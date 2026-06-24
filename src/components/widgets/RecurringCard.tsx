"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, Trash2, Plus, AlertTriangle, MoreVertical } from "lucide-react";
import { useDashboard, type RecurringTask } from "@/context/DashboardContext";
import RecurringResponsibilityModal from "@/components/RecurringResponsibilityModal";
import AddRecurringTaskModal from "@/components/AddRecurringTaskModal";
import ManageAreasModal from "@/components/modals/ManageAreasModal";
import { areaColor } from "@/lib/areaColors";
import SwipeToDeleteRow from "@/components/ui/SwipeToDeleteRow";
import ScrollFadeContainer from "@/components/ui/ScrollFadeContainer";

// ── Countdown helpers ─────────────────────────────────────────────────────────

// Clamp to actual last day of the given month so e.g. day=31 in February is safe.
function anchorInMonth(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

function formatCountdownLabel(daysLeft: number): string {
  if (daysLeft <= 0)       return "Overdue";
  if (daysLeft === 1)      return "1 day left";
  if (daysLeft < 14)       return `${daysLeft} days left`;
  if (daysLeft < 60)       return `${Math.ceil(daysLeft / 7)} wks left`;
  return `${Math.ceil(daysLeft / 30)} mo left`;
}

function urgencyFromProgress(daysLeft: number, progress: number): "fresh" | "mid" | "due" | "overdue" {
  if (daysLeft <= 0)      return "overdue";
  if (progress >= 0.80)   return "due";
  if (progress >= 0.50)   return "mid";
  return "fresh";
}

export function computeCountdown(task: RecurringTask): {
  daysLeft: number;
  progress: number;
  label: string;
  urgency: "fresh" | "mid" | "due" | "overdue";
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  // Tasks whose start date is still in the future have not begun their first cycle.
  // Show a "Starts in X days" label rather than a misleading cycle-progress number.
  if (task.startDate) {
    const start = new Date(task.startDate + "T00:00:00");
    if (start.getTime() > todayMs) {
      const daysUntilStart = Math.ceil((start.getTime() - todayMs) / 86_400_000);
      const label =
        daysUntilStart === 1  ? "Starts tomorrow"
        : daysUntilStart < 14 ? `Starts in ${daysUntilStart} days`
        : `Starts ${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      return { daysLeft: daysUntilStart, progress: 0, label, urgency: "fresh" };
    }
  }

  // Derive anchorDay from startDate if not set explicitly (monthly only)
  const effectiveAnchorDay: number | undefined =
    task.anchorDay ??
    (task.startDate && task.intervalDays === 30
      ? new Date(task.startDate + "T00:00:00").getDate()
      : undefined);

  // ── Calendar-anchored monthly countdown ──────────────────────────────────
  if (effectiveAnchorDay && task.intervalDays === 30) {
    const thisMonthAnchor = anchorInMonth(today.getFullYear(), today.getMonth(), effectiveAnchorDay);

    const lastDone = task.lastDoneDate ? new Date(task.lastDoneDate) : null;
    if (lastDone) lastDone.setHours(0, 0, 0, 0);
    const doneThisCycle = lastDone !== null && lastDone >= thisMonthAnchor;
    const pushToNextMonth = lastDone === null && thisMonthAnchor.getTime() < todayMs;

    const nextDue = (doneThisCycle || pushToNextMonth)
      ? anchorInMonth(today.getFullYear(), today.getMonth() + 1, effectiveAnchorDay)
      : thisMonthAnchor;
    const prevAnchor = (doneThisCycle || pushToNextMonth)
      ? thisMonthAnchor
      : anchorInMonth(today.getFullYear(), today.getMonth() - 1, effectiveAnchorDay);

    const msLeft   = nextDue.getTime() - todayMs;
    const daysLeft = Math.ceil(msLeft / 86_400_000);
    const cycleMs  = nextDue.getTime() - prevAnchor.getTime();
    const progress = Math.min(Math.max((todayMs - prevAnchor.getTime()) / cycleMs, 0), 1);

    return { daysLeft, progress, label: formatCountdownLabel(daysLeft), urgency: urgencyFromProgress(daysLeft, progress) };
  }

  // ── Start-date-anchored countdown (all non-monthly intervals) ─────────────
  // When a startDate is set and the task has not yet been completed, derive the
  // current cycle from the startDate so brand-new tasks are never immediately overdue.
  if (task.startDate) {
    const anchor    = new Date(task.startDate + "T00:00:00");
    const intervalMs = task.intervalDays * 86_400_000;

    const lastDone = task.lastDoneDate ? new Date(task.lastDoneDate) : null;
    if (lastDone) lastDone.setHours(0, 0, 0, 0);

    // If completed more recently than the current anchor cycle, restart from lastDoneDate
    const elapsedSinceAnchor = todayMs - anchor.getTime();
    const cycleIndex = Math.max(0, Math.floor(elapsedSinceAnchor / intervalMs));
    const cycleStart = new Date(anchor.getTime() + cycleIndex * intervalMs);

    const prevDue = (lastDone && lastDone >= cycleStart) ? lastDone : cycleStart;
    const nextDue = new Date(prevDue.getTime() + intervalMs);

    const msLeft   = nextDue.getTime() - todayMs;
    const daysLeft = Math.ceil(msLeft / 86_400_000);
    const progress = Math.min(Math.max((todayMs - prevDue.getTime()) / intervalMs, 0), 1);

    return { daysLeft, progress, label: formatCountdownLabel(daysLeft), urgency: urgencyFromProgress(daysLeft, progress) };
  }

  // ── Legacy: interval-based from lastDoneDate only ─────────────────────────
  if (!task.lastDoneDate) {
    return { daysLeft: 0, progress: 1, label: "Due now", urgency: "overdue" };
  }
  const msLeft   = task.lastDoneDate.getTime() + task.intervalDays * 86_400_000 - Date.now();
  const daysLeft = Math.ceil(msLeft / 86_400_000);
  const elapsed  = task.intervalDays - daysLeft;
  const progress = Math.min(Math.max(elapsed / task.intervalDays, 0), 1);

  return { daysLeft, progress, label: formatCountdownLabel(daysLeft), urgency: urgencyFromProgress(daysLeft, progress) };
}

const URGENCY_BAR: Record<string, string> = {
  fresh:   "from-teal-500 to-teal-400",
  mid:     "from-amber-500 to-amber-400",
  due:     "from-orange-500 to-orange-400",
  overdue: "from-red-600 to-red-400",
};
const URGENCY_TEXT: Record<string, string> = {
  fresh:   "text-teal-400",
  mid:     "text-amber-400",
  due:     "text-orange-400",
  overdue: "text-red-400",
};
const URGENCY_BADGE: Record<string, string> = {
  fresh:   "bg-teal-500/10 border-teal-500/20 text-teal-400",
  mid:     "bg-amber-500/10 border-amber-500/20 text-amber-400",
  due:     "bg-orange-500/10 border-orange-500/20 text-orange-400",
  overdue: "bg-red-500/10  border-red-500/20  text-red-400",
};

// Tier weights for the sort: overdue → due → mid → fresh
const URGENCY_RANK: Record<string, number> = { overdue: 0, due: 1, mid: 2, fresh: 3 };

const NOW_FILTER = "__now__";


// ── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteConfirmModal({
  task,
  onConfirm,
  onCancel,
}: {
  task: RecurringTask;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#0F1629] border border-white/[0.08] rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-5">

        {/* Icon + heading */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Delete Responsibility?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="text-slate-300 font-medium">"{task.title}"</span>?
              This will permanently erase your entire historical tracking log.
            </p>
          </div>
        </div>

        {/* History count warning */}
        {task.history.length > 0 && (
          <div className="rounded-xl bg-red-500/[0.06] border border-red-500/15 px-4 py-3 flex items-center gap-2.5">
            <RefreshCw className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-300">
              {task.history.length} completion{task.history.length !== 1 ? "s" : ""} logged will be lost.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-500 text-sm text-white font-medium transition-all shadow-[0_0_16px_rgba(220,38,38,0.35)]"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function RecurringRow({
  task,
  onInspect,
  onDeleteRequest,
}: {
  task: RecurringTask;
  onInspect: (t: RecurringTask) => void;
  onDeleteRequest: (t: RecurringTask) => void;
}) {
  const { completeRecurringTask } = useDashboard();
  const { progress, label, urgency } = computeCountdown(task);
  const pct = Math.round(progress * 100);

  return (
    <SwipeToDeleteRow onDelete={() => onDeleteRequest(task)} onClick={() => onInspect(task)}>
    <div
      className="group flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 px-3 py-2.5 sm:py-2 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08] hover:bg-white/[0.03] transition-all duration-200 cursor-pointer"
    >
      {/* ── Top / Left: checkbox + title + (mobile) due pill ────────────────── */}
      <div className="flex items-center gap-3 min-w-0 sm:flex-1">
        <button
          onClick={(e) => { e.stopPropagation(); completeRecurringTask(task.id); }}
          title="Mark done — resets cycle"
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-white/[0.04] border border-white/[0.07] text-slate-500 hover:bg-teal-500/20 hover:border-teal-500/30 hover:text-teal-400 transition-all duration-150"
        >
          <CheckCircle2 className="w-3 h-3" />
        </button>
        <span className="text-sm font-medium text-slate-200 leading-none truncate flex-1 min-w-0">
          {task.title}
        </span>
        {/* Due pill — sits on the title row on mobile, hidden here on desktop (shown in the bottom row instead) */}
        <span className={`md:hidden inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0 ${URGENCY_BADGE[urgency]}`}>
          {label}
        </span>
      </div>

      {/* ── Bottom / Right: cadence · badge · progress · delete — desktop only, collapses entirely on mobile ── */}
      {/* pl-9 on mobile = checkbox(w-6 = 24px) + gap-3(12px) = 36px — aligns under title */}
      <div className="hidden md:flex flex-wrap items-center gap-2 sm:gap-3 pl-9 sm:pl-0 sm:ml-auto justify-between sm:justify-end">
        <span className="hidden md:block text-[10px] text-slate-500 flex-shrink-0">
          {task.intervalLabel}{task.completionCount > 0 ? ` · 🔄 ${task.completionCount}x` : ""}
        </span>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {task.lastDoneDate && (
            <span className="text-[10px] text-slate-600 tabular-nums hidden sm:block">
              {new Date(task.lastDoneDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
          {/* Due pill — desktop only here (mobile shows it up on the title row) */}
          <span className={`hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0 ${URGENCY_BADGE[urgency]}`}>
            {label}
          </span>
          <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
            <div className="w-16 sm:w-20 h-1 bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${URGENCY_BAR[urgency]}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`text-[10px] font-medium tabular-nums w-7 text-right ${URGENCY_TEXT[urgency]}`}>
              {pct}%
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteRequest(task); }}
            title="Delete"
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
    </SwipeToDeleteRow>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export default function RecurringCard() {
  const { recurringTasks, deleteRecurringTask, spheres } = useDashboard();

  const [activeSphereId,  setActiveSphereId]  = useState<string>(() => spheres[0]?.id ?? "");
  const [isAddModalOpen,  setIsAddModalOpen]  = useState(false);
  const [inspectTask,     setInspectTask]     = useState<RecurringTask | null>(null);
  const [deleteTarget,    setDeleteTarget]    = useState<RecurringTask | null>(null);
  const [showManageAreas, setShowManageAreas] = useState(false);

  const isNowFilter     = activeSphereId === NOW_FILTER;
  const activeSphereObj = isNowFilter ? undefined : (spheres.find((s) => s.id === activeSphereId) ?? spheres[0]);
  const activeSphere    = activeSphereObj?.name ?? "";

  const visible = isNowFilter
    ? recurringTasks.filter((r) => computeCountdown(r).urgency === "overdue")
    : recurringTasks.filter((r) => r.sphere === activeSphere);

  // Tiered sort: overdue → due → mid → fresh; within each tier, fewest days remaining first
  const sorted = [...visible].sort((a, b) => {
    const pa = computeCountdown(a);
    const pb = computeCountdown(b);
    const rankDiff = (URGENCY_RANK[pa.urgency] ?? 9) - (URGENCY_RANK[pb.urgency] ?? 9);
    if (rankDiff !== 0) return rankDiff;
    return pa.daysLeft - pb.daysLeft;
  });

  // Per-sphere count of tasks that are "due" or "overdue" (for red dots + "🔴 Now" badge)
  const sphereAlertCounts: Record<string, number> = {};
  for (const s of spheres) {
    sphereAlertCounts[s.id] = recurringTasks.filter((r) => {
      if (r.sphere !== s.name) return false;
      const u = computeCountdown(r).urgency;
      return u === "due" || u === "overdue";
    }).length;
  }
  const nowCount = recurringTasks.filter((r) => computeCountdown(r).urgency === "overdue").length;

  function confirmDelete() {
    if (deleteTarget) deleteRecurringTask(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <>
      <AddRecurringTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      <ManageAreasModal
        isOpen={showManageAreas}
        onClose={() => setShowManageAreas(false)}
      />
      <RecurringResponsibilityModal
        task={inspectTask}
        onClose={() => setInspectTask(null)}
      />
      {deleteTarget && (
        <DeleteConfirmModal
          task={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-violet-400" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Recurring Responsibilities
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1 px-2.5 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 text-[11px] font-medium hover:bg-violet-600/30 hover:border-violet-500/50 transition-all duration-150"
            >
              <Plus className="w-3 h-3" />
              <span className="hidden md:inline">Add</span>
            </button>
            <button
              onClick={() => setShowManageAreas(true)}
              title="Manage areas"
              className="flex-shrink-0 p-1 text-slate-500 hover:text-violet-300 active:opacity-70 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sphere tabs — swipeable single row on mobile, wraps on desktop */}
        <ScrollFadeContainer>

          {/* Global overdue/due-now quick filter */}
          {nowCount > 0 && (
            <button
              onClick={() => setActiveSphereId(NOW_FILTER)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-medium border transition-all duration-150 ${
                isNowFilter
                  ? "bg-red-500/20 border-red-500/50 text-red-300 md:shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                  : "bg-red-500/8 border-red-500/20 text-red-400/80 hover:bg-red-500/15 hover:border-red-500/35"
              }`}
            >
              Now
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 flex-shrink-0 animate-pulse" />
            </button>
          )}

          {spheres.map((sphere) => {
            const pill       = areaColor(sphere.labelColor);
            const alertCount = sphereAlertCounts[sphere.id] ?? 0;
            return (
              <button
                key={sphere.id}
                onClick={() => setActiveSphereId(sphere.id)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-medium border transition-all duration-150 ${
                  activeSphereObj?.id === sphere.id ? pill.pillActive : pill.pillInactive
                }`}
              >
                {sphere.name}
                {alertCount > 0 && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 flex-shrink-0 animate-pulse" />
                )}
              </button>
            );
          })}
          <span className="hidden md:block ml-auto flex-shrink-0 text-xs self-center text-slate-500">
            {visible.length} task{visible.length !== 1 ? "s" : ""}
          </span>
        </ScrollFadeContainer>

        {/* Task rows */}
        <div className="flex flex-col gap-1">
          {visible.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-6">
              {isNowFilter ? "All clear — nothing overdue." : `No recurring tasks for ${activeSphere}.`}
            </p>
          ) : (
            sorted.map((task) => (
              <RecurringRow
                key={task.id}
                task={task}
                onInspect={setInspectTask}
                onDeleteRequest={setDeleteTarget}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
