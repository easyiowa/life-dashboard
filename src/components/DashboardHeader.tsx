"use client";

import { useState } from "react";
import { Settings, Lightbulb } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import SettingsModal from "@/components/SettingsModal";
import WorkbenchBeacon from "@/components/WorkbenchBeacon";

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

export default function DashboardHeader() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [beaconOpen,   setBeaconOpen]   = useState(false);
  const [beaconUnread, setBeaconUnread] = useState(true);
  const { user, isConfigured } = useAuth();

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
            <h1 className="text-3xl font-semibold text-white tracking-tight">
              {greeting}, {displayName}
            </h1>
          </div>

          <div className="flex items-center gap-3 mt-2">
            {/* Workbench Lightbulb — always visible */}
            <button
              onClick={() => { setBeaconOpen(true); setBeaconUnread(false); }}
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
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            <span className="text-slate-400 text-sm">Live</span>
          </div>
        </header>

        {/* Monstera decoration */}
        <img
          src="/monstera.png"
          alt=""
          className="absolute top-4 right-4 w-36 h-36 z-0 object-contain opacity-70 hover:opacity-95 transition-opacity duration-300 pointer-events-none select-none"
        />
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <WorkbenchBeacon isOpen={beaconOpen} onClose={() => setBeaconOpen(false)} />
    </>
  );
}
