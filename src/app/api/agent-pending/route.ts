import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const PENDING_PATH = path.join(process.cwd(), "agent-server", "agent-pending.json");

// Browser polls this to pick up agent-originated actions
export async function GET() {
  if (!fs.existsSync(PENDING_PATH)) return NextResponse.json([]);
  try {
    const data = JSON.parse(fs.readFileSync(PENDING_PATH, "utf8"));
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch {
    return NextResponse.json([]);
  }
}

// Browser calls this after processing to clear the queue
export async function DELETE() {
  try {
    fs.writeFileSync(PENDING_PATH, "[]", "utf8");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
