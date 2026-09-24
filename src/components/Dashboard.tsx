"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lead, LeadStats } from "@/lib/types";
import { enrichPriorityLabel } from "@/lib/score";
import type { EnrichPlan } from "@/lib/planner";
import styles from "./Dashboard.module.css";

type Filters = {
  q: string;
  minScore: number;
  industry: string;
  status: string;
  hideDuplicates: boolean;
};

const emptyStats: LeadStats = {
  total: 0,
  unique: 0,
  duplicates: 0,
  avgScore: 0,
  readyToEnrich: 0,
  enriched: 0,
  creditsSavedEstimate: 0,
};

function money(n: number | null) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function flagLabel(f: string) {
  return f.replace(/_/g, " ");
}

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats>(emptyStats);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [creditBudget, setCreditBudget] = useState(5);
  const [plan, setPlan] = useState<EnrichPlan | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    q: "",
    minScore: 0,
    industry: "",
    status: "all",
    hideDuplicates: true,
  });

  const selected = useMemo(
    () => leads.find((l) => l.id === selectedId) || null,
    [leads, selectedId]
  );

  const loadPlan = useCallback(async (budget: number) => {
    const res = await fetch(`/api/leads/plan?budget=${budget}`);
    if (!res.ok) return;
    const data = await res.json();
    setPlan(data.plan);
  }, []);

  const load = useCallback(async (f: Filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.q) params.set("q", f.q);
      if (f.minScore) params.set("minScore", String(f.minScore));
      if (f.industry) params.set("industry", f.industry);
      if (f.status) params.set("status", f.status);
      params.set("hideDuplicates", String(f.hideDuplicates));

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load leads (${res.status})`);
      const data = await res.json();
      setLeads(data.leads || []);
      setStats(data.stats || emptyStats);
    } catch (err) {
      console.error(err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(filters), 180);
    return () => clearTimeout(t);
  }, [filters, load]);

  useEffect(() => {
    const t = setTimeout(() => loadPlan(creditBudget), 200);
    return () => clearTimeout(t);
  }, [creditBudget, loadPlan, leads]);

  async function patchStatus(id: string, status: Lead["status"]) {
    setBusy(true);
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load(filters);
    setBusy(false);
  }

  async function runDedupe() {
    setBusy(true);
    await fetch("/api/leads/dedupe", { method: "POST" });
    await load(filters);
    setBusy(false);
  }

  async function resetDemo() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/leads/reset", { method: "POST" });
      if (!res.ok) throw new Error(`Reset failed (${res.status})`);
      const data = await res.json();
      setSelectedId(null);
      const nextFilters: Filters = {
        q: "",
        minScore: 0,
        industry: "",
        status: "all",
        hideDuplicates: true,
      };
      // Prefer payload from the same request (avoids serverless instance mismatch)
      if (Array.isArray(data.leads) && data.stats) {
        setLeads(data.leads);
        setStats(data.stats);
        setFilters(nextFilters);
      } else {
        await load(nextFilters);
        setFilters(nextFilters);
      }
      await loadPlan(creditBudget);
      setNotice(
        "Demo data restored — seed leads are back (this does not clear the list to empty)."
      );
      window.setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error(err);
      setNotice("Reset failed on the server. Try refreshing the page.");
    } finally {
      setBusy(false);
    }
  }

  async function applyPlan() {
    setBusy(true);
    const res = await fetch("/api/leads/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budget: creditBudget, apply: true }),
    });
    const data = await res.json();
    setPlan(data.plan);
    await load(filters);
    setBusy(false);
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.minScore) params.set("minScore", String(filters.minScore));
    if (filters.industry) params.set("industry", filters.industry);
    if (filters.status) params.set("status", filters.status);
    params.set("hideDuplicates", String(filters.hideDuplicates));
    window.open(`/api/leads/export?${params.toString()}`, "_blank");
  }

  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <div>
          <p className={styles.eyebrow}>SaaSquatch companion</p>
          <h1 className={styles.brand}>LeadRank</h1>
          <p className={styles.tag}>
            Score scraped leads before you burn enrichment credits.
          </p>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.btnGhost}
            onClick={runDedupe}
            disabled={busy}
          >
            Re-run dedupe
          </button>
          <button
            className={styles.btnGhost}
            onClick={exportCsv}
            disabled={busy}
          >
            Export CSV
          </button>
          <button
            className={styles.btnGhost}
            onClick={resetDemo}
            disabled={busy}
            title="Restore the original seed dataset (not an empty list)"
          >
            {busy ? "Resetting…" : "Reset demo data"}
          </button>
        </div>
      </header>

      {notice && <p className={styles.notice}>{notice}</p>}

      <section className={styles.stats}>
        <div className={styles.stat}>
          <span>Total leads</span>
          <strong>{stats.total}</strong>
        </div>
        <div className={styles.stat}>
          <span>Unique</span>
          <strong>{stats.unique}</strong>
        </div>
        <div className={styles.stat}>
          <span>Duplicates caught</span>
          <strong>{stats.duplicates}</strong>
        </div>
        <div className={styles.stat}>
          <span>Avg score</span>
          <strong>{stats.avgScore}</strong>
        </div>
        <div className={styles.stat}>
          <span>Ready to enrich</span>
          <strong className={styles.good}>{stats.readyToEnrich}</strong>
        </div>
        <div className={styles.stat}>
          <span>Credits you&apos;d skip</span>
          <strong className={styles.good}>{stats.creditsSavedEstimate}</strong>
        </div>
      </section>

      <section className={styles.filters}>
        <input
          className={styles.input}
          placeholder="Search company, name, email..."
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <select
          className={styles.select}
          value={filters.minScore}
          onChange={(e) =>
            setFilters({ ...filters, minScore: Number(e.target.value) })
          }
        >
          <option value={0}>Any score</option>
          <option value={45}>Score ≥ 45</option>
          <option value={70}>Score ≥ 70 (high priority)</option>
        </select>
        <select
          className={styles.select}
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="queued">Queued</option>
          <option value="enriched">Enriched</option>
          <option value="skipped">Skipped</option>
          <option value="duplicate">Duplicates</option>
        </select>
        <input
          className={styles.input}
          placeholder="Industry filter"
          value={filters.industry}
          onChange={(e) =>
            setFilters({ ...filters, industry: e.target.value })
          }
        />
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={filters.hideDuplicates}
            onChange={(e) =>
              setFilters({ ...filters, hideDuplicates: e.target.checked })
            }
          />
          Hide duplicates
        </label>
      </section>

      <section className={styles.planner}>
        <div className={styles.plannerHead}>
          <div>
            <p className={styles.eyebrow}>Sales workflow</p>
            <h2>Smart enrich planner</h2>
            <p className={styles.tag}>
              Set how many credits you have. LeadRank picks the best unique
              leads and skips junk / duplicates for you.
            </p>
          </div>
          <div className={styles.plannerControls}>
            <label className={styles.budgetLabel}>
              Credits available
              <input
                className={styles.input}
                type="number"
                min={1}
                max={20}
                value={creditBudget}
                onChange={(e) =>
                  setCreditBudget(Math.max(1, Number(e.target.value) || 1))
                }
              />
            </label>
            <button
              className={styles.btnPrimary}
              onClick={applyPlan}
              disabled={busy || !plan?.recommended.length}
            >
              Queue recommended ({plan?.recommended.length ?? 0})
            </button>
          </div>
        </div>

        {plan && (
          <div className={styles.plannerBody}>
            <div className={styles.plannerSkip}>
              <span>Skipped low score: {plan.skippedLowScore}</span>
              <span>Skipped bad email: {plan.skippedBadEmail}</span>
              <span>Skipped duplicates: {plan.skippedDuplicate}</span>
              <span>Already handled: {plan.skippedAlreadyHandled}</span>
            </div>
            {plan.recommended.length === 0 ? (
              <p className={styles.mutedInline}>
                No fresh high-score leads left under this budget. Reset demo
                data or raise the budget.
              </p>
            ) : (
              <ul className={styles.planList}>
                {plan.recommended.map((item, i) => (
                  <li key={item.id}>
                    <span className={styles.planIndex}>{i + 1}</span>
                    <div>
                      <strong>
                        {item.contactName} · {item.company}
                      </strong>
                      <p>
                        {item.title} · score {item.score} · {item.reason}
                      </p>
                    </div>
                    <button
                      className={styles.linkBtn}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                    >
                      View
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <div className={styles.main}>
        <div className={styles.tableWrap}>
          {loading ? (
            <p className={styles.muted}>Loading leads…</p>
          ) : leads.length === 0 ? (
            <p className={styles.muted}>No leads match these filters.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Score</th>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Title</th>
                  <th>Industry</th>
                  <th>Revenue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const tier = enrichPriorityLabel(lead.score);
                  return (
                    <tr
                      key={lead.id}
                      className={
                        selectedId === lead.id ? styles.rowActive : undefined
                      }
                      onClick={() => setSelectedId(lead.id)}
                    >
                      <td>
                        <span
                          className={`${styles.score} ${styles[`tier_${tier}`]}`}
                        >
                          {lead.score}
                        </span>
                      </td>
                      <td>
                        <div className={styles.company}>{lead.company}</div>
                        <div className={styles.domain}>{lead.domain}</div>
                      </td>
                      <td>{lead.contactName}</td>
                      <td>{lead.title}</td>
                      <td>{lead.industry}</td>
                      <td>{money(lead.revenueEstimate)}</td>
                      <td>
                        <span className={styles.pill}>{lead.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <aside className={styles.detail}>
          {!selected ? (
            <div className={styles.detailEmpty}>
              <h2>Enrichment queue</h2>
              <p>
                Pick a lead on the left. High scores (≥70) are the ones worth
                spending a SaaSquatch enrichment credit on first.
              </p>
            </div>
          ) : (
            <>
              <div className={styles.detailHead}>
                <div>
                  <p className={styles.eyebrow}>{selected.industry}</p>
                  <h2>{selected.company}</h2>
                  <p className={styles.tag}>
                    {selected.contactName} · {selected.title}
                  </p>
                </div>
                <div
                  className={`${styles.scoreBig} ${
                    styles[`tier_${enrichPriorityLabel(selected.score)}`]
                  }`}
                >
                  {selected.score}
                </div>
              </div>

              <dl className={styles.meta}>
                <div>
                  <dt>Email</dt>
                  <dd>{selected.email || "—"}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{selected.phone || "—"}</dd>
                </div>
                <div>
                  <dt>Domain</dt>
                  <dd>{selected.domain}</dd>
                </div>
                <div>
                  <dt>Employees</dt>
                  <dd>{selected.employeeCount ?? "—"}</dd>
                </div>
                <div>
                  <dt>Est. revenue</dt>
                  <dd>{money(selected.revenueEstimate)}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{selected.source}</dd>
                </div>
              </dl>

              <h3 className={styles.sectionTitle}>Score breakdown</h3>
              <ul className={styles.breakdown}>
                <li>
                  Title seniority{" "}
                  <span>+{selected.scoreBreakdown.titleSeniority}</span>
                </li>
                <li>
                  Company / ICP fit{" "}
                  <span>+{selected.scoreBreakdown.companyFit}</span>
                </li>
                <li>
                  Data completeness{" "}
                  <span>+{selected.scoreBreakdown.dataCompleteness}</span>
                </li>
                <li>
                  Revenue signal{" "}
                  <span>+{selected.scoreBreakdown.revenueSignal}</span>
                </li>
                <li>
                  Validation penalties{" "}
                  <span>-{selected.scoreBreakdown.validationPenalty}</span>
                </li>
              </ul>

              <h3 className={styles.sectionTitle}>Validation</h3>
              <div className={styles.flags}>
                {selected.validation.map((f) => (
                  <span
                    key={f}
                    className={
                      f === "email_ok" ? styles.flagOk : styles.flagWarn
                    }
                  >
                    {flagLabel(f)}
                  </span>
                ))}
              </div>

              {selected.duplicateOf && (
                <p className={styles.warnBox}>
                  Marked duplicate of <code>{selected.duplicateOf}</code>
                </p>
              )}

              <div className={styles.detailActions}>
                <button
                  className={styles.btnPrimary}
                  disabled={busy || selected.status === "duplicate"}
                  onClick={() => patchStatus(selected.id, "queued")}
                >
                  Queue for enrich
                </button>
                <button
                  className={styles.btnGhost}
                  disabled={busy || selected.status === "duplicate"}
                  onClick={() => patchStatus(selected.id, "enriched")}
                >
                  Mark enriched
                </button>
                <button
                  className={styles.btnGhost}
                  disabled={busy || selected.status === "duplicate"}
                  onClick={() => patchStatus(selected.id, "skipped")}
                >
                  Skip
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
