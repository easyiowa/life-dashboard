"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { TrendingUp, X, BarChart2 } from "lucide-react";
import { useDashboard, type FocusSession, type HistoricalLog } from "@/context/DashboardContext";

// ── Utilities ─────────────────────────────────────────────────────────────────

const BAR_COLORS = [
  "from-violet-600 to-violet-400",
  "from-blue-600 to-blue-400",
  "from-emerald-600 to-emerald-400",
  "from-amber-600 to-amber-400",
];

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Returns Monday-anchored week bounds, offset by N weeks (negative = past)
function getWeekBounds(offsetWeeks = 0): { start: Date; end: Date } {
  const now = new Date();
  const dow = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - ((dow + 6) % 7) + offsetWeeks * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

// "YYYY-MM-DD" using local time (same as completedAtDateString)
function toDayStr(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

function computeFocusHours(secs: number): number {
  return Math.round(secs / 360) / 10;
}

function statusBadge(score: number): { text: string; cls: string } {
  if (score >= 85) return { text: "Overkill 🔥", cls: "bg-orange-500/20 text-orange-300 border-orange-500/30" };
  if (score >= 65) return { text: "On Track ✅", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
  if (score >= 40) return { text: "Slacking ⚠️", cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" };
  return { text: "Off Track 😴", cls: "bg-slate-500/20 text-slate-400 border-slate-500/30" };
}

// "8.06" — day.month, no leading zero on day
function fmtDay(d: Date): string {
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Returns the Monday of a given ISO year+week
function isoWeekToMonday(year: number, week: number): Date {
  const jan4    = new Date(year, 0, 4);
  const jan4dow = jan4.getDay() || 7;
  const monday  = new Date(jan4);
  monday.setDate(jan4.getDate() - (jan4dow - 1) + (week - 1) * 7);
  return monday;
}

// "YYYY-WNN" → "8.06 – 14.06"
function weekKeyToRange(weekKey: string): string {
  const dashW  = weekKey.indexOf("-W");
  const year   = parseInt(weekKey.substring(0, dashW));
  const week   = parseInt(weekKey.substring(dashW + 2));
  const monday = isoWeekToMonday(year, week);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${fmtDay(monday)} – ${fmtDay(sunday)}`;
}

// Week offset → "8.06 – 14.06" using local-time week bounds
function getWeekRangeStr(offsetWeeks: number): string {
  const { start, end } = getWeekBounds(offsetWeeks);
  const sunday = new Date(end);
  sunday.setDate(end.getDate() - 1);
  return `${fmtDay(start)} – ${fmtDay(sunday)}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface WeekAggregate {
  weekKey: string;
  weekNum: number;
  focusHours: number;
  tasksDone: number;
  tasksQueued: number;
  score: number;
}

interface MonthAggregate {
  monthKey: string;
  label: string;
  focusHours: number;
  tasksDone: number;
  tasksQueued: number;
  score: number;
}

interface DisplayRow {
  key: string;
  period: string;
  dateRange?: string;
  focusHours: number;
  tasksDone: number;
  tasksQueued: number;
  score: number;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) {
    return (
      <div className="h-8 flex items-center">
        <span className="text-[10px] text-slate-600">No data yet</span>
      </div>
    );
  }
  const max = Math.max(...values, 0.1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 min-w-0 rounded-sm bg-violet-500/50"
          style={{ height: `${Math.max(Math.round((v / max) * 100), 4)}%` }}
        />
      ))}
    </div>
  );
}

interface ModalProps {
  onClose: () => void;
  sessions: FocusSession[];
  historicalLogs: HistoricalLog[];
}

function AllWeeksModal({ onClose, sessions, historicalLogs }: ModalProps) {
  const [tab, setTab] = useState<"weeks" | "months">("weeks");

  const { weekAggregates, monthAggregates } = useMemo(() => {
    const FOCUS_GOAL_WEEK  = 20;   // hours
    const FOCUS_GOAL_MONTH = 80;   // hours (~4 weeks)

    const weekMap  = new Map<string, { weekNum: number; focusSecs: number; tasksDone: number; tasksQueued: number }>();
    const monthMap = new Map<string, { label: string;  focusSecs: number; tasksDone: number; tasksQueued: number }>();

    for (const s of sessions) {
      const dateStr = s.completedAtDateString;
      const d   = new Date(dateStr + "T00:00:00");
      const wk  = getISOWeek(d);
      const yr  = d.getFullYear();
      const wkKey = `${yr}-W${String(wk).padStart(2, "0")}`;
      const moKey = dateStr.substring(0, 7);

      if (!weekMap.has(wkKey)) weekMap.set(wkKey, { weekNum: wk, focusSecs: 0, tasksDone: 0, tasksQueued: 0 });
      weekMap.get(wkKey)!.focusSecs += s.durationSeconds;

      if (!monthMap.has(moKey)) {
        const label = new Date(moKey + "-01T00:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        monthMap.set(moKey, { label, focusSecs: 0, tasksDone: 0, tasksQueued: 0 });
      }
      monthMap.get(moKey)!.focusSecs += s.durationSeconds;
    }

    for (const l of historicalLogs) {
      const dateStr = l.date;
      const d   = new Date(dateStr + "T00:00:00");
      const wk  = getISOWeek(d);
      const yr  = d.getFullYear();
      const wkKey = `${yr}-W${String(wk).padStart(2, "0")}`;
      const moKey = dateStr.substring(0, 7);
      const done   = l.completedTasks.length;
      const queued = done + l.rolledOverTasks.length;

      if (!weekMap.has(wkKey)) weekMap.set(wkKey, { weekNum: wk, focusSecs: 0, tasksDone: 0, tasksQueued: 0 });
      weekMap.get(wkKey)!.tasksDone   += done;
      weekMap.get(wkKey)!.tasksQueued += queued;

      if (!monthMap.has(moKey)) {
        const label = new Date(moKey + "-01T00:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        monthMap.set(moKey, { label, focusSecs: 0, tasksDone: 0, tasksQueued: 0 });
      }
      monthMap.get(moKey)!.tasksDone   += done;
      monthMap.get(moKey)!.tasksQueued += queued;
    }

    const weekAggregates: WeekAggregate[] = [...weekMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const focusHours   = computeFocusHours(v.focusSecs);
        const focusScore   = Math.min((focusHours / FOCUS_GOAL_WEEK) * 100, 100);
        const velScore     = v.tasksQueued > 0 ? (v.tasksDone / v.tasksQueued) * 100 : 0;
        const score        = v.tasksQueued > 0 ? (focusScore + velScore) / 2 : focusScore;
        return { weekKey: key, weekNum: v.weekNum, focusHours, tasksDone: v.tasksDone, tasksQueued: v.tasksQueued, score };
      });

    const monthAggregates: MonthAggregate[] = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const focusHours = computeFocusHours(v.focusSecs);
        const focusScore = Math.min((focusHours / FOCUS_GOAL_MONTH) * 100, 100);
        const velScore   = v.tasksQueued > 0 ? (v.tasksDone / v.tasksQueued) * 100 : 0;
        const score      = v.tasksQueued > 0 ? (focusScore + velScore) / 2 : focusScore;
        return { monthKey: key, label: v.label, focusHours, tasksDone: v.tasksDone, tasksQueued: v.tasksQueued, score };
      });

    return { weekAggregates, monthAggregates };
  }, [sessions, historicalLogs]);

  const sparkValues  = tab === "weeks"
    ? weekAggregates.slice(-12).map((w) => w.focusHours)
    : monthAggregates.slice(-12).map((m) => m.focusHours);
  const sparkLabels  = tab === "weeks"
    ? weekAggregates.slice(-12).map((w) => `W${w.weekNum}`)
    : monthAggregates.slice(-12).map((m) => m.label);
  const tableRows: DisplayRow[] = tab === "weeks"
    ? [...weekAggregates].reverse().map((r) => ({
        key: r.weekKey, period: `W${r.weekNum}`, dateRange: weekKeyToRange(r.weekKey),
        focusHours: r.focusHours, tasksDone: r.tasksDone, tasksQueued: r.tasksQueued, score: r.score,
      }))
    : [...monthAggregates].reverse().map((r) => ({
        key: r.monthKey, period: r.label,
        focusHours: r.focusHours, tasksDone: r.tasksDone, tasksQueued: r.tasksQueued, score: r.score,
      }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0F1629] border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <BarChart2 className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Analytics</h2>
            <span className="text-[10px] text-slate-500">All-time history</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs + Sparkline */}
        <div className="px-6 py-4 border-b border-white/[0.04]">
          <div className="flex gap-1 mb-4">
            {(["weeks", "months"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 h-7 rounded-lg text-xs font-medium transition-all border ${
                  tab === t
                    ? "bg-violet-600/20 border-violet-500/30 text-violet-300"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                {t === "weeks" ? "Weeks View" : "Months View"}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">
            Focus Hours — {tab === "weeks" ? "last 12 weeks" : "last 12 months"}
          </p>
          <Sparkline values={sparkValues} />
          {sparkLabels.length > 0 && (
            <div className="flex gap-0.5 mt-1">
              {sparkLabels.map((lbl, i) => (
                <div key={i} className="flex-1 min-w-0 text-center text-[8px] text-slate-600 truncate">
                  {lbl}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#0F1629] border-b border-white/[0.06]">
              <tr>
                <th className="px-6 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest w-24">Period</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Tasks</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Focus</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Velocity</th>
                <th className="px-6 py-2.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-600 text-xs">
                    No historical data yet. Lock your first day to start tracking.
                  </td>
                </tr>
              ) : (
                tableRows.map((row) => {
                  const velocity = row.tasksQueued > 0
                    ? Math.round((row.tasksDone / row.tasksQueued) * 100)
                    : 0;
                  const badge = statusBadge(row.score);
                  return (
                    <tr key={row.key} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3">
                        <span className="font-medium text-white">{row.period}</span>
                        {row.dateRange && (
                          <span className="ml-1.5 text-[10px] text-slate-500 font-normal">({row.dateRange})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className="text-slate-300">{row.tasksDone}</span>
                        <span className="text-slate-600">/{row.tasksQueued}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300 tabular-nums">
                        {row.focusHours.toFixed(1)}h
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 tabular-nums">
                        {row.tasksQueued > 0 ? `${velocity}%` : "—"}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.cls}`}>
                          {badge.text}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface Metric {
  label: string;
  current: number;
  target: number;
  unit: string;
  change: string;
  positive: boolean;
}

function MetricsList({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="flex flex-col gap-4">
      {metrics.map((metric, i) => {
        const pct = Math.min(Math.round((metric.current / metric.target) * 100), 100);
        return (
          <div key={metric.label} className="flex flex-col gap-1.5">
            <div className="flex items-end justify-between">
              <span className="text-sm text-white font-medium">{metric.label}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-semibold text-white tabular-nums">
                  {metric.current}{metric.unit}
                </span>
                <span className="text-xs text-slate-500">/ {metric.target}{metric.unit}</span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${BAR_COLORS[i]} transition-all duration-700`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] ${metric.positive ? "text-emerald-400" : "text-slate-500"}`}>
                {metric.change}
              </span>
              <span className="text-[10px] text-slate-600">{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Card ─────────────────────────────────────────────────────────────────

export default function ProgressCard() {
  const { tasks, projects, sessions, historicalLogs } = useDashboard();

  // 0 = current week, -1 = last week, -2 = two weeks ago
  const [viewOffset, setViewOffset] = useState(0);
  const [showModal,  setShowModal]  = useState(false);

  const { start: weekStart }  = getWeekBounds(0);
  const { start: hvStart }    = getWeekBounds(viewOffset);
  const { start: hvNextStart} = getWeekBounds(viewOffset + 1);
  const weekStartStr = toDayStr(weekStart);
  const hvStartStr   = toDayStr(hvStart);
  const hvEndStr     = toDayStr(hvNextStart);

  // ── Current week ──────────────────────────────────────────────────────────

  const weekSessions    = sessions.filter((s) => s.completedAtDateString >= weekStartStr);
  const weekFocusSec    = weekSessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const weekFocusHours  = computeFocusHours(weekFocusSec);
  const focusTarget     = 20;

  const doneTasks  = tasks.filter((t) => t.done).length;
  const totalTasks = tasks.length;

  const projectProgress = projects.map((p) => {
    const pt = tasks.filter((t) => t.sphere === p.sphere && t.project === p.name);
    return pt.length > 0 ? Math.round((pt.filter((t) => t.done).length / pt.length) * 100) : 0;
  });
  const avgProjectProgress =
    projects.length > 0
      ? Math.round(projectProgress.reduce((s, v) => s + v, 0) / projects.length)
      : 0;

  const highTasks = tasks.filter((t) => t.priority === "High");
  const highDone  = highTasks.filter((t) => t.done).length;
  const highTotal = highTasks.length;
  const highOpen  = highTotal - highDone;

  // ── Historical view (any past week selected via viewOffset) ──────────────

  const hvSessions    = viewOffset !== 0
    ? sessions.filter((s) => s.completedAtDateString >= hvStartStr && s.completedAtDateString < hvEndStr)
    : [];
  const hvFocusSec    = hvSessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const hvFocusHours  = computeFocusHours(hvFocusSec);

  const hvLogs    = viewOffset !== 0
    ? historicalLogs.filter((l) => l.date >= hvStartStr && l.date < hvEndStr)
    : [];
  const hvDone    = hvLogs.reduce((s, l) => s + l.completedTasks.length, 0);
  const hvQueued  = hvLogs.reduce(
    (s, l) => s + l.completedTasks.length + l.rolledOverTasks.length,
    0
  );

  // ── Metrics ───────────────────────────────────────────────────────────────

  const currentMetrics = [
    {
      label:    "Tasks Done",
      current:  doneTasks,
      target:   Math.max(totalTasks, 1),
      unit:     "",
      change:   `${totalTasks - doneTasks} still open`,
      positive: doneTasks / Math.max(totalTasks, 1) >= 0.5,
    },
    {
      label:    "Focus Time",
      current:  weekFocusHours,
      target:   focusTarget,
      unit:     "h",
      change:   `${weekSessions.length} session${weekSessions.length !== 1 ? "s" : ""} this week`,
      positive: weekFocusHours >= 5,
    },
    {
      label:    "Project Progress",
      current:  avgProjectProgress,
      target:   100,
      unit:     "%",
      change:   `across ${projects.length} project${projects.length !== 1 ? "s" : ""}`,
      positive: avgProjectProgress >= 50,
    },
    {
      label:    "High Priority",
      current:  highDone,
      target:   Math.max(highTotal, 1),
      unit:     "",
      change:   highOpen === 0 ? "All clear" : `${highOpen} urgent open`,
      positive: highOpen === 0,
    },
  ];

  const lastWeekMetrics = [
    {
      label:    "Tasks Done",
      current:  hvDone,
      target:   Math.max(hvQueued, 1),
      unit:     "",
      change:   hvQueued > 0 ? `${hvQueued - hvDone} rolled over` : "No log data",
      positive: hvQueued > 0 && hvDone / hvQueued >= 0.5,
    },
    {
      label:    "Focus Time",
      current:  hvFocusHours,
      target:   focusTarget,
      unit:     "h",
      change:   `${hvSessions.length} session${hvSessions.length !== 1 ? "s" : ""} that week`,
      positive: hvFocusHours >= 5,
    },
    {
      label:    "Project Progress",
      current:  avgProjectProgress,
      target:   100,
      unit:     "%",
      change:   "current snapshot",
      positive: avgProjectProgress >= 50,
    },
    {
      label:    "High Priority",
      current:  highDone,
      target:   Math.max(highTotal, 1),
      unit:     "",
      change:   "current snapshot",
      positive: highOpen === 0,
    },
  ];

  const metrics = viewOffset === 0 ? currentMetrics : lastWeekMetrics;

  const overallPct = Math.round(
    (metrics.reduce((sum, m) => sum + Math.min(m.current / m.target, 1), 0) / metrics.length) * 100
  );

  const weekRangeStr = getWeekRangeStr(viewOffset);

  // ── Mobile swipe carousel (Last Week ↔ Current Week) ─────────────────────
  // Page 0 = Last Week, page 1 = Current Week — matches the desktop toggle order.
  const mobileActiveIndex = viewOffset === -1 ? 0 : 1;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.clientWidth * mobileActiveIndex;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleMobileScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const index = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
    const nextOffset = index === 0 ? -1 : 0;
    if (nextOffset !== viewOffset) setViewOffset(nextOffset);
  }

  return (
    <>
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest leading-none">
                Weekly Progress
              </h2>
            </div>
            <p className="text-[10px] text-slate-600 mt-0.5 tabular-nums pl-6">{weekRangeStr}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-sm font-semibold text-white tabular-nums">{overallPct}%</span>

            {/* Last Week / Current Week segmented toggle */}
            <div className="hidden md:flex rounded-lg border border-white/[0.07] overflow-hidden">
              {([
                { label: "Last Week",    offset: -1 },
                { label: "Current Week", offset:  0 },
              ] as const).map(({ label, offset }, i) => (
                <button
                  key={offset}
                  onClick={() => setViewOffset(offset)}
                  className={`px-2.5 h-7 text-[11px] font-medium transition-all duration-150 ${
                    i === 0 ? "border-r border-white/[0.07]" : ""
                  } ${
                    viewOffset === offset
                      ? `bg-purple-600/20 text-purple-400 font-bold ${i === 0 ? "rounded-l-lg rounded-r-none" : "rounded-r-lg rounded-l-none"}`
                      : "bg-white/[0.02] text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* View All — matches Headspace trends link style */}
            <button
              onClick={() => setShowModal(true)}
              className="text-[11px] font-normal text-violet-400/70 hover:text-violet-300 transition-colors whitespace-nowrap"
            >
              View All →
            </button>
          </div>
        </div>

        {/* Metrics — desktop: single panel driven by the toggle above */}
        <div className="hidden md:block">
          <MetricsList metrics={metrics} />
        </div>

        {/* Metrics — mobile: swipeable carousel between Last Week and Current Week */}
        <div className="md:hidden flex flex-col gap-3">
          <div
            ref={scrollRef}
            onScroll={handleMobileScroll}
            className="flex overflow-x-auto snap-x snap-mandatory touch-pan-x [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="w-full flex-shrink-0 snap-center">
              <MetricsList metrics={lastWeekMetrics} />
            </div>
            <div className="w-full flex-shrink-0 snap-center">
              <MetricsList metrics={currentMetrics} />
            </div>
          </div>

          {/* Pagination dots */}
          <div className="flex items-center justify-center gap-1.5">
            {[0, 1].map((i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  mobileActiveIndex === i ? "w-4 bg-violet-400" : "w-1.5 bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>

      </div>

      {showModal && (
        <AllWeeksModal
          onClose={() => setShowModal(false)}
          sessions={sessions}
          historicalLogs={historicalLogs}
        />
      )}
    </>
  );
}
