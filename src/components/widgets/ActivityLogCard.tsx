"use client";

import { useState, type ReactNode } from "react";
import { Activity, ChevronDown } from "lucide-react";
import { useDashboard, type FocusSession, type Sphere } from "@/context/DashboardContext";
import { fmtSecs } from "@/lib/time";

// ── Constants ─────────────────────────────────────────────────────────────────

const GOAL_SECONDS = 8 * 3600;
const RING_R = 34;
const RING_C = 2 * Math.PI * RING_R;

// ── Formatters ────────────────────────────────────────────────────────────────

const fmt = fmtSecs;

function fmtTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function fmtDayHeader(dateKey: string): string {
  const [y, mo, d] = dateKey.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

function fmtMonthHeader(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long", year: "numeric",
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DayGroup {
  key: string;           // "YYYY-MM-DD"
  label: string;         // "Monday, June 1"
  totalSeconds: number;
  sessions: FocusSession[];
}

interface WeekBucket  { id: string;       label: string; days: DayGroup[]; total: number; }
interface MonthBucket { monthKey: string; label: string; days: DayGroup[]; total: number; }

// ── Date helpers ──────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day  = date.getDay(); // 0 = Sun
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function dk(d: Date): string { return d.toLocaleDateString("en-CA"); }

// ── Group sessions by calendar day ────────────────────────────────────────────

function groupByDay(sessions: FocusSession[]): DayGroup[] {
  const map = new Map<string, FocusSession[]>();
  for (const s of sessions) {
    const key = s.completedAtDateString ?? new Date(s.completedAt).toLocaleDateString("en-CA");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, ss]) => ({
      key,
      label:        fmtDayHeader(key),
      totalSeconds: ss.reduce((sum, s) => sum + s.durationSeconds, 0),
      sessions:     [...ss].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      ),
    }));
}

// ── Bucket day-groups into week / month hierarchy ─────────────────────────────

function bucketGroups(allGroups: DayGroup[]): {
  currentWeek:    WeekBucket;
  previousWeek:   WeekBucket;
  monthlyArchive: MonthBucket[];
} {
  const today      = new Date();
  const thisMonday = getMonday(today);
  const thisSunday = addDays(thisMonday, 6);
  const prevMonday = addDays(thisMonday, -7);
  const prevSunday = addDays(thisMonday, -1);

  const curDays:  DayGroup[] = [];
  const prevDays: DayGroup[] = [];
  const archDays: DayGroup[] = [];

  for (const g of allGroups) {
    if      (g.key >= dk(thisMonday) && g.key <= dk(thisSunday)) curDays.push(g);
    else if (g.key >= dk(prevMonday) && g.key <= dk(prevSunday)) prevDays.push(g);
    else archDays.push(g);
  }

  const monthMap = new Map<string, DayGroup[]>();
  for (const g of archDays) {
    const mk = g.key.slice(0, 7); // "YYYY-MM"
    if (!monthMap.has(mk)) monthMap.set(mk, []);
    monthMap.get(mk)!.push(g);
  }

  const sum = (days: DayGroup[]) => days.reduce((s, d) => s + d.totalSeconds, 0);

  return {
    currentWeek:  { id: "cur",  label: "Current Week",  days: curDays,  total: sum(curDays)  },
    previousWeek: { id: "prev", label: "Previous Week", days: prevDays, total: sum(prevDays) },
    monthlyArchive: Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([mk, days]) => ({
        monthKey: mk,
        label:    fmtMonthHeader(mk),
        days:     [...days].sort((a, b) => b.key.localeCompare(a.key)),
        total:    sum(days),
      })),
  };
}

// ── Sphere accent colours ─────────────────────────────────────────────────────

const LABEL_DOT: Record<string, string> = {
  emerald: "bg-emerald-400", violet: "bg-violet-400", sky:    "bg-sky-400",
  amber:   "bg-amber-400",   pink:   "bg-pink-400",   teal:   "bg-teal-400",
  blue:    "bg-blue-400",    rose:   "bg-rose-400",   orange: "bg-orange-400",
  indigo:  "bg-indigo-400",
};
const LABEL_TEXT: Record<string, string> = {
  emerald: "text-emerald-400", violet: "text-violet-400", sky:    "text-sky-400",
  amber:   "text-amber-400",   pink:   "text-pink-400",   teal:   "text-teal-400",
  blue:    "text-blue-400",    rose:   "text-rose-400",   orange: "text-orange-400",
  indigo:  "text-indigo-400",
};

// ── DayAccordion ──────────────────────────────────────────────────────────────

