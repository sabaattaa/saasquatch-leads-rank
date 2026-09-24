import { Lead } from "./types";
import { normalizeDomain } from "./validate";

function keyEmail(email: string | null): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

function keyCompanyContact(company: string, name: string): string {
  return `${company.trim().toLowerCase()}|${name.trim().toLowerCase()}`;
}

/**
 * Marks later duplicates against the first (highest-score) occurrence.
 * Returns a new array — doesn't mutate the input.
 */
export function dedupeLeads(leads: Lead[]): Lead[] {
  const byScore = [...leads].sort((a, b) => b.score - a.score);

  const seenEmail = new Map<string, string>();
  const seenDomain = new Map<string, string>();
  const seenPair = new Map<string, string>();

  const dupMap = new Map<string, string>(); // id -> canonical id

  for (const lead of byScore) {
    if (lead.status === "duplicate" && lead.duplicateOf) continue;

    const email = keyEmail(lead.email);
    const domain = normalizeDomain(lead.domain);
    const pair = keyCompanyContact(lead.company, lead.contactName);

    let canonical: string | undefined;

    if (email && seenEmail.has(email)) canonical = seenEmail.get(email);
    else if (pair && seenPair.has(pair)) canonical = seenPair.get(pair);
    else if (domain && seenDomain.has(domain) && email) {
      // same company domain + we already have someone — only mark if emails match-ish
      // keep domain map for first contact; second contact at same domain is often legit
    }

    if (canonical && canonical !== lead.id) {
      dupMap.set(lead.id, canonical);
      continue;
    }

    if (email) seenEmail.set(email, lead.id);
    if (pair) seenPair.set(pair, lead.id);
    if (domain && !seenDomain.has(domain)) seenDomain.set(domain, lead.id);
  }

  return leads.map((lead) => {
    const of = dupMap.get(lead.id);
    if (!of) {
      if (lead.status === "duplicate") {
        return { ...lead, status: "new" as const, duplicateOf: null };
      }
      return lead;
    }
    return {
      ...lead,
      status: "duplicate" as const,
      duplicateOf: of,
      notes: lead.notes || `Duplicate of ${of}`,
    };
  });
}

export function countDuplicates(leads: Lead[]): number {
  return leads.filter((l) => l.status === "duplicate").length;
}
