import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Play,
  Pause,
  CheckCheck,
  FileText,
  Download,
  ShieldCheck,
  Phone,
  Video,
  MoreVertical,
  Lock,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Volume2
} from 'lucide-react';
import { ChatMessage, ExtractedSlots, KRAReceipt } from '../types';

interface WhatsAppVoiceSimulatorProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, isVoice?: boolean, dialect?: 'Swahili' | 'Sheng' | 'English') => void;
  extractedSlots: ExtractedSlots;
  isProcessing: boolean;
  onConsentGrant: () => void;
  onTriggerRPA: () => void;
  rpaStatus: string;
  latestReceipt: KRAReceipt | null;
  onViewReceipt: () => void;
}

export const WhatsAppVoiceSimulator: React.FC<WhatsAppVoiceSimulatorProps> = ({
  messages,
  onSendMessage,
  extractedSlots,
  isProcessing,
  onConsentGrant,
  onTriggerRPA,
  rpaStatus,
  latestReceipt,
  onViewReceipt,
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [activeAudioPlayingId, setActiveAudioPlayingId] = useState<string | null>(null);
  const [selectedDialect, setSelectedDialect] = useState<'Swahili' | 'Sheng' | 'English'>('Sheng');
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Handle Recording Timer
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleSendText = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), false, selectedDialect);
    setInputText('');
  };

  // Simulated voice note recording finish
  const handleStopRecording = () => {
    setIsRecording(false);
    const simulatedPhrases: Record<'Sheng' | 'Swahili' | 'English', string[]> = {
      Sheng: [
        'Niaje Wakili, nataka ku-file nil return yangu ya KRA ya mwaka jana.',
        'PIN yangu ya KRA ni A018274659Z, nisaidie kuendelea.',
        'Password ya iTax ni Kenya@2025!',
        'Ndio, nimekubali unifailie return sasa hivi.',
      ],
      Swahili: [
        'Habari, nahitaji kuwasilisha Nil Return yangu ya KRA tafadhali.',
        'KRA PIN yangu ni A019847261M.',
        'Nenosiri langu la iTax ni Ushuru2025#.',
        'Ninakupa idhini ya kuingia kwenye akaunti yangu na kuwasilisha.',
      ],
      English: [
        'Hi, I would like to file my KRA Nil Return for 2025.',
        'My KRA PIN is A014829104P.',
        'My iTax portal password is SafePassword2025!',
        'Yes, I grant consent under the Data Protection Act to file.',
      ],
    };

    // Determine smart context-aware voice transcript if fields are missing
    let phrase = '';
    const pool = simulatedPhrases[selectedDialect];
    if (!extractedSlots.kra_pin) {
      phrase = pool[0];
    } else if (!extractedSlots.itax_password) {
      phrase = pool[2];
    } else {
      phrase = pool[3];
    }

    onSendMessage(phrase, true, selectedDialect);
    // Play voice audio simulation
    speakText(phrase);
  };

  // Browser speech synthesis for spoken audio notes
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      // Try to find a Swahili or English voice
      const voices = window.speechSynthesis.getVoices();
      const swVoice = voices.find((v) => v.lang.startsWith('sw') || v.lang.includes('KE'));
      if (swVoice) {
        utterance.voice = swVoice;
      }
      utterance.onend = () => setActiveAudioPlayingId(null);
      utterance.onerror = () => setActiveAudioPlayingId(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  const togglePlayAudio = (msgId: string, text: string) => {
    if (activeAudioPlayingId === msgId) {
      window.speechSynthesis.cancel();
      setActiveAudioPlayingId(null);
    } else {
      setActiveAudioPlayingId(msgId);
      speakText(text);
    }
  };

  const isReadyToFile = Boolean(extractedSlots.kra_pin && extractedSlots.itax_password);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left: Interactive WhatsApp Phone Screen */}
      <div className="lg:col-span-7 flex justify-center">
        <div className="w-full max-w-md bg-neutral-900 rounded-3xl p-3 shadow-2xl border border-neutral-700/60 overflow-hidden">
          {/* Phone Speaker & Camera Notch */}
          <div className="flex justify-center items-center py-1">
            <div className="w-16 h-1.5 bg-neutral-700 rounded-full"></div>
          </div>

          {/* Inner Phone Screen */}
          <div className="bg-[#efeae2] dark:bg-[#0b141a] rounded-2xl overflow-hidden flex flex-col h-[650px] shadow-inner relative">
            {/* WhatsApp App Header */}
            <div className="bg-[#008069] dark:bg-[#202c33] text-white px-4 py-3 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src="/src/assets/images/wakili_avatar_1793786289249.jpg"
                    alt="Wakili AI"
                    className="w-10 h-10 rounded-full object-cover border border-white/20"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#008069] dark:border-[#202c33] rounded-full"></span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm leading-tight flex items-center gap-1.5">
                    Wakili AI · e-Bureaucrat
                    <span className="text-[10px] bg-emerald-800/80 text-emerald-200 px-1.5 py-0.2 rounded font-normal">
                      Verified Bot
                    </span>
                  </h3>
                  <p className="text-[11px] text-emerald-100/90 dark:text-neutral-400">
                    {isProcessing ? 'inarekodi sauti / typing...' : 'GovTech Assistant (Swahili/Sheng)'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-white/90">
                <button className="hover:text-white p-1" title="Voice call" aria-label="Voice call">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="hover:text-white p-1" title="Video call" aria-label="Video call">
                  <Video className="w-4 h-4" />
                </button>
                <button className="hover:text-white p-1" title="Menu" aria-label="Menu">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dialect selector bar */}
            <div className="bg-[#e9edef] dark:bg-[#111b21] px-3 py-1.5 border-b border-neutral-300 dark:border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                Dialect Preference:
              </span>
              <div className="flex items-center gap-1">
                {(['Sheng', 'Swahili', 'English'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDialect(d)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      selectedDialect === d
                        ? 'bg-[#008069] text-white shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Body */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#00000008_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff08_1px,transparent_1px)]"
              style={{ backgroundSize: '16px 16px' }}
            >
              {/* WhatsApp Encryption Note */}
              <div className="flex justify-center">
                <div className="bg-[#ffeecd] dark:bg-[#182229] text-[#54656f] dark:text-[#8696a0] text-[10.5px] px-3 py-1.5 rounded-lg max-w-xs text-center shadow-xs flex items-center gap-1.5 border border-amber-200/50 dark:border-neutral-800">
                  <Lock className="w-3 h-3 text-amber-700 dark:text-amber-500 shrink-0" />
                  <span>
                    Secured by Republic of Kenya Data Protection Act 2019. Passwords deleted immediately upon receipt delivery.
                  </span>
                </div>
              </div>

              {/* Messages list */}
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                const isAudioPlaying = activeAudioPlayingId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs shadow-xs relative ${
                        isUser
                          ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-neutral-900 dark:text-neutral-100 rounded-tr-none'
                          : 'bg-white dark:bg-[#202c33] text-neutral-900 dark:text-neutral-100 rounded-tl-none'
                      }`}
                    >
                      {/* Voice Note Player Header */}
                      {msg.isVoice ? (
                        <div className="space-y-1.5 pb-1">
                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={() => togglePlayAudio(msg.id, msg.text)}
                              aria-label={isAudioPlaying ? 'Pause audio' : 'Play audio'}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 shadow-sm ${
                                isUser
                                  ? 'bg-[#008069] text-white hover:bg-[#006a57]'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {isAudioPlaying ? (
                                <Pause className="w-3.5 h-3.5" />
                              ) : (
                                <Play className="w-3.5 h-3.5 ml-0.5" />
                              )}
                            </button>

                            {/* Voice Waveform Bars */}
                            <div className="flex-1 flex items-center gap-0.5 h-6">
                              {[40, 75, 55, 90, 60, 100, 45, 80, 65, 30, 85, 50, 95, 70, 40].map(
                                (h, i) => (
                                  <span
                                    key={i}
                                    style={{ height: `${h}%` }}
                                    className={`w-1 rounded-full transition-all ${
                                      isAudioPlaying
                                        ? 'bg-emerald-600 dark:bg-emerald-400 animate-pulse'
                                        : isUser
                                        ? 'bg-[#53bdeb] dark:bg-[#8696a0]'
                                        : 'bg-neutral-400 dark:bg-neutral-500'
                                    }`}
                                  ></span>
                                )
                              )}
                            </div>

                            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                              {msg.audioDuration || '0:07'}
                            </span>
                          </div>

                          {/* Spoken transcription preview */}
                          <div className="bg-black/5 dark:bg-white/5 rounded-md p-1.5 text-[11px] text-neutral-700 dark:text-neutral-300 italic border-l-2 border-emerald-600">
                            &ldquo;{msg.text}&rdquo;
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      )}

                      {/* Footer time & read receipts */}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                        <span>{msg.timestamp}</span>
                        {isUser && <CheckCheck className="w-3 h-3 text-[#53bdeb]" />}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Processing indicator */}
              {isProcessing && (
                <div className="flex items-start">
                  <div className="bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-none px-3.5 py-2 text-xs shadow-xs flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce"></span>
                    <span
                      className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></span>
                    <span
                      className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce"
                      style={{ animationDelay: '0.4s' }}
                    ></span>
                    <span className="text-[11px] ml-1">Wakili AI anasikiliza & kuchanganua...</span>
                  </div>
                </div>
              )}

              {/* Completed Receipt Card inside WhatsApp */}
              {latestReceipt && (
                <div className="flex flex-col items-start w-full">
                  <div className="bg-white dark:bg-[#202c33] border border-emerald-300 dark:border-emerald-800 rounded-xl p-3 shadow-sm max-w-[90%] space-y-2">
                    <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          KRA_Nil_Return_Receipt.pdf
                        </h4>
                        <p className="text-[10px] text-neutral-500">
                          Official KRA Acknowledgment · 142 KB
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-neutral-700 dark:text-neutral-300">
                      Receipt yako rasmi imetolewa. Nil Return ya <strong>{latestReceipt.pin}</strong> kwa mwaka {latestReceipt.returnPeriodTo.slice(-4)} imewasilishwa kikamilifu!
                    </p>

                    <button
                      onClick={onViewReceipt}
                      className="w-full py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Fungua / Pakua Receipt (PDF)
                    </button>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Recording Active Banner */}
            {isRecording && (
              <div className="bg-red-50 dark:bg-red-950/50 border-t border-red-200 dark:border-red-900 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></span>
                  <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                    Recording Audio Note: {recordingSeconds}s
                  </span>
                </div>
                <button
                  onClick={handleStopRecording}
                  className="px-2.5 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  Send Voice Note
                </button>
              </div>
            )}

            {/* WhatsApp Input Bar */}
            <div className="bg-[#f0f2f5] dark:bg-[#202c33] p-2.5 border-t border-neutral-300 dark:border-neutral-800 flex items-center gap-2">
              <input
                type="text"
                placeholder={isRecording ? 'Recording voice note...' : 'Type in Sheng, Swahili, or English...'}
                value={inputText}
                disabled={isRecording}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                className="flex-1 bg-white dark:bg-[#2a3942] text-xs text-neutral-900 dark:text-neutral-100 rounded-full px-3.5 py-2.5 outline-hidden border border-neutral-200 dark:border-neutral-700 focus:border-emerald-600"
              />

              {inputText.trim() ? (
                <button
                  onClick={handleSendText}
                  className="w-9 h-9 rounded-full bg-[#008069] text-white flex items-center justify-center hover:bg-[#006a57] transition-colors shrink-0 shadow-sm"
                  title="Send message"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (isRecording) {
                      handleStopRecording();
                    } else {
                      setIsRecording(true);
                    }
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 shadow-sm ${
                    isRecording
                      ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                      : 'bg-[#008069] text-white hover:bg-[#006a57]'
                  }`}
                  title={isRecording ? 'Stop recording voice note' : 'Record WhatsApp voice note'}
                  aria-label={isRecording ? 'Stop recording voice note' : 'Record WhatsApp voice note'}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Dialogue State Engine & RPA Dispatch HUD */}
      <div className="lg:col-span-5 space-y-6">
        {/* Slot Extraction Inspector */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Dialogue State & Extracted Slots
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Real-time extraction from Kenyan Swahili / Sheng voice transcripts
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-mono text-neutral-500 block">Status:</span>
              <span
                className={`text-xs font-semibold ${
                  isReadyToFile
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {isReadyToFile ? 'READY_TO_FILE' : 'COLLECTING_SLOTS'}
              </span>
            </div>
          </div>

          {/* Slots Table */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">1. KRA PIN</span>
              <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                {extractedSlots.kra_pin || (
                  <span className="text-amber-600 dark:text-amber-400 italic font-normal">
                    Pending voice input
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">2. iTax Password</span>
              <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                {extractedSlots.itax_password ? (
                  <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 inline" />
                    Encrypted (In Memory)
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 italic font-normal">
                    Pending voice input
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">3. Tax Obligation</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {extractedSlots.tax_obligation || 'Income Tax - Resident Individual'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">4. Filing Period Year</span>
              <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                {extractedSlots.year || '2025'}
              </span>
            </div>
          </div>

          {/* Quick preset filler for testing */}
          <div className="pt-1 flex items-center justify-between text-xs border-t border-neutral-100 dark:border-neutral-800">
            <span className="text-neutral-500">Need sample credentials?</span>
            <button
              onClick={() => {
                onSendMessage('KRA PIN yangu ni A019283746Z na password ni KenyaSecure2025!', false, 'Sheng');
              }}
              className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
            >
              Fill Sample PIN & Password
            </button>
          </div>
        </div>

        {/* RPA Worker Execution Trigger Card */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Automated Headless Browser Dispatch
            </h3>
            <span className="text-[11px] font-mono text-neutral-500">
              Playwright Worker
            </span>
          </div>

          <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
            When all fields are collected and citizen consent is recorded, the Playwright RPA worker opens the KRA iTax portal, solves the arithmetic captcha via OCR, submits the Nil declaration, and delivers the receipt.
          </p>

          <button
            onClick={onTriggerRPA}
            disabled={!isReadyToFile || rpaStatus === 'RUNNING'}
            className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
              isReadyToFile && rpaStatus !== 'RUNNING'
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
            }`}
          >
            {rpaStatus === 'RUNNING' ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                RPA Browser Executing KRA Portal...
              </>
            ) : isReadyToFile ? (
              <>
                <ShieldCheck className="w-4 h-4" />
                Dispatch Playwright Headless Browser Now
              </>
            ) : (
              'Awaiting KRA PIN & Password via Voice Note'
            )}
          </button>
        </div>

        {/* Legal & Compliance Safeguards info */}
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 bg-neutral-50 dark:bg-neutral-900/60 text-xs space-y-2">
          <div className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
            Kenya Data Protection Act (2019) Guardrails
          </div>
          <ul className="space-y-1 text-neutral-600 dark:text-neutral-400 list-disc list-inside">
            <li><strong>Explicit Audio Consent:</strong> Prompt plays before portal access.</li>
            <li><strong>Ephemeral Memory:</strong> Password purged upon receipt delivery.</li>
            <li><strong>Encrypted Transport:</strong> TLS 1.3 + AES-256 for all API payloads.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