function DayAccordion({
  group, isOpen, onToggle, spheres,
}: {
  group: DayGroup; isOpen: boolean; onToggle: () => void; spheres: Sphere[];
}) {
  return (
    <div className="rounded-lg border border-white/[0.04] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 bg-white/[0.02] hover:bg-white/[0.04] transition-colors duration-150"
      >
        <span className="text-[11px] font-semibold text-white flex-1 text-left">{group.label}</span>
        <span className="text-[10px] text-slate-500 tabular-nums">
          {fmt(group.totalSeconds)} · {group.sessions.length} session{group.sessions.length !== 1 ? "s" : ""}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-600 ml-1 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isOpen ? `${group.sessions.length * 56 + 16}px` : "0px" }}
      >
        <div className="px-3 pt-1 pb-2 flex flex-col">
          {group.sessions.map((session, i) => {
            const sphereObj = spheres.find((s) => s.name === session.sphere);
            const dotClass  = LABEL_DOT[sphereObj?.labelColor ?? ""] ?? "bg-slate-400";
            const textClass = LABEL_TEXT[sphereObj?.labelColor ?? ""] ?? "text-slate-400";
            const isLast    = i === group.sessions.length - 1;

            return (
              <div key={session.id} className="flex gap-2.5">
                {/* Spine */}
                <div className="flex flex-col items-center flex-shrink-0 w-3">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${dotClass}`} />
                  {!isLast && <div className="w-px flex-1 bg-white/[0.05] mt-0.5 mb-0.5" />}
                </div>

                {/* Content */}
                <div className={`flex flex-col gap-0.5 min-w-0 flex-1 ${isLast ? "pb-0" : "pb-2"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-xs font-medium text-white leading-tight truncate">
                        {session.taskName}
                      </p>
                      {session.isManual && (
                        <span className="flex-shrink-0 px-1 py-0.5 rounded text-[9px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/25">
                          Manual
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-violet-300 tabular-nums flex-shrink-0">
                      {fmt(session.durationSeconds)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-medium ${textClass}`}>{session.sphere}</span>
                    <span className="text-slate-700 text-[10px]">·</span>
                    <span className="text-[10px] text-slate-500 truncate">{session.project}</span>
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
}

// ── SectionNode: collapsible week / month container ───────────────────────────

function SectionNode({
  label, sublabel, isOpen, onToggle, children, accent = false,
}: {
  label: string; sublabel?: string; isOpen: boolean; onToggle: () => void;
  children: ReactNode; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border overflow-hidden ${
      accent ? "border-violet-500/20 bg-violet-600/[0.03]" : "border-white/[0.06] bg-white/[0.01]"
    }`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-4 py-2.5 transition-colors duration-150 ${
          accent ? "hover:bg-violet-600/[0.06]" : "hover:bg-white/[0.03]"
        }`}
      >
        <span className={`text-xs font-semibold flex-1 text-left ${accent ? "text-violet-200" : "text-slate-300"}`}>
          {label}
        </span>
        {sublabel && <span className="text-[10px] text-slate-500 tabular-nums">{sublabel}</span>}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-600 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isOpen ? "3000px" : "0px" }}
      >
        <div className="px-3 pb-3 pt-1 flex flex-col gap-1">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export default function ActivityLogCard() {
  const { sessions, spheres } = useDashboard();

  const todayKey = new Date().toLocaleDateString("en-CA");

  // Top-level section nodes: current week open by default
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({ cur: true });
  // Individual day accordions: today open by default
  const [openDays,  setOpenDays]  = useState<Record<string, boolean>>({ [todayKey]: true });

  const toggleNode = (id: string)  => setOpenNodes((p) => ({ ...p, [id]: !p[id] }));
  const toggleDay  = (key: string) => setOpenDays((p)  => ({ ...p, [key]: !p[key] }));

  const allGroups = groupByDay(sessions);
  const { currentWeek, previousWeek, monthlyArchive } = bucketGroups(allGroups);

  // Today stats for the ring
  const todaySessions    = sessions.filter(
    (s) => (s.completedAtDateString ?? new Date(s.completedAt).toLocaleDateString("en-CA")) === todayKey
  );
  const todaySeconds     = todaySessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const progress         = Math.min(todaySeconds / GOAL_SECONDS, 1);
  const strokeDashoffset = RING_C * (1 - progress);
  const totalLabel       = fmtSecs(todaySeconds);
  const _totalMins       = Math.floor((todaySeconds + 29) / 60);
  const totalH           = Math.floor(_totalMins / 60);
  const totalM           = _totalMins % 60;
  const goalPct          = Math.round(progress * 100);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-400" />
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Focus Sessions 
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

      {/* ── Hierarchical log ───────────────────────────────────────────────────── */}
      {allGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-8 h-8 rounded-full border border-white/[0.07] flex items-center justify-center mb-2">
            <Activity className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-xs text-slate-600">No sessions yet</p>
          <p className="text-[10px] text-slate-700 mt-0.5">Click ▶ on a task to begin</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">

          {/* Current Week — open by default */}
          {currentWeek.days.length > 0 && (
            <SectionNode
              label="Current Week"
              sublabel={currentWeek.total > 0 ? fmt(currentWeek.total) : undefined}
              isOpen={!!openNodes["cur"]}
              onToggle={() => toggleNode("cur")}
              accent
            >
              {currentWeek.days.map((day) => (
                <DayAccordion
                  key={day.key}
                  group={day}
                  isOpen={!!openDays[day.key]}
                  onToggle={() => toggleDay(day.key)}
                  spheres={spheres}
                />
              ))}
            </SectionNode>
          )}

          {/* Previous Week — collapsed by default */}
          {previousWeek.days.length > 0 && (
            <SectionNode
              label="Previous Week"
              sublabel={previousWeek.total > 0 ? fmt(previousWeek.total) : undefined}
              isOpen={!!openNodes["prev"]}
              onToggle={() => toggleNode("prev")}
            >
              {previousWeek.days.map((day) => (
                <DayAccordion
                  key={day.key}
                  group={day}
                  isOpen={!!openDays[day.key]}
                  onToggle={() => toggleDay(day.key)}
                  spheres={spheres}
                />
              ))}
            </SectionNode>
          )}

          {/* Monthly Archive — each month collapsed by default */}
          {monthlyArchive.map((month) => (
            <SectionNode
              key={month.monthKey}
              label={month.label}
              sublabel={month.total > 0 ? fmt(month.total) : undefined}
              isOpen={!!openNodes[month.monthKey]}
              onToggle={() => toggleNode(month.monthKey)}
            >
              {month.days.map((day) => (
                <DayAccordion
                  key={day.key}
                  group={day}
                  isOpen={!!openDays[day.key]}
                  onToggle={() => toggleDay(day.key)}
                  spheres={spheres}
                />
              ))}
            </SectionNode>
          ))}

        </div>
      )}
    </div>
  );
}
