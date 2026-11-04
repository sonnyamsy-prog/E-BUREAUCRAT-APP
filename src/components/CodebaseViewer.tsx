import React, { useState } from 'react';
import { Copy, Check, FileCode, Terminal, Download, BookOpen, Shield } from 'lucide-react';

export const CodebaseViewer: React.FC = () => {
  const [activeFile, setActiveFile] = useState<string>('app.py');
  const [copied, setCopied] = useState<boolean>(false);

  const files: Record<string, { language: string; content: string; description: string }> = {
    'app.py': {
      language: 'python',
      description: 'FastAPI Webhook Gateway & WhatsApp Message Dispatcher',
      content: `import os
import httpx
from fastapi import FastAPI, Request, Response, BackgroundTasks
from config import WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, VERIFY_TOKEN, STORAGE_DIR
from audio_service import convert_ogg_to_wav, transcribe_audio, synthesize_speech_swahili
from dialogue_engine import process_user_turn
from workers.kra_nil_return import execute_kra_nil_return

app = FastAPI(title="e-Bureaucrat WhatsApp Voice Gateway")
os.makedirs(STORAGE_DIR, exist_ok=True)

# ----------------- WHATSAPP CLOUD API UTILITIES -----------------

async def send_whatsapp_voice(to_phone: str, audio_file_path: str):
    """Uploads and sends an audio message back to the user."""
    url = f"https://graph.facebook.com/v20.0/{WHATSAPP_PHONE_NUMBER_ID}/media"
    headers = {"Authorization": f"Bearer {WHATSAPP_TOKEN}"}
    
    # 1. Upload Media
    async with httpx.AsyncClient() as client:
        with open(audio_file_path, "rb") as f:
            files = {"file": (os.path.basename(audio_file_path), f, "audio/mpeg")}
            data = {"type": "audio", "messaging_product": "whatsapp"}
            res = await client.post(url, headers=headers, data=data, files=files)
            media_id = res.json().get("id")

    # 2. Send Media Message
    msg_url = f"https://graph.facebook.com/v20.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "audio",
        "audio": {"id": media_id}
    }
    async with httpx.AsyncClient() as client:
        await client.post(msg_url, headers=headers, json=payload)

async def send_whatsapp_document(to_phone: str, document_path: str, caption: str):
    """Sends the final government receipt/filing PDF."""
    url = f"https://graph.facebook.com/v20.0/{WHATSAPP_PHONE_NUMBER_ID}/media"
    headers = {"Authorization": f"Bearer {WHATSAPP_TOKEN}"}
    
    async with httpx.AsyncClient() as client:
        with open(document_path, "rb") as f:
            files = {"file": (os.path.basename(document_path), f, "application/pdf")}
            data = {"type": "document", "messaging_product": "whatsapp"}
            res = await client.post(url, headers=headers, data=data, files=files)
            media_id = res.json().get("id")

    msg_url = f"https://graph.facebook.com/v20.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "document",
        "document": {"id": media_id, "caption": caption, "filename": "KRA_Nil_Receipt.pdf"}
    }
    async with httpx.AsyncClient() as client:
        await client.post(msg_url, headers=headers, json=payload)

# ----------------- BACKGROUND WORKFLOW PIPELINE -----------------

async def handle_incoming_voice_workflow(from_phone: str, media_id: str):
    headers = {"Authorization": f"Bearer {WHATSAPP_TOKEN}"}
    
    # 1. Fetch Media URL from WhatsApp
    async with httpx.AsyncClient() as client:
        res = await client.get(f"https://graph.facebook.com/v20.0/{media_id}", headers=headers)
        media_url = res.json().get("url")
        
        # Download raw .ogg audio
        ogg_res = await client.get(media_url, headers=headers)
        raw_ogg_path = os.path.join(STORAGE_DIR, f"{media_id}.ogg")
        with open(raw_ogg_path, "wb") as f:
            f.write(ogg_res.content)
            
    # 2. Transcode & Transcribe
    wav_path = os.path.join(STORAGE_DIR, f"{media_id}.wav")
    convert_ogg_to_wav(raw_ogg_path, wav_path)
    user_text = transcribe_audio(wav_path)
    print(f"[{from_phone} Said]: {user_text}")

    # 3. Pass to Dialogue Engine
    decision = process_user_turn(from_phone, user_text)
    
    # 4. Check if ready to execute RPA
    if decision["is_complete"]:
        # Let user know processing has started
        progress_audio = os.path.join(STORAGE_DIR, f"progress_{from_phone}.mp3")
        await synthesize_speech_swahili(
            "Asante sana. Nimepokea taarifa zako zote. Natuma ripoti kwa KRA sasa hivi...", 
            progress_audio
        )
        await send_whatsapp_voice(from_phone, progress_audio)

        # Run Playwright worker
        data = decision["collected_data"]
        receipt_pdf = os.path.join(STORAGE_DIR, f"KRA_Receipt_{from_phone}.pdf")
        
        success = await execute_kra_nil_return(data["kra_pin"], data["itax_password"], receipt_pdf)
        
        if success:
            await send_whatsapp_document(
                from_phone, 
                receipt_pdf, 
                "Hii hapa receipt yako rasmi kutoka KRA. Umefaulu kuwasilisha Nil Return yako kikamilifu."
            )
        else:
            fail_audio = os.path.join(STORAGE_DIR, f"fail_{from_phone}.mp3")
            await synthesize_speech_swahili(
                "Samahani, kumetokea hitilafu kwenye tovuti ya KRA au nenosiri si sahihi. Tafadhali jaribu tena baadaye.", 
                fail_audio
            )
            await send_whatsapp_voice(from_phone, fail_audio)
    else:
        # Synthesize next clarifying question
        reply_audio = os.path.join(STORAGE_DIR, f"reply_{from_phone}.mp3")
        await synthesize_speech_swahili(decision["reply"], reply_audio)
        await send_whatsapp_voice(from_phone, reply_audio)

# ----------------- WEBHOOK ROUTES -----------------

@app.get("/webhook")
async def verify_webhook(request: Request):
    """WhatsApp Webhook verification handshake."""
    params = request.query_params
    if params.get("hub.mode") == "subscribe" and params.get("hub.verify_token") == VERIFY_TOKEN:
        return Response(content=params.get("hub.challenge"), media_type="text/plain")
    return Response(status_code=403)

@app.post("/webhook")
async def webhook_handler(request: Request, background_tasks: BackgroundTasks):
    """Handles incoming WhatsApp messages."""
    payload = await request.json()
    
    try:
        entry = payload["entry"][0]["changes"][0]["value"]
        if "messages" in entry:
            message = entry["messages"][0]
            from_phone = message["from"]
            
            # Process only voice/audio messages
            if message["type"] == "audio":
                media_id = message["audio"]["id"]
                background_tasks.add_task(handle_incoming_voice_workflow, from_phone, media_id)
                
    except (KeyError, IndexError):
        pass
        
    return {"status": "received"}`,
    },
    'audio_service.py': {
      language: 'python',
      description: 'Kenyan Dialect Biased Whisper STT & Edge-TTS Speech Synthesis',
      content: `import os
import subprocess
import whisper
import edge_tts

# Load base model for low-latency inference
whisper_model = whisper.load_model("base")

KENYAN_CONTEXT_PROMPT = (
    "Sheng, Kiswahili, English, KRA PIN, iTax, eCitizen, M-Pesa, nil returns, "
    "kitambulisho, logbook, NTSA, masharti, ushuru, daktari."
)

def convert_ogg_to_wav(input_path: str, output_path: str) -> None:
    """Converts WhatsApp OGG audio to 16kHz mono WAV for Whisper."""
    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", output_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

def transcribe_audio(wav_path: str) -> str:
    """Transcribes audio with Kenyan context awareness."""
    result = whisper_model.transcribe(
        wav_path,
        initial_prompt=KENYAN_CONTEXT_PROMPT,
        temperature=0.0
    )
    return result["text"].strip()

async def synthesize_speech_swahili(text: str, output_path: str) -> None:
    """Generates natural Swahili voice response using Microsoft Edge-TTS."""
    communicate = edge_tts.Communicate(text, voice="sw-KE-ZuriNeural")
    await communicate.save(output_path)`,
    },
    'dialogue_engine.py': {
      language: 'python',
      description: 'Conversational Slot Extraction & Dialogue State Machine',
      content: `import json
from anthropic import Anthropic
from config import ANTHROPIC_API_KEY

client = Anthropic(api_key=ANTHROPIC_API_KEY)

# Simple in-memory session cache (use Redis in production)
SESSIONS = {}

SYSTEM_PROMPT = """
You are 'Wakili AI', an expert digital public assistant in Kenya. You talk to citizens 
via WhatsApp in warm, natural Swahili or Kenyan English (match the user's dialect).

Your goal is to collect the required fields to file a KRA Nil Return:
1. KRA PIN (Format: A followed by 9 digits and a letter, e.g., A012345678Z)
2. iTax Password
3. Tax Obligation (Usually 'Income Tax - Resident Individual')
4. Return Year (Defaults to current past tax year)

Rules:
- If a user sends a greeting or asks for help, explain what you do concisely.
- Extract slots immediately if provided.
- If any required field is missing, ask for ONLY ONE missing piece at a time.
- If you have ALL fields, output the final state as READY_TO_FILE.

Output format must ALWAYS be strictly valid JSON:
{
  "intent": "KRA_NIL_RETURN" | "UNKNOWN",
  "extracted_data": {
    "kra_pin": string or null,
    "itax_password": string or null,
    "year": string or null
  },
  "is_complete": boolean,
  "reply_text": "Response to send to the user in their language"
}
"""

def process_user_turn(phone_number: str, user_transcript: str) -> dict:
    session = SESSIONS.get(phone_number, {"history": [], "data": {}})
    session["history"].append({"role": "user", "content": user_transcript})
    
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=500,
        system=SYSTEM_PROMPT,
        messages=session["history"]
    )
    
    response_content = response.content[0].text
    try:
        parsed = json.loads(response_content)
    except Exception:
        clean_json = response_content.replace("\`\`\`json", "").replace("\`\`\`", "").strip()
        parsed = json.loads(clean_json)
        
    for k, v in parsed.get("extracted_data", {}).items():
        if v:
            session["data"][k] = v
            
    session["history"].append({"role": "assistant", "content": response_content})
    SESSIONS[phone_number] = session
    
    return {
        "reply": parsed["reply_text"],
        "is_complete": parsed["is_complete"],
        "collected_data": session["data"]
    }`,
    },
    'workers/kra_nil_return.py': {
      language: 'python',
      description: 'Playwright RPA Worker Automating KRA iTax & Arithmetic Captcha',
      content: `import re
import asyncio
from playwright.async_api import async_playwright
import pytesseract
from PIL import Image

def solve_kra_math_captcha(image_path: str) -> int:
    """Solves standard KRA arithmetic security questions (e.g. '12 + 4 = ?')."""
    img = Image.open(image_path)
    text = pytesseract.image_to_string(img, config='--psm 7').strip()
    
    match = re.search(r'(\\d+)\\s*([\\+\\-\\*])\\s*(\\d+)', text)
    if not match:
        raise ValueError(f"Could not parse arithmetic captcha: {text}")
        
    num1, op, num2 = int(match.group(1)), match.group(2), int(match.group(3))
    if op == '+': return num1 + num2
    if op == '-': return num1 - num2
    if op == '*': return num1 * num2
    return 0

async def execute_kra_nil_return(kra_pin: str, password: str, receipt_pdf_path: str) -> bool:
    """Logs into KRA iTax, solves the captcha, and submits an Individual Nil Return."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(accept_downloads=True)
        page = await context.new_page()

        try:
            # 1. Navigate to iTax Portal
            await page.goto("https://itax.kra.go.ke/KRA-Portal/", timeout=60000)
            
            # 2. Enter PIN
            await page.fill("#logEid", kra_pin)
            await page.click("#btnLogEid")
            await page.wait_for_selector("#password", timeout=15000)

            # 3. Enter Password
            await page.fill("#password", password)

            # 4. Handle Captcha Image
            captcha_element = await page.query_selector("#captCode")
            captcha_img_path = "/tmp/captcha_kra.png"
            await captcha_element.screenshot(path=captcha_img_path)
            
            captcha_solution = solve_kra_math_captcha(captcha_img_path)
            await page.fill("#captBsc", str(captcha_solution))
            
            # 5. Submit Login
            await page.click("#submit", timeout=10000)
            await page.wait_for_url("**/home.htm", timeout=20000)

            # 6. Navigate to Returns -> File Nil Return
            await page.hover("a:has-text('Returns')")
            await page.click("a:has-text('File Nil Return')")
            
            # 7. Select Tax Obligation
            await page.select_option("#taxObligation", label="Income Tax - Resident Individual")
            await page.click("#btnSubmit")

            # 8. Confirm Nil Return Wizard
            await page.click("#btnSubmitReturn")
            
            # 9. Capture Download Receipt
            async with page.expect_download() as download_info:
                await page.click("a:has-text('Download Receipt')")
            download = await download_info.value
            await download.save_as(receipt_pdf_path)

            await browser.close()
            return True

        except Exception as e:
            print(f"[RPA ERROR]: {e}")
            await browser.close()
            return False`,
    },
    'requirements.txt': {
      language: 'text',
      description: 'Python Dependencies & Package Versions',
      content: `fastapi==0.115.0
uvicorn==0.30.0
httpx==0.27.0
openai-whisper==20231117
edge-tts==6.1.12
playwright==1.47.0
pydantic==2.8.2
python-dotenv==1.0.1
anthropic==0.34.0
pillow==10.4.0
pytesseract==0.3.10`,
    },
    '.env.example': {
      language: 'bash',
      description: 'Environment Variables & WhatsApp Cloud API Credentials',
      content: `WHATSAPP_TOKEN="your_meta_system_user_token"
WHATSAPP_PHONE_NUMBER_ID="your_whatsapp_phone_number_id"
VERIFY_TOKEN="wakili_secret_token_2026"
ANTHROPIC_API_KEY="sk-ant-..."
STORAGE_DIR="./storage"`,
    },
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(files[activeFile].content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            <span>Production Architecture Blueprint</span>
            <span aria-hidden="true">·</span>
            <span>FastAPI + Playwright + Whisper</span>
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            Source Code & Deployment Artifacts
          </h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
            Inspect the complete, runnable Python backend files ready for direct deployment on Linux / Docker.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="px-3.5 py-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Copied to Clipboard!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy Current File
            </>
          )}
        </button>
      </div>

      {/* Code Browser Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: File Tree Navigation */}
        <div className="lg:col-span-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 px-2 pb-1">
            Repository Files
          </h4>

          {Object.keys(files).map((fileName) => (
            <button
              key={fileName}
              onClick={() => setActiveFile(fileName)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                activeFile === fileName
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/80'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
              }`}
            >
              <span className="font-mono flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-neutral-500" />
                {fileName}
              </span>
            </button>
          ))}

          {/* Quick Deployment Guide */}
          <div className="pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800 text-xs space-y-2 text-neutral-600 dark:text-neutral-400">
            <h5 className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-600" />
              Local Run Instructions:
            </h5>
            <ol className="list-decimal list-inside space-y-1 text-[11px] font-mono bg-neutral-50 dark:bg-neutral-950 p-2.5 rounded border border-neutral-200 dark:border-neutral-800">
              <li>pip install -r requirements.txt</li>
              <li>playwright install chromium</li>
              <li>ngrok http 8000</li>
              <li>uvicorn app:app --port 8000</li>
            </ol>
          </div>
        </div>

        {/* Right: Code Viewer */}
        <div className="lg:col-span-8 bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden shadow-lg">
          <div className="bg-neutral-900 px-4 py-2.5 border-b border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            <span className="font-mono text-emerald-400 font-semibold">{activeFile}</span>
            <span className="text-[11px] text-neutral-400">{files[activeFile].description}</span>
          </div>

          <pre className="p-4 text-neutral-200 font-mono text-xs overflow-x-auto max-h-[580px] leading-relaxed">
            <code>{files[activeFile].content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
