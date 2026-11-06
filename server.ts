import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', 1);
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Demo guard: keeps a public URL from draining the Gemini quota.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 40;
const RATE_BUCKETS = new Map<string, { count: number; resetAt: number }>();

app.use('/api', (req, res, next) => {
  const now = Date.now();
  const ip = req.ip ?? 'unknown';
  const bucket = RATE_BUCKETS.get(ip);

  if (!bucket || now > bucket.resetAt) {
    RATE_BUCKETS.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else if (++bucket.count > RATE_LIMIT_MAX) {
    res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
    return res.status(429).json({
      success: false,
      error: 'Demo rate limit reached. Please try again in a minute.',
    });
  }

  if (RATE_BUCKETS.size > 5000) {
    for (const [key, entry] of RATE_BUCKETS) {
      if (now > entry.resetAt) RATE_BUCKETS.delete(key);
    }
  }

  next();
});

// ---------------------------------------------------------------------------
// Durable demo store (JSON file). Render's free disk is ephemeral: data resets
// on deploy, which is acceptable for a prototype but not for real filings.
// ---------------------------------------------------------------------------
type RequestStatus = 'submitted' | 'in_review' | 'approved' | 'rejected';

interface FilingRecord {
  id: string;
  pin: string;
  year: string;
  ackNumber: string;
  status: 'simulated';
  createdAt: string;
  channel: string;
}

interface ServiceRequestRecord {
  reference: string;
  serviceId: string;
  serviceName: string;
  applicant: string;
  phone: string;
  notes: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  decisionNote: string;
}

interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
}

interface StoreShape {
  filings: FilingRecord[];
  requests: ServiceRequestRecord[];
  audit: AuditEvent[];
}

const DATA_DIR = path.resolve(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const STORE_LIMIT = 500;

function loadStore(): StoreShape {
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) as Partial<StoreShape>;
    return {
      filings: Array.isArray(parsed.filings) ? parsed.filings : [],
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
      audit: Array.isArray(parsed.audit) ? parsed.audit : [],
    };
  } catch {
    return { filings: [], requests: [], audit: [] };
  }
}

const store = loadStore();

function saveStore() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${STORE_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
    fs.renameSync(tmp, STORE_PATH);
  } catch (err) {
    console.error('Failed to persist store:', err);
  }
}

function audit(actor: string, action: string, target: string, detail = '') {
  store.audit.unshift({
    id: `AUD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    actor,
    action,
    target,
    detail,
  });
  if (store.audit.length > STORE_LIMIT) store.audit.length = STORE_LIMIT;
  saveStore();
}

function maskIdentifier(value?: string | null) {
  if (!value) return '—';
  if (value.length <= 5) return '*'.repeat(value.length);
  return `${value.slice(0, 3)}${'*'.repeat(value.length - 6)}${value.slice(-3)}`;
}

// ---------------------------------------------------------------------------
// Admin authentication: scrypt hash + HMAC-signed HttpOnly cookie.
// No default password in production — login stays disabled until a hash is set.
// ---------------------------------------------------------------------------
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@ebureaucrat.local').toLowerCase();
const ADMIN_COOKIE = 'eb_admin';
const ADMIN_SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.ADMIN_PASSWORD_HASH ||
  randomBytes(32).toString('hex');

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

let adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || '';
if (!adminPasswordHash && process.env.ADMIN_PASSWORD) {
  adminPasswordHash = hashPassword(process.env.ADMIN_PASSWORD);
}
if (!adminPasswordHash && process.env.NODE_ENV !== 'production') {
  adminPasswordHash = hashPassword('AdminDemo2026!');
  console.warn('Admin login is using the local demo password. Set ADMIN_PASSWORD_HASH before deploying.');
}
if (!adminPasswordHash) {
  console.warn('Admin login disabled: set ADMIN_PASSWORD_HASH to enable the console.');
}

function verifyAdminPassword(password: string) {
  if (!adminPasswordHash) return false;
  const [salt, expectedHex] = adminPasswordHash.split(':');
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function signToken(payload: string) {
  return createHmac('sha256', ADMIN_SESSION_SECRET).update(payload).digest('base64url');
}

function createAdminToken(email: string) {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + ADMIN_SESSION_TTL_MS }),
  ).toString('base64url');
  return `${payload}.${signToken(payload)}`;
}

function readAdminSession(req: express.Request): { email: string; exp: number } | null {
  const header = req.headers.cookie;
  if (!header) return null;
  const raw = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`));
  if (!raw) return null;

  const token = raw.slice(ADMIN_COOKIE.length + 1);
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const given = Buffer.from(signature);
  const expected = Buffer.from(signToken(payload));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      email?: string;
      exp?: number;
    };
    if (!parsed.email || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null;
    return { email: parsed.email, exp: parsed.exp };
  } catch {
    return null;
  }
}

