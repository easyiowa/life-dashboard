"use client";

import { useState, useEffect } from "react";
import TextareaAutosize from "react-textarea-autosize";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { secsToMins } from "@/lib/time";
import { areaColor } from "@/lib/areaColors";
import { X, Clock, CheckCircle2, Circle, ChevronDown } from "lucide-react";
import {
  useDashboard,
  type Task,
  type Priority,
  type Energy,
  type Urgency,
} from "@/context/DashboardContext";

interface Props {
  task: Task | null;
  onClose: () => void;
}

const PRIORITY_ACTIVE: Record<Priority, string> = {
  High: "bg-red-500/20 border-red-500/50 text-red-300",
  Med:  "bg-amber-500/20 border-amber-500/50 text-amber-300",
  Low:  "bg-slate-500/20 border-slate-500/40 text-slate-300",
};
const ENERGY_ACTIVE: Record<Energy, string> = {
  Flow:  "bg-violet-500/20 border-violet-500/50 text-violet-300",
  Quick: "bg-teal-500/20 border-teal-500/50 text-teal-300",
  Easy:  "bg-green-500/20 border-green-500/50 text-green-300",
};
const INACTIVE = "border-white/[0.07] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]";

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  activeStyles,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  activeStyles: Record<T, string>;
}) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 h-8 rounded-lg text-xs font-medium border transition-all duration-150 ${
            value === opt ? activeStyles[opt] : INACTIVE
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function formatMinutes(m: number): string {
  if (m <= 0) return "—";
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h > 0) return `${h}h ${rem > 0 ? `${rem}m` : ""}`.trim();
  return `${m}m`;
}

