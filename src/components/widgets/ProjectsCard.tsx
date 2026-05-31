"use client";

import { useState } from "react";
import {
  FolderKanban,
  CheckSquare,
  CalendarClock,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  Play,
  Zap,
  Plus,
  Settings2,
  X,
  Trash2,
} from "lucide-react";
import {
  useDashboard,
  type Task,
  type Priority,
  type Energy,
  type Sphere,
} from "@/context/DashboardContext";
import TaskModal from "@/components/TaskModal";
import TaskInspectModal from "@/components/TaskInspectModal";

// ── Style maps ────────────────────────────────────────────────────────────────

type Status = "ahead" | "on-track" | "at-risk";

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

const TAG_COLORS: Record<string, string> = {
  amber:   "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  emerald: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  blue:    "bg-blue-500/15 text-blue-400 border border-blue-500/25",
  violet:  "bg-violet-500/15 text-violet-400 border border-violet-500/25",
  pink:    "bg-pink-500/15 text-pink-400 border border-pink-500/25",
  teal:    "bg-teal-500/15 text-teal-400 border border-teal-500/25",
  sky:     "bg-sky-500/15 text-sky-400 border border-sky-500/25",
  rose:    "bg-rose-500/15 text-rose-400 border border-rose-500/25",
  orange:  "bg-orange-500/15 text-orange-400 border border-orange-500/25",
  indigo:  "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25",
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

function fmtDuration(s: number): string {
  if (s <= 0) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function Pill({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${className}`}>
      {label}
    </span>
  );
}

// ── Color palette for sphere management ───────────────────────────────────────

const COLOR_PALETTE: { value: string; dot: string }[] = [
  { value: "emerald", dot: "bg-emerald-500" },
  { value: "violet",  dot: "bg-violet-500"  },
  { value: "sky",     dot: "bg-sky-500"     },
  { value: "amber",   dot: "bg-amber-500"   },
  { value: "pink",    dot: "bg-pink-500"    },
  { value: "teal",    dot: "bg-teal-500"    },
  { value: "blue",    dot: "bg-blue-500"    },
  { value: "rose",    dot: "bg-rose-500"    },
  { value: "orange",  dot: "bg-orange-500"  },
  { value: "indigo",  dot: "bg-indigo-500"  },
];

// ── Manage Spheres modal ──────────────────────────────────────────────────────

function ManageSpheresModal({ onClose }: { onClose: () => void }) {
  const { spheres, addSphere, updateSphere, deleteSphere } = useDashboard();

  // Per-sphere inline edit state
  const [editName,  setEditName]  = useState<Record<string, string>>({});
  const [editColor, setEditColor] = useState<Record<string, string>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // New sphere form
  const [newName,  setNewName]  = useState("");
  const [newColor, setNewColor] = useState("blue");
  const [newErr,   setNewErr]   = useState(false);

  function nameFor(s: Sphere)  { return editName[s.id]  ?? s.name;        }
  function colorFor(s: Sphere) { return editColor[s.id] ?? s.labelColor;  }
  function isDirty(s: Sphere)  { return nameFor(s) !== s.name || colorFor(s) !== s.labelColor; }

  function saveSphere(s: Sphere) {
    const name  = nameFor(s).trim();
    if (!name) return;
    updateSphere(s.id, { name, labelColor: colorFor(s) });
    setEditName((p)  => { const n = { ...p }; delete n[s.id]; return n; });
    setEditColor((p) => { const n = { ...p }; delete n[s.id]; return n; });
  }

  function handleAdd() {
    if (!newName.trim()) { setNewErr(true); return; }
    addSphere(newName.trim(), newColor);
    setNewName("");
    setNewColor("blue");
    setNewErr(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0F1629] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-[#0F1629] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Manage Spheres</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">

          {/* Existing spheres */}
          <div className="flex flex-col gap-2">
            {spheres.map((s) => (
              <div key={s.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex flex-col gap-2">
                {confirmId === s.id ? (
                  /* Delete confirmation inline */
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-slate-300">
                      Delete <span className="text-white font-medium">"{s.name}"</span>? All tasks will be reassigned to the first sphere.
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmId(null)} className="flex-1 h-7 rounded-lg border border-white/[0.07] bg-white/[0.03] text-xs text-slate-400 hover:text-white transition-all">
                        Cancel
                      </button>
                      <button
                        onClick={() => { deleteSphere(s.id); setConfirmId(null); }}
                        className="flex-1 h-7 rounded-lg bg-red-600 hover:bg-red-500 text-xs text-white font-medium transition-all"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      {/* Color dot indicator */}
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${COLOR_PALETTE.find(c => c.value === colorFor(s))?.dot ?? "bg-slate-500"}`} />
                      {/* Name input */}
                      <input
                        type="text"
                        value={nameFor(s)}
                        onChange={(e) => setEditName((p) => ({ ...p, [s.id]: e.target.value }))}
                        className="flex-1 h-8 px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 transition-colors"
                      />
                      {/* Save */}
                      {isDirty(s) && (
                        <button
                          onClick={() => saveSphere(s)}
                          className="px-2.5 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs text-white font-medium transition-all flex-shrink-0"
                        >
                          Save
                        </button>
                      )}
                      {/* Delete */}
                      <button
                        onClick={() => setConfirmId(s.id)}
                        disabled={spheres.length <= 1}
                        className="w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        title={spheres.length <= 1 ? "Cannot delete last sphere" : "Delete sphere"}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Color picker */}
                    <div className="flex gap-1.5 pl-5">
                      {COLOR_PALETTE.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => setEditColor((p) => ({ ...p, [s.id]: c.value }))}
                          className={`w-4 h-4 rounded-full ${c.dot} transition-all ${
                            colorFor(s) === c.value ? "ring-2 ring-white/60 ring-offset-1 ring-offset-[#0F1629]" : "opacity-50 hover:opacity-100"
                          }`}
                          title={c.value}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.05]" />

          {/* Add new sphere */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">New Sphere</p>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${COLOR_PALETTE.find(c => c.value === newColor)?.dot ?? "bg-slate-500"}`} />
              <input
                type="text"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setNewErr(false); }}
                placeholder="Sphere name…"
                className={`flex-1 h-9 px-3 rounded-xl bg-white/[0.04] border text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 transition-colors ${
                  newErr ? "border-red-500/60" : "border-white/[0.07]"
                }`}
              />
              <button
                onClick={handleAdd}
                className="px-3 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs text-white font-medium transition-all flex-shrink-0 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {newErr && <p className="text-[10px] text-red-400 -mt-1">Name is required.</p>}
            <div className="flex gap-1.5">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setNewColor(c.value)}
                  className={`w-4 h-4 rounded-full ${c.dot} transition-all ${
                    newColor === c.value ? "ring-2 ring-white/60 ring-offset-1 ring-offset-[#0F1629]" : "opacity-50 hover:opacity-100"
                  }`}
                  title={c.value}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Nested task row ───────────────────────────────────────────────────────────

