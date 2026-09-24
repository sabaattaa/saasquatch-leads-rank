export type LeadStatus =
  | "new"
  | "queued"
  | "enriched"
  | "skipped"
  | "duplicate";

export type ValidationFlag =
  | "email_ok"
  | "email_invalid"
  | "email_missing"
  | "disposable_domain"
  | "domain_mismatch"
  | "incomplete_profile";

export interface Lead {
  id: string;
  company: string;
  domain: string;
  contactName: string;
  title: string;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  industry: string;
  employeeCount: number | null;
  revenueEstimate: number | null;
  location: string;
  source: string;
  scrapedAt: string;
  status: LeadStatus;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  validation: ValidationFlag[];
  duplicateOf: string | null;
  notes: string;
}

export interface ScoreBreakdown {
  titleSeniority: number;
  companyFit: number;
  dataCompleteness: number;
  revenueSignal: number;
  validationPenalty: number;
}

export interface LeadStats {
  total: number;
  unique: number;
  duplicates: number;
  avgScore: number;
  readyToEnrich: number;
  enriched: number;
  creditsSavedEstimate: number;
}

export interface LeadFilters {
  q?: string;
  minScore?: number;
  industry?: string;
  status?: LeadStatus | "all";
  hideDuplicates?: boolean;
}
