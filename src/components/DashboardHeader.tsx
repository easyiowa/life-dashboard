"use client";

import { useState, useEffect } from "react";
import { Settings, Lightbulb } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import SettingsModal from "@/components/SettingsModal";
import WorkbenchBeacon from "@/components/WorkbenchBeacon";

interface Props {
  /** Opens Blueprint Mode directly (owned by DuduBlueprintBridge) — forwarded to SettingsModal's own trigger button. */
  onOpenBlueprint?: () => void;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function DashboardHeader({ onOpenBlueprint }: Props) {
  const [settingsOpen,    setSettingsOpen]    = useState(false);
  const [beaconOpen,      setBeaconOpen]      = useState(false);
  const [beaconUnread,    setBeaconUnread]    = useState(false);
  const [latestTimestamp, setLatestTimestamp] = useState<string | null>(null);
  const { user, isConfigured } = useAuth();

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    void supabase
      .from("workbench_updates")
      .select("created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const ts = (data?.[0] as { created_at?: string } | undefined)?.created_at ?? null;
        if (!ts) return;
        setLatestTimestamp(ts);
        const lastRead = localStorage.getItem("workbench_last_read");
        setBeaconUnread(!lastRead || ts > lastRead);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const greeting    = getGreeting();
  const date        = formatDate();
  const displayName = user?.user_metadata?.display_name || "Olaf";

  return (
    <>
      <div className="relative min-h-[160px] pb-12 mb-0">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-slate-500 text-xs font-medium tracking-widest uppercase mb-1">
              {date}
            </p>
            <h1 className="flex flex-col md:flex-row md:gap-2 text-2xl md:text-3xl font-semibold text-white tracking-tight">
              <span>{greeting},</span>
              <span>{displayName}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 mt-2">
            {/* Workbench Lightbulb — always visible */}
            <button
              onClick={() => {
                setBeaconOpen(true);
                if (latestTimestamp) localStorage.setItem("workbench_last_read", latestTimestamp);
                setBeaconUnread(false);
              }}
              title="Olaf's Workbench"
              className="w-8 h-8 rounded-xl flex items-center justify-center border border-transparent hover:bg-white/[0.06] hover:border-white/[0.08] transition-all"
            >
              <Lightbulb className={`w-4 h-4 transition-colors ${
                beaconUnread
                  ? "text-purple-400 animate-pulse drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                  : "text-slate-500 hover:text-slate-300"
              }`} />
            </button>

            {/* Settings trigger — only shown when auth is active */}
            {isConfigured && (
              <button
                onClick={() => setSettingsOpen(true)}
                title="Account Settings"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-all"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Monstera decoration */}
        <img
          src="/monstera.png"
          alt=""
          className="absolute top-4 right-4 w-36 h-36 z-0 object-contain opacity-70 hover:opacity-95 transition-opacity duration-300 pointer-events-none select-none"
        />
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} onOpenBlueprint={onOpenBlueprint} />
      <WorkbenchBeacon isOpen={beaconOpen} onClose={() => setBeaconOpen(false)} />
    </>
  );
}
