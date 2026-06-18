"use client";

import type { ComponentType } from "react";

function formatActivationDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

interface WidgetIconTooltipProps {
  id:          string;
  Icon:        ComponentType<{ className?: string }>;
  label:       string;
  activatedAt: string;
  isNew:       boolean;
}

// Custom hover tooltip — native `title` attributes have a ~1s OS-level delay
// before showing, which reads as sluggish for a dense icon row. This shows
// instantly on hover instead via group-hover opacity.
export default function WidgetIconTooltip({ Icon, label, activatedAt, isNew }: WidgetIconTooltipProps) {
  return (
    <div className="group relative w-6 h-6 rounded-lg bg-white/[0.05] border border-white/[0.07] flex items-center justify-center">
      {/* pointer-events-none so the icon's own hit-testing can't flicker the group hover state */}
      <Icon className="w-3 h-3 text-slate-400 pointer-events-none" />
      {isNew && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0B0F1C]" />
      )}
      <div
        className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 whitespace-nowrap rounded-lg bg-[#15192B] border border-white/[0.08] px-2.5 py-1.5 shadow-lg"
      >
        <p className="text-[10px] font-semibold text-white leading-tight">{label}</p>
        <p className="text-[9px] text-slate-500 leading-tight">Added: {formatActivationDate(activatedAt)}</p>
      </div>
    </div>
  );
}