export default function TaskInspectModal({ task, onClose }: Props) {
  const { spheres, projects, sessions, updateTask } = useDashboard();
  const [form, setForm]               = useState<Task | null>(null);
  const [rawManualMins, setRawManualMins] = useState<string>("0");
  const [showSettings, setShowSettings]   = useState(false);

  useEffect(() => {
    if (task) {
      setForm({ ...task });
      setRawManualMins(String(task.manualMinutes));
      setShowSettings(false);
    }
  }, [task]);

  if (!task || !form) return null;

  const sphereProjects = projects.filter((p) => p.sphere === form.sphere);
  const ac = areaColor(spheres.find((s) => s.name === form.sphere)?.labelColor);

  const timerSeconds = sessions
    .filter((s) => !s.isManual && s.project === task.project &&
      (s.taskName === task.title || s.taskName.startsWith(task.title)))
    .reduce((sum, s) => sum + s.durationSeconds, 0);
  const timerMinutes = secsToMins(timerSeconds);
  const totalLogged  = form.manualMinutes + timerMinutes;

  function handleSphereChange(name: string) {
    const firstProject = projects.find((p) => p.sphere === name)?.name ?? "";
    setForm((f) => f ? { ...f, sphere: name, project: firstProject } : f);
  }

  function handleSave() {
    if (!form || !form.title.trim()) return;
    updateTask(form.id, {
      title:         form.title,
      sphere:        form.sphere,
      project:       form.project,
      priority:      form.priority,
      energy:        form.energy,
      urgency:       form.urgency,
      done:          form.done,
      deadline:      form.deadline,
      notes:         form.notes,
      manualMinutes: Math.max(0, parseInt(rawManualMins, 10) || 0),
    } satisfies Partial<Task>);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0F1629] border border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[92vh]">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0F1629] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => setForm((f) => f ? { ...f, done: !f.done } : f)} className="flex-shrink-0" aria-label="Toggle complete">
              {form.done
                ? <CheckCircle2 className="w-5 h-5 text-violet-500" />
                : <Circle className="w-5 h-5 text-slate-600 hover:text-slate-400 transition-colors" />}
            </button>
            <h2 className="text-sm font-semibold text-white">Inspect Task</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">

          {/* Task Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Task Name</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => f ? { ...f, title: e.target.value } : f)}
              className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors"
            />
          </div>

          {/* Notes — front and centre for comfortable reading */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Notes</label>
            <TextareaAutosize
              value={form.notes}
              onChange={(e) => setForm((f) => f ? { ...f, notes: e.target.value } : f)}
              placeholder="Context, links, or details…"
              minRows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors resize-none"
            />
          </div>

          {/* ── Task Properties accordion ──────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-all duration-150"
            >
              <span className="flex items-center gap-2">
                <span>⚙️</span>
                <span className="font-medium">Task Properties</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showSettings ? "rotate-180" : ""}`} />
            </button>

            {showSettings && (
              <div className="flex flex-col gap-5">

                {/* Sphere + Project */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Area</label>
                    <select
                      value={form.sphere}
                      onChange={(e) => handleSphereChange(e.target.value)}
                      className={`h-10 px-3 rounded-xl border text-sm text-white outline-none transition-colors appearance-none cursor-pointer ${ac.bgTint} ${ac.border}`}
                    >
                      {spheres.map((s) => (
                        <option key={s.id} value={s.name} className="bg-[#0F1629]">{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Project</label>
                    <select
                      value={form.project}
                      onChange={(e) => setForm((f) => f ? { ...f, project: e.target.value } : f)}
                      className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors appearance-none cursor-pointer"
                    >
                      {sphereProjects.map((p) => (
                        <option key={p.id} value={p.name} className="bg-[#0F1629]">{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Priority */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Priority</label>
                  <ToggleGroup<Priority>
                    options={["High", "Med", "Low"]}
                    value={form.priority}
                    onChange={(v) => setForm((f) => f ? { ...f, priority: v } : f)}
                    activeStyles={PRIORITY_ACTIVE}
                  />
                </div>

                {/* Energy */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Energy</label>
                  <ToggleGroup<Energy>
                    options={["Flow", "Quick", "Easy"]}
                    value={form.energy}
                    onChange={(v) => setForm((f) => f ? { ...f, energy: v } : f)}
                    activeStyles={ENERGY_ACTIVE}
                  />
                </div>

                {/* Urgency */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Urgency</label>
                  <div className="flex gap-2">
                    {([
                      { value: "urgent",     label: "🔥 Urgent"    },
                      { value: "not-urgent", label: "🧊 Not Urgent" },
                    ] as { value: Urgency; label: string }[]).map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm((f) => f ? { ...f, urgency: value } : f)}
                        className={`flex-1 h-8 rounded-lg text-xs font-medium border transition-all duration-150 ${
                          (form.urgency ?? "not-urgent") === value
                            ? value === "urgent"
                              ? "bg-red-500/20 border-red-500/50 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.15)]"
                              : "bg-white/[0.06] border-white/[0.12] text-slate-300"
                            : "border-white/[0.07] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deadline + Manual Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Deadline</label>
                    <DatePickerInput
                      value={form.deadline ?? null}
                      onChange={(v) => setForm((f) => f ? { ...f, deadline: v } : f)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Manual Time (min)</label>
                    <input
                      type="number"
                      min={0}
                      value={rawManualMins}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setRawManualMins(raw);
                        const parsed = parseInt(raw, 10);
                        setForm((f) => f ? { ...f, manualMinutes: (!isNaN(parsed) && parsed >= 0) ? parsed : 0 } : f);
                      }}
                      className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                {/* Time summary */}
                {(timerMinutes > 0 || form.manualMinutes > 0) && (
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 flex items-center gap-3">
                    <Clock className="w-4 h-4 text-violet-400 flex-shrink-0" />
                    <div className="flex gap-4 flex-wrap">
                      {timerMinutes > 0 && (
                        <div>
                          <p className="text-[10px] text-slate-500">Timer sessions</p>
                          <p className="text-sm font-semibold text-white">{formatMinutes(timerMinutes)}</p>
                        </div>
                      )}
                      {form.manualMinutes > 0 && (
                        <div>
                          <p className="text-[10px] text-slate-500">Manual logged</p>
                          <p className="text-sm font-semibold text-white">{formatMinutes(form.manualMinutes)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-slate-500">Total</p>
                        <p className="text-sm font-semibold text-violet-300">{formatMinutes(totalLogged)}</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">
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
