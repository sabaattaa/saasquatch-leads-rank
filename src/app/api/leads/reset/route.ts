import { NextResponse } from "next/server";
import { getStats, resetSeed } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  const leads = resetSeed();
  return NextResponse.json({ ok: true, count: leads.length, stats: getStats() });
}
