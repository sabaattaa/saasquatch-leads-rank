import fs from "fs";
import path from "path";
import { Lead, LeadFilters, LeadStats } from "./types";
import { createSeedLeads } from "./seed";
import { scoreLead } from "./score";
import { validateLead } from "./validate";
import { dedupeLeads } from "./dedupe";

const DATA_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join("/tmp", "leadrank-data")
    : path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "leads.json");

function ensureStore(): Lead[] {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const seed = createSeedLeads();
    // run dedupe once on first boot so the demo shows value immediately
    const withDups = dedupeLeads(seed);
    fs.writeFileSync(DATA_FILE, JSON.stringify(withDups, null, 2), "utf8");
    return withDups;
  }
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  return JSON.parse(raw) as Lead[];
}

function save(leads: Lead[]) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2), "utf8");
}

export function getAllLeads(): Lead[] {
  return ensureStore();
}

export function filterLeads(filters: LeadFilters = {}): Lead[] {
  let leads = getAllLeads();

  if (filters.hideDuplicates !== false) {
    leads = leads.filter((l) => l.status !== "duplicate");
  }

  if (filters.status && filters.status !== "all") {
    leads = leads.filter((l) => l.status === filters.status);
  }

  if (filters.minScore != null) {
    leads = leads.filter((l) => l.score >= filters.minScore!);
  }

  if (filters.industry) {
    const ind = filters.industry.toLowerCase();
    leads = leads.filter((l) => l.industry.toLowerCase().includes(ind));
  }

  if (filters.q) {
    const q = filters.q.toLowerCase();
    leads = leads.filter(
      (l) =>
        l.company.toLowerCase().includes(q) ||
        l.contactName.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.domain.toLowerCase().includes(q) ||
        l.title.toLowerCase().includes(q)
    );
  }

  return [...leads].sort((a, b) => b.score - a.score);
}

export function getLead(id: string): Lead | undefined {
  return getAllLeads().find((l) => l.id === id);
}

export function updateLead(
  id: string,
  patch: Partial<Pick<Lead, "status" | "notes" | "email" | "phone">>
): Lead | null {
  const leads = getAllLeads();
  const idx = leads.findIndex((l) => l.id === id);
  if (idx < 0) return null;

  const next = { ...leads[idx], ...patch };
  next.validation = validateLead({
    email: next.email,
    domain: next.domain,
    contactName: next.contactName,
    title: next.title,
    company: next.company,
  });
  const scored = scoreLead(next);
  next.score = scored.score;
  next.scoreBreakdown = scored.scoreBreakdown;

  leads[idx] = next;
  save(leads);
  return next;
}

export function runDedupe(): Lead[] {
  const leads = dedupeLeads(getAllLeads());
  save(leads);
  return leads;
}

export function queueLeads(ids: string[]): Lead[] {
  const idSet = new Set(ids);
  const leads = getAllLeads().map((lead) => {
    if (!idSet.has(lead.id) || lead.status === "duplicate") return lead;
    return { ...lead, status: "queued" as const };
  });
  save(leads);
  return leads;
}

export function resetSeed(): Lead[] {
  const seed = dedupeLeads(createSeedLeads());
  save(seed);
  return seed;
}

export function getStats(): LeadStats {
  const leads = getAllLeads();
  const duplicates = leads.filter((l) => l.status === "duplicate").length;
  const unique = leads.length - duplicates;
  const active = leads.filter((l) => l.status !== "duplicate");
  const avgScore =
    active.length === 0
      ? 0
      : Math.round(active.reduce((s, l) => s + l.score, 0) / active.length);
  const readyToEnrich = active.filter(
    (l) => l.score >= 70 && (l.status === "new" || l.status === "queued")
  ).length;
  const enriched = active.filter((l) => l.status === "enriched").length;

  // each avoided duplicate / low-quality enrich = 1 credit saved (demo heuristic)
  const lowQuality = active.filter((l) => l.score < 45).length;
  const creditsSavedEstimate = duplicates + lowQuality;

  return {
    total: leads.length,
    unique,
    duplicates,
    avgScore,
    readyToEnrich,
    enriched,
    creditsSavedEstimate,
  };
}

export function toCsv(leads: Lead[]): string {
  const headers = [
    "id",
    "company",
    "domain",
    "contactName",
    "title",
    "email",
    "phone",
    "industry",
    "employeeCount",
    "revenueEstimate",
    "score",
    "status",
    "location",
    "source",
  ];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.join(",")];
  for (const l of leads) {
    lines.push(
      [
        l.id,
        l.company,
        l.domain,
        l.contactName,
        l.title,
        l.email,
        l.phone,
        l.industry,
        l.employeeCount,
        l.revenueEstimate,
        l.score,
        l.status,
        l.location,
        l.source,
      ]
        .map(escape)
        .join(",")
    );
  }
  return lines.join("\n");
}
