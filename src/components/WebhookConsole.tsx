import React, { useState } from 'react';
import { Send, CheckCircle2, Code, Terminal, Play, ArrowRight, Shield, Layers } from 'lucide-react';

interface WebhookConsoleProps {
  onSimulateWebhook: (payload: any) => Promise<any>;
}

export const WebhookConsole: React.FC<WebhookConsoleProps> = ({ onSimulateWebhook }) => {
  const [verifyToken, setVerifyToken] = useState('wakili_secret_token_2026');
  const [challengeStr, setChallengeStr] = useState('1158201444');
  const [handshakeResult, setHandshakeResult] = useState<string | null>(null);
  const [isHandshaking, setIsHandshaking] = useState(false);

  const [activePayloadTab, setActivePayloadTab] = useState<'voice_note' | 'otp_text' | 'consent'>('voice_note');
  const [postResponse, setPostResponse] = useState<any>(null);
  const [isPosting, setIsPosting] = useState(false);

  // Sample WhatsApp Cloud API Webhook Payloads
  const samplePayloads = {
    voice_note: {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '109823746592019',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '+254700000000',
                  phone_number_id: '104829104928374',
                },
                contacts: [
                  {
                    profile: { name: 'Juma Mwangi' },
                    wa_id: '254712345678',
                  },
                ],
                messages: [
                  {
                    from: '254712345678',
                    id: `wamid.HBgM${Date.now()}`,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    type: 'audio',
                    audio: {
                      mime_type: 'audio/ogg; codecs=opus',
                      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                      id: '182749102948271',
                      voice: true,
                    },
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    },
    otp_text: {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '109823746592019',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                messages: [
                  {
                    from: '254712345678',
                    id: `wamid.HBgM${Date.now()}`,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    type: 'text',
                    text: { body: 'Hiyo OTP ni 849201' },
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    },
    consent: {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '109823746592019',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                messages: [
                  {
                    from: '254712345678',
                    id: `wamid.HBgM${Date.now()}`,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    type: 'text',
                    text: { body: 'Ndio nimekubali unifailie Nil Return yangu ya KRA.' },
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    },
  };

  const handleTestHandshake = async () => {
    setIsHandshaking(true);
    try {
      const res = await fetch(
        `/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(
          verifyToken
        )}&hub.challenge=${encodeURIComponent(challengeStr)}`
      );
      if (res.ok) {
        const text = await res.text();
        setHandshakeResult(`HTTP 200 OK — Challenge Echoed: "${text}" (Webhook Verified!)`);
      } else {
        setHandshakeResult(`HTTP ${res.status} Forbidden — Token mismatch.`);
      }
    } catch (e: any) {
      setHandshakeResult(`Error: ${e.message}`);
    } finally {
      setIsHandshaking(false);
    }
  };

  const handleDispatchPayload = async () => {
    setIsPosting(true);
    const payload = samplePayloads[activePayloadTab];
    try {
      const res = await onSimulateWebhook(payload);
      setPostResponse(res);
    } catch (e: any) {
      setPostResponse({ error: e.message });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Overview & Architecture Header */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs space-y-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            <span>Developer Sandbox</span>
            <span aria-hidden="true">·</span>
            <span>Meta WhatsApp Cloud API v20.0</span>
            <span aria-hidden="true">·</span>
            <span>Webhook Verification Handshake</span>
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            WhatsApp Gateway & Webhook Simulator
          </h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
            Test the Meta webhook subscription handshake and simulate incoming voice note JSON events.
          </p>
        </div>

        {/* System Flow Diagram */}
        <div className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            End-to-End Pipeline Architecture
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-xs">
            <div className="p-2.5 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <span className="font-bold block text-neutral-900 dark:text-neutral-100">1. Citizen Voice</span>
              <span className="text-[10px] text-neutral-500">.ogg Opus via WhatsApp</span>
            </div>
            <div className="p-2.5 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <span className="font-bold block text-neutral-900 dark:text-neutral-100">2. Transcode / STT</span>
              <span className="text-[10px] text-neutral-500">ffmpeg &rarr; Whisper (Sheng biased)</span>
            </div>
            <div className="p-2.5 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <span className="font-bold block text-neutral-900 dark:text-neutral-100">3. Dialogue State</span>
              <span className="text-[10px] text-neutral-500">Slot & Consent Extraction</span>
            </div>
            <div className="p-2.5 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <span className="font-bold block text-neutral-900 dark:text-neutral-100">4. Playwright RPA</span>
              <span className="text-[10px] text-neutral-500">iTax Math Captcha OCR</span>
            </div>
            <div className="p-2.5 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <span className="font-bold block text-emerald-700 dark:text-emerald-400">5. Receipt PDF</span>
              <span className="text-[10px] text-neutral-500">Dispatched back to user</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: GET Handshake & POST Webhook */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: GET Webhook Verification Handshake */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-600" />
              1. GET /webhook (Verification Handshake)
            </h3>
            <span className="text-[11px] font-mono text-neutral-500">Meta Callback Setup</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                hub.verify_token:
              </label>
              <input
                type="text"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                className="w-full p-2 font-mono rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div>
              <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                hub.challenge:
              </label>
              <input
                type="text"
                value={challengeStr}
                onChange={(e) => setChallengeStr(e.target.value)}
                className="w-full p-2 font-mono rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <button
              onClick={handleTestHandshake}
              disabled={isHandshaking}
              className="w-full py-2 px-3 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              {isHandshaking ? 'Testing Handshake...' : 'Send Verification Handshake (GET)'}
            </button>

            {handshakeResult && (
              <div
                className={`p-3 rounded-lg text-xs font-mono ${
                  handshakeResult.includes('HTTP 200')
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-300'
                }`}
              >
                {handshakeResult}
              </div>
            )}
          </div>
        </div>

        {/* Right: POST /webhook Incoming Event Simulator */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Code className="w-4 h-4 text-emerald-600" />
              2. POST /webhook (Incoming Event)
            </h3>
            <span className="text-[11px] font-mono text-neutral-500">Live Payload Dispatch</span>
          </div>

          {/* Payload Selector Tabs */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs">
            <button
              onClick={() => setActivePayloadTab('voice_note')}
              className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                activePayloadTab === 'voice_note'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Voice Note (.ogg)
            </button>
            <button
              onClick={() => setActivePayloadTab('otp_text')}
              className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                activePayloadTab === 'otp_text'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              SMS OTP Response
            </button>
            <button
              onClick={() => setActivePayloadTab('consent')}
              className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                activePayloadTab === 'consent'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Citizen Consent
            </button>
          </div>

          {/* Payload JSON Viewer */}
          <div className="relative">
            <pre className="p-3 bg-neutral-950 text-neutral-200 font-mono text-[11px] rounded-lg max-h-56 overflow-y-auto leading-relaxed border border-neutral-800">
              {JSON.stringify(samplePayloads[activePayloadTab], null, 2)}
            </pre>
          </div>

          <button
            onClick={handleDispatchPayload}
            disabled={isPosting}
            className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            {isPosting ? 'Sending Payload...' : 'Dispatch Webhook Event to /webhook (POST)'}
          </button>

          {postResponse && (
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/80 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-mono space-y-1">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 block">
                Server Acknowledgment:
              </span>
              <pre className="text-[11px] text-neutral-700 dark:text-neutral-300">
                {JSON.stringify(postResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
