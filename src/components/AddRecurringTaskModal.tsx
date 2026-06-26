"use client";

import { useState, useEffect } from "react";
import { X, RefreshCw } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import AutoExpandingTextarea from "@/components/ui/AutoExpandingTextarea";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { useModalOverlay } from "@/hooks/useModalOverlay";

interface Props {
  isOpen: boolean;
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

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export default function AddRecurringTaskModal({ isOpen, onClose }: Props) {
  const { addRecurringTask, spheres } = useDashboard();
  useModalOverlay(isOpen);

  const [title,         setTitle]         = useState("");
  const [notes,         setNotes]         = useState("");
  const [intervalDays,  setIntervalDays]  = useState(30);
  const [intervalLabel, setIntervalLabel] = useState("Every Month");
  const [startDate,     setStartDate]     = useState(todayISO);
  const [sphere,        setSphere]        = useState<string>(() => spheres[0]?.name ?? "");
  const [err,           setErr]           = useState(false);

  // The lazy initializer above runs at mount, before Supabase spheres are loaded (initial state
  // is []). When the modal first opens, sync sphere to the first loaded sphere if it's still unset.
  useEffect(() => {
    if (isOpen && sphere === "" && spheres.length > 0) {
      setSphere(spheres[0].name);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  function reset() {
    setTitle(""); setNotes(""); setIntervalDays(30); setIntervalLabel("Every Month");
    setStartDate(todayISO()); setSphere(spheres[0]?.name ?? ""); setErr(false);
  }

  function handleClose() { reset(); onClose(); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setErr(true); return; }
    addRecurringTask({
      title: title.trim(),
      notes,
      intervalDays,
      intervalLabel,
      startDate,
      sphere: sphere || spheres[0]?.name || "",
      lastDoneDate: null,
    });
    handleClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-[#0F1629] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">New Recurring Task</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Task Name *</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setErr(false); }}
              placeholder="e.g. Review Insurance"
              className={`h-10 px-3 rounded-xl bg-white/[0.04] border text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors ${
                err ? "border-red-500/60" : "border-white/[0.07]"
              }`}
            />
            {err && <p className="text-[10px] text-red-400">Task name is required.</p>}
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Notes</label>
            <AutoExpandingTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context or reminders…"
              minRows={2}
              maxHeightVariant="modal"
              className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors"
            />
          </div>

          {/* Interval + Area */}
          <div className="grid grid-cols-2 gap-3">
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
                className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors appearance-none cursor-pointer"
              >
                {INTERVAL_PRESETS.map((p) => (
                  <option key={p.days} value={p.days} className="bg-[#0F1629]">{p.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Area</label>
              <select
                value={sphere}
                onChange={(e) => setSphere(e.target.value)}
                className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors appearance-none cursor-pointer"
              >
                {spheres.map((s) => (
                  <option key={s.id} value={s.name} className="bg-[#0F1629]">{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Start Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Start Date</label>
              <DatePickerInput
                value={startDate}
                onChange={(v) => setStartDate(v ?? todayISO())}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 h-10 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm text-white font-medium transition-all shadow-[0_0_20px_rgba(124,58,237,0.35)]"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
