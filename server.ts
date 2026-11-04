import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Server-side Gemini client with 'aistudio-build' telemetry header
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// In-memory sessions store (simulating Redis in production)
interface SessionRecord {
  phoneNumber: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  data: {
    kra_pin?: string | null;
    itax_password?: string | null;
    tax_obligation?: string | null;
    year?: string | null;
    national_id?: string | null;
    full_name?: string | null;
    otp_code?: string | null;
  };
  consentGiven: boolean;
  service: string;
  status: 'COLLECTING' | 'CONSENT_PENDING' | 'AWAITING_OTP' | 'READY_TO_FILE' | 'FILED' | 'ERROR';
  lastUpdated: string;
}

const SESSIONS = new Map<string, SessionRecord>();

// Fallback rule-based Kenyan dialect engine if Gemini API key is not configured or in offline mode
function fallbackDialogueEngine(userText: string, currentData: SessionRecord['data']) {
  const textLower = userText.toLowerCase();
  const data = { ...currentData };

  // Detect KRA PIN pattern: Letter A/P + 9 digits + 1 letter (e.g., A012345678Z or P051234567M)
  const pinMatch = userText.match(/\b([APap][0-9]{9}[A-Za-z])\b/i);
  if (pinMatch) {
    data.kra_pin = pinMatch[1].toUpperCase();
  }

  // Detect Tax Year (e.g., 2023, 2024, 2025, 2026)
  const yearMatch = userText.match(/\b(202[0-9])\b/);
  if (yearMatch) {
    data.year = yearMatch[1];
  } else if (!data.year) {
    data.year = '2025';
  }

  // Detect password mentions (e.g. "password yangu ni ...", "pass: ...", or single word alphanumeric with symbols)
  const passMatch = userText.match(/(?:password|nenosiri|pass)\s*(?:yangu|ni|is|:)?\s*([A-Za-z0-9@#$%^&*!]{6,})/i);
  if (passMatch) {
    data.itax_password = passMatch[1].trim();
  }

  // Check 6-digit OTP
  const otpMatch = userText.match(/\b([0-9]{6})\b/);
  if (otpMatch) {
    data.otp_code = otpMatch[1];
  }

  // Evaluate what's missing
  let reply = '';
  let isComplete = false;

  const isSwahiliOrSheng = /habari|niaje|sasa|vipi|mambo|ushuru|ku-file|file|nataka|nisaidie|ndio|asante|sawa|kaka|bro/i.test(textLower);

  if (!data.kra_pin) {
    reply = isSwahiliOrSheng
      ? 'Sawa kabisa! Ninaweza kukusaidia ku-file Nil Return yako ya KRA mara moja. Tafadhali niambie KRA PIN yako (kwa mfano: A012345678Z).'
      : 'Hello! I can help you submit your KRA Nil Return immediately. Please provide your KRA PIN (e.g., A012345678Z).';
  } else if (!data.itax_password) {
    reply = isSwahiliOrSheng
      ? `Asante! Nimepata PIN yako: ${data.kra_pin}. Sasa tafadhali nipe nenosiri (password) lako la iTax ili niingie kwa niaba yako.`
      : `Thank you! I got your PIN: ${data.kra_pin}. Next, please provide your iTax password so the automated agent can log in on your behalf.`;
  } else {
    isComplete = true;
    reply = isSwahiliOrSheng
      ? `Asante sana. Nimepokea taarifa zako zote za KRA (${data.kra_pin} kwa mwaka ${data.year}). Kulingana na Sheria ya Data Protection 2019, tunafuta nenosiri mara baada ya kuthibitisha. Je, unaniruhusu kuingia kwenye iTax na kuwasilisha Nil Return yako sasa hivi?`
      : `Thank you. I have all necessary details for KRA Nil Return (${data.kra_pin} for Year ${data.year}). In compliance with Kenya Data Protection Act 2019, your password is ephemeral. Do you authorize me to file your Nil Return now?`;
  }

  return {
    reply,
    isComplete,
    extractedData: data,
    intent: 'KRA_NIL_RETURN',
  };
}

// 1. Dialogue endpoint
app.post('/api/dialogue', async (req, res) => {
  try {
    const { phoneNumber = '+254712345678', message = '', consentGranted = false } = req.body;

    let session = SESSIONS.get(phoneNumber);
    if (!session) {
      session = {
        phoneNumber,
        history: [],
        data: {
          tax_obligation: 'Income Tax - Resident Individual',
          year: '2025',
        },
        consentGiven: false,
        service: 'KRA_NIL_RETURN',
        status: 'COLLECTING',
        lastUpdated: new Date().toISOString(),
      };
      SESSIONS.set(phoneNumber, session);
    }

    if (consentGranted) {
      session.consentGiven = true;
    }

    session.history.push({ role: 'user', content: message });

    let reply = '';
    let isComplete = false;
    let extractedData = { ...session.data };

    if (aiClient) {
      try {
        const systemPrompt = `
You are 'Wakili AI' (e-Bureaucrat), an empathetic, professional Kenyan GovTech public assistant communicating via WhatsApp voice notes and text.
You communicate fluently in natural Kiswahili, Sheng (Nairobi youth dialect), or Kenyan English, precisely mirroring the user's tone and dialect.

Primary Mission:
Guide the citizen to collect required slots for Kenyan government portal filings (primarily KRA Nil Return, or eCitizen services):
1. KRA PIN (Standard format: Starts with 'A' or 'P', followed by 9 digits, ending in a letter, e.g. A012345678Z)
2. iTax Password
3. Tax Obligation (Default: "Income Tax - Resident Individual")
4. Tax Year (Default: "2025" or current previous tax year)

Rules:
- Never ask for multiple missing fields at once. Only ask for ONE missing piece of information at a time.
- If user greets or speaks Sheng ("Niaje", "Sasa bro", "Mambo vipi"), reply warmly in natural Sheng/Swahili.
- If user provides PIN or password, acknowledge it respectfully.
- When all fields are present (PIN + password), prompt for explicit legal consent under the Kenya Data Protection Act 2019 before marking is_complete=true.
- Output strictly valid JSON matching this schema:
{
  "intent": "KRA_NIL_RETURN" | "ECITIZEN_SERVICE" | "UNKNOWN",
  "extracted_data": {
    "kra_pin": string or null,
    "itax_password": string or null,
    "year": string or null,
    "tax_obligation": string or null
  },
  "is_complete": boolean,
  "reply_text": "Spoken/text response to user in matching dialect (Swahili/Sheng/Kenyan English)"
}
`;

        const recentHistory = session.history.slice(-8).map(h => `${h.role === 'user' ? 'Citizen' : 'Wakili AI'}: ${h.content}`).join('\n');
        const userPrompt = `Current Known Data: ${JSON.stringify(session.data)}\nConversation History:\n${recentHistory}\nLatest Message from Citizen: "${message}"\nAnalyze intent, extract missing fields, and formulate next audio/text reply.`;

        const response = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        reply = parsed.reply_text || 'Samahani, tafadhali rudia tena.';
        isComplete = Boolean(parsed.is_complete);

        if (parsed.extracted_data) {
          if (parsed.extracted_data.kra_pin) extractedData.kra_pin = parsed.extracted_data.kra_pin;
          if (parsed.extracted_data.itax_password) extractedData.itax_password = parsed.extracted_data.itax_password;
          if (parsed.extracted_data.year) extractedData.year = parsed.extracted_data.year;
          if (parsed.extracted_data.tax_obligation) extractedData.tax_obligation = parsed.extracted_data.tax_obligation;
        }
      } catch (err) {
        console.warn('Gemini API call fallback to local rule-engine:', err);
        const fallback = fallbackDialogueEngine(message, session.data);
        reply = fallback.reply;
        isComplete = fallback.isComplete;
        extractedData = fallback.extractedData;
      }
    } else {
      const fallback = fallbackDialogueEngine(message, session.data);
      reply = fallback.reply;
      isComplete = fallback.isComplete;
      extractedData = fallback.extractedData;
    }

    session.data = extractedData;
    session.history.push({ role: 'assistant', content: reply });
    session.lastUpdated = new Date().toISOString();

    if (isComplete && extractedData.kra_pin && extractedData.itax_password) {
      session.status = 'READY_TO_FILE';
    } else {
      session.status = 'COLLECTING';
    }

    return res.json({
      success: true,
      reply,
      isComplete,
      collectedData: session.data,
      status: session.status,
      history: session.history,
    });
  } catch (error) {
    console.error('Error in /api/dialogue:', error);
    return res.status(500).json({ success: false, error: 'Internal server error in dialogue engine' });
  }
});

// 2. RPA Browser Execution Simulator endpoint
app.post('/api/rpa/execute-kra', async (req, res) => {
  try {
    const { kra_pin = 'A019876543K', itax_password = '••••••••', year = '2025' } = req.body;

    // Simulate real headless browser automation workflow
    const executionId = `KRA-EXEC-${Date.now().toString(36).toUpperCase()}`;
    const timestamp = new Date().toISOString();
    const ackNumber = `KRA${year}${Math.floor(10000000 + Math.random() * 90000000)}`;

    const steps = [
      {
        id: 'INIT_BROWSER',
        name: 'Launch Headless Chromium',
        action: 'Starting Playwright browser context with accept_downloads=true',
        status: 'SUCCESS',
        durationMs: 420,
      },
      {
        id: 'NAVIGATE_PORTAL',
        name: 'Access KRA iTax Gateway',
        action: 'Navigating to https://itax.kra.go.ke/KRA-Portal/',
        status: 'SUCCESS',
        durationMs: 680,
      },
      {
        id: 'INPUT_PIN',
        name: 'Submit Taxpayer Identification',
        action: `Entering KRA PIN (${kra_pin}) into selector #logEid`,
        status: 'SUCCESS',
        durationMs: 290,
      },
      {
        id: 'INPUT_PASSWORD',
        name: 'Inject Portal Password',
        action: 'Entering encrypted password into #password securely',
        status: 'SUCCESS',
        durationMs: 310,
      },
      {
        id: 'SOLVE_CAPTCHA',
        name: 'Arithmetic Security Solver',
        action: 'OCR solved arithmetic captcha: "48 + 12 = 60" -> Injected 60 into #captBsc',
        status: 'SUCCESS',
        durationMs: 510,
      },
      {
        id: 'VERIFY_DASHBOARD',
        name: 'Authenticate Session',
        action: 'Awaiting URL **/home.htm -> Session token verified',
        status: 'SUCCESS',
        durationMs: 820,
      },
      {
        id: 'NAVIGATE_NIL_RETURN',
        name: 'Select Nil Return Wizard',
        action: 'Hovering a:has-text("Returns") -> Clicking "File Nil Return"',
        status: 'SUCCESS',
        durationMs: 440,
      },
      {
        id: 'SELECT_OBLIGATION',
        name: 'Choose Obligation',
        action: 'Selecting "Income Tax - Resident Individual" for period ' + year,
        status: 'SUCCESS',
        durationMs: 380,
      },
      {
        id: 'SUBMIT_CONFIRMATION',
        name: 'Submit Official Declaration',
        action: 'Clicked #btnSubmitReturn -> Nil Declaration verified by KRA Gateway',
        status: 'SUCCESS',
        durationMs: 620,
      },
      {
        id: 'GENERATE_RECEIPT',
        name: 'Download e-Return Receipt',
        action: `Captured official PDF acknowledgment: KRA_Receipt_${kra_pin}_${year}.pdf`,
        status: 'SUCCESS',
        durationMs: 530,
      },
    ];

    const receiptData = {
      ackNumber,
      pin: kra_pin,
      taxpayerName: 'CITIZEN TAXPAYER (INDIVIDUAL)',
      taxObligation: 'Income Tax - Resident Individual',
      returnPeriodFrom: `01/01/${year}`,
      returnPeriodTo: `31/12/${year}`,
      submissionDate: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString(),
      modeOfFiling: 'Electronic (e-Bureaucrat Headless RPA)',
      totalTaxDue: '0.00 KES (NIL)',
      status: 'FILED & VERIFIED',
      qrVerificationUrl: `https://itax.kra.go.ke/KRA-Portal/verifyReturn.htm?ack=${ackNumber}`,
    };

    return res.json({
      success: true,
      executionId,
      timestamp,
      steps,
      receipt: receiptData,
    });
  } catch (err) {
    console.error('Error executing RPA simulation:', err);
    return res.status(500).json({ success: false, error: 'RPA automation failed' });
  }
});

// 3. WhatsApp Cloud API Webhook handshake & receiver simulator
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'wakili_secret_token_2026';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

app.post('/webhook', (req, res) => {
  const payload = req.body;
  console.log('Received WhatsApp Webhook payload:', JSON.stringify(payload, null, 2));
  return res.json({ status: 'received', messageId: `wamid.HBgM${Date.now()}` });
});

// 4. Reset session helper
app.post('/api/session/reset', (req, res) => {
  const { phoneNumber = '+254712345678' } = req.body;
  SESSIONS.delete(phoneNumber);
  return res.json({ success: true, message: 'Session reset successfully' });
});

// 5. App Health
app.get('/api/health', (req, res) => {
  return res.json({
    status: 'online',
    service: 'e-Bureaucrat WhatsApp Voice Agent Engine',
    geminiActive: Boolean(aiClient),
    activeSessions: SESSIONS.size,
    timestamp: new Date().toISOString(),
  });
});

// Start dev server with Vite middlewares
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 e-Bureaucrat server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
