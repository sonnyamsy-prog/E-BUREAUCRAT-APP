export interface ExtractedSlots {
  kra_pin?: string | null;
  itax_password?: string | null;
  tax_obligation?: string | null;
  year?: string | null;
  national_id?: string | null;
  full_name?: string | null;
  otp_code?: string | null;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'wakili' | 'system';
  text: string;
  timestamp: string;
  isVoice?: boolean;
  audioDuration?: string;
  dialect?: 'Swahili' | 'Sheng' | 'English';
  audioBlobUrl?: string;
}

export interface RPAStep {
  id: string;
  name: string;
  action: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';
  durationMs: number;
  log?: string;
}

export interface KRAReceipt {
  ackNumber: string;
  pin: string;
  taxpayerName: string;
  taxObligation: string;
  returnPeriodFrom: string;
  returnPeriodTo: string;
  submissionDate: string;
  modeOfFiling: string;
  totalTaxDue: string;
  status: string;
  qrVerificationUrl: string;
}
