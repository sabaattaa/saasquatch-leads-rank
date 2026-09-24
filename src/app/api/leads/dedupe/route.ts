import { NextResponse } from "next/server";
import { getStats, runDedupe } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  const leads = runDedupe();
  return NextResponse.json({
    ok: true,
    duplicates: leads.filter((l) => l.status === "duplicate").length,
    stats: getStats(),
  });
}
