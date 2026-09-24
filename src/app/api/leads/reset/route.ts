import { NextResponse } from "next/server";
import { filterLeads, getStats, resetSeed } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const all = resetSeed();
    const leads = filterLeads({ hideDuplicates: true, status: "all" });
    return NextResponse.json({
      ok: true,
      count: all.length,
      leads,
      stats: getStats(),
    });
  } catch (err) {
    console.error("reset failed", err);
    return NextResponse.json(
      { ok: false, error: "Failed to reset demo data" },
      { status: 500 }
    );
  }
}
