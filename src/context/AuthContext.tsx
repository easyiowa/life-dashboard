"use client";

// =============================================================================
// AuthContext — Phase 2 wiring skeleton
//
// HOW TO ACTIVATE:
//   1. npm install @supabase/supabase-js @supabase/ssr
//   2. Add .env.local entries (see src/lib/supabase.ts)
//   3. Wrap <DashboardProvider> with <AuthProvider> in src/app/layout.tsx
//   4. Replace the stub below with the real implementation.
//
// SIGN-IN METHODS SUPPORTED:
//   - Email + Password   →  supabase.auth.signInWithPassword({ email, password })
//   - Google OAuth       →  supabase.auth.signInWithOAuth({ provider: "google",
//                             options: { redirectTo: window.location.origin } })
//
// SESSION FLOW:
//   Supabase stores the session in a secure HttpOnly cookie (SSR package handles
//   this automatically). On every navigation the middleware refreshes the token.
// =============================================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthState {
  session:  Session | null;
  user:     User    | null;
  loading:  boolean;
  signInWithEmail:  (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail:  (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut:          () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hydrate from existing cookie/session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Subscribe to auth state changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUpWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// =============================================================================
// USAGE EXAMPLE — src/app/layout.tsx
// =============================================================================
//
// import { AuthProvider } from "@/context/AuthContext";
// import { DashboardProvider } from "@/context/DashboardContext";
//
// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en">
//       <body>
//         <AuthProvider>
//           <DashboardProvider>
//             {children}
//           </DashboardProvider>
//         </AuthProvider>
//       </body>
//     </html>
//   );
// }
//
// =============================================================================
// AUTH GATE — src/components/AuthGate.tsx (Phase 2 addition)
// =============================================================================
//
// "use client";
// import { useAuth } from "@/context/AuthContext";
// import LoginPage from "@/components/LoginPage";
//
// export default function AuthGate({ children }: { children: React.ReactNode }) {
//   const { user, loading } = useAuth();
//   if (loading) return <div className="...">Loading…</div>;
//   if (!user)   return <LoginPage />;
//   return <>{children}</>;
// }
