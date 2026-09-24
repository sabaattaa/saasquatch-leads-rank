import { NextRequest, NextResponse } from "next/server";
import { getLead, updateLead } from "@/lib/store";
import { LeadStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const lead = getLead(params.id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const allowedStatus: LeadStatus[] = [
    "new",
    "queued",
    "enriched",
    "skipped",
    "duplicate",
  ];

  const patch: { status?: LeadStatus; notes?: string } = {};
  if (body.status && allowedStatus.includes(body.status)) {
    patch.status = body.status;
  }
  if (typeof body.notes === "string") patch.notes = body.notes;

  const lead = updateLead(params.id, patch);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead });
}
