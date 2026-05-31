"use client";

import { useState } from "react";
import { Flame, Trash2, Plus } from "lucide-react";
import { useDashboard, type Habit } from "@/context/DashboardContext";
import HabitModal from "@/components/HabitModal";

// ── Date helpers ──────────────────────────────────────────────────────────────

function getWeekDates(): { dateString: string; dayLabel: string; isToday: boolean }[] {
  const today = new Date();
  // Get Monday of the current ISO week
  const dow = (today.getDay() + 6) % 7; // 0 = Mon … 6 = Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);
  monday.setHours(0, 0, 0, 0);

  const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const ds = d.toLocaleDateString("en-CA");
    const isToday = ds === today.toLocaleDateString("en-CA");
    return { dateString: ds, dayLabel: DAY_LABELS[i], isToday };
  });
}

// ── Micro gauge bar ───────────────────────────────────────────────────────────

function GaugeBar({
  pct,
  label,
  accentClass,
}: {
  pct: number;
  label: string;
  accentClass: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${accentClass}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-[10px] font-medium tabular-nums text-slate-500 flex-shrink-0 w-12 text-right">
        {label}
      </span>
    </div>
  );
}

// ── Single habit row ──────────────────────────────────────────────────────────

function HabitRow({
  habit,
  weekDates,
}: {
  habit: Habit;
  weekDates: ReturnType<typeof getWeekDates>;
}) {
  const { toggleHabitDate, deleteHabit } = useDashboard();
  const isStop      = habit.type === "stop";
  const todayString = new Date().toLocaleDateString("en-CA");

  // ── Start-habit metrics ───────────────────────────────────────────────────
  const startDone = isStop
    ? 0
    : weekDates.filter((d) => habit.history[d.dateString]).length;

  const startPct    = Math.min(Math.round((startDone / Math.max(habit.targetCount, 1)) * 100), 100);
  const startAccent = startDone >= habit.targetCount
    ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
    : startDone > 0
      ? "bg-gradient-to-r from-violet-600 to-violet-400"
      : "bg-gradient-to-r from-slate-600 to-slate-500";

  // ── Stop-habit metrics (inverted logic) ───────────────────────────────────
  // history[date] === true  →  slipped on that day  (first click on an absent day sets true)
  // history[date] falsy/absent  →  clean (implicitly successful)
  const elapsedDates  = weekDates.filter((d) => d.dateString <= todayString);
  const slippedCount  = isStop
    ? elapsedDates.filter((d) => habit.history[d.dateString] === true).length
    : 0;
  const elapsedCount  = elapsedDates.length;
  const cleanCount    = elapsedCount - slippedCount;
  // Start at 100% when no days have elapsed yet or no slips
  const stopScore     = elapsedCount > 0 ? Math.round((cleanCount / elapsedCount) * 100) : 100;

  const stopAccent = stopScore === 100
    ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
    : stopScore >= 70
      ? "bg-gradient-to-r from-amber-500 to-amber-400"
      : "bg-gradient-to-r from-rose-700 to-rose-500";

  // ── Shared derived values ─────────────────────────────────────────────────
  const accentBar  = isStop ? stopAccent : startAccent;
  const gaugePct   = isStop ? stopScore : startPct;
  const gaugeLabel = isStop
    ? `${cleanCount}/${elapsedCount} clean`
    : `${startDone}/${habit.targetCount}`;
  const headerTag  = isStop
    ? slippedCount === 0
      ? "✅ Clean so far"
      : `⚠️ ${slippedCount} slip${slippedCount !== 1 ? "s" : ""} this week`
    : `🎯 ${startDone}/${habit.targetCount} this week`;

  return (
    <div className="group flex flex-col gap-2 p-3 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:border-white/[0.07] transition-all duration-200">

      {/* Row header */}
      <div className="flex items-center gap-2">
        <span className="text-base leading-none flex-shrink-0">{habit.emoji}</span>
        <span className="text-sm font-medium text-white flex-1 leading-none truncate">{habit.title}</span>
        <span className="text-[10px] text-slate-600 flex-shrink-0">{headerTag}</span>
        <button
          onClick={() => deleteHabit(habit.id)}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:text-red-400 transition-all duration-150"
          title="Delete habit"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Week date grid */}
      <div className="flex gap-1.5">
        {weekDates.map(({ dateString, dayLabel, isToday }) => {
          const isFuture = dateString > todayString;

          // Start habits: checked = history flag is truthy
          // Stop habits:  slipped = history flag is explicitly `true`
          //               clean   = absent or false; future = neutral
          const isSlipped  = isStop && habit.history[dateString] === true;
          const isChecked  = !isStop && !!habit.history[dateString];
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

          const dotClass = isChecked
            ? "bg-emerald-400"
            : isSlipped
              ? "bg-red-400"
              : isStopClean
                ? "bg-emerald-500/40"
              : isToday
                ? "bg-violet-500/50"
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
      </div>

      {/* Micro gauge */}
      <GaugeBar pct={gaugePct} label={gaugeLabel} accentClass={accentBar} />
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export default function HabitTrackerCard() {
  const { habits } = useDashboard();
  const [showModal, setShowModal] = useState(false);
  const weekDates = getWeekDates();

  const startHabits = habits.filter((h) => h.type === "start");
  const stopHabits  = habits.filter((h) => h.type === "stop");

  return (
    <>
      <HabitModal open={showModal} onClose={() => setShowModal(false)} />

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-violet-400" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Habit Tracker
            </h2>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 px-2.5 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 text-[11px] font-medium hover:bg-violet-600/30 hover:border-violet-500/50 transition-all duration-150"
          >
            <Plus className="w-3 h-3" /> Add Habit
          </button>
        </div>

        {/* Building section */}
        {startHabits.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-400">🔥 Building Consistency</span>
              <span className="flex-1 h-px bg-emerald-500/15" />
              <span className="text-[10px] text-slate-600">{startHabits.length} habit{startHabits.length !== 1 ? "s" : ""}</span>
            </div>
            {startHabits.map((h) => (
              <HabitRow key={h.id} habit={h} weekDates={weekDates} />
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
              <HabitRow key={h.id} habit={h} weekDates={weekDates} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {habits.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-6">
            No habits yet — add one to start tracking.
          </p>
        )}
      </div>
    </>
  );
}
