import { createBrowserClient } from "@supabase/ssr";

// Singleton browser client — safe to import anywhere in client components.
// Environment variables are set in .env.local (never committed to git).
//
//   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
