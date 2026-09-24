import { NextRequest, NextResponse } from "next/server";
import { filterLeads, toCsv } from "@/lib/store";
import { LeadStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const leads = filterLeads({
    q: sp.get("q") || undefined,
    industry: sp.get("industry") || undefined,
    status: (sp.get("status") || "all") as LeadStatus | "all",
    minScore: sp.get("minScore") ? Number(sp.get("minScore")) : undefined,
    hideDuplicates: sp.get("hideDuplicates") !== "false",
  });

  const csv = toCsv(leads);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="leadrank-export.csv"',
    },
  });
}
