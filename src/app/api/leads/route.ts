import { NextRequest, NextResponse } from "next/server";
import { filterLeads, getStats } from "@/lib/store";
import { LeadStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = (sp.get("status") || "all") as LeadStatus | "all";
  const minScore = sp.get("minScore");
  const hideDuplicates = sp.get("hideDuplicates") !== "false";

  const leads = filterLeads({
    q: sp.get("q") || undefined,
    industry: sp.get("industry") || undefined,
    status,
    minScore: minScore ? Number(minScore) : undefined,
    hideDuplicates,
  });

  return NextResponse.json({ leads, stats: getStats() });
}
