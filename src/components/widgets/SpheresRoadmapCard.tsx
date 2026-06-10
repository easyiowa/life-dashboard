"use client";

import { useState } from "react";
import { Layers, CheckSquare, CalendarClock, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
import { useDashboard, type SphereId } from "@/context/DashboardContext";

type Status = "ahead" | "on-track" | "at-risk";

const SPHERE_META: Record<SphereId, { label: string; description: string }> = {
  Private:      { label: "Private",    description: "Personal life & wellbeing"     },
  "Business 1": { label: "Business 1", description: "Core business operations"       },
  "Business 2": { label: "Business 2", description: "Secondary venture & growth"     },
};

const TAG_COLORS: Record<string, string> = {
  amber:   "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  emerald: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  blue:    "bg-blue-500/15 text-blue-400 border border-blue-500/25",
  violet:  "bg-violet-500/15 text-violet-400 border border-violet-500/25",
  pink:    "bg-pink-500/15 text-pink-400 border border-pink-500/25",
  teal:    "bg-teal-500/15 text-teal-400 border border-teal-500/25",
};

const STATUS_CONFIG: Record<Status, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  ahead:      { label: "Ahead",    icon: <TrendingUp className="w-3 h-3" />,    color: "text-emerald-400", bg: "bg-emerald-500/10 border border-emerald-500/20" },
  "on-track": { label: "On Track", icon: <ArrowRight className="w-3 h-3" />,    color: "text-slate-400",   bg: "bg-white/[0.05] border border-white/[0.08]"     },
  "at-risk":  { label: "At Risk",  icon: <AlertTriangle className="w-3 h-3" />, color: "text-amber-400",   bg: "bg-amber-500/10 border border-amber-500/20"     },
};

function barGradient(pct: number) {
  if (pct >= 75) return "from-violet-500 to-violet-300";
  if (pct >= 40) return "from-violet-600 to-violet-400";
  return "from-violet-700 to-violet-500";
}

export default function SpheresRoadmapCard() {
  const [active, setActive] = useState<SphereId>("Private");
  const { tasks, projects, tags } = useDashboard();

  const sphereMeta = SPHERE_META[active];

  // Compute live progress per project from global tasks
  const sphereProjects = projects
    .filter((p) => p.sphere === active)
    .map((project, i) => {
      const projectTasks = tasks.filter(
        (t) => t.sphere === project.sphere && t.project === project.name
      );
      const total = projectTasks.length;
      const done  = projectTasks.filter((t) => t.done).length;
      const progress = total > 0 ? Math.round((done / total) * 100) : 0;
      return { ...project, progress, taskTotal: total, taskDone: done, index: i };
    });

  const avgProgress =
    sphereProjects.length > 0
      ? Math.round(sphereProjects.reduce((s, p) => s + p.progress, 0) / sphereProjects.length)
      : 0;

  const totalTasks = sphereProjects.reduce((s, p) => s + p.taskTotal, 0);
  const doneTasks  = sphereProjects.reduce((s, p) => s + p.taskDone, 0);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-violet-400" />
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Areas &amp; Roadmap
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{sphereProjects.length} active projects</span>
          <span className="text-slate-700">·</span>
          <span>{doneTasks}/{totalTasks} tasks</span>
        </div>
      </div>

      {/* Tab pills */}
      <div className="flex gap-2">
        {(Object.keys(SPHERE_META) as SphereId[]).map((key) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={`px-4 h-8 rounded-full text-xs font-medium transition-all duration-200 ${
              active === key
                ? "bg-violet-600 text-white shadow-[0_0_16px_rgba(124,58,237,0.4)]"
                : "bg-white/[0.04] text-slate-400 border border-white/[0.07] hover:bg-white/[0.08] hover:text-slate-200"
            }`}
          >
            {SPHERE_META[key].label}
          </button>
        ))}
      </div>

      {/* Sphere sub-header */}
      <div className="flex items-center justify-between pb-1 border-b border-white/[0.05]">
        <p className="text-sm text-slate-400">{sphereMeta.description}</p>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-16 rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${barGradient(avgProgress)} transition-all duration-700`}
              style={{ width: `${avgProgress}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">{avgProgress}% avg</span>
        </div>
      </div>

      {/* Project list */}
      <div className="flex flex-col gap-5">
        {sphereProjects.map((project) => {
          const status = STATUS_CONFIG[project.status];

          return (
            <div key={project.id} className="flex flex-col gap-2">
              {/* Name row */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-600 w-4 flex-shrink-0">
                  {String(project.index + 1).padStart(2, "0")}
                </span>
                <span className="text-sm font-medium text-white flex-1 leading-none">
                  {project.name}
                </span>
                {(() => {
                  const firstId = project.tagIds?.[0];
                  const tagObj  = firstId ? tags.find((t) => t.id === firstId) : null;
                  return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${TAG_COLORS[tagObj?.color ?? "violet"] ?? TAG_COLORS.violet}`}>
                      {tagObj?.label ?? "—"}
                    </span>
                  );
                })()}
                <span className="text-base font-semibold text-white w-12 text-right tabular-nums">
                  {project.progress}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  key={`${active}-${project.id}`}
                  className={`h-full rounded-full bg-gradient-to-r ${barGradient(project.progress)} transition-all duration-700`}
                  style={{
                    width: `${project.progress}%`,
                    transformOrigin: "left",
                    animation: `bar-fill 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${project.index * 0.08}s both`,
                  }}
                />
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-3 pl-5">
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <CalendarClock className="w-3 h-3 flex-shrink-0" />
                  <span>{project.milestone}</span>
                </div>
                <span className="text-slate-700 text-[10px]">·</span>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <CheckSquare className="w-3 h-3 flex-shrink-0" />
                  <span>{project.taskDone}/{project.taskTotal} tasks</span>
                  <div className="w-10 h-1 rounded-full bg-white/[0.05] overflow-hidden ml-1">
                    <div
                      className="h-full rounded-full bg-slate-500 transition-all duration-500"
                      style={{ width: project.taskTotal > 0 ? `${Math.round((project.taskDone / project.taskTotal) * 100)}%` : "0%" }}
                    />
                  </div>
                </div>
                <div className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${status.color} ${status.bg}`}>
                  {status.icon}
                  {status.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-white/[0.05] flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-violet-500/50" />
        <p className="text-[10px] text-slate-600">
          Progress reflects live task completion · Use the <span className="text-slate-500">Tasks card</span> to update
        </p>
      </div>
    </div>
  );
}
