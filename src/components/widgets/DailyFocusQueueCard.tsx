"use client";

import { useState, useRef, useEffect } from "react";
import { Target, Moon, Play, Pause, Check, X, Clock, ChevronDown, ChevronUp, Zap, Plus, Trash2 } from "lucide-react";
import { useDashboard, type Task, type HistoricalLog, type DailyTrackingEntry, type RecurringTask } from "@/context/DashboardContext";
import { areaColor } from "@/lib/areaColors";
import TaskInspectModal from "@/components/TaskInspectModal";
import { computeCountdown } from "@/components/widgets/RecurringCard";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(ds: string): string {
  const [y, m, d] = ds.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

export const INTENT_OPTIONS: { value: Task["intent"]; label: string }[] = [
  { value: "finish", label: "🎯 Finish" },
  { value: "time",   label: "⏱️ Time Goal" },
  { value: "maybe",  label: "🎲 Maybe" },
];

export const INTENT_ACTIVE: Record<NonNullable<Task["intent"]>, string> = {
  finish: "bg-violet-600/25 border-violet-500/50 text-violet-200",
  time:   "bg-blue-600/25 border-blue-500/50 text-blue-200",
  maybe:  "bg-slate-600/25 border-slate-500/40 text-slate-300",
};

const INACTIVE_PILL = "bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300";

// Swipe-to-delete reveal geometry — kept as named constants so the JS snap target
// always matches the tray's actual layout (icon button width + symmetric padding
// on each side, mirroring the pr-4/w-8 values used in the tray markup below).
const DELETE_ICON_SIZE      = 32; // px — w-8/h-8 icon button
const DELETE_TRAY_PADDING   = 16; // px — pr-4, mirrored on the icon's left side too
const DELETE_REVEAL_OFFSET  = DELETE_ICON_SIZE + DELETE_TRAY_PADDING * 2; // 64px

// ── Queue row ─────────────────────────────────────────────────────────────────

function QueueRow({ task, onInspect }: { task: Task; onInspect: (t: Task) => void }) {
  const { updateTaskDaily, toggleTaskComplete, toggleTaskForToday, startGlobalTimer, pauseGlobalTimer, activeTaskId, timerIsRunning, elapsed, committedSecs, currentTrackingDate, spheres } = useDashboard();
  const ac = areaColor(spheres.find((s) => s.name === task.sphere)?.labelColor);

  // ── Mobile swipe-left-to-delete gesture ──────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null); // wraps tray + foreground — used to detect outside taps
  const rowRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef<{ startX: number; startY: number; axis: "x" | "y" | null }>({ startX: 0, startY: 0, axis: null });
  const suppressClickRef = useRef(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // locked at the symmetric anchor, awaiting a follow-up tap

  function closeRow() {
    setDragX(0);
    setIsOpen(false);
  }

  // While the row is pinned open, any vertical page scroll or any tap/touch outside this
  // row's own bounds should snap it closed again. Listeners are only live while open, and
  // are torn down immediately on close so idle rows never pay for this.
  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideInteraction(e: Event) {
      const target = e.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        closeRow();
      }
    }

    function handleScroll() {
      closeRow();
    }

    document.addEventListener("pointerdown", handleOutsideInteraction, true);
    document.addEventListener("touchstart", handleOutsideInteraction, true);
    document.addEventListener("click", handleOutsideInteraction, true);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideInteraction, true);
      document.removeEventListener("touchstart", handleOutsideInteraction, true);
      document.removeEventListener("click", handleOutsideInteraction, true);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen]);

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchRef.current = { startX: t.clientX, startY: t.clientY, axis: null };
  }

  function handleTouchMove(e: React.TouchEvent) {
    const t = e.touches[0];
    const deltaX = t.clientX - touchRef.current.startX;
    const deltaY = t.clientY - touchRef.current.startY;

    if (touchRef.current.axis === null) {
      // Vertical intent wins immediately — let the native page scroll take over.
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        touchRef.current.axis = "y";
        return;
      }
      // Require a clear horizontal intent before locking the gesture.
      if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
        touchRef.current.axis = "x";
        setIsDragging(true);
      } else {
        return;
      }
    }

    if (touchRef.current.axis !== "x") return;

    const width = rowRef.current?.offsetWidth ?? 1;
    setDragX(Math.min(0, Math.max(deltaX, -width)));
  }

  function handleTouchEnd() {
    if (touchRef.current.axis === "x") {
      const width = rowRef.current?.offsetWidth ?? 1;
      if (Math.abs(dragX) >= width * 0.6) {
        // Long-swipe past 60% — commit the delete immediately, no need to settle on the anchor first.
        toggleTaskForToday(task.id, currentTrackingDate, "finish", null);
        setDragX(0);
        setIsOpen(false);
      } else if (Math.abs(dragX) >= DELETE_REVEAL_OFFSET) {
        // Past the reveal point but short of the delete trigger — magnetically lock onto the
        // pre-calculated symmetric anchor instead of resting wherever the finger happened to lift.
        setDragX(-DELETE_REVEAL_OFFSET);
        setIsOpen(true);
      } else {
        // Short swipe — snap fully back closed.
        setDragX(0);
        setIsOpen(false);
      }
      suppressClickRef.current = true;
    } else {
      setDragX(0);
      setIsOpen(false);
    }
    setIsDragging(false);
    touchRef.current.axis = null;
  }

  function handleRowClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onInspect(task);
  }

  // All daily focus data reads from the per-date registry — never from cumulative task fields
  const dailyEntry: DailyTrackingEntry = task.dailyTracking?.[currentTrackingDate]
    ?? { timeSpentMinutes: 0, intent: "finish", dailyTargetMinutes: null };

  const intent             = dailyEntry.intent;
  const committedFocusMins = dailyEntry.timeSpentMinutes; // today only, no historical bleed
  const isThisTaskActive   = activeTaskId === task.id && timerIsRunning;
  const isMaybe            = intent === "maybe";
  const goalMinutes        = dailyEntry.dailyTargetMinutes ?? 0;
  const isTimeGoal         = intent === "time" && goalMinutes > 0;
  // Second-precision calculation so the bar moves every tick, not once per minute.
  const goalSecs           = goalMinutes * 60;
  const liveTotalSecs      = (committedFocusMins * 60) + (isThisTaskActive ? (elapsed - committedSecs) : 0);
  const pct                = isTimeGoal && goalSecs > 0 ? Math.min((liveTotalSecs / goalSecs) * 100, 100) : 0;
  const totalFocusMinutes  = Math.floor(liveTotalSecs / 60);
  const goalAchieved       = isTimeGoal && liveTotalSecs >= goalSecs;
  const [localMins, setLocalMins] = useState<string>(dailyEntry.dailyTargetMinutes?.toString() ?? "");

  function handleIntentChange(val: Task["intent"]) {
    const resolvedIntent = val ?? "finish";
    // Pre-fill 25 min when switching to time goal with no value set
    if (resolvedIntent === "time" && !localMins) setLocalMins("25");
    updateTaskDaily(task.id, currentTrackingDate, {
      intent: resolvedIntent,
      dailyTargetMinutes: resolvedIntent !== "time" ? null : (Number(localMins) || 25),
    });
  }

  function handleTargetBlur() {
    const mins = Number(localMins);
    updateTaskDaily(task.id, currentTrackingDate, { dailyTargetMinutes: mins > 0 ? mins : null });
  }

  function handleStart() {
    if (isThisTaskActive) {
      pauseGlobalTimer();
    } else {
      startGlobalTimer(task.id);
    }
  }

  const isComplete = task.done;

  const cardToneClass = (isComplete || goalAchieved)
    ? "border-emerald-500/25 bg-emerald-500/[0.03]"
    : isMaybe
      ? "border-dashed border-white/[0.07] bg-white/[0.01] opacity-70"
      : "border-white/[0.05] bg-white/[0.02]";

  return (
    <div ref={containerRef} className="relative rounded-xl overflow-hidden">
      {/* Underlayer — stationary delete tray, fully covered by the foreground card at rest */}
      <div className="md:hidden absolute inset-0 flex items-center justify-end pr-4 bg-white/[0.02]">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleTaskForToday(task.id, currentTrackingDate, "finish", null); closeRow(); }}
          aria-label="Delete task"
          className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] text-red-500"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

    {/* Foreground layer — the draggable task card; opaque base blocks the red tray underneath */}
    <div
      ref={rowRef}
      onClick={handleRowClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ transform: `translateX(${dragX}px)`, transition: isDragging ? "none" : "transform 0.2s ease-out" }}
      className="relative rounded-xl overflow-hidden cursor-pointer touch-pan-y"
    >
      <div className="absolute inset-0 rounded-xl bg-[#0F1629]" />
      <div className={`absolute inset-0 rounded-xl border transition-colors duration-200 ${cardToneClass}`} />

      <div className="relative flex flex-col gap-2 p-2.5 hover:bg-white/[0.03] transition-colors duration-200">
      {/* Title row */}
      <div className="flex items-center gap-2">
        {/* Completion checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleTaskComplete(task.id); }}
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
        <span className={`text-sm flex-1 leading-normal pb-0.5 truncate ${isComplete ? "line-through text-emerald-300/60" : "text-white font-medium"}`}>
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
            onClick={(e) => { e.stopPropagation(); handleStart(); }}
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
          onClick={(e) => { e.stopPropagation(); toggleTaskForToday(task.id, currentTrackingDate, "finish", null); }}
          title="Remove from today"
          className="hidden md:flex flex-shrink-0 w-5 h-5 rounded items-center justify-center text-slate-600 hover:text-slate-300 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Meta row — sphere/project left, intent pills right (desktop only — pills move into the Task Properties sheet on mobile) */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-medium flex-shrink-0 ${ac.text}`}>{task.sphere}</span>
          <span className="text-slate-700 text-[10px]">·</span>
          <span className="text-[10px] text-slate-500 flex-shrink-0">{task.project}</span>
        </div>
        {!isComplete && (
          <div className="hidden md:flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {INTENT_OPTIONS.map((opt) => {
              const isActive = intent === opt.value;
              if (opt.value === "time" && isActive) {
                return (
                  <div key={opt.value} className={`inline-flex items-center gap-0.5 px-2.5 h-5 rounded-full text-[10px] font-medium border ${INTENT_ACTIVE["time"]}`}>
                    <span className="flex-shrink-0 leading-none">⏱️</span>
                    <input
                      type="number"
                      min={1}
                      value={localMins}
                      onChange={(e) => setLocalMins(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                      onBlur={handleTargetBlur}
                      className="w-5 p-0 m-0 bg-transparent outline-none text-center leading-none text-blue-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className={`flex-shrink-0 ${goalAchieved ? "text-emerald-400" : ""}`}>
                      {goalAchieved ? "✓" : "min"}
                    </span>
                  </div>
                );
              }
              return (
                <button
                  key={opt.value}
                  onClick={() => handleIntentChange(opt.value)}
                  className={`px-2.5 h-5 rounded-full text-[10px] font-medium border transition-all duration-100 ${
                    isActive && opt.value ? INTENT_ACTIVE[opt.value] : INACTIVE_PILL
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      </div>

      {/* Progress bar — flush to card bottom; always shown when done or time goal active */}
      {(isTimeGoal || isComplete) && (
        <div className="relative h-1 bg-white/[0.04]">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${isComplete || goalAchieved ? "bg-emerald-500" : "bg-violet-500/50"}`}
            style={{ width: `${isComplete ? 100 : pct}%` }}
          />
        </div>
      )}
    </div>
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
        <span className="text-[10px] font-semibold text-violet-300 uppercase tracking-widest">Tasks from Project Widget</span>
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
        {log.completedTasks.length === 0 && log.rolledOverTasks.length === 0 ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30">
            ☕ Chill day
          </span>
        ) : (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${velocityBadgeClass(log.dayVelocity)}`}>
            {log.dayVelocity}% Velocity
          </span>
        )}
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
                log.completedTasks.map((title, i) => {
                  const meta = log.taskMeta?.[title];
                  return (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 text-[10px] flex-shrink-0 mt-0.5">✓</span>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[10px] text-slate-400 leading-snug truncate">{title}</span>
                        {meta && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] text-slate-600">
                              {meta.intent === "time" && meta.target
                                ? `⏱️ ${meta.target}m goal`
                                : meta.intent === "maybe" ? "🎲 Maybe" : "🎯 Finish"}
                            </span>
                            <span className="text-[9px] text-slate-600">
                              {meta.minutes > 0 ? `Worked: ${meta.minutes}m` : "Worked: 0m"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Rolled Over</p>
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] text-slate-700">
                              {meta.intent === "time" && meta.target
                                ? `⏱️ ${meta.target}m goal`
                                : meta.intent === "maybe" ? "🎲 Maybe" : "🎯 Finish"}
                            </span>
                            <span className="text-[9px] text-slate-700">
                              {meta.minutes > 0 ? `Worked: ${meta.minutes}m` : "Worked: 0m"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Mind-state snapshot — rendered when the day had a check-in */}
          {log.mindStateClosure && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-white/[0.04]">
              <p className="text-[9px] font-bold text-violet-400/70 uppercase tracking-widest">🧠 Mind State</p>
              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-[10px] text-violet-300">{log.mindStateClosure.morningMood}</span>
                {log.mindStateClosure.morningTags.length > 0 && (
                  <span className="text-[10px] text-slate-500">{log.mindStateClosure.morningTags.join(" ")}</span>
                )}
                <span className="text-[10px] text-slate-600">→</span>
                <span className={`text-[10px] font-medium ${
                  log.mindStateClosure.endDelta === "better" ? "text-emerald-400"
                  : log.mindStateClosure.endDelta === "worse" ? "text-rose-400"
                  : "text-slate-400"
                }`}>
                  {log.mindStateClosure.endDelta === "better" ? "📈 Better"
                   : log.mindStateClosure.endDelta === "worse"  ? "📉 Worse"
                   : "⚖️ Same"}
                </span>
              </div>
              {(log.mindStateClosure.morningNote || log.mindStateClosure.closureNote) && (
                <div className="flex flex-col gap-0.5">
                  {log.mindStateClosure.morningNote && (
                    <p className="text-[9px] text-slate-600 italic">AM: &ldquo;{log.mindStateClosure.morningNote}&rdquo;</p>
                  )}
                  {log.mindStateClosure.closureNote && (
                    <p className="text-[9px] text-slate-600 italic">PM: &ldquo;{log.mindStateClosure.closureNote}&rdquo;</p>
                  )}
                </div>
              )}
            </div>
          )}
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

// ── Rollover suggestion widget ────────────────────────────────────────────────

function RolloverWidget({ log, onDismiss }: { log: HistoricalLog; onDismiss: () => void }) {
  const { tasks, currentTrackingDate, toggleTaskForToday } = useDashboard();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const pendingTasks = log.rolledOverTasks
    .map((title) => tasks.find((t) => t.title === title))
    .filter((t): t is Task =>
      t !== undefined &&
      !t.done &&
      (t.queuedDate ?? null) !== currentTrackingDate &&
      !dismissedIds.has(t.id)
    );

  // Auto-close when every item has been individually actioned
  if (pendingTasks.length === 0) return null;

  function addOne(t: Task) {
    toggleTaskForToday(t.id, currentTrackingDate, t.intent ?? "finish", t.dailyTargetMinutes ?? null);
  }

  function dismissOne(id: string) {
    setDismissedIds((prev) => new Set([...prev, id]));
  }

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm leading-none">↩</span>
          <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-widest">
            {pendingTasks.length} unfinished from yesterday
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-600 hover:text-slate-400 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {pendingTasks.map((t) => {
          const meta = log.taskMeta?.[t.title];
          return (
            <div key={t.id} className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white/[0.02] group/row">
              {/* Title — flex-1 min-w-0 prevents collision with right-side content */}
              <span className="flex-1 min-w-0 text-xs text-slate-400 leading-normal truncate">{t.title}</span>
              {/* Meta label */}
              {meta && (
                <span className="text-[9px] text-slate-600 flex-shrink-0 tabular-nums whitespace-nowrap">
                  {meta.intent === "time" && meta.target
                    ? `${meta.target}m goal`
                    : meta.intent === "maybe" ? "Maybe" : "Finish"}
                  {meta.minutes > 0 && ` · ${meta.minutes}m`}
                </span>
              )}
              {/* Per-row actions — always visible */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => addOne(t)}
                  title="Add to today's queue"
                  className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-slate-950 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => dismissOne(t.id)}
                  title="Keep in backlog"
                  className="p-1.5 rounded-lg bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:bg-red-500 hover:text-white hover:border-red-600 transition-all duration-200 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Persistent per-day suggestion dismissals ──────────────────────────────────
// Key format: dismissed_suggestions_YYYY-MM-DD — auto-expires when date changes.

function useDayDismissed(date: string): [Set<string>, (key: string) => void] {
  const storageKey = `dismissed_suggestions_${date}`;

  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set<string>();
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  function dismiss(key: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(key);
      try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch { /* quota */ }
      return next;
    });
  }

  return [dismissed, dismiss];
}

// ── Birthday auto-inject rows ─────────────────────────────────────────────────

function BirthdayRows() {
  const { networkContacts, currentTrackingDate } = useDashboard();
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [dismissed, dismiss]        = useDayDismissed(currentTrackingDate);

  const todayBirthdays = networkContacts.filter(
    (c) => c.birthday && c.birthday.slice(5) === currentTrackingDate.slice(5) && !dismissed.has(`bday-${c.id}`)
  );
  if (todayBirthdays.length === 0) return null;

  function toggle(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <>
      {todayBirthdays.map((c) => {
        const done = checkedIds.has(c.id);
        return (
          <div key={c.id} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all duration-200 ${done ? "border-emerald-500/25 bg-emerald-500/[0.03]" : "border-white/[0.05] bg-white/[0.02]"}`}>
            <button
              type="button"
              onClick={() => toggle(c.id)}
              className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-150 ${done ? "bg-emerald-500/25 border-emerald-400/60 shadow-[0_0_8px_rgba(52,211,153,0.35)]" : "border-slate-600 hover:border-pink-400"}`}
            >
              {done && <Check className="w-2.5 h-2.5 text-emerald-300" />}
            </button>
            <span className={`flex-1 text-sm leading-normal pb-0.5 truncate ${done ? "line-through text-emerald-300/60" : "text-white font-medium"}`}>
              🎂 {c.name}
            </span>
            <button
              type="button"
              onClick={() => dismiss(`bday-${c.id}`)}
              title="Dismiss"
              className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:text-slate-300 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </>
  );
}

// ── Recurring tasks added directly to today's queue ───────────────────────────

function AddedRecurringRows({ items, onRemove }: { items: RecurringTask[]; onRemove: (id: string) => void }) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  if (items.length === 0) return null;

  function toggle(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <>
      {items.map((rt) => {
        const done = checkedIds.has(rt.id);
        return (
          <div key={rt.id} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all duration-200 ${done ? "border-emerald-500/25 bg-emerald-500/[0.03]" : "border-white/[0.05] bg-white/[0.02]"}`}>
            <button
              type="button"
              onClick={() => toggle(rt.id)}
              className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-150 ${done ? "bg-emerald-500/25 border-emerald-400/60 shadow-[0_0_8px_rgba(52,211,153,0.35)]" : "border-slate-600 hover:border-violet-400"}`}
            >
              {done && <Check className="w-2.5 h-2.5 text-emerald-300" />}
            </button>
            <span className={`flex-1 text-sm leading-normal pb-0.5 truncate ${done ? "line-through text-emerald-300/60" : "text-white font-medium"}`}>
              ♻️ {rt.title}
            </span>
            <button
              type="button"
              onClick={() => onRemove(rt.id)}
              title="Remove from focus"
              className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:text-slate-300 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </>
  );
}

// ── Today's aggregation suggestions ──────────────────────────────────────────

function TodaySuggestions({ onDismiss, onAddRecurring }: { onDismiss: () => void; onAddRecurring: (rt: RecurringTask) => void }) {
  const { tasks, recurringTasks, currentTrackingDate, toggleTaskForToday, spheres } = useDashboard();
  const [dismissed, dismiss] = useDayDismissed(currentTrackingDate);

  const today = currentTrackingDate;

  const deadlineSuggestions = tasks.filter((t) =>
    t.deadline === today &&
    !t.done &&
    (t.queuedDate ?? null) !== today &&
    !dismissed.has(`task-${t.id}`)
  );

  const recurringSuggestions = recurringTasks.filter((rt) => {
    if (dismissed.has(`rt-${rt.id}`)) return false;
    return computeCountdown(rt).daysLeft <= 0;
  });

  const hasAny = deadlineSuggestions.length > 0 || recurringSuggestions.length > 0;
  if (!hasAny) return null;

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-600/[0.04] p-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm leading-none">✨</span>
          <span className="text-[10px] font-semibold text-violet-300 uppercase tracking-widest">
            Today&apos;s Aggregation
          </span>
        </div>
        <button type="button" onClick={onDismiss} className="text-slate-600 hover:text-slate-400 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {/* Recurring responsibilities due today */}
        {recurringSuggestions.map((rt) => {
          const ac = areaColor(spheres.find((s) => s.name === rt.sphere)?.labelColor);
          return (
            <div
              key={rt.id}
              onClick={() => { onAddRecurring(rt); dismiss(`rt-${rt.id}`); }}
              className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer transition-colors"
            >
              <span className={`flex-1 min-w-0 text-xs leading-normal truncate ${ac.text}`}>
                ♻️ {rt.title}
              </span>
              <span className="text-[9px] text-slate-600 flex-shrink-0 tabular-nums">{rt.intervalLabel}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onAddRecurring(rt); dismiss(`rt-${rt.id}`); }}
                  title="Add to today's focus"
                  className="p-1.5 rounded-lg border transition-all cursor-pointer bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500 hover:text-white dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-500/30 dark:hover:bg-violet-500"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); dismiss(`rt-${rt.id}`); }}
                  title="Dismiss"
                  className="p-1.5 rounded-lg bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:bg-red-500 hover:text-white hover:border-red-600 transition-all duration-200 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Tasks with deadline today — addable directly to today's queue */}
        {deadlineSuggestions.map((t) => {
          const ac = areaColor(spheres.find((s) => s.name === t.sphere)?.labelColor);
          return (
            <div key={t.id} className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white/[0.02]">
              <span className={`flex-1 min-w-0 text-xs leading-normal truncate ${ac.text}`}>
                📅 {t.title}
              </span>
              <span className="text-[9px] text-slate-600 flex-shrink-0">Due today</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleTaskForToday(t.id, today, "finish", null); dismiss(`task-${t.id}`); }}
                  title="Add to today's focus"
                  className="p-1.5 rounded-lg border transition-all cursor-pointer bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500 hover:text-white dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-500/30 dark:hover:bg-violet-500"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); dismiss(`task-${t.id}`); }}
                  title="Dismiss"
                  className="p-1.5 rounded-lg bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:bg-red-500 hover:text-white hover:border-red-600 transition-all duration-200 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export default function DailyFocusQueueCard() {
  const { tasks, currentTrackingDate, requestNightlyReview, historicalLogs } = useDashboard();
  const [showPicker,           setShowPicker]           = useState(false);
  const [rolloverDismissed,    setRolloverDismissed]    = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [inspectTask,          setInspectTask]          = useState<Task | null>(null);
  const [addedRecurring,       setAddedRecurring]       = useState<RecurringTask[]>([]);

  const addRecurringToFocus = (rt: RecurringTask) =>
    setAddedRecurring((prev) => prev.some((r) => r.id === rt.id) ? prev : [...prev, rt]);
  const removeAddedRecurring = (id: string) =>
    setAddedRecurring((prev) => prev.filter((r) => r.id !== id));

  const yesterdayLog = historicalLogs[0] ?? null;

  const queuedTasks   = tasks.filter((t) => (t.queuedDate ?? null) === currentTrackingDate);
  const getIntent     = (t: Task) => t.dailyTracking?.[currentTrackingDate]?.intent ?? t.intent ?? "finish";
  const commitments   = queuedTasks.filter((t) => getIntent(t) !== "maybe");
  const maybes        = queuedTasks.filter((t) => getIntent(t) === "maybe");
  const doneCount     = commitments.filter((t) => t.done).length;

  // Lazy initializer runs once on mount only — later taps on the chevron toggle
  // freely via setCollapsed and are never overridden by this check again. Mobile
  // starts expanded whenever today actually has tasks queued, and only collapses
  // by default when there's nothing planned for the day.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768 && queuedTasks.length === 0;
  });

  // The initializer above runs once at mount, but `tasks` is frequently still empty at that
  // exact moment (Supabase hasn't resolved yet) — without this, a day that actually has tasks
  // queued could get permanently stuck collapsed once that data arrives a moment later, since
  // useState's lazy initializer never re-fires. This corrects that exactly once, and never
  // fights a deliberate tap on the chevron afterward.
  const hasUserToggled = useRef(false);
  useEffect(() => {
    if (hasUserToggled.current) return;
    if (typeof window === "undefined" || window.innerWidth >= 768) return;
    if (queuedTasks.length > 0 && collapsed) setCollapsed(false);
  }, [queuedTasks.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
    <TaskInspectModal task={inspectTask} onClose={() => setInspectTask(null)} />
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5 flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-violet-400" />
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Today's Focus
          </h2>
          {queuedTasks.length > 0 && (
            <span className="hidden md:inline-block text-[10px] text-slate-600">
              {fmtDate(currentTrackingDate)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {queuedTasks.length > 0 && (
            <span className="hidden md:inline-block text-[10px] text-slate-500 tabular-nums">
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
            onClick={() => { hasUserToggled.current = true; setCollapsed((v) => !v); }}
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
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <Target className="w-6 h-6 text-slate-700" />
              <p className="text-xs text-slate-600">Plan your day, add existing tasks.</p>
              {showPicker
                ? <TaskPicker onClose={() => setShowPicker(false)} />
                : (
                  <button
                    onClick={() => setShowPicker(true)}
                    className="flex items-center gap-1.5 justify-center h-7 px-4 rounded-xl border border-dashed border-white/[0.10] text-[11px] text-slate-600 hover:text-slate-300 hover:border-white/[0.20] transition-all duration-150"
                  >
                    + Add a task
                  </button>
                )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {commitments.map((t) => <QueueRow key={t.id} task={t} onInspect={setInspectTask} />)}
              {maybes.length > 0 && (
                <>
                  <p className="text-[10px] text-slate-600 mt-1 px-1">🎲 Bonus / Maybe</p>
                  {maybes.map((t) => <QueueRow key={t.id} task={t} onInspect={setInspectTask} />)}
                </>
              )}
            </div>
          )}

          {/* Birthday auto-inject rows */}
          <BirthdayRows />

          {/* Recurring tasks promoted into today's focus */}
          <AddedRecurringRows items={addedRecurring} onRemove={removeAddedRecurring} />

          {/* Rollover suggestion */}
          {!rolloverDismissed && yesterdayLog && yesterdayLog.rolledOverTasks.length > 0 && (
            <RolloverWidget
              log={yesterdayLog}
              onDismiss={() => setRolloverDismissed(true)}
            />
          )}

          {/* Today's aggregation suggestions */}
          {!suggestionsDismissed && (
            <TodaySuggestions onDismiss={() => setSuggestionsDismissed(true)} onAddRecurring={addRecurringToFocus} />
          )}

          {/* Performance Archive */}
          {historicalLogs.length > 0 && (
            <PerformanceArchive logs={historicalLogs} />
          )}
        </>
      )}
    </div>
    </>
  );
}
