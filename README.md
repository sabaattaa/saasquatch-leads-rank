# LeadRank

Caprae Capital handbook task — focused improvement on top of [SaaSquatch Leads](https://www.saasquatchleads.com/), not a full rebuild.

SaaSquatch already scrapes and enriches leads. The expensive part is enrichment credits. After looking at the product, the gap I cared about was: **which leads are actually worth enriching, and which ones are junk / duplicates?**

LeadRank sits in that gap.

## What I built (three improvements)

1. **Lead quality score + enrichment priority queue**  
   Each lead gets a 0–100 score from title seniority, ICP/industry fit, company size, revenue signal, and profile completeness. High scores (≥70) go to the front of the enrich queue.

2. **Validation + dedupe**  
   Flags bad/missing/disposable emails and domain mismatches. Dedupes on email and company+contact so you don't pay twice for the same person scraped from two sources.

Demo heuristic: duplicates + low-score leads ≈ credits you'd skip.

## Why this (business value)

- Credits are the monetization lever on SaaSquatch. Wasting them on interns, duplicate rows, or disposable emails is real money.
- Salespeople don't need more scrape volume — they need a ranked shortlist.
- Fits Caprae's "1–2 high-impact improvements in ~5 hours" constraint.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

First boot writes seed data to `data/leads.json` (already includes intentional duplicates so dedupe is obvious).

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 14 (App Router) + React + CSS Modules |
| Backend | Next.js Route Handlers |
| Storage | JSON file store under `/data` (zero setup for reviewers) |
| Hosting target | Vercel (or any Node host) |

No external lead APIs in the demo — scoring/validation run locally on seeded + imported-style sample data so the review doesn't depend on paid keys.

## Project layout

```
src/app/api/leads/     REST endpoints
src/components/        Dashboard UI
src/lib/score.ts       Scoring
src/lib/validate.ts    Email/domain checks
src/lib/dedupe.ts      Duplicate detection
src/lib/planner.ts      Credit-budget enrich recommendations
src/lib/store.ts       Persistence + filters + CSV export
src/lib/seed.ts        Demo dataset
```

More detail: [TECHNICAL.md](./TECHNICAL.md)

## API (short)

- `GET /api/leads` — list + stats (`q`, `minScore`, `industry`, `status`, `hideDuplicates`)
- `PATCH /api/leads/:id` — update status (`queued` / `enriched` / `skipped`)
- `POST /api/leads/dedupe` — re-run dedupe
- `POST /api/leads/reset` — restore seed data
- `GET /api/leads/export` — CSV of current filtered view
- `GET /api/leads/plan?budget=5` — smart enrich recommendations
- `POST /api/leads/plan` — `{ budget, apply: true }` queues recommended leads

## What I'd do next (out of scope)

- Wire real enrichment provider webhooks
- Fuzzy name matching (Levenshtein) for near-duplicates
- Team ICP presets per customer
- Postgres instead of JSON if this left the demo stage

## Video walkthrough notes

Cover: problem (credit waste) → score model → dedupe demo → smart enrich planner (budget) → why not rebuild whole product.
