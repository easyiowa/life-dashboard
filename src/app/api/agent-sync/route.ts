import { NextRequest, NextResponse } from "next/server";

// The Telegram agent (Benicio) reads live context directly from Supabase on
// every turn, so a local snapshot file is no longer needed. This endpoint is
// kept for backwards compatibility with older DashboardContext versions that
// POST here after every state change; it drains the body and acknowledges.
export async function POST(req: NextRequest) {
  await req.json().catch(() => {});
  return NextResponse.json({ ok: true });
}
