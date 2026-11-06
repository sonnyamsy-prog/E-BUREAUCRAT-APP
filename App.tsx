import React, { useState, useEffect } from 'react';
import { TopNavigation } from './components/TopNavigation';
import { HeroSection } from './components/HeroSection';
import { WhatsAppVoiceSimulator } from './components/WhatsAppVoiceSimulator';
import { RPABrowserVisualizer } from './components/RPABrowserVisualizer';
import { OfficialKRAReceipt } from './components/OfficialKRAReceipt';
import { WebhookConsole } from './components/WebhookConsole';
import { CodebaseViewer } from './components/CodebaseViewer';
import { ServiceCatalog } from './components/ServiceCatalog';
import { AdminConsole } from './components/AdminConsole';
import { ChatMessage, ExtractedSlots, RPAStep, KRAReceipt } from './types';

const INITIAL_STEPS: RPAStep[] = [
  {
    id: 'INIT_BROWSER',
    name: '1. Launch Headless Chromium',
    action: 'Initializing Playwright context with accept_downloads=true',
    status: 'PENDING',
    durationMs: 380,
  },
  {
    id: 'NAVIGATE_PORTAL',
    name: '2. Access KRA iTax Gateway',
    action: 'Navigating to https://itax.kra.go.ke/KRA-Portal/',
    status: 'PENDING',
    durationMs: 640,
  },
  {
    id: 'INPUT_PIN',
    name: '3. Input Taxpayer PIN',
    action: 'Typing KRA PIN into #logEid and clicking #btnLogEid',
    status: 'PENDING',
    durationMs: 310,
  },
  {
    id: 'INPUT_PASSWORD',
    name: '4. Inject Encrypted Password',
    action: 'Awaiting #password selector and entering token securely',
    status: 'PENDING',
    durationMs: 290,
  },
  {
    id: 'SOLVE_CAPTCHA',
    name: '5. Arithmetic Captcha OCR Solver',
    action: 'Screenshot #captCode: "48 + 12" -> OCR computed 60 into #captBsc',
    status: 'PENDING',
    durationMs: 540,
  },
  {
    id: 'VERIFY_DASHBOARD',
    name: '6. Authenticate & Session Check',
    action: 'Awaiting navigation to **/home.htm -> Session validated',
    status: 'PENDING',
    durationMs: 790,
  },
  {
    id: 'NAVIGATE_NIL_RETURN',
    name: '7. Select File Nil Return',
    action: 'Hovering a:has-text("Returns") -> Clicking "File Nil Return"',
    status: 'PENDING',
    durationMs: 420,
  },
  {
    id: 'SELECT_OBLIGATION',
    name: '8. Choose Tax Obligation',
    action: 'Selecting "Income Tax - Resident Individual" from #taxObligation',
    status: 'PENDING',
    durationMs: 360,
  },
  {
    id: 'SUBMIT_CONFIRMATION',
    name: '9. Submit Nil Declaration',
    action: 'Clicking #btnSubmitReturn and accepting legal verification alert',
    status: 'PENDING',
    durationMs: 610,
  },
  {
    id: 'GENERATE_RECEIPT',
    name: '10. Capture Download Receipt',
    action: 'Playwright expect_download() captured official PDF acknowledgment',
    status: 'PENDING',
    durationMs: 490,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('simulator');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Initial WhatsApp conversation
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'wakili',
      text: 'Sasa! Mimi ni Wakili AI, msaidizi wako wa kidijitali wa serikali. Ninaweza kukusaidia ku-file Nil Return yako ya KRA bila kwenda Cyber Cafe.\n\nTafadhali niambie KRA PIN yako (kwa mfano: A012345678Z) au bonyeza mic kutuma voice note kwa Sheng au Kiswahili!',
      timestamp: '09:41 AM',
      isVoice: false,
    },
  ]);

  const [extractedSlots, setExtractedSlots] = useState<ExtractedSlots>({
    tax_obligation: 'Income Tax - Resident Individual',
    year: '2025',
  });

  const [rpaSteps, setRpaSteps] = useState<RPAStep[]>(INITIAL_STEPS);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isRunningRPA, setIsRunningRPA] = useState<boolean>(false);
  const [latestReceipt, setLatestReceipt] = useState<KRAReceipt | null>(null);

  // Handle incoming message from citizen (Voice or text)
  const handleSendMessage = async (
    text: string,
    isVoice = false,
    dialect: 'Swahili' | 'Sheng' | 'English' = 'Sheng'
  ) => {
    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isVoice,
      dialect,
      audioDuration: isVoice ? '0:06' : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: '+254712345678',
          message: text,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.collectedData) {
          setExtractedSlots((prev) => ({
            ...prev,
            ...data.collectedData,
          }));
        }

        const replyMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'wakili',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isVoice: isVoice, // Reply in voice if user sent voice
          audioDuration: isVoice ? '0:09' : undefined,
        };

        setMessages((prev) => [...prev, replyMsg]);
      }
    } catch (err) {
      console.error('Failed to query /api/dialogue:', err);
      // Fallback response
      const fallbackMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'wakili',
        text: 'Nimepokea ujumbe wako. Tafadhali thibitisha KRA PIN yako na nenosiri ili niwasilishe return.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isVoice,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Run RPA Headless Browser step-by-step
  const handleRunAutomation = async () => {
    setIsRunningRPA(true);
    setActiveTab('rpa');

    const pinToUse = extractedSlots.kra_pin || 'A019876543K';
    const yearToUse = extractedSlots.year || '2025';

    // Step-by-step visual animation for user
    for (let i = 0; i < INITIAL_STEPS.length; i++) {
      setCurrentStepIndex(i);
      setRpaSteps((prev) =>
        prev.map((step, idx) => {
          if (idx < i) return { ...step, status: 'SUCCESS' };
          if (idx === i) return { ...step, status: 'RUNNING' };
          return { ...step, status: 'PENDING' };
        })
      );
      // Wait for realistic step simulation
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    try {
      const res = await fetch('/api/rpa/execute-kra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kra_pin: pinToUse,
          year: yearToUse,
        }),
      });
      const data = await res.json();

      if (data.success && data.receipt) {
        setLatestReceipt(data.receipt);
        setRpaSteps((prev) => prev.map((s) => ({ ...s, status: 'SUCCESS' })));

        // Send confirmation WhatsApp message with receipt
        const confirmMsg: ChatMessage = {
          id: `bot-receipt-${Date.now()}`,
          sender: 'wakili',
          text: `Hongera sana! Nil Return yako ya KRA (PIN: ${pinToUse}) kwa mwaka ${yearToUse} imewasilishwa rasmi. Receipt yako: ${data.receipt.ackNumber}. Nimeiambatanisha hapa chini.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isVoice: false,
        };
        setMessages((prev) => [...prev, confirmMsg]);
      }
    } catch (e) {
      console.error('RPA Execution failed:', e);
    } finally {
      setIsRunningRPA(false);
    }
  };

  // Handle Preset Scenarios
  const handleSelectScenario = (scenario: 'sheng_kra' | 'swahili_kra' | 'english_ecitizen') => {
    if (scenario === 'sheng_kra') {
      handleSendMessage(
        'Niaje Wakili, nataka ku-file nil return yangu ya KRA ya mwaka jana lakini sijui procedure. Nisaidie.',
        true,
        'Sheng'
      );
    } else if (scenario === 'swahili_kra') {
      handleSendMessage(
        'Habari ya asubuhi, ninaomba msaada wa kuwasilisha Nil Return yangu ya KRA. KRA PIN yangu ni A018294710Z.',
        true,
        'Swahili'
      );
    } else {
      handleSendMessage(
        'Hello Wakili, I need assistance filing my 2025 KRA individual nil return.',
        true,
        'English'
      );
    }
  };

  const handleResetSession = async () => {
    try {
      await fetch('/api/session/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: '+254712345678' }),
      });
    } catch (e) {
      console.warn(e);
    }

    setMessages([
      {
        id: 'msg-welcome-reset',
        sender: 'wakili',
        text: 'Sasa tena! Mazungumzo mapya yameanza. Tafadhali niambie KRA PIN yako au bonyeza kinasa sauti kutuma voice note.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isVoice: false,
      },
    ]);
    setExtractedSlots({
      tax_obligation: 'Income Tax - Resident Individual',
      year: '2025',
    });
    setCurrentStepIndex(0);
    setRpaSteps(INITIAL_STEPS);
    setLatestReceipt(null);
  };

  const handleSimulateWebhook = async (payload: any) => {
    const res = await fetch('/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors">
      {/* 3-Zone Top Navigation Contract */}
      <TopNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onLaunchFiling={handleRunAutomation}
      />

      {/* Hero Showcase with documentary photo & scenario triggers */}
      <HeroSection
        onSelectScenario={handleSelectScenario}
        onResetSession={handleResetSession}
        onViewRPA={() => setActiveTab('rpa')}
      />

      {/* Main Workbench Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Workspace Mode Sub-Tabs */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'simulator'
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              1. WhatsApp Voice Agent
            </button>
            <button
              onClick={() => setActiveTab('rpa')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'rpa'
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              2. Playwright RPA Browser
            </button>
            <button
              onClick={() => setActiveTab('receipt')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'receipt'
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              3. KRA e-Return Receipt
            </button>
            <button
              onClick={() => setActiveTab('webhook')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'webhook'
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              4. Webhook & API Gateway
            </button>
            <button
              onClick={() => setActiveTab('source')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'source'
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              5. Python Source Blueprint
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'services'
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              6. eCitizen Services
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'admin'
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              7. Admin Console
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs text-neutral-500 font-mono">
            <span>Server: Express + Vite</span>
            <span aria-hidden="true">·</span>
            <span>Port: 3000</span>
          </div>
        </div>

        {/* Tab Content Rendering */}
        {activeTab === 'simulator' && (
          <WhatsAppVoiceSimulator
            messages={messages}
            onSendMessage={handleSendMessage}
            extractedSlots={extractedSlots}
            isProcessing={isProcessing}
            onConsentGrant={() => {
              handleSendMessage('Ndio nimekubali unifailie Nil Return yangu ya KRA sasa hivi.', false, 'Sheng');
            }}
            onTriggerRPA={handleRunAutomation}
            rpaStatus={isRunningRPA ? 'RUNNING' : 'IDLE'}
            latestReceipt={latestReceipt}
            onViewReceipt={() => setActiveTab('receipt')}
          />
        )}

        {activeTab === 'rpa' && (
          <RPABrowserVisualizer
            steps={rpaSteps}
            currentStepIndex={currentStepIndex}
            isRunning={isRunningRPA}
            onRunAutomation={handleRunAutomation}
            onReset={() => {
              setCurrentStepIndex(0);
              setRpaSteps(INITIAL_STEPS);
            }}
            receipt={latestReceipt}
            kraPin={extractedSlots.kra_pin || 'A019876543K'}
            year={extractedSlots.year || '2025'}
            onViewReceipt={() => setActiveTab('receipt')}
          />
        )}

        {activeTab === 'receipt' && (
          <OfficialKRAReceipt
            receipt={latestReceipt}
            onSendToWhatsApp={() => setActiveTab('simulator')}
          />
        )}

        {activeTab === 'webhook' && (
          <WebhookConsole onSimulateWebhook={handleSimulateWebhook} />
        )}

        {activeTab === 'source' && <CodebaseViewer />}

        {activeTab === 'services' && <ServiceCatalog />}

        {activeTab === 'admin' && <AdminConsole />}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-6 px-6 text-xs text-neutral-500 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            e-Bureaucrat · Autonomous Voice-Native Public Filing Agent · Republic of Kenya
          </p>
          <div className="flex items-center gap-4">
            <span>FastAPI</span>
            <span aria-hidden="true">·</span>
            <span>Playwright RPA</span>
            <span aria-hidden="true">·</span>
            <span>Whisper STT</span>
            <span aria-hidden="true">·</span>
            <span>Kenya DPA 2019</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
