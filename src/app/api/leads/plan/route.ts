import { NextRequest, NextResponse } from "next/server";
import { buildEnrichPlan } from "@/lib/planner";
import { getAllLeads, getStats, queueLeads } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const budget = Number(req.nextUrl.searchParams.get("budget") || 5);
  const plan = buildEnrichPlan(getAllLeads(), budget);
  return NextResponse.json({ plan, stats: getStats() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const budget = Number(body.budget ?? 5);
  const plan = buildEnrichPlan(getAllLeads(), budget);

  if (body.apply) {
    const ids = plan.recommended.map((r) => r.id);
    queueLeads(ids);
  }

  return NextResponse.json({
    ok: true,
    applied: Boolean(body.apply),
    plan: buildEnrichPlan(getAllLeads(), budget),
    stats: getStats(),
  });
}
