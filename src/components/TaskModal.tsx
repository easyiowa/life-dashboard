"use client";

import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import {
  useDashboard,
  type Priority,
  type Energy,
  type Task,
} from "@/context/DashboardContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

type FormData = Omit<Task, "id" | "done">;

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

export default function TaskModal({ open, onClose }: Props) {
  const { spheres, projects, addTask, addProject } = useDashboard();

  const defaultSphere = spheres[0]?.name ?? "";
  const defaultProject = projects.find((p) => p.sphere === defaultSphere)?.name ?? "";

  const blank = (): FormData => ({
    sphere: defaultSphere,
    project: defaultProject,
    title: "",
    priority: "Med",
    energy: "Easy",
    deadline: null,
    notes: "",
    manualMinutes: 0,
  });

  const [form, setForm] = useState<FormData>(blank);
  const [titleError, setTitleError] = useState(false);

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectSphere, setNewProjectSphere] = useState(defaultSphere);
  const [newProjectError, setNewProjectError] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(blank());
      setTitleError(false);
      setShowNewProject(false);
      setNewProjectName("");
      setNewProjectSphere(spheres[0]?.name ?? "");
      setNewProjectError(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sphereProjects = projects.filter((p) => p.sphere === form.sphere);

  function handleSphereChange(name: string) {
    const firstProject = projects.find((p) => p.sphere === name)?.name ?? "";
    setForm((f) => ({ ...f, sphere: name, project: firstProject }));
    setShowNewProject(false);
  }

  function handleSaveNewProject() {
    if (!newProjectName.trim()) { setNewProjectError(true); return; }
    const tag      = newProjectName.trim().split(" ")[0];
    const tagColor = spheres.find((s) => s.name === newProjectSphere)?.labelColor ?? "violet";
    addProject({
      sphere:    newProjectSphere,
      name:      newProjectName.trim(),
      tag,
      tagColor,
      status:    "on-track",
      milestone: "In progress",
    });
    setForm((f) => ({ ...f, sphere: newProjectSphere, project: newProjectName.trim() }));
    setShowNewProject(false);
    setNewProjectName("");
    setNewProjectError(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setTitleError(true); return; }
    addTask({ ...form, done: false });
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0F1629] border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0F1629] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Add Task</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

          {/* Task Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Task Name *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setTitleError(false); }}
              placeholder="What needs to be done?"
              className={`w-full h-10 px-3 rounded-xl bg-white/[0.04] border text-sm text-white placeholder:text-slate-600 outline-none transition-colors focus:border-violet-500/60 focus:bg-white/[0.06] ${
                titleError ? "border-red-500/60" : "border-white/[0.07]"
              }`}
            />
            {titleError && <p className="text-[10px] text-red-400">Task name is required.</p>}
          </div>

          {/* Sphere + Project */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Sphere</label>
                <select
                  value={form.sphere}
                  onChange={(e) => handleSphereChange(e.target.value)}
                  className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors appearance-none cursor-pointer"
                >
                  {spheres.map((s) => (
                    <option key={s.id} value={s.name} className="bg-[#0F1629]">{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Project</label>
                  <button
                    type="button"
                    onClick={() => { setShowNewProject((v) => !v); setNewProjectSphere(form.sphere); }}
                    className="flex items-center gap-0.5 text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> New Project
                  </button>
                </div>
                <select
                  value={form.project}
                  onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}
                  className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors appearance-none cursor-pointer"
                >
                  {sphereProjects.map((p) => (
                    <option key={p.id} value={p.name} className="bg-[#0F1629]">{p.name}</option>
                  ))}
                  {sphereProjects.length === 0 && (
                    <option value="" className="bg-[#0F1629]">No projects — create one ↑</option>
                  )}
                </select>
              </div>
            </div>

            {showNewProject && (
              <div className="rounded-xl border border-violet-500/20 bg-violet-600/[0.05] p-4 flex flex-col gap-3">
                <p className="text-xs font-semibold text-violet-300">New Project</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Name *</label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => { setNewProjectName(e.target.value); setNewProjectError(false); }}
                      placeholder="e.g. Website Redesign"
                      className={`h-9 px-3 rounded-lg bg-white/[0.04] border text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 transition-colors ${
                        newProjectError ? "border-red-500/60" : "border-white/[0.07]"
                      }`}
                    />
                    {newProjectError && <p className="text-[10px] text-red-400">Name required.</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Sphere</label>
                    <select
                      value={newProjectSphere}
                      onChange={(e) => setNewProjectSphere(e.target.value)}
                      className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 transition-colors appearance-none cursor-pointer"
                    >
                      {spheres.map((s) => (
                        <option key={s.id} value={s.name} className="bg-[#0F1629]">{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setShowNewProject(false); setNewProjectName(""); setNewProjectError(false); }} className="flex-1 h-8 rounded-lg border border-white/[0.07] bg-white/[0.03] text-xs text-slate-400 hover:text-white transition-all">
                    Cancel
                  </button>
                  <button type="button" onClick={handleSaveNewProject} className="flex-1 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs text-white font-medium transition-all">
                    Create Project
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Priority</label>
            <ToggleGroup<Priority>
              options={["High", "Med", "Low"]}
              value={form.priority}
              onChange={(v) => setForm((f) => ({ ...f, priority: v }))}
              activeStyles={PRIORITY_ACTIVE}
            />
          </div>

          {/* Energy */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Energy</label>
            <ToggleGroup<Energy>
              options={["Flow", "Quick", "Easy"]}
              value={form.energy}
              onChange={(v) => setForm((f) => ({ ...f, energy: v }))}
              activeStyles={ENERGY_ACTIVE}
            />
          </div>

          {/* Deadline + Manual Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Deadline</label>
              <input
                type="date"
                value={form.deadline ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value || null }))}
                className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors [color-scheme:dark]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Manual Time (min)</label>
              <input
                type="number"
                min={0}
                value={form.manualMinutes}
                onChange={(e) => setForm((f) => ({ ...f, manualMinutes: Math.max(0, Number(e.target.value)) }))}
                className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional context or links…"
              rows={3}
              className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">
              Cancel
            </button>
            <button type="submit" className="flex-1 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm text-white font-medium transition-all shadow-[0_0_20px_rgba(124,58,237,0.35)]">
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
