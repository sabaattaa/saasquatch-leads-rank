import { Lead, ScoreBreakdown, ValidationFlag } from "./types";

const SENIOR_TITLES = [
  "ceo",
  "cto",
  "cfo",
  "coo",
  "founder",
  "co-founder",
  "owner",
  "president",
  "vp",
  "vice president",
  "head of",
  "director",
  "partner",
  "managing",
];

const MID_TITLES = ["manager", "lead", "principal", "senior"];

// rough ICP for a typical B2B SaaS seller going after mid-market software cos
const TARGET_INDUSTRIES = [
  "software",
  "saas",
  "fintech",
  "healthcare",
  "marketing",
  "cybersecurity",
  "hr tech",
];

function titleScore(title: string): number {
  const t = title.toLowerCase();
  if (SENIOR_TITLES.some((s) => t.includes(s))) return 30;
  if (MID_TITLES.some((s) => t.includes(s))) return 18;
  return 8;
}

function companyFitScore(industry: string, employees: number | null): number {
  const ind = industry.toLowerCase();
  let score = TARGET_INDUSTRIES.some((i) => ind.includes(i)) ? 18 : 6;

  if (employees != null) {
    if (employees >= 20 && employees <= 500) score += 12;
    else if (employees > 500 && employees <= 2000) score += 8;
    else if (employees < 20) score += 4;
    else score += 2;
  }
  return Math.min(score, 30);
}

function completenessScore(lead: Pick<Lead, "email" | "phone" | "linkedin" | "domain" | "revenueEstimate">): number {
  let pts = 0;
  if (lead.email) pts += 6;
  if (lead.phone) pts += 4;
  if (lead.linkedin) pts += 4;
  if (lead.domain) pts += 3;
  if (lead.revenueEstimate != null) pts += 3;
  return pts; // max 20
}

function revenueScore(rev: number | null): number {
  if (rev == null) return 4;
  if (rev >= 5_000_000 && rev <= 50_000_000) return 15;
  if (rev >= 1_000_000 && rev < 5_000_000) return 11;
  if (rev > 50_000_000) return 8;
  return 5;
}

function validationPenalty(flags: ValidationFlag[]): number {
  let pen = 0;
  if (flags.includes("email_invalid")) pen += 12;
  if (flags.includes("disposable_domain")) pen += 15;
  if (flags.includes("domain_mismatch")) pen += 8;
  if (flags.includes("email_missing")) pen += 4;
  if (flags.includes("incomplete_profile")) pen += 3;
  return Math.min(pen, 25);
}

export function scoreLead(
  lead: Omit<Lead, "score" | "scoreBreakdown"> & {
    score?: number;
    scoreBreakdown?: ScoreBreakdown;
  }
): { score: number; scoreBreakdown: ScoreBreakdown } {
  const titleSeniority = titleScore(lead.title);
  const companyFit = companyFitScore(lead.industry, lead.employeeCount);
  const dataCompleteness = completenessScore(lead);
  const revenueSignal = revenueScore(lead.revenueEstimate);
  const penalty = validationPenalty(lead.validation);

  const raw =
    titleSeniority + companyFit + dataCompleteness + revenueSignal - penalty;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    score,
    scoreBreakdown: {
      titleSeniority,
      companyFit,
      dataCompleteness,
      revenueSignal,
      validationPenalty: penalty,
    },
  };
}

export function enrichPriorityLabel(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}
