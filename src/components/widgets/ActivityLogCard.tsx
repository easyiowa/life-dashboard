"use client";

import { useState } from "react";
import { Activity, ChevronDown } from "lucide-react";
import { useDashboard, type FocusSession } from "@/context/DashboardContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

const GOAL_SECONDS = 8 * 3600;
const RING_R = 34;
const RING_C = 2 * Math.PI * RING_R;

function fmt(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function fmtTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

// ── Day-grouping ──────────────────────────────────────────────────────────────

interface DayGroup {
  key: string;          // "YYYY-MM-DD"
  label: string;        // "Today" | "Yesterday" | "May 29, 2026"
  totalSeconds: number;
  sessions: FocusSession[];
}

function getDayLabel(dateKey: string): string {
  const todayKey = new Date().toLocaleDateString("en-CA");
  const yd = new Date();
  yd.setDate(yd.getDate() - 1);
  const yesterdayKey = yd.toLocaleDateString("en-CA");

  if (dateKey === todayKey)     return "Today";
  if (dateKey === yesterdayKey) return "Yesterday";

  const [y, mo, d] = dateKey.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function groupByDay(sessions: FocusSession[]): DayGroup[] {
  const map = new Map<string, FocusSession[]>();
  for (const s of sessions) {
    const key = s.completedAtDateString ??
      new Date(s.completedAt).toLocaleDateString("en-CA");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // newest first
    .map(([key, ss]) => ({
      key,
      label:        getDayLabel(key),
      totalSeconds: ss.reduce((sum, s) => sum + s.durationSeconds, 0),
      sessions:     [...ss].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      ),
    }));
}

// ── Sphere accent colours (mapped from labelColor palette) ───────────────────

const LABEL_DOT: Record<string, string> = {
  emerald: "bg-emerald-400",  violet: "bg-violet-400",  sky:    "bg-sky-400",
  amber:   "bg-amber-400",    pink:   "bg-pink-400",    teal:   "bg-teal-400",
  blue:    "bg-blue-400",     rose:   "bg-rose-400",    orange: "bg-orange-400",
  indigo:  "bg-indigo-400",
};
const LABEL_TEXT: Record<string, string> = {
  emerald: "text-emerald-400", violet: "text-violet-400", sky:    "text-sky-400",
  amber:   "text-amber-400",   pink:   "text-pink-400",   teal:   "text-teal-400",
  blue:    "text-blue-400",    rose:   "text-rose-400",   orange: "text-orange-400",
  indigo:  "text-indigo-400",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ActivityLogCard() {
  const { sessions, spheres } = useDashboard();

  // Default: today open, everything else closed
  const todayKey = new Date().toLocaleDateString("en-CA");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    () => ({ [todayKey]: true })
  );
  const toggle = (key: string) =>
    setOpenGroups((p) => ({ ...p, [key]: !p[key] }));

  const groups = groupByDay(sessions);

  // Today-only stats for the ring
  const todaySessions = sessions.filter(
    (s) => (s.completedAtDateString ?? new Date(s.completedAt).toLocaleDateString("en-CA")) === todayKey
  );
  const todaySeconds     = todaySessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const progress         = Math.min(todaySeconds / GOAL_SECONDS, 1);
  const strokeDashoffset = RING_C * (1 - progress);
  const totalH           = Math.floor(todaySeconds / 3600);
  const totalM           = Math.floor((todaySeconds % 3600) / 60);
  const totalLabel       = totalH > 0 ? `${totalH}h ${totalM}m` : `${totalM}m`;
  const goalPct          = Math.round(progress * 100);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-400" />
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Activity Log
          </h2>
        </div>
        <span className="text-xs text-slate-500">
          {todaySessions.length} session{todaySessions.length !== 1 ? "s" : ""} today
        </span>
      </div>

      {/* Today ring + stats */}
      <div className="flex items-center gap-5">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
            <circle cx="40" cy="40" r={RING_R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
            <circle
              cx="40" cy="40" r={RING_R}
              fill="none"
              stroke="url(#logGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700"
            />
            <defs>
              <linearGradient id="logGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-white font-mono leading-none tabular-nums">
              {totalH > 0 ? `${totalH}h` : `${totalM}m`}
            </span>
            {totalH > 0 && <span className="text-[9px] text-slate-500 mt-0.5">{totalM}m</span>}
          </div>
        </div>
        <div className="flex flex-col gap-2 min-w-0">
          <div>
            <p className="text-lg font-semibold text-white leading-none">{totalLabel}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total focus today</p>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500">Daily goal (8h)</span>
              <span className="text-slate-400 font-medium">{goalPct}%</span>
            </div>
            <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden w-full">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-700"
                style={{ width: `${goalPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grouped day sections */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-8 h-8 rounded-full border border-white/[0.07] flex items-center justify-center mb-2">
            <Activity className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-xs text-slate-600">No sessions yet</p>
          <p className="text-[10px] text-slate-700 mt-0.5">Click ▶ on a task to begin</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto max-h-72">
          {groups.map((group) => {
            const isOpen = !!openGroups[group.key];
            return (
              <div key={group.key} className="rounded-xl border border-white/[0.05] overflow-hidden">

                {/* Day header — collapsible toggle */}
                <button
                  onClick={() => toggle(group.key)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors duration-150"
                >
                  <span className="text-xs font-semibold text-white">{group.label}</span>
                  <span className="text-[10px] text-slate-500 ml-1">
                    · {fmt(group.totalSeconds)} · {group.sessions.length} session{group.sessions.length !== 1 ? "s" : ""}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 text-slate-600 ml-auto transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Session timeline */}
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{ maxHeight: isOpen ? `${group.sessions.length * 72 + 16}px` : "0px" }}
                >
                  <div className="px-3 pt-1 pb-3 flex flex-col">
                    {group.sessions.map((session, i) => {
                      const sphereObj   = spheres.find((s) => s.name === session.sphere);
                      const dotClass    = LABEL_DOT[sphereObj?.labelColor ?? ""] ?? "bg-slate-400";
                      const textClass   = LABEL_TEXT[sphereObj?.labelColor ?? ""] ?? "text-slate-400";
                      const isLast      = i === group.sessions.length - 1;

                      return (
                        <div key={session.id} className="flex gap-3">
                          {/* Spine */}
                          <div className="flex flex-col items-center flex-shrink-0 w-4">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${dotClass} shadow-[0_0_5px_rgba(139,92,246,0.35)]`} />
                            {!isLast && <div className="w-px flex-1 bg-white/[0.06] mt-1 mb-1" />}
                          </div>

                          {/* Content */}
                          <div className={`flex flex-col gap-0.5 min-w-0 flex-1 ${isLast ? "pb-0" : "pb-3"}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <p className="text-sm font-medium text-white leading-tight truncate">
                                  {session.taskName}
                                </p>
                                {session.isManual && (
                                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/25">
                                    Manual
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-semibold text-violet-300 tabular-nums flex-shrink-0">
                                {fmt(session.durationSeconds)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-medium ${textClass}`}>
                                {session.sphere}
                              </span>
                              <span className="text-slate-700 text-[10px]">·</span>
                              <span className="text-[10px] text-slate-500 truncate">
                                {session.project}
                              </span>
                              <span className="text-slate-700 text-[10px] ml-auto flex-shrink-0">
                                {fmtTime(new Date(session.completedAt))}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
