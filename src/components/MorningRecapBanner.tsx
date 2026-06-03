"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";

export default function MorningRecapBanner() {
  const { yesterdayRecap } = useDashboard();
  const [dismissed, setDismissed] = useState(false);

  if (!yesterdayRecap || dismissed) return null;

  return (
    <div className="mb-4 rounded-xl border border-violet-500/25 bg-violet-600/[0.08] backdrop-blur-xl px-4 py-3 flex items-center gap-3">
      <Info className="w-4 h-4 text-violet-400 flex-shrink-0" />
      <p className="text-sm text-violet-200 flex-1 leading-relaxed">{yesterdayRecap}</p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss recap"
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-violet-400/60 hover:text-violet-300 transition-colors rounded"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
