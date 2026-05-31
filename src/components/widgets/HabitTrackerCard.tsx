"use client";

import { useState } from "react";
import { Flame, Trash2, Plus, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { useDashboard, type Habit } from "@/context/DashboardContext";
import HabitModal from "@/components/HabitModal";
import HabitEditModal from "@/components/HabitEditModal";

// ── Week-date helpers ─────────────────────────────────────────────────────────

function getWeekDates(): { dateString: string; dayLabel: string; isToday: boolean }[] {
  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // 0 = Mon … 6 = Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);
  monday.setHours(0, 0, 0, 0);
  const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const ds = d.toLocaleDateString("en-CA");
    return { dateString: ds, dayLabel: DAY_LABELS[i], isToday: ds === today.toLocaleDateString("en-CA") };
  });
}

// ── Month analytics helpers ───────────────────────────────────────────────────

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function mds(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface MonthStats {
  successfulDays: number;
  totalElapsed: number;
  consistencyPct: number;
  streak: number;
  totalDays: number;
}

function computeMonthStats(habit: Habit, year: number, month: number): MonthStats {
  const isStop    = habit.type === "stop";
  const totalDays = daysInMonth(year, month);
  const todayStr  = new Date().toLocaleDateString("en-CA");
  const today     = new Date();
  const isCurrent = year === today.getFullYear() && month === today.getMonth();
  const endDay    = isCurrent ? today.getDate() : totalDays;

  let successfulDays = 0;
  let totalElapsed   = 0;

  for (let d = 1; d <= endDay; d++) {
    const ds = mds(year, month, d);
    if (ds > todayStr) continue;
    totalElapsed++;
    const ok = isStop ? habit.history[ds] !== true : habit.history[ds] === true;
    if (ok) successfulDays++;
  }

  // Streak: consecutive successes counting backward from end of elapsed period
  let streak = 0;
  for (let d = endDay; d >= 1; d--) {
    const ds = mds(year, month, d);
    if (ds > todayStr) continue;
    const ok = isStop ? habit.history[ds] !== true : habit.history[ds] === true;
    if (ok) streak++;
    else break;
  }

  const consistencyPct = totalElapsed > 0
    ? Math.round((successfulDays / totalElapsed) * 100)
    : 100;

  return { successfulDays, totalElapsed, consistencyPct, streak, totalDays };
}

// ── Gauge bar ─────────────────────────────────────────────────────────────────

function GaugeBar({ pct, label, accentClass }: { pct: number; label: string; accentClass: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${accentClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-[10px] font-medium tabular-nums text-slate-500 flex-shrink-0 w-12 text-right">{label}</span>
    </div>
  );
}

// ── Monthly analytics panel (micro-dot stream) ───────────────────────────────

function HabitMonthAnalytics({
  habit,
  year,
  month,
}: {
  habit: Habit;
  year: number;
  month: number;
}) {
  const isStop   = habit.type === "stop";
  const todayStr = new Date().toLocaleDateString("en-CA");
  const { successfulDays, consistencyPct, streak, totalDays } =
    computeMonthStats(habit, year, month);

  return (
    <div className="flex flex-col gap-1.5 pt-2 border-t border-white/[0.05]">

      {/* Single-line condensed stats */}
      <p className="text-[10px] font-mono text-slate-500 tracking-tight">
        Wins:&nbsp;<span className="text-slate-300">{successfulDays}</span>
        &nbsp;&nbsp;Ratio:&nbsp;<span className={
          consistencyPct === 100 ? "text-emerald-400"
          : consistencyPct >= 70 ? "text-amber-400"
          : "text-rose-400"
        }>{consistencyPct}%</span>
        &nbsp;&nbsp;Streak:&nbsp;<span className="text-violet-300">{streak}d</span>
      </p>

      {/* Micro-dot stream with weekday letters */}
      <div className="flex w-full justify-between items-center py-3">
        {Array.from({ length: totalDays }, (_, i) => {
          const day      = i + 1;
          const ds       = mds(year, month, day);
          const isFuture = ds > todayStr;

          // Dot colour — untouched
          const dotClass = isFuture
            ? "bg-white/[0.06]"
            : isStop
              ? habit.history[ds] === false
                ? "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]"
                : "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
              : habit.history[ds] === true
                ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                : "bg-white/[0.06]";

          const DOW_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
          const dow    = new Date(year, month, day).getDay(); // 0 = Sun
          const letter = DOW_LETTERS[dow];

          return (
            <div key={ds} className="flex flex-col items-center gap-1 flex-1">
              <span title={ds} className={`h-2 w-2 rounded-full transition-all ${dotClass}`} />
              <span className={`text-[9px] font-mono font-medium ${
                dow === 0 ? "text-purple-400 font-bold" : "text-slate-500"
              }`}>
                {letter}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Single habit row ──────────────────────────────────────────────────────────

function HabitRow({
  habit,
  weekDates,
  showAnalytics,
  analyticsYear,
  analyticsMonth,
  onEdit,
}: {
  habit: Habit;
  weekDates: ReturnType<typeof getWeekDates>;
  showAnalytics: boolean;
  analyticsYear: number;
  analyticsMonth: number;
  onEdit: (h: Habit) => void;
}) {
  const { toggleHabitDate, deleteHabit } = useDashboard();
  const isStop      = habit.type === "stop";
  const todayString = new Date().toLocaleDateString("en-CA");

  // ── Start-habit weekly metrics ────────────────────────────────────────────
  const startDone   = isStop ? 0 : weekDates.filter((d) => habit.history[d.dateString]).length;
  const startPct    = Math.min(Math.round((startDone / Math.max(habit.targetCount, 1)) * 100), 100);
  const startAccent = startDone >= habit.targetCount
    ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
    : startDone > 0 ? "bg-gradient-to-r from-violet-600 to-violet-400"
    : "bg-gradient-to-r from-slate-600 to-slate-500";

  // ── Stop-habit weekly metrics (inverted) ──────────────────────────────────
  const elapsedDates = weekDates.filter((d) => d.dateString <= todayString);
  const slippedCount = isStop
    ? elapsedDates.filter((d) => habit.history[d.dateString] === true).length
    : 0;
  const elapsedCount = elapsedDates.length;
  const cleanCount   = elapsedCount - slippedCount;
  const stopScore    = elapsedCount > 0 ? Math.round((cleanCount / elapsedCount) * 100) : 100;
  const stopAccent   = stopScore === 100
    ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
    : stopScore >= 70 ? "bg-gradient-to-r from-amber-500 to-amber-400"
    : "bg-gradient-to-r from-rose-700 to-rose-500";

  // ── Shared display values ─────────────────────────────────────────────────
  const accentBar  = isStop ? stopAccent : startAccent;
  const gaugePct   = isStop ? stopScore : startPct;
  const gaugeLabel = isStop ? `${cleanCount}/${elapsedCount} clean` : `${startDone}/${habit.targetCount}`;
  const headerTag  = isStop
    ? slippedCount === 0 ? "✅ Clean so far" : `⚠️ ${slippedCount} slip${slippedCount !== 1 ? "s" : ""} this week`
    : `🎯 ${startDone}/${habit.targetCount} this week`;

  return (
    <div className="group flex flex-col gap-2 p-3 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:border-white/[0.07] transition-all duration-200">

      {/* Row header */}
      <div className="flex items-center gap-2">
        <span className="text-base leading-none flex-shrink-0">{habit.emoji}</span>
        <span className="text-sm font-medium text-white flex-1 leading-none truncate">{habit.title}</span>
        <span className="text-[10px] text-slate-600 flex-shrink-0">{headerTag}</span>
        <button
          onClick={() => onEdit(habit)}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors duration-150"
          title="Edit habit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => deleteHabit(habit.id)}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:text-red-400 transition-all duration-150"
          title="Delete habit"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Weekly date grid + gauge — checklist mode only */}
      {!showAnalytics && <div className="flex gap-1.5">
        {weekDates.map(({ dateString, dayLabel, isToday }) => {
          const isFuture    = dateString > todayString;
          const isSlipped   = isStop && habit.history[dateString] === true;
          const isChecked   = !isStop && !!habit.history[dateString];
          const isStopClean = isStop && !isFuture && !isSlipped;

          const btnClass = isChecked
            ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-300"
            : isSlipped
              ? "bg-red-600/20 border-red-500/40 text-red-300"
              : isStopClean && isToday
                ? "border-violet-500/30 bg-violet-600/[0.06] text-violet-300"
              : isStopClean
                ? "bg-emerald-600/[0.08] border-emerald-500/20 text-emerald-500"
              : isToday
                ? "border-violet-500/30 bg-violet-600/[0.06] text-violet-300"
                : isFuture && isStop
                  ? "border-white/[0.04] bg-transparent text-slate-700 cursor-default"
                  : "border-white/[0.05] bg-white/[0.02] text-slate-600 hover:border-white/[0.12] hover:text-slate-400";

          const dotClass = isChecked ? "bg-emerald-400"
            : isSlipped ? "bg-red-400"
            : isStopClean ? "bg-emerald-500/40"
            : isToday ? "bg-violet-500/50"
            : "bg-white/[0.08]";

          return (
            <button
              key={dateString}
              onClick={() => { if (!(isFuture && isStop)) toggleHabitDate(habit.id, dateString); }}
              title={dateString}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all duration-150 ${btnClass}`}
            >
              <span>{dayLabel}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
            </button>
          );
        })}
      </div>}

      {/* Micro gauge — checklist mode only */}
      {!showAnalytics && <GaugeBar pct={gaugePct} label={gaugeLabel} accentClass={accentBar} />}

      {/* Monthly analytics — expands below in analytics mode */}
      {showAnalytics && (
        <HabitMonthAnalytics habit={habit} year={analyticsYear} month={analyticsMonth} />
      )}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export default function HabitTrackerCard() {
  const { habits } = useDashboard();
  const [showModal,      setShowModal]      = useState(false);
  const [editingHabit,   setEditingHabit]   = useState<Habit | null>(null);
  const [viewMode,       setViewMode]       = useState<"check" | "analytics">("check");
  const [analyticsDate,  setAnalyticsDate]  = useState(() => new Date());

  const weekDates    = getWeekDates();
  const startHabits  = habits.filter((h) => h.type === "start");
  const stopHabits   = habits.filter((h) => h.type === "stop");
  const showAnalytics = viewMode === "analytics";

  const analyticsYear  = analyticsDate.getFullYear();
  const analyticsMonth = analyticsDate.getMonth();

  const today         = new Date();
  const isCurrentMonth =
    analyticsYear === today.getFullYear() && analyticsMonth === today.getMonth();

  const monthLabel = analyticsDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function prevMonth() {
    setAnalyticsDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    if (!isCurrentMonth) setAnalyticsDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  const rowProps = { weekDates, showAnalytics, analyticsYear, analyticsMonth, onEdit: setEditingHabit };

  return (
    <>
      <HabitModal open={showModal} onClose={() => setShowModal(false)} />
      <HabitEditModal habit={editingHabit} onClose={() => setEditingHabit(null)} />

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Flame className="w-4 h-4 text-violet-400" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Habit Tracker
            </h2>
          </div>

          {/* View mode segment control */}
          <div className="flex items-center bg-white/[0.05] border border-white/[0.07] rounded-lg p-0.5 gap-0.5">
            {(["check", "analytics"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 h-6 rounded-md text-[11px] font-medium transition-all duration-150 ${
                  viewMode === mode
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {mode === "check" ? "Checklist" : "Analytics"}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 px-2.5 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 text-[11px] font-medium hover:bg-violet-600/30 hover:border-violet-500/50 transition-all duration-150 flex-shrink-0"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        {/* Month navigation — visible in analytics mode */}
        {showAnalytics && (
          <div className="flex items-center justify-between px-1 -mt-2">
            <button
              onClick={prevMonth}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.07] transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-semibold text-slate-300">{monthLabel}</span>
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.07] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Building section */}
        {startHabits.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-400">🔥 Building Consistency</span>
              <span className="flex-1 h-px bg-emerald-500/15" />
              <span className="text-[10px] text-slate-600">{startHabits.length} habit{startHabits.length !== 1 ? "s" : ""}</span>
            </div>
            {startHabits.map((h) => (
              <HabitRow key={h.id} habit={h} {...rowProps} />
            ))}
          </div>
        )}

        {/* Breaking section */}
        {stopHabits.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-red-400">🛑 Breaking Chains</span>
              <span className="flex-1 h-px bg-red-500/15" />
              <span className="text-[10px] text-slate-600">{stopHabits.length} habit{stopHabits.length !== 1 ? "s" : ""}</span>
            </div>
            {stopHabits.map((h) => (
              <HabitRow key={h.id} habit={h} {...rowProps} />
            ))}
          </div>
        )}

        {habits.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-6">
            No habits yet — add one to start tracking.
          </p>
        )}
      </div>
    </>
  );
}
