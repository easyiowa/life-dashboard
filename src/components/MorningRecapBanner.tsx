"use client";

import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";

// ── Velocity helpers ──────────────────────────────────────────────────────────

function velocityEmoji(v: number): string {
  if (v === 100) return "👑";
  if (v >= 80)   return "🔥";
  if (v >= 60)   return "😎";
  if (v >= 40)   return "🫡";
  if (v >= 20)   return "🫠";
  return "💀";
}

function velocityBarClass(v: number): string {
  if (v >= 80) return "from-emerald-600 to-emerald-400";
  if (v >= 60) return "from-violet-600 to-violet-400";
  if (v >= 40) return "from-amber-600 to-amber-400";
  return "from-rose-700 to-rose-500";
}

function humanizedMessage(v: number, completedCount: number, rolledCount: number): string {
  const name = "Olaf";
  if (v === 100) {
    return `${name}, you absolute legend — 100% velocity. Every single goal hit, nothing left on the table. Clean sweep, zero excuses. Today's going to feel easy by comparison.`;
  }
  if (v >= 80) {
    return `Strong work yesterday, ${name}. You pushed through ${completedCount} goal${completedCount !== 1 ? "s" : ""}${rolledCount > 0 ? ` — just ${rolledCount} thing${rolledCount !== 1 ? "s" : ""} carried forward` : " and left nothing behind"}. This is the kind of consistency that quietly compounds.`;
  }
  if (v >= 60) {
    return `Solid session yesterday, ${name} — ${v}% velocity. ${completedCount} done${rolledCount > 0 ? `, ${rolledCount} rolled over` : ", clean finish"}. You held the line when it mattered. Keep the momentum going.`;
  }
  if (v >= 40) {
    return `Mixed bag yesterday, ${name}. ${v}% — some real progress made, ${rolledCount > 0 ? `${rolledCount} thing${rolledCount !== 1 ? "s" : ""} slipped through` : "but you stayed in the game"}. No shame in honest effort. Let's be sharper today.`;
  }
  if (v >= 20) {
    return `Yesterday was a grind, ${name}. ${v}% velocity — ${completedCount > 0 ? `${completedCount} done` : "the wall was real"}${rolledCount > 0 ? `, ${rolledCount} dragged forward` : ""}. Some days are just like this. What matters is the reset.`;
  }
  return `Rough one yesterday, ${name}. ${v}% velocity — it happens to everyone. ${rolledCount > 0 ? `${rolledCount} task${rolledCount !== 1 ? "s" : ""} waiting for you now.` : "But the fact you're here means you're not done."} Fresh start. Let's go.`;
}

// ── Banner ────────────────────────────────────────────────────────────────────

export default function MorningRecapBanner() {
  const { yesterdayRecap, historicalLogs } = useDashboard();
  const [dismissed, setDismissed] = useState(false);
  const [expanded,  setExpanded]  = useState(false);

  const log = historicalLogs[0];

  if (!yesterdayRecap || dismissed || !log) return null;

  const emoji   = velocityEmoji(log.dayVelocity);
  const message = humanizedMessage(log.dayVelocity, log.completedTasks.length, log.rolledOverTasks.length);

  return (
    <div className="mb-4 rounded-xl border border-violet-500/25 bg-violet-600/[0.06] backdrop-blur-xl overflow-hidden">

      {/* Main row — clickable to expand */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors duration-150"
      >
        <span className="text-lg leading-none flex-shrink-0 mt-0.5">{emoji}</span>
        <p className="text-sm text-violet-200 flex-1 leading-relaxed">{message}</p>
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          <ChevronDown
            className={`w-3.5 h-3.5 text-violet-400/50 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
            aria-label="Dismiss recap"
            className="w-5 h-5 flex items-center justify-center text-violet-400/50 hover:text-violet-300 transition-colors rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </button>

      {/* Expandable details panel */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: expanded ? "600px" : "0px" }}
      >
        <div className="px-4 pb-4 pt-3 flex flex-col gap-3 border-t border-violet-500/15">

          {/* Velocity mini-bar */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold text-violet-300/80 uppercase tracking-widest flex-shrink-0 w-24">
              {log.dayVelocity}% velocity
            </span>
            <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${velocityBarClass(log.dayVelocity)} transition-all duration-700`}
                style={{ width: `${log.dayVelocity}%` }}
              />
            </div>
          </div>

          {/* Completed + Rolled Over grid */}
          <div className="grid grid-cols-2 gap-3">

            {/* Completed */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">✓ Completed</p>
              {log.completedTasks.length === 0 ? (
                <p className="text-[10px] text-slate-700">—</p>
              ) : (
                log.completedTasks.map((title, i) => {
                  const meta = log.taskMeta?.[title];
                  return (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 text-[10px] flex-shrink-0 mt-0.5">✓</span>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[10px] text-slate-300 leading-snug truncate">{title}</span>
                        {meta && (
                          <span className="text-[9px] text-slate-600">
                            {meta.intent === "time" && meta.target
                              ? `⏱️ ${meta.target}m goal`
                              : meta.intent === "maybe" ? "🎲 Maybe" : "🎯 Finish"}
                            {meta.minutes > 0 && ` · ${meta.minutes}m`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rolled Over */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">↩ Rolled Over</p>
              {log.rolledOverTasks.length === 0 ? (
                <p className="text-[10px] text-slate-700">—</p>
              ) : (
                log.rolledOverTasks.map((title, i) => {
                  const meta = log.taskMeta?.[title];
                  return (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-slate-500 text-[10px] flex-shrink-0 mt-0.5">↩</span>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[10px] text-slate-500 leading-snug truncate">{title}</span>
                        {meta && (
                          <span className="text-[9px] text-slate-700">
                            {meta.intent === "time" && meta.target
                              ? `⏱️ ${meta.target}m goal`
                              : meta.intent === "maybe" ? "🎲 Maybe" : "🎯 Finish"}
                            {meta.minutes > 0 && ` · ${meta.minutes}m`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
