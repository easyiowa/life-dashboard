export const dynamic = "force-dynamic";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function makeClient() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return jar.getAll(); },
        setAll(list) {
          try { list.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* */ }
        },
      },
    }
  );
}

// Browser polls this every 3 s to pick up actions queued by the Telegram agent.
export async function GET() {
  const db = await makeClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json([]);

  const { data } = await db
    .from("agent_actions_queue")
    .select("type, payload")
    .eq("user_id", user.id)
    .is("processed_at", null)
    .order("queued_at", { ascending: true });

  return NextResponse.json(data ?? []);
}

// Browser calls this after processing the batch to clear consumed rows.
export async function DELETE() {
  const db = await makeClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  await db
    .from("agent_actions_queue")
    .delete()
    .eq("user_id", user.id)
    .is("processed_at", null);

  return NextResponse.json({ ok: true });
}
