import { createBrowserClient } from "@supabase/ssr";

// Populated from .env.local — copy .env.local.example to get started.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// When env vars are absent (local dev without Supabase), the client is null.
// AuthContext detects this and bypasses auth so the app still runs locally.
export const supabase = (supabaseUrl && supabaseKey)
  ? createBrowserClient(supabaseUrl, supabaseKey)
  : null;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);
