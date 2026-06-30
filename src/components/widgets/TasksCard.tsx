"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  ListTodo,
  Play,
  Zap,
  Plus,
} from "lucide-react";
import { useDashboard, type Task, type Priority, type Energy } from "@/context/DashboardContext";
import TaskModal from "@/components/TaskModal";
import TaskInspectModal from "@/components/TaskInspectModal";

const PRIORITY_STYLE: Record<Priority, string> = {
  High: "bg-red-500/15 text-red-400 border border-red-500/25",
  Med:  "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  Low:  "bg-slate-500/15 text-slate-400 border border-slate-500/25",
};
const ENERGY_STYLE: Record<Energy, string> = {
  Flow:  "bg-violet-500/15 text-violet-400 border border-violet-500/25",
  Quick: "bg-teal-500/15 text-teal-400 border border-teal-500/25",
  Easy:  "bg-green-500/15 text-green-400 border border-green-500/25",
};

function Pill({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${className}`}>
      {label}
    </span>
  );
}

export default function TasksCard() {
  const { tasks, updateTask, activeTask, startTask, spheres } = useDashboard();
  const [activeSphereId, setActiveSphereId] = useState<string>(() => spheres[0]?.id ?? "");
  const [showModal, setShowModal] = useState(false);
  const [inspectTask, setInspectTask] = useState<Task | null>(null);

  const toggleDone = (task: Task) => updateTask(task.id, { done: !task.done });

  const activeSphereObj = spheres.find((s) => s.id === activeSphereId) ?? spheres[0];
  const activeSphere    = activeSphereObj?.name ?? "";
  const done            = tasks.filter((t) => t.done).length;
  const visibleTasks    = tasks.filter((t) => t.sphere === activeSphere);

  return (
    <>
      <TaskModal open={showModal} onClose={() => setShowModal(false)} defaultSphere={activeSphere} />
      <TaskInspectModal task={inspectTask} onClose={() => setInspectTask(null)} />

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5 h-full flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-violet-400" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Tasks</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{done}/{tasks.length} done</span>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1 px-2.5 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 text-[11px] font-medium hover:bg-violet-600/30 hover:border-violet-500/50 transition-all duration-150"
            >
              <Plus className="w-3 h-3" />
              <span className="hidden md:inline">Add</span>
            </button>
          </div>
        </div>

        {/* Sphere filter tabs */}
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
        </div>

        {/* Overall progress bar */}
        <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-500"
            style={{ width: tasks.length ? `${(done / tasks.length) * 100}%` : "0%" }}
          />
        </div>

        {/* Task list */}
        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-80">
          {visibleTasks.map((task) => {
            const isActive = activeTask?.id === task.id;
            return (
              <div
                key={task.id}
                onClick={() => setInspectTask(task)}
                className={`group flex items-center gap-3 px-4 min-h-[4rem] rounded-xl border transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "border-violet-500/30 bg-violet-600/[0.07]"
                    : task.done
                      ? "border-transparent opacity-40"
                      : "border-white/[0.04] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.03]"
                }`}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggleDone(task); }}
                  className="flex-shrink-0"
                  aria-label="Toggle complete"
                >
                  {task.done ? (
                    <CheckCircle2 className="w-4 h-4 text-violet-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-600 hover:text-slate-400 transition-colors" />
                  )}
                </button>

                <div className="flex flex-col flex-1 min-w-0 gap-1">
                  <p className={`text-sm text-white leading-none ${task.done ? "line-through text-slate-500" : ""}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-600">{task.project}</span>
                    {(task.priority || task.energy) && <span className="text-slate-700">·</span>}
                    {task.priority && <Pill label={task.priority} className={PRIORITY_STYLE[task.priority]} />}
                    {task.energy   && <Pill label={task.energy}   className={ENERGY_STYLE[task.energy]}    />}
                    {task.deadline && (
                      <span className="text-[10px] text-slate-500">
                        {new Date(task.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>

                {!task.done && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startTask({ id: task.id, title: task.title, project: task.project, sphere: task.sphere });
                    }}
                    aria-label={`Focus on ${task.title}`}
                    title={isActive ? "Currently active" : "Start focus session"}
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? "bg-violet-500/25 text-violet-300 ring-1 ring-violet-400/40 shadow-[0_0_10px_rgba(139,92,246,0.35)]"
                        : "bg-white/[0.04] text-slate-500 border border-white/[0.07] opacity-0 group-hover:opacity-100 hover:bg-violet-500/20 hover:text-violet-400 hover:border-violet-500/30"
                    }`}
                  >
                    {isActive ? <Zap className="w-3.5 h-3.5" /> : <Play className="w-3 h-3 translate-x-[1px]" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
