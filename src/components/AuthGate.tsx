"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import LoginPage from "@/components/LoginPage";
import OnboardingFlow from "@/components/OnboardingFlow";
import OnboardingLoader, { type LoaderConfig } from "@/components/OnboardingLoader";

// AuthGate renders children only when a valid Supabase session exists.
// If Supabase env vars are absent (local dev), it passes through immediately.
//
// The OnboardingLoader is mounted HERE (not inside OnboardingFlow) so that it
// persists across the OnboardingFlow → dashboard route switch. When AuthGate
// switches views because is_onboarded becomes true, the loader remains as a
// fixed z-[60] overlay, blocking any flash of the appearance step or a blank
// frame. Only after the dashboard has had time to paint does the loader fade out.

export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, isConfigured } = useAuth();
  const [loaderConfig, setLoaderConfig] = useState<LoaderConfig | null>(null);
  const [loaderFading, setLoaderFading] = useState(false);

  if (!isConfigured) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  // Called by OnboardingLoader once its animation signals completion.
  // 1. completeFn fires → auth update → AuthGate switches to dashboard (under loader).
  // 2. 500 ms grace period for dashboard to mount and paint.
  // 3. Loader fades to opacity 0 over 300 ms, revealing the fully-painted workspace.
  // 4. Loader is unmounted.
  async function handleLoaderDone() {
    if (!loaderConfig) return;
    await loaderConfig.completeFn();
    await new Promise<void>(r => setTimeout(r, 500));
    setLoaderFading(true);
    await new Promise<void>(r => setTimeout(r, 300));
    setLoaderConfig(null);
    setLoaderFading(false);
  }

  return (
    <>
      {!user.user_metadata?.is_onboarded
        ? <OnboardingFlow onStartLoader={setLoaderConfig} />
        : <>{children}</>
      }

      {/* Loader lives outside OnboardingFlow so it survives the route switch */}
      {loaderConfig && (
        <div
          className="fixed inset-0 z-[60]"
          style={{
            opacity:            loaderFading ? 0 : 1,
            transition:         "opacity 300ms ease",
            pointerEvents:      loaderFading ? "none" : "auto",
          }}
        >
          <OnboardingLoader
            selectedWidgets={loaderConfig.selectedWidgets}
            theme={loaderConfig.theme}
            seedFn={loaderConfig.seedFn}
            onDone={handleLoaderDone}
          />
        </div>
      )}
    </>
  );
}
