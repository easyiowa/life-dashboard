"use client";

import { useState } from "react";
import { Target, Moon, Play, Pause, Check, X, Clock, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { useDashboard, type Task, type HistoricalLog } from "@/context/DashboardContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(ds: string): string {
  const [y, m, d] = ds.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

const INTENT_OPTIONS: { value: Task["intent"]; label: string }[] = [
  { value: "finish", label: "🎯 Finish" },
  { value: "time",   label: "⏱️ Time Goal" },
  { value: "maybe",  label: "🎲 Maybe" },
];

const INTENT_ACTIVE: Record<NonNullable<Task["intent"]>, string> = {
  finish: "bg-violet-600/25 border-violet-500/50 text-violet-200",
  time:   "bg-blue-600/25 border-blue-500/50 text-blue-200",
  maybe:  "bg-slate-600/25 border-slate-500/40 text-slate-300",
};

const INACTIVE_PILL = "bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300";

// ── Queue row ─────────────────────────────────────────────────────────────────

function QueueRow({ task }: { task: Task }) {
  const { updateTask, toggleTaskComplete, toggleTaskForToday, startGlobalTimer, pauseGlobalTimer, activeTaskId, timerIsRunning, currentTrackingDate } = useDashboard();
  const intent             = task.intent ?? "finish";
  const totalFocusMinutes  = (task.timeSpentMinutes ?? 0) + (task.manualMinutes ?? 0);
  const isThisTaskActive   = activeTaskId === task.id && timerIsRunning;
  const isMaybe            = intent === "maybe";
  const goalMinutes        = task.dailyTargetMinutes ?? 0;
  const isTimeGoal         = intent === "time" && goalMinutes > 0;
  const pct                = isTimeGoal ? Math.min(Math.round((totalFocusMinutes / goalMinutes) * 100), 100) : 0;
  const goalAchieved       = isTimeGoal && totalFocusMinutes >= goalMinutes;
  const [localMins, setLocalMins] = useState<string>(task.dailyTargetMinutes?.toString() ?? "");

  function handleIntentChange(val: Task["intent"]) {
    updateTask(task.id, { intent: val, dailyTargetMinutes: val !== "time" ? null : (Number(localMins) || null) });
  }

  function handleTargetBlur() {
    const mins = Number(localMins);
    updateTask(task.id, { dailyTargetMinutes: mins > 0 ? mins : null });
  }

  function handleStart() {
    if (isThisTaskActive) {
      pauseGlobalTimer();
    } else {
      startGlobalTimer(task.id);
    }
  }

  const isComplete = task.done;

  return (
    <div className={`flex flex-col gap-2 p-2.5 rounded-xl border transition-all duration-200 overflow-hidden ${
      (isComplete || goalAchieved)
        ? "border-emerald-500/25 bg-emerald-500/[0.03]"
        : isMaybe
          ? "border-dashed border-white/[0.07] bg-white/[0.01] opacity-70"
          : "border-white/[0.05] bg-white/[0.02]"
    }`}>
      {/* Title row */}
      <div className="flex items-center gap-2">
        {/* Completion checkbox */}
        <button
          onClick={() => toggleTaskComplete(task.id)}
          aria-label={task.done ? "Mark incomplete" : "Mark complete"}
          className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center cursor-pointer transition-all duration-150 ${
            isComplete
              ? "bg-emerald-500/25 border-emerald-400/60 shadow-[0_0_8px_rgba(52,211,153,0.35)]"
              : "border-slate-600 hover:border-purple-400"
          }`}
        >
          {isComplete && <Check className="w-2.5 h-2.5 text-emerald-300" />}
        </button>
        {isThisTaskActive && <Zap className="w-3 h-3 text-violet-400 flex-shrink-0" />}
        <span className={`text-sm flex-1 leading-none truncate ${isComplete ? "line-through text-emerald-300/60" : "text-white font-medium"}`}>
          {task.title}
        </span>
        {totalFocusMinutes > 0 && (
          <span className={`flex items-center gap-1 text-[10px] font-mono flex-shrink-0 ${isComplete || goalAchieved ? "text-emerald-400" : "text-slate-500"}`}>
            <Clock className="w-2.5 h-2.5" />
            {totalFocusMinutes}m
          </span>
        )}
        {!task.done && (
          <button
            onClick={handleStart}
            title={isThisTaskActive ? "Pause focus timer" : "Start focus timer"}
            className={`flex-shrink-0 flex items-center gap-1 px-2 h-6 rounded-lg text-[10px] font-medium transition-all duration-150 ${
              isThisTaskActive
                ? "bg-violet-500/25 text-violet-300 border border-violet-400/40"
                : "bg-white/[0.05] border border-white/[0.08] text-slate-400 hover:text-violet-300 hover:border-violet-500/40 hover:bg-violet-500/10"
            }`}
          >
            {isThisTaskActive ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
            {isThisTaskActive ? "Pause" : "Focus"}
          </button>
        )}
        <button
          onClick={() => toggleTaskForToday(task.id, currentTrackingDate, "finish", null)}
          title="Remove from today"
          className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:text-slate-300 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Meta + intent selector */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-slate-600 flex-shrink-0">{task.project}</span>
        <span className="text-slate-700 text-[10px]">·</span>
        {INTENT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleIntentChange(opt.value)}
            className={`px-2 h-5 rounded-full text-[10px] font-medium border transition-all duration-100 ${
              intent === opt.value ? INTENT_ACTIVE[opt.value] : INACTIVE_PILL
            }`}
          >
            {opt.label}
          </button>
        ))}
        {intent === "time" && (
          <div className="flex items-center gap-1 ml-1">
            <input
              type="number"
              min={1}
              value={localMins}
              onChange={(e) => setLocalMins(e.target.value)}
              onBlur={handleTargetBlur}
              placeholder="min"
              className="w-14 h-5 px-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-white outline-none focus:border-blue-500/60 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className={`text-[10px] ${goalAchieved ? "text-emerald-400 font-medium" : "text-slate-600"}`}>
              {goalAchieved ? "✓ goal reached" : "min goal"}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar — flush to card bottom; always shown when done or time goal active */}
      {(isTimeGoal || isComplete) && (
        <div className="-mx-2.5 -mb-2.5 h-1 bg-white/[0.04]">
          <div
            className={`h-full transition-all duration-500 ease-out ${isComplete || goalAchieved ? "bg-emerald-500" : "bg-violet-500/50"}`}
            style={{ width: `${isComplete ? 100 : pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ── Task picker (backlog → queue) ─────────────────────────────────────────────

function TaskPicker({ onClose }: { onClose: () => void }) {
  const { tasks, spheres, currentTrackingDate, toggleTaskForToday } = useDashboard();
  const [search, setSearch] = useState("");
  const today = currentTrackingDate;

  const available = tasks.filter(
    (t) => !t.done && (t.queuedDate ?? null) !== today &&
      (search.trim() === "" || t.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-violet-500/20 bg-violet-600/[0.04]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-violet-300 uppercase tracking-widest">Add from backlog</span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <input
        autoFocus
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search tasks…"
        className="h-7 px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-xs text-white placeholder:text-slate-700 outline-none focus:border-violet-500/60 transition-colors"
      />
      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
        {available.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-3">No tasks available.</p>
        )}
        {available.map((t) => {
          const sphereColor = spheres.find((s) => s.name === t.sphere)?.labelColor ?? "slate";
          return (
            <button
              key={t.id}
              onClick={() => toggleTaskForToday(t.id, today, "finish", null)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/[0.05] transition-colors group"
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 bg-${sphereColor}-400`} />
              <span className="text-xs text-slate-300 flex-1 leading-none truncate">{t.title}</span>
              <span className="text-[10px] text-slate-600 flex-shrink-0">{t.project}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Archive helpers ───────────────────────────────────────────────────────────

function fmtArchiveDate(ds: string): string {
  const [y, m, d] = ds.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

function velocityBadgeClass(v: number): string {
  if (v >= 80) return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
  if (v >= 50) return "bg-violet-500/20 text-violet-300 border border-violet-500/30";
  if (v >= 25) return "bg-amber-500/20 text-amber-300 border border-amber-500/30";
  return "bg-rose-500/20 text-rose-300 border border-rose-500/30";
}

function ArchiveDayRow({ log }: { log: HistoricalLog }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-white/[0.04] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-white/[0.02] hover:bg-white/[0.04] transition-colors duration-150"
      >
        <span className="text-[11px] font-semibold text-white flex-1 text-left">
          {fmtArchiveDate(log.date)}
        </span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${velocityBadgeClass(log.dayVelocity)}`}>
          {log.dayVelocity}% Velocity
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-600 ml-1 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? "600px" : "0px" }}
      >
        <div className="px-3 pt-2 pb-3 flex flex-col gap-3">
          {log.recap && (
            <p className="text-[11px] text-slate-400 leading-relaxed italic border-l-2 border-violet-500/30 pl-2">
              {log.recap}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Completed</p>
              {log.completedTasks.length === 0 ? (
                <p className="text-[10px] text-slate-700">—</p>
              ) : (
                log.completedTasks.map((title, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 text-[10px] flex-shrink-0 mt-px">✓</span>
                    <span className="text-[10px] text-slate-400 leading-snug">{title}</span>
                  </div>
                ))
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Rolled Over</p>
              {log.rolledOverTasks.length === 0 ? (
                <p className="text-[10px] text-slate-700">—</p>
              ) : (
                log.rolledOverTasks.map((title, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-slate-500 text-[10px] flex-shrink-0 mt-px">↩</span>
                    <span className="text-[10px] text-slate-500 leading-snug">{title}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PerformanceArchive({ logs }: { logs: HistoricalLog[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/[0.03] transition-colors duration-150"
      >
        <span className="text-xs font-semibold text-slate-300 flex-1 text-left">🕒 Performance Archive</span>
        <span className="text-[10px] text-slate-500 tabular-nums">
          {logs.length} day{logs.length !== 1 ? "s" : ""}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-600 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? "3000px" : "0px" }}
      >
        <div className="px-3 pb-3 pt-1 flex flex-col gap-1">
          {logs.map((log, index) => (
            <ArchiveDayRow key={`${log.date}-${index}`} log={log} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export default function DailyFocusQueueCard() {
  const { tasks, currentTrackingDate, requestNightlyReview, historicalLogs } = useDashboard();
  const [showPicker, setShowPicker] = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);

  const queuedTasks   = tasks.filter((t) => (t.queuedDate ?? null) === currentTrackingDate);
  const commitments   = queuedTasks.filter((t) => (t.intent ?? "finish") !== "maybe");
  const maybes        = queuedTasks.filter((t) => (t.intent ?? "finish") === "maybe");
  const doneCount     = commitments.filter((t) => t.done).length;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5 flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-violet-400" />
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Today's Focus Queue
          </h2>
          {queuedTasks.length > 0 && (
            <span className="text-[10px] text-slate-600">
              {fmtDate(currentTrackingDate)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {queuedTasks.length > 0 && (
            <span className="text-[10px] text-slate-500 tabular-nums">
              {doneCount}/{commitments.length} done
            </span>
          )}
          <button
            onClick={() => requestNightlyReview()}
            className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-violet-600 text-white text-[11px] font-semibold hover:bg-violet-500 transition-all duration-150 shadow-[0_0_14px_rgba(124,58,237,0.45)] hover:shadow-[0_0_20px_rgba(124,58,237,0.6)]"
            title="Open nightly review"
          >
            <Moon className="w-3 h-3" />
            Call it a Day
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-300 transition-colors"
          >
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Body — collapsible */}
      {!collapsed && (
        <>
          {/* Commitment tasks */}
          {commitments.length === 0 && maybes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <Target className="w-6 h-6 text-slate-700" />
              <p className="text-xs text-slate-600">No tasks queued for today.</p>
              <p className="text-[10px] text-slate-700">Add tasks from your backlog to start planning.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {commitments.map((t) => <QueueRow key={t.id} task={t} />)}
              {maybes.length > 0 && (
                <>
                  <p className="text-[10px] text-slate-600 mt-1 px-1">🎲 Bonus / Maybe</p>
                  {maybes.map((t) => <QueueRow key={t.id} task={t} />)}
                </>
              )}
            </div>
          )}

          {/* Picker + Add button */}
          {showPicker
            ? <TaskPicker onClose={() => setShowPicker(false)} />
            : (
              <button
                onClick={() => setShowPicker(true)}
                className="flex items-center gap-1.5 justify-center h-7 rounded-xl border border-dashed border-white/[0.10] text-[11px] text-slate-600 hover:text-slate-300 hover:border-white/[0.20] transition-all duration-150"
              >
                + Plan a task for today
              </button>
            )}

          {/* Performance Archive */}
          {historicalLogs.length > 0 && (
            <PerformanceArchive logs={historicalLogs} />
          )}
        </>
      )}
    </div>
  );
}
