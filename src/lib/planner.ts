import { Lead } from "./types";

export type PlanPick = {
  id: string;
  company: string;
  contactName: string;
  title: string;
  score: number;
  reason: string;
};

export type EnrichPlan = {
  budget: number;
  recommended: PlanPick[];
  skippedLowScore: number;
  skippedBadEmail: number;
  skippedDuplicate: number;
  skippedAlreadyHandled: number;
  leftoverCredits: number;
};

function pickReason(lead: Lead): string {
  const bits: string[] = [];
  if (lead.score >= 85) bits.push("top-tier score");
  else if (lead.score >= 70) bits.push("high priority");
  if (lead.validation.includes("email_ok")) bits.push("clean email");
  if (
    /ceo|cto|cfo|founder|vp|director|head of/i.test(lead.title)
  ) {
    bits.push("decision-maker title");
  }
  if ((lead.revenueEstimate ?? 0) >= 5_000_000) bits.push("solid revenue band");
  return bits.slice(0, 3).join(" / ") || "best available under budget";
}

/**
 * Given N enrichment credits, pick the best unique leads to spend them on.
 * Skips duplicates, already enriched/queued/skipped, low scores, and bad emails.
 */
export function buildEnrichPlan(leads: Lead[], budget: number): EnrichPlan {
  const credits = Math.max(0, Math.min(50, Math.floor(budget)));

  let skippedDuplicate = 0;
  let skippedLowScore = 0;
  let skippedBadEmail = 0;
  let skippedAlreadyHandled = 0;

  const candidates: Lead[] = [];

  for (const lead of leads) {
    if (lead.status === "duplicate") {
      skippedDuplicate += 1;
      continue;
    }
    if (
      lead.status === "enriched" ||
      lead.status === "queued" ||
      lead.status === "skipped"
    ) {
      skippedAlreadyHandled += 1;
      continue;
    }
    if (lead.score < 70) {
      skippedLowScore += 1;
      continue;
    }
    if (
      lead.validation.includes("email_invalid") ||
      lead.validation.includes("disposable_domain")
    ) {
      skippedBadEmail += 1;
      continue;
    }
    candidates.push(lead);
  }

  candidates.sort((a, b) => b.score - a.score);

  const recommended = candidates.slice(0, credits).map((lead) => ({
    id: lead.id,
    company: lead.company,
    contactName: lead.contactName,
    title: lead.title,
    score: lead.score,
    reason: pickReason(lead),
  }));

  return {
    budget: credits,
    recommended,
    skippedLowScore,
    skippedBadEmail,
    skippedDuplicate,
    skippedAlreadyHandled,
    leftoverCredits: Math.max(0, credits - recommended.length),
  };
}
