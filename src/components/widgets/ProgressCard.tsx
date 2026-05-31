"use client";

import { TrendingUp } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";

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

function getWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const dow = now.getDay(); // 0 = Sun
  const start = new Date(now);
  start.setDate(now.getDate() - ((dow + 6) % 7));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

export default function ProgressCard() {
  const { tasks, projects, sessions } = useDashboard();

  const { start: weekStart, end: weekEnd } = getWeekBounds();

  // ── Metric 1: Tasks Done ──────────────────────────────────────────────────
  const doneTasks  = tasks.filter((t) => t.done).length;
  const totalTasks = tasks.length;

  // ── Metric 2: Focus Time this week (hours) ────────────────────────────────
  const weekSessions = sessions.filter((s) => {
    const d = new Date(s.completedAt);
    return d >= weekStart && d < weekEnd;
  });
  const weekFocusSec   = weekSessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const weekFocusHours = Math.round(weekFocusSec / 360) / 10; // 1 decimal, e.g. 2.5
  const focusTarget    = 20; // weekly goal in hours

  // ── Metric 3: Avg project progress ───────────────────────────────────────
  const projectProgress = projects.map((p) => {
    const pt = tasks.filter((t) => t.sphere === p.sphere && t.project === p.name);
    return pt.length > 0 ? Math.round((pt.filter((t) => t.done).length / pt.length) * 100) : 0;
  });
  const avgProjectProgress =
    projects.length > 0
      ? Math.round(projectProgress.reduce((s, v) => s + v, 0) / projects.length)
      : 0;

  // ── Metric 4: High-priority tasks done ───────────────────────────────────
  const highTasks = tasks.filter((t) => t.priority === "High");
  const highDone  = highTasks.filter((t) => t.done).length;
  const highTotal = highTasks.length;
  const highOpen  = highTotal - highDone;

  const metrics = [
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

  const overallPct = Math.round(
    metrics.reduce((sum, m) => sum + Math.min(m.current / m.target, 1), 0) / metrics.length * 100
  );

  // Dynamic week badges: W-2, W-1, current
  const currentWeek = getISOWeek(new Date());
  const weekBadges = [currentWeek - 2, currentWeek - 1, currentWeek];

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-400" />
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Weekly Progress
          </h2>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500">Overall</span>
          <span className="ml-2 text-sm font-semibold text-white">{overallPct}%</span>
        </div>
      </div>

      {/* Metrics */}
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

      {/* Week badges */}
      <div className="flex gap-2 pt-1 border-t border-white/[0.05]">
        {weekBadges.map((week, i) => (
          <div
            key={week}
            className={`flex-1 rounded-lg py-1.5 text-center text-xs font-medium transition-colors ${
              i === 2
                ? "bg-violet-600/20 border border-violet-500/30 text-violet-300"
                : "bg-white/[0.03] border border-white/[0.05] text-slate-500"
            }`}
          >
            W{week}
            {i === 2 && <span className="ml-1 text-[9px] text-violet-400">current</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
