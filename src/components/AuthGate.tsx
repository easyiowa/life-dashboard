"use client";

import { type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import LoginPage from "@/components/LoginPage";
import OnboardingFlow from "@/components/OnboardingFlow";

// AuthGate renders children only when a valid Supabase session exists.
// If Supabase env vars are absent (local dev), it passes through immediately.

export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, isConfigured } = useAuth();

  // Supabase not wired yet — pass through so local dev still works
  if (!isConfigured) return <>{children}</>;

  // Hydrating session from cookie
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  // No session — show login
  if (!user) return <LoginPage />;

  // Authenticated but hasn't completed onboarding
  if (!user.user_metadata?.is_onboarded) return <OnboardingFlow />;

  // Authenticated + onboarded — render dashboard
  return <>{children}</>;
}