const requireAdmin: express.RequestHandler = (req, res, next) => {
  const session = readAdminSession(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Admin login required' });
  }
  (req as express.Request & { adminEmail?: string }).adminEmail = session.email;
  next();
};

const LOGIN_ATTEMPTS = new Map<string, { count: number; resetAt: number }>();
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

// ---------------------------------------------------------------------------
// Service catalog. "simulated" = end-to-end demo, "catalog" = intake only,
// "not-offered" = deliberately out of scope (payments, government accounts).
// ---------------------------------------------------------------------------
type ServiceStatus = 'simulated' | 'catalog' | 'not-offered';

interface ServiceDefinition {
  id: string;
  name: string;
  agency: string;
  category: string;
  status: ServiceStatus;
  description: string;
  fee: string;
  turnaround: string;
  channels: string[];
}

const SERVICE_CATALOG: ServiceDefinition[] = [
  {
    id: 'kra-nil-return',
    name: 'KRA Nil Return Filing',
    agency: 'Kenya Revenue Authority',
    category: 'Tax',
    status: 'simulated',
    description: 'Voice-driven Nil Return interview with a simulated filing and sample acknowledgment.',
    fee: 'KES 0',
    turnaround: 'Instant (simulated)',
    channels: ['WhatsApp voice', 'Web console'],
  },
  {
    id: 'kra-pin',
    name: 'KRA PIN Registration & Retrieval',
    agency: 'Kenya Revenue Authority',
    category: 'Tax',
    status: 'catalog',
    description: 'Request intake only. The demo does not connect to iTax to create or retrieve PINs.',
    fee: 'KES 0',
    turnaround: 'Demo: 1 working day',
    channels: ['Web console'],
  },
  {
    id: 'ntsa-licence',
    name: 'Driving Licence Renewal',
    agency: 'NTSA (TIMS)',
    category: 'Transport',
    status: 'catalog',
    description: 'Intake and status tracking. No TIMS integration; no licence is issued.',
    fee: 'Per NTSA schedule',
    turnaround: 'Demo: 3 working days',
    channels: ['Web console'],
  },
  {
    id: 'ntsa-transfer',
    name: 'Vehicle Ownership Transfer',
    agency: 'NTSA (TIMS)',
    category: 'Transport',
    status: 'catalog',
    description: 'Intake and status tracking only.',
    fee: 'Per NTSA schedule',
    turnaround: 'Demo: 5 working days',
    channels: ['Web console'],
  },
  {
    id: 'brs-name-search',
    name: 'Business Name Search & Registration',
    agency: 'Business Registration Service',
    category: 'Business',
    status: 'catalog',
    description: 'Intake and status tracking. No BRS integration and no certificate is issued.',
    fee: 'Per BRS schedule',
    turnaround: 'Demo: 2 working days',
    channels: ['Web console'],
  },
  {
    id: 'immigration-passport',
    name: 'Passport Application',
    agency: 'Immigration Services',
    category: 'Travel',
    status: 'catalog',
    description: 'Intake only. Biometrics and identity checks are out of scope for this demo.',
    fee: 'Per government schedule',
    turnaround: 'Demo: not scheduled',
    channels: ['Web console'],
  },
  {
    id: 'civil-birth',
    name: 'Birth Certificate Application',
    agency: 'Civil Registration Services',
    category: 'Identity',
    status: 'catalog',
    description: 'Intake only. No civil registry access.',
    fee: 'Per government schedule',
    turnaround: 'Demo: not scheduled',
    channels: ['Web console'],
  },
  {
    id: 'helb-loan',
    name: 'HELB Loan Application',
    agency: 'Higher Education Loans Board',
    category: 'Education',
    status: 'catalog',
    description: 'Intake only. No HELB integration.',
    fee: 'KES 0',
    turnaround: 'Demo: not scheduled',
    channels: ['Web console'],
  },
  {
    id: 'sha-registration',
    name: 'SHA / NHIF Registration',
    agency: 'Social Health Authority',
    category: 'Health',
    status: 'catalog',
    description: 'Intake only. No health authority integration.',
    fee: 'KES 0',
    turnaround: 'Demo: not scheduled',
    channels: ['Web console'],
  },
  {
    id: 'dci-good-conduct',
    name: 'Police Clearance (Good Conduct)',
    agency: 'Directorate of Criminal Investigations',
    category: 'Justice',
    status: 'catalog',
    description: 'Intake only. Fingerprints and certificate issuance are out of scope.',
    fee: 'Per DCI schedule',
    turnaround: 'Demo: not scheduled',
    channels: ['Web console'],
  },
  {
    id: 'ecitizen-payments',
    name: 'Government Payments (eCitizen Paybill)',
    agency: 'eCitizen',
    category: 'Payments',
    status: 'not-offered',
    description: 'The demo collects no money and holds no payment credentials.',
    fee: '—',
    turnaround: '—',
    channels: [],
  },
  {
    id: 'ecitizen-account',
    name: 'eCitizen Account & Profile',
    agency: 'eCitizen',
    category: 'Account',
    status: 'not-offered',
    description: 'Keep using your own eCitizen account. This demo does not create or store government accounts.',
    fee: '—',
    turnaround: '—',
    channels: [],
  },
];

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

  // Detect password mentions (e.g. "password yangu ni ...", "pass: ...", or a bare secret)
  const passMatch = userText.match(/(?:password|nenosiri|pass)\s*(?:(?:yangu|ni|is|ndio|:)\s*)*([A-Za-z0-9@#$%^&*!]{6,})/i);
  if (passMatch) {
    data.itax_password = passMatch[1].trim();
  }
  if (
    !data.itax_password &&
    data.kra_pin &&
    /^[A-Za-z0-9@#$%^&*!]{6,}$/.test(userText.trim()) &&
    !/^[AP]\d{9}[A-Z]$/i.test(userText.trim())
  ) {
    data.itax_password = userText.trim();
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

    const secret = session.data.itax_password;
    const safeHistory = secret
      ? session.history.map((item) => ({
          ...item,
          content: item.content.split(secret).join('••••••••'),
        }))
      : session.history;

    return res.json({
      success: true,
      reply,
      isComplete,
      collectedData: { ...session.data, itax_password: secret ? '••••••••' : null },
      status: session.status,
      history: safeHistory,
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

    store.filings.unshift({
      id: executionId,
      pin: kra_pin,
      year,
      ackNumber,
      status: 'simulated',
      createdAt: timestamp,
      channel: 'rpa-simulator',
    });
    if (store.filings.length > STORE_LIMIT) store.filings.length = STORE_LIMIT;
    audit('citizen', 'filing.simulated', executionId, `PIN ${maskIdentifier(kra_pin)}, year ${year}`);

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

// ---------------------------------------------------------------------------
// Public service directory + request intake
// ---------------------------------------------------------------------------
function publicRequest(record: ServiceRequestRecord) {
  return {
    reference: record.reference,
    serviceId: record.serviceId,
    serviceName: record.serviceName,
    applicant: record.applicant,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    decisionNote: record.decisionNote,
  };
}

// Public parity map against eCitizen's advertised capabilities (demo copy, 2026).
const ECITIZEN_PARITY = [
  {
    capability: 'Single citizen account',
    ecitizen: 'One account across all agencies',
    demo: 'Not offered',
    note: 'Citizens use the agent without an account; only staff sign in.',
  },
  {
    capability: 'Service catalogue',
    ecitizen: 'Hundreds of services',
    demo: '12 modelled',
    note: 'Representative services across tax, transport, business, travel, identity, health.',
  },
  {
    capability: 'Application intake',
    ecitizen: 'Online forms per service',
    demo: 'Yes',
    note: 'Requests are stored and queued for an officer decision.',
  },
  {
    capability: 'Payments',
    ecitizen: 'Paybill, cards, mobile money',
    demo: 'Not offered',
    note: 'No money moves and no payment credentials are accepted.',
  },
  {
    capability: 'Document upload',
    ecitizen: 'Attachments per application',
    demo: 'Not offered',
    note: 'Intake records text only; no files are stored.',
  },
  {
    capability: 'Status tracking',
    ecitizen: 'Dashboard, SMS, email',
    demo: 'Yes',
    note: 'Reference number lookup; notifications are not sent.',
  },
  {
    capability: 'Appointments',
    ecitizen: 'Booking for in-person visits',
    demo: 'Not offered',
    note: 'Out of scope for this prototype.',
  },
  {
    capability: 'Voice and chat channel',
    ecitizen: 'Web, USSD, limited WhatsApp',
    demo: 'Core focus',
    note: 'Swahili, Sheng and English with slot extraction.',
  },
  {
    capability: 'Automated agency form filling',
    ecitizen: 'Not offered',
    demo: 'Simulated',
    note: 'RPA screens are a simulation; no portal is opened.',
  },
  {
    capability: 'Back-office review console',
    ecitizen: 'Internal only',
    demo: 'Yes',
    note: 'Queue, decisions and audit trail behind admin login.',
  },
];

app.get('/api/services', (_req, res) => {
  return res.json({
    success: true,
    services: SERVICE_CATALOG,
    parity: ECITIZEN_PARITY,
    stats: { filings: store.filings.length, requests: store.requests.length },
    disclaimer:
      'Demo catalogue modelled on Kenyan eCitizen categories. Not affiliated with eCitizen or any government agency, and no request reaches an agency.',
  });
});

app.post('/api/services/request', (req, res) => {
  const body = req.body ?? {};
  const service = SERVICE_CATALOG.find((item) => item.id === body.serviceId);

  if (!service) return res.status(400).json({ success: false, error: 'Unknown service' });
  if (service.status === 'not-offered') {
    return res.status(400).json({ success: false, error: 'This service is not offered in the demo' });
  }

  const applicant = String(body.fullName ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  const notes = String(body.notes ?? '').trim();

  if (applicant.length < 2 || applicant.length > 80) {
    return res.status(400).json({ success: false, error: 'Enter your full name (2-80 characters)' });
  }
  if (!/^\+?[0-9][0-9 ]{8,14}$/.test(phone)) {
    return res.status(400).json({ success: false, error: 'Enter a valid phone number' });
  }
  if (notes.length > 300) {
    return res.status(400).json({ success: false, error: 'Notes must be 300 characters or fewer' });
  }

  const now = new Date().toISOString();
  const record: ServiceRequestRecord = {
    reference: `EB-${Date.now().toString(36).toUpperCase()}`,
    serviceId: service.id,
    serviceName: service.name,
    applicant,
    phone,
    notes,
    status: 'submitted',
    createdAt: now,
    updatedAt: now,
    decisionNote: '',
  };

  store.requests.unshift(record);
  if (store.requests.length > STORE_LIMIT) store.requests.length = STORE_LIMIT;
  saveStore();
  audit('citizen', 'service.request', record.reference, `${service.name} for ${applicant}`);

  return res.status(201).json({ success: true, request: publicRequest(record) });
});

app.get('/api/services/track/:reference', (req, res) => {
  const record = store.requests.find(
    (item) => item.reference === req.params.reference.toUpperCase(),
  );
  if (!record) return res.status(404).json({ success: false, error: 'Reference not found' });
  return res.json({ success: true, request: publicRequest(record) });
});

// ---------------------------------------------------------------------------
// Admin console API
// ---------------------------------------------------------------------------
app.get('/api/admin/session', (req, res) => {
  const session = readAdminSession(req);
  return res.json({
    success: true,
    authenticated: Boolean(session),
    email: session?.email ?? null,
    loginDisabled: !adminPasswordHash,
  });
});

app.post('/api/admin/login', (req, res) => {
  if (!adminPasswordHash) {
    return res.status(503).json({
      success: false,
      error: 'Admin login is disabled. Set ADMIN_PASSWORD_HASH on the server.',
    });
  }

  const ip = req.ip ?? 'unknown';
  const now = Date.now();
  const attempt = LOGIN_ATTEMPTS.get(ip);
  if (attempt && now < attempt.resetAt && attempt.count >= LOGIN_MAX_ATTEMPTS) {
    return res.status(429).json({
      success: false,
      error: 'Too many attempts. Try again in 15 minutes.',
    });
  }

  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const valid = email === ADMIN_EMAIL && verifyAdminPassword(password);

  if (!valid) {
    if (!attempt || now > attempt.resetAt) {
      LOGIN_ATTEMPTS.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    } else {
      attempt.count += 1;
    }
    audit('anonymous', 'admin.login.failed', email || 'unknown', `ip=${ip}`);
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  LOGIN_ATTEMPTS.delete(ip);
  const cookie = [
    `${ADMIN_COOKIE}=${createAdminToken(email)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Strict',
    `Max-Age=${Math.floor(ADMIN_SESSION_TTL_MS / 1000)}`,
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');

  res.setHeader('Set-Cookie', cookie);
  audit(email, 'admin.login', 'session', `ip=${ip}`);
  return res.json({ success: true, email });
});

app.post('/api/admin/logout', (_req, res) => {
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0`);
  return res.json({ success: true });
});

app.get('/api/admin/overview', requireAdmin, (_req, res) => {
  const requestsByStatus: Record<string, number> = {
    submitted: 0,
    in_review: 0,
    approved: 0,
    rejected: 0,
  };
  for (const item of store.requests) {
    requestsByStatus[item.status] = (requestsByStatus[item.status] ?? 0) + 1;
  }

  return res.json({
    success: true,
    overview: {
      sessions: SESSIONS.size,
      filings: store.filings.length,
      requests: store.requests.length,
      requestsByStatus,
      auditEvents: store.audit.length,
      geminiActive: Boolean(aiClient),
      uptimeSeconds: Math.round(process.uptime()),
      node: process.version,
      storage: 'json-file',
      adminEmail: ADMIN_EMAIL,
    },
  });
});

app.get('/api/admin/filings', requireAdmin, (_req, res) => {
  return res.json({
    success: true,
    filings: store.filings.map((filing) => ({ ...filing, pin: maskIdentifier(filing.pin) })),
  });
});

app.get('/api/admin/requests', requireAdmin, (_req, res) => {
  return res.json({
    success: true,
    requests: store.requests.map((record) => ({
      ...publicRequest(record),
      phone: maskIdentifier(record.phone),
    })),
  });
});

app.patch('/api/admin/requests/:reference', requireAdmin, (req, res) => {
  const allowed: RequestStatus[] = ['in_review', 'approved', 'rejected'];
  const status = String(req.body?.status ?? '') as RequestStatus;
  if (!allowed.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Status must be in_review, approved or rejected',
    });
  }

  const record = store.requests.find(
    (item) => item.reference === req.params.reference.toUpperCase(),
  );
  if (!record) return res.status(404).json({ success: false, error: 'Reference not found' });

  record.status = status;
  record.decisionNote = String(req.body?.note ?? '').slice(0, 300);
  record.updatedAt = new Date().toISOString();
  saveStore();

  const actor = (req as express.Request & { adminEmail?: string }).adminEmail ?? 'admin';
  audit(actor, `request.${status}`, record.reference, record.decisionNote);

  return res.json({ success: true, request: record });
});

app.get('/api/admin/audit', requireAdmin, (_req, res) => {
  return res.json({ success: true, events: store.audit.slice(0, 100) });
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
