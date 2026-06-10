import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SNAPSHOT_PATH = path.join(process.cwd(), "agent-server", "dashboard-snapshot.json");

export async function POST(req: NextRequest) {
  // Vercel's filesystem is read-only — skip the write and let localStorage own state
  if (process.env.VERCEL) {
    await req.json(); // drain body
    return NextResponse.json({ ok: true, serverless: true });
  }
  try {
    const data = await req.json();
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(data, null, 2), "utf8");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[agent-sync] Write failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
