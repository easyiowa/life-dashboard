"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, Trash2, Plus, X, AlertTriangle } from "lucide-react";
import { useDashboard, type RecurringTask } from "@/context/DashboardContext";
import RecurringResponsibilityModal from "@/components/RecurringResponsibilityModal";

// ── Countdown helpers ─────────────────────────────────────────────────────────

export function computeCountdown(task: RecurringTask): {
  daysLeft: number;
  progress: number;
  label: string;
  urgency: "fresh" | "mid" | "due" | "overdue";
} {
  if (!task.lastDoneDate) {
    return { daysLeft: 0, progress: 1, label: "Due now", urgency: "overdue" };
  }
  const msLeft = task.lastDoneDate.getTime() + task.intervalDays * 86_400_000 - Date.now();
  const daysLeft = Math.ceil(msLeft / 86_400_000);
  const elapsed = task.intervalDays - daysLeft;
  const progress = Math.min(Math.max(elapsed / task.intervalDays, 0), 1);

  let label: string;
  if (daysLeft <= 0)       label = "Overdue";
  else if (daysLeft === 1) label = "1 day left";
  else if (daysLeft < 14)  label = `${daysLeft} days left`;
  else if (daysLeft < 60)  label = `${Math.ceil(daysLeft / 7)} wks left`;
  else                     label = `${Math.ceil(daysLeft / 30)} mo left`;

  const urgency =
    daysLeft <= 0      ? "overdue"
    : progress >= 0.80 ? "due"
    : progress >= 0.50 ? "mid"
    : "fresh";

  return { daysLeft, progress, label, urgency };
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

// ── Add-task inline form ───────────────────────────────────────────────────────

const INTERVAL_PRESETS = [
  { label: "Every Week",     days: 7   },
  { label: "Every 2 Weeks",  days: 14  },
  { label: "Every Month",    days: 30  },
  { label: "Every 3 Months", days: 90  },
  { label: "Every 6 Months", days: 180 },
  { label: "Every Year",     days: 365 },
];

function AddForm({ onClose }: { onClose: () => void }) {
  const { addRecurringTask, spheres } = useDashboard();
  const [title, setTitle]               = useState("");
  const [notes, setNotes]               = useState("");
  const [intervalDays, setIntervalDays] = useState(30);
  const [intervalLabel, setIntervalLabel] = useState("Every Month");
  const [sphere, setSphere]             = useState<string>(() => spheres[0]?.name ?? "");
  const [err, setErr]                   = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setErr(true); return; }
    addRecurringTask({ title: title.trim(), notes, intervalDays, intervalLabel, sphere, lastDoneDate: null });
    onClose();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-violet-500/20 bg-violet-600/[0.05] p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-xs font-semibold text-violet-300">New Recurring Task</p>
        <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setErr(false); }}
          placeholder="e.g. Review Insurance"
          className={`h-9 px-3 rounded-lg bg-white/[0.04] border text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 transition-colors ${
            err ? "border-red-500/60" : "border-white/[0.07]"
          }`}
        />
        {err && <p className="text-[10px] text-red-400">Title is required.</p>}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes…"
        rows={2}
        className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 transition-colors resize-none"
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Interval</label>
          <select
            value={intervalDays}
            onChange={(e) => {
              const days = Number(e.target.value);
              const preset = INTERVAL_PRESETS.find((p) => p.days === days);
              setIntervalDays(days);
              setIntervalLabel(preset?.label ?? `Every ${days} days`);
            }}
            className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 transition-colors appearance-none cursor-pointer"
          >
            {INTERVAL_PRESETS.map((p) => (
              <option key={p.days} value={p.days} className="bg-[#0F1629]">{p.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Sphere</label>
          <select
            value={sphere}
            onChange={(e) => setSphere(e.target.value)}
            className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 transition-colors appearance-none cursor-pointer"
          >
            {spheres.map((s) => (
              <option key={s.id} value={s.name} className="bg-[#0F1629]">{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-0.5">
        <button type="button" onClick={onClose} className="flex-1 h-8 rounded-lg border border-white/[0.07] bg-white/[0.03] text-xs text-slate-400 hover:text-white transition-all">
          Cancel
        </button>
        <button type="submit" className="flex-1 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs text-white font-medium transition-all">
          Add Task
        </button>
      </div>
    </form>
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

  return (
    <div
      onClick={() => onInspect(task)}
      className="group flex flex-col gap-2 p-3 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08] hover:bg-white/[0.03] transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-center gap-2.5">
        {/* Complete button */}
        <button
          onClick={(e) => { e.stopPropagation(); completeRecurringTask(task.id); }}
          title="Mark done — resets cycle"
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.04] border border-white/[0.07] text-slate-500 hover:bg-teal-500/20 hover:border-teal-500/30 hover:text-teal-400 transition-all duration-150"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
        </button>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-white font-medium truncate">{task.title}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${URGENCY_BADGE[urgency]}`}>
              {label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-600">{task.intervalLabel}</span>
            {task.completionCount > 0 && (
              <>
                <span className="text-slate-700">·</span>
                <span className="text-[10px] text-slate-600 flex items-center gap-0.5">
                  <RefreshCw className="w-2.5 h-2.5" />
                  {task.completionCount}x
                </span>
              </>
            )}
          </div>
        </div>

        {/* Delete — stops propagation so row click doesn't also fire */}
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteRequest(task); }}
          title="Delete"
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${URGENCY_BAR[urgency]}`}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {/* Progress footnote */}
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-slate-600">
          {task.lastDoneDate
            ? `Last done ${new Date(task.lastDoneDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
            : "Never completed"}
        </span>
        <span className={`text-[10px] font-medium tabular-nums ${URGENCY_TEXT[urgency]}`}>
          {Math.round(progress * 100)}%
        </span>
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export default function RecurringCard() {
  const { recurringTasks, deleteRecurringTask, spheres } = useDashboard();

  const [activeSphereId, setActiveSphereId] = useState<string>(() => spheres[0]?.id ?? "");
  const [showAdd,        setShowAdd]        = useState(false);
  const [inspectTask,    setInspectTask]    = useState<RecurringTask | null>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<RecurringTask | null>(null);

  const activeSphereObj = spheres.find((s) => s.id === activeSphereId) ?? spheres[0];
  const activeSphere    = activeSphereObj?.name ?? "";
  const visible         = recurringTasks.filter((r) => r.sphere === activeSphere);
  const overdueCount    = visible.filter((r) => computeCountdown(r).urgency === "overdue").length;

  function confirmDelete() {
    if (deleteTarget) deleteRecurringTask(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <>
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
            {overdueCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500/20 border border-red-500/30 text-[9px] font-bold text-red-400">
                {overdueCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-1 px-2.5 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 text-[11px] font-medium hover:bg-violet-600/30 hover:border-violet-500/50 transition-all duration-150"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>

        {/* Sphere tabs */}
        <div className="flex flex-wrap gap-2">
          {spheres.map((sphere) => (
            <button
              key={sphere.id}
              onClick={() => setActiveSphereId(sphere.id)}
              className={`px-3 h-7 rounded-full text-xs font-medium border transition-all duration-150 ${
                activeSphereObj?.id === sphere.id
                  ? "bg-violet-600 text-white border-transparent shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                  : "bg-white/[0.04] border-white/[0.05] text-slate-400 hover:text-slate-300 hover:bg-white/[0.07]"
              }`}
            >
              {sphere.name}
            </button>
          ))}
          <span className="ml-auto text-xs self-center text-slate-500">
            {visible.length} task{visible.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Inline add form */}
        {showAdd && <AddForm onClose={() => setShowAdd(false)} />}

        {/* Task rows */}
        <div className="flex flex-col gap-2">
          {visible.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-6">
              No recurring tasks for {activeSphere}.
            </p>
          ) : (
            visible.map((task) => (
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
