"use client";

import { useState, useEffect } from "react";
import { X, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import {
  useDashboard,
  type RecurringTask,
} from "@/context/DashboardContext";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { useModalOverlay } from "@/hooks/useModalOverlay";


interface Props {
  task: RecurringTask | null;
  onClose: () => void;
}

const INTERVAL_PRESETS = [
  { label: "Every Week",     days: 7   },
  { label: "Every 2 Weeks",  days: 14  },
  { label: "Every Month",    days: 30  },
  { label: "Every 3 Months", days: 90  },
  { label: "Every 6 Months", days: 180 },
  { label: "Every Year",     days: 365 },
];

interface FormState {
  title: string;
  notes: string;
  sphere: string;
  intervalDays: number;
  intervalLabel: string;
  startDate: string;
}

export default function RecurringResponsibilityModal({ task, onClose }: Props) {
  const { spheres, updateRecurringTask } = useDashboard();
  useModalOverlay(!!task);
  const [form, setForm] = useState<FormState | null>(null);
  const [titleError, setTitleError] = useState(false);

  useEffect(() => {
    if (task) {
      // Derive startDate: prefer explicit field, fall back to anchorDay-in-month, then today
      const today = new Date().toISOString().split("T")[0];
      let derived = task.startDate ?? today;
      if (!task.startDate && task.anchorDay && task.intervalDays === 30) {
        const now = new Date();
        const d = String(task.anchorDay).padStart(2, "0");
        const m = String(now.getMonth() + 1).padStart(2, "0");
        derived = `${now.getFullYear()}-${m}-${d}`;
      }
      setForm({
        title:         task.title,
        notes:         task.notes,
        sphere:        task.sphere,
        intervalDays:  task.intervalDays,
        intervalLabel: task.intervalLabel,
        startDate:     derived,
      });
      setTitleError(false);
    }
  }, [task]);

  if (!task || !form) return null;

  function handleSave() {
    if (!form || !form.title.trim()) { setTitleError(true); return; }
    updateRecurringTask(task!.id, {
      title:         form.title.trim(),
      notes:         form.notes,
      sphere:        form.sphere,
      intervalDays:  form.intervalDays,
      intervalLabel: form.intervalLabel,
      startDate:     form.startDate,
      anchorDay:     undefined,
    });
    onClose();
  }

  function handleIntervalChange(days: number) {
    const preset = INTERVAL_PRESETS.find((p) => p.days === days);
    setForm((f) => f ? {
      ...f,
      intervalDays:  days,
      intervalLabel: preset?.label ?? `Every ${days} days`,
    } : f);
  }

  const lastDoneFormatted = task.lastDoneDate
    ? new Date(task.lastDoneDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-[#0F1629] border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0F1629] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Responsibility Details</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">

          {/* Task Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Task Name
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => { setForm((f) => f ? { ...f, title: e.target.value } : f); setTitleError(false); }}
              className={`w-full h-10 px-3 rounded-xl bg-white/[0.04] border text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors ${
                titleError ? "border-red-500/60" : "border-white/[0.07]"
              }`}
            />
            {titleError && <p className="text-[10px] text-red-400">Task name is required.</p>}
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => f ? { ...f, notes: e.target.value } : f)}
              placeholder="Context, links, or reminders…"
              rows={3}
              className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors resize-none"
            />
          </div>

          {/* Area + Interval */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Area</label>
              <select
                value={form.sphere}
                onChange={(e) => setForm((f) => f ? { ...f, sphere: e.target.value } : f)}
                className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors appearance-none cursor-pointer"
              >
                {spheres.map((s) => (
                  <option key={s.id} value={s.name} className="bg-[#0F1629]">{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Interval</label>
              <select
                value={form.intervalDays}
                onChange={(e) => handleIntervalChange(Number(e.target.value))}
                className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors appearance-none cursor-pointer"
              >
                {INTERVAL_PRESETS.map((p) => (
                  <option key={p.days} value={p.days} className="bg-[#0F1629]">{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Start Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Start Date</label>
              <DatePickerInput
                value={form.startDate}
                onChange={(v) => setForm((f) => f ? { ...f, startDate: v ?? form.startDate } : f)}
              />
            </div>
          </div>

          {/* Stats strip */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 flex items-center gap-6">
            <div>
              <p className="text-[10px] text-slate-500">Completions</p>
              <p className="text-sm font-semibold text-white tabular-nums">{task.completionCount}</p>
            </div>
            {lastDoneFormatted && (
              <div>
                <p className="text-[10px] text-slate-500">Last done</p>
                <p className="text-sm font-semibold text-white">{lastDoneFormatted}</p>
              </div>
            )}
            <div className="ml-auto flex items-center gap-1.5 text-violet-400">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{form.intervalLabel}</span>
            </div>
          </div>

          {/* ── Completion History Log ─────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-white/[0.05]">
              <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Completion History Log
              </h3>
              <span className="text-[10px] text-slate-600">
                {task.history.length} {task.history.length === 1 ? "entry" : "entries"}
              </span>
            </div>

            {task.history.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-4">
                No completions recorded yet.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                {task.history.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300">
                        Completed on{" "}
                        <span className="text-white font-medium">
                          {entry.completedAt}
                        </span>
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-600 flex-shrink-0">
                      #{task.history.length - i}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!form.title.trim()}
              className="flex-1 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm text-white font-medium transition-all shadow-[0_0_20px_rgba(124,58,237,0.35)]"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