function TaskRow({
  task,
  onInspect,
  loggedSeconds = 0,
}: {
  task: Task;
  onInspect: (t: Task) => void;
  loggedSeconds?: number;
}) {
  const { updateTask, activeTask, startTask } = useDashboard();
  const isActive = activeTask?.id === task.id;
  const timeLabel = fmtDuration(loggedSeconds);

  return (
    <div
      onClick={() => onInspect(task)}
      className={`group flex items-start gap-2.5 px-3 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
        isActive
          ? "border-violet-500/30 bg-violet-600/[0.07]"
          : task.done
            ? "border-transparent opacity-40"
            : "border-white/[0.04] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.03]"
      }`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); updateTask(task.id, { done: !task.done }); }}
        className="mt-0.5 flex-shrink-0"
        aria-label="Toggle complete"
      >
        {task.done
          ? <CheckCircle2 className="w-4 h-4 text-violet-500" />
          : <Circle className="w-4 h-4 text-slate-600 hover:text-slate-400 transition-colors" />}
      </button>

      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        <p className={`text-sm text-white leading-none ${task.done ? "line-through text-slate-500" : ""}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Pill label={task.priority} className={PRIORITY_STYLE[task.priority]} />
          <Pill label={task.energy}   className={ENERGY_STYLE[task.energy]}     />
          {task.deadline && (
            <span className="text-[10px] text-slate-500">
              {new Date(task.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </div>

      {/* Per-task logged time — only when sessions exist */}
      {timeLabel && (
        <span className="flex-shrink-0 self-center text-[10px] font-mono text-slate-500 tabular-nums">
          {timeLabel} logged
        </span>
      )}

      {!task.done && (
        <button
          onClick={(e) => { e.stopPropagation(); startTask({ id: task.id, title: task.title, project: task.project, sphere: task.sphere }); }}
          aria-label={isActive ? "Currently active" : "Start focus session"}
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
}

// ── Main card ─────────────────────────────────────────────────────────────────

export default function ProjectsCard() {
  const { tasks, projects, spheres, sessions } = useDashboard();

  const [activeSphereId,       setActiveSphereId]       = useState<string>(() => spheres[0]?.id ?? "");
  const [unfoldedProjects,     setUnfoldedProjects]      = useState<Record<string, boolean>>({});
  const [showCompletedInProject, setShowCompletedInProject] = useState<Record<string, boolean>>({});
  const [showModal,            setShowModal]             = useState(false);
  const [inspectTask,          setInspectTask]           = useState<Task | null>(null);
  const [showManageSpheres,    setShowManageSpheres]     = useState(false);

  const toggleProject   = (id: string) => setUnfoldedProjects((p) => ({ ...p, [id]: !p[id] }));
  const toggleCompleted = (id: string) => setShowCompletedInProject((p) => ({ ...p, [id]: !p[id] }));

  // Resolve active sphere — falls back to first if current id was deleted
  const activeSphereObj = spheres.find((s) => s.id === activeSphereId) ?? spheres[0];
  const activeSphere    = activeSphereObj?.name ?? "";

  const sphereProjects = projects
    .filter((p) => p.sphere === activeSphere)
    .map((project, i) => {
      const projectTasks = tasks.filter((t) => t.sphere === project.sphere && t.project === project.name);
      const total    = projectTasks.length;
      const done     = projectTasks.filter((t) => t.done).length;
      const progress = total > 0 ? Math.round((done / total) * 100) : 0;

      // Project-level session aggregates
      const projectSessions     = sessions.filter((s) => s.project === project.name);
      const projectLoggedSecs   = projectSessions.reduce((sum, s) => sum + s.durationSeconds, 0);
      const projectSessionCount = projectSessions.length;

      // Per-task logged seconds keyed by task id
      const taskLoggedSecsMap: Record<string, number> = {};
      for (const task of projectTasks) {
        taskLoggedSecsMap[task.id] = sessions
          .filter(
            (s) =>
              s.project === task.project &&
              (s.taskName === task.title || s.taskName === `${task.title} (Manual Entry)`)
          )
          .reduce((sum, s) => sum + s.durationSeconds, 0);
      }

      return {
        ...project,
        progress,
        taskTotal: total,
        taskDone: done,
        projectTasks,
        projectLoggedSecs,
        projectSessionCount,
        taskLoggedSecsMap,
        index: i,
      };
    });

  const avgProgress = sphereProjects.length > 0
    ? Math.round(sphereProjects.reduce((s, p) => s + p.progress, 0) / sphereProjects.length)
    : 0;
  const totalTasks = sphereProjects.reduce((s, p) => s + p.taskTotal, 0);
  const doneTasks  = sphereProjects.reduce((s, p) => s + p.taskDone,  0);

  return (
    <>
      <TaskModal open={showModal} onClose={() => setShowModal(false)} />
      <TaskInspectModal task={inspectTask} onClose={() => setInspectTask(null)} />
      {showManageSpheres && <ManageSpheresModal onClose={() => setShowManageSpheres(false)} />}

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-violet-400" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Projects &amp; Tasks</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{doneTasks}/{totalTasks} tasks</span>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1 px-2.5 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 text-[11px] font-medium hover:bg-violet-600/30 hover:border-violet-500/50 transition-all duration-150"
            >
              <Plus className="w-3 h-3" /> Add Task
            </button>
          </div>
        </div>

        {/* Sphere tabs + manage button */}
        <div className="flex items-center gap-2 flex-wrap">
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
          <button
            onClick={() => setShowManageSpheres(true)}
            title="Manage spheres"
            className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 border border-white/[0.05] hover:text-violet-400 hover:border-violet-500/30 hover:bg-violet-500/10 transition-all duration-150"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sub-header */}
        <div className="flex items-center justify-between -mt-1 pb-1 border-b border-white/[0.05]">
          <p className="text-sm text-slate-400">{activeSphereObj?.name ?? ""}</p>
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
        <div className="flex flex-col gap-4">
          {sphereProjects.length === 0 && (
            <p className="text-xs text-slate-600 text-center py-4">No projects in this sphere yet.</p>
          )}

          {sphereProjects.map((project) => {
            const status    = STATUS_CONFIG[project.status];
            const isOpen    = !!unfoldedProjects[project.id];
            const openTasks = project.projectTasks.filter((t) => !t.done).length;

            return (
              <div key={project.id} className="flex flex-col gap-0">

                {/* Project header — clickable */}
                <button
                  onClick={() => toggleProject(project.id)}
                  className="w-full text-left group flex flex-col gap-2 p-3 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08] hover:bg-white/[0.03] transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-600 w-4 flex-shrink-0">
                      {String(project.index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-medium text-white flex-1 leading-none">{project.name}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${TAG_COLORS[project.tagColor] ?? TAG_COLORS.violet}`}>
                      {project.tag}
                    </span>
                    <span className="text-base font-semibold text-white w-10 text-right tabular-nums">{project.progress}%</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-600 transition-transform duration-200 ml-1 ${isOpen ? "rotate-180" : ""}`} />
                  </div>

                  <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${barGradient(project.progress)} transition-all duration-700`}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-3 pl-5">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <CalendarClock className="w-3 h-3 flex-shrink-0" />
                      <span>{project.milestone}</span>
                    </div>
                    <span className="text-slate-700 text-[10px]">·</span>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <CheckSquare className="w-3 h-3 flex-shrink-0" />
                      <span>{project.taskDone}/{project.taskTotal} tasks</span>
                    </div>
                    {project.projectSessionCount > 0 && (
                      <>
                        <span className="text-slate-700 text-[10px]">·</span>
                        <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                          {project.projectSessionCount} session{project.projectSessionCount !== 1 ? "s" : ""} · {fmtDuration(project.projectLoggedSecs)}
                        </span>
                      </>
                    )}
                    {openTasks > 0 && (
                      <>
                        <span className="text-slate-700 text-[10px]">·</span>
                        <span className="text-[10px] text-violet-400">{openTasks} open</span>
                      </>
                    )}
                    <div className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${status.color} ${status.bg}`}>
                      {status.icon}{status.label}
                    </div>
                  </div>
                </button>

                {/* Nested task list */}
                {(() => {
                  const activeTasks    = project.projectTasks.filter((t) => !t.done);
                  const completedTasks = project.projectTasks.filter((t) =>  t.done);
                  const showCompleted  = !!showCompletedInProject[project.id];
                  const totalHeight    = project.projectTasks.length * 80 + (completedTasks.length > 0 ? 60 : 0) + 24;
                  return (
                    <div
                      className="overflow-hidden transition-all duration-300 ease-in-out"
                      style={{ maxHeight: isOpen ? `${totalHeight}px` : "0px" }}
                    >
                      {project.projectTasks.length === 0 ? (
                        <p className="text-xs text-slate-600 text-center py-3 px-3">No tasks yet.</p>
                      ) : (
                        <div className="flex flex-col gap-1.5 pt-1.5 pl-3 pr-0.5">
                          {activeTasks.map((task) => (
                            <TaskRow key={task.id} task={task} onInspect={setInspectTask} loggedSeconds={project.taskLoggedSecsMap[task.id] ?? 0} />
                          ))}
                          {completedTasks.length > 0 && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleCompleted(project.id); }}
                                className="flex items-center gap-2 px-2 py-1.5 mt-1 rounded-lg text-[11px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] transition-all duration-150 w-full"
                              >
                                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showCompleted ? "rotate-180" : ""}`} />
                                <span>Completed ({completedTasks.length})</span>
                                <span className="ml-auto h-px flex-1 bg-white/[0.05]" />
                              </button>
                              <div
                                className="overflow-hidden transition-all duration-300 ease-in-out flex flex-col gap-1.5"
                                style={{ maxHeight: showCompleted ? `${completedTasks.length * 80}px` : "0px" }}
                              >
                                {completedTasks.map((task) => (
                                  <TaskRow key={task.id} task={task} onInspect={setInspectTask} loggedSeconds={project.taskLoggedSecsMap[task.id] ?? 0} />
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
