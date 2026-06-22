"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  Pause,
  Zap,
  Plus,
  Settings,
  Settings2,
  X,
  Target,
  Trash2,
  Pencil,
  GripVertical,
  FileText,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useDashboard,
  type Task,
  type Priority,
  type Energy,
  type Sphere,
} from "@/context/DashboardContext";
import TaskModal from "@/components/TaskModal";
import TaskInspectModal from "@/components/TaskInspectModal";
import ProjectEditModal from "@/components/ProjectEditModal";
import { fmtSecs } from "@/lib/time";
import { areaColor } from "@/lib/areaColors";

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
  return fmtSecs(s);
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

// Full class strings must be explicit for Tailwind JIT — no dynamic interpolation

// ── Sortable sphere row ───────────────────────────────────────────────────────

function SortableSphereItem({ sphere, canDelete }: { sphere: Sphere; canDelete: boolean }) {
  const { updateSphere, deleteSphere } = useDashboard();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sphere.id });

  const [name,    setName]    = useState(sphere.name);
  const [color,   setColor]   = useState(sphere.labelColor);
  const [desc,    setDesc]    = useState(sphere.description ?? "");
  const [confirm, setConfirm] = useState(false);

  // Re-sync if an external update changes the sphere's canonical values
  useEffect(() => {
    setName(sphere.name);
    setColor(sphere.labelColor);
    setDesc(sphere.description ?? "");
  }, [sphere.name, sphere.labelColor, sphere.description]);

  const isDirty =
    name !== sphere.name ||
    color !== sphere.labelColor ||
    desc !== (sphere.description ?? "");

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    updateSphere(sphere.id, { name: trimmed, labelColor: color, description: desc.trim() || undefined });
  }

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border p-3 flex flex-col gap-2 transition-all duration-150 ${
        isDragging
          ? "shadow-2xl border-purple-500/30 bg-white/[0.04] scale-[1.01] z-50 opacity-80"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}
    >
      {confirm ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-300">
            Delete <span className="text-white font-medium">"{sphere.name}"</span>? All tasks will be reassigned to the first area.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirm(false)}
              className="flex-1 h-7 rounded-lg border border-white/[0.07] bg-white/[0.03] text-xs text-slate-400 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => { deleteSphere(sphere.id); setConfirm(false); }}
              className="flex-1 h-7 rounded-lg bg-red-600 hover:bg-red-500 text-xs text-white font-medium transition-all"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="flex-shrink-0 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing transition-colors touch-none"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            {/* Color dot */}
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${COLOR_PALETTE.find(c => c.value === color)?.dot ?? "bg-slate-500"}`} />
            {/* Name input */}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 h-8 px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 transition-colors"
            />
            {/* Save */}
            {isDirty && (
              <button
                onClick={save}
                className="px-2.5 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs text-white font-medium transition-all flex-shrink-0"
              >
                Save
              </button>
            )}
            {/* Delete */}
            <button
              onClick={() => setConfirm(true)}
              disabled={!canDelete}
              className="w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title={!canDelete ? "Cannot delete last area" : "Delete area"}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>

          {/* Description */}
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Short description…"
            className="h-7 px-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-slate-300 placeholder:text-slate-700 outline-none focus:border-violet-500/50 transition-colors"
          />

          {/* Color picker — indented to align under name */}
          <div className="flex gap-1.5 pl-10">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                className={`w-4 h-4 rounded-full ${c.dot} transition-all ${
                  color === c.value ? "ring-2 ring-white/60 ring-offset-1 ring-offset-[#0F1629]" : "opacity-50 hover:opacity-100"
                }`}
                title={c.value}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Manage Spheres modal ──────────────────────────────────────────────────────

function ManageSpheresModal({ onClose }: { onClose: () => void }) {
  const { spheres, addSphere, reorderSpheres } = useDashboard();

  const [newName,  setNewName]  = useState("");
  const [newColor, setNewColor] = useState("blue");
  const [newErr,   setNewErr]   = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = spheres.findIndex((s) => s.id === active.id);
    const to   = spheres.findIndex((s) => s.id === over.id);
    if (from !== -1 && to !== -1) reorderSpheres(from, to);
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
            <h2 className="text-sm font-semibold text-white">Manage Areas</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">

          {/* Sortable sphere list */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={spheres.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {spheres.map((s) => (
                  <SortableSphereItem key={s.id} sphere={s} canDelete={spheres.length > 1} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Divider */}
          <div className="border-t border-white/[0.05]" />

          {/* Add new sphere */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">New Area</p>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${COLOR_PALETTE.find(c => c.value === newColor)?.dot ?? "bg-slate-500"}`} />
              <input
                type="text"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setNewErr(false); }}
                placeholder="Area name…"
                className={`flex-1 h-9 px-3 rounded-xl bg-white/[0.04] border text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 transition-colors ${
                  newErr ? "border-red-500/60" : "border-white/[0.07]"
                }`}
              />
              <button
                onClick={handleAdd}
                className="px-3 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs text-white font-medium transition-all flex-shrink-0 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> <span className="hidden md:inline">Add</span>
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

// ── Multi-axis sort weights ───────────────────────────────────────────────────

const URGENCY_W:  Record<string, number> = { urgent: 2, "not-urgent": 1 };
const PRIORITY_W: Record<string, number> = { High: 3, Med: 2, Low: 1 };

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const uDiff = (URGENCY_W[b.urgency ?? "not-urgent"] ?? 1) - (URGENCY_W[a.urgency ?? "not-urgent"] ?? 1);
    if (uDiff !== 0) return uDiff;
    return (PRIORITY_W[b.priority] ?? 0) - (PRIORITY_W[a.priority] ?? 0);
  });
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
  const { updateTask, deleteTask, activeTaskId, timerIsRunning, startGlobalTimer, pauseGlobalTimer, toggleTaskForToday, currentTrackingDate } = useDashboard();
  const isThisTaskActive = activeTaskId === task.id && timerIsRunning;
  const isQueued         = (task.queuedDate ?? null) === currentTrackingDate;
  const timeLabel        = fmtDuration(loggedSeconds);
  const hasNote          = !!(task.notes && task.notes.trim().length > 0);
  const noteIconRef      = useRef<HTMLSpanElement>(null);
  const [notePos, setNotePos] = useState<{ top: number; left: number } | null>(null);

  return (
    <div
      onClick={() => onInspect(task)}
        className={`group flex items-center justify-between w-full px-2.5 py-2 rounded-lg border transition-all duration-200 cursor-pointer ${
          isThisTaskActive
            ? "border-violet-500/30 bg-violet-600/[0.07]"
            : task.done
              ? "border-transparent opacity-40"
              : isQueued
                ? "border-l-2 border-l-purple-500 border-white/[0.04] bg-purple-950/20"
                : "border-white/[0.04] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.03]"
        }`}
      >
        {/* ── Left: checkbox + title + taxonomy pills ─────────────────────── */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={(e) => { e.stopPropagation(); updateTask(task.id, { done: !task.done }); }}
            className="flex-shrink-0"
            aria-label="Toggle complete"
          >
            {task.done
              ? <CheckCircle2 className="w-4 h-4 text-violet-500" />
              : isQueued
                ? <Circle className="w-4 h-4 text-violet-500" style={{ fill: "rgba(168,85,247,0.12)" }} />
                : <Circle className="w-4 h-4 text-slate-600 hover:text-slate-400 transition-colors" />}
          </button>

          <div className="flex flex-col gap-1 min-w-0">
            <p className={`text-sm leading-none truncate ${task.done ? "line-through text-slate-500" : isQueued ? "text-slate-400" : "text-white"}`}>
              {task.title}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {task.urgency === "urgent" && (
                <span className="text-[11px] leading-none" title="Urgent">🔥</span>
              )}
              <Pill label={task.priority} className={PRIORITY_STYLE[task.priority]} />
              <Pill label={task.energy}   className={ENERGY_STYLE[task.energy]}     />
              {task.deadline && (
                <span className="text-[10px] text-slate-500">
                  {new Date(task.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: contextual actions ────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 ml-4 flex-shrink-0">

          {/* Time logged */}
          {timeLabel && (
            <span className="text-[10px] font-mono text-slate-500 tabular-nums mr-1">
              {timeLabel}
            </span>
          )}

          {/* Note indicator — portal tooltip so it escapes all overflow/stacking contexts */}
          {hasNote && (
            <span
              ref={noteIconRef}
              className="hidden md:flex flex-shrink-0 items-center justify-center p-1 text-slate-500 hover:text-purple-400 cursor-pointer transition-colors"
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={() => {
                const r = noteIconRef.current?.getBoundingClientRect();
                if (r) setNotePos({ top: r.bottom + 8, left: r.left + r.width / 2 });
              }}
              onMouseLeave={() => setNotePos(null)}
            >
              <FileText className="w-3.5 h-3.5" />
            </span>
          )}
          {notePos && hasNote && createPortal(
            <div
              style={{ position: "fixed", top: notePos.top, left: notePos.left, transform: "translateX(-50%)", zIndex: 9999 }}
              className="w-max max-w-xs bg-slate-900/95 border border-white/[0.08] text-slate-200 text-xs rounded-lg px-3 py-2.5 shadow-2xl backdrop-blur-md whitespace-pre-wrap break-words leading-relaxed pointer-events-none"
            >
              {task.notes}
            </div>,
            document.body
          )}

          {/* Queue toggle — always visible when queued, hover-reveal when not */}
          {!task.done && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleTaskForToday(task.id, currentTrackingDate, task.intent ?? "finish", task.dailyTargetMinutes ?? null); }}
              title={isQueued ? "Remove from today's queue" : "Queue for today"}
              className={`flex-shrink-0 p-1 rounded transition-all ml-auto md:ml-0 ${
                isQueued
                  ? "text-purple-400"
                  : "opacity-100 md:opacity-0 md:group-hover:opacity-100 text-slate-500 hover:text-purple-400"
              }`}
            >
              <Target className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Play / Pause global timer */}
          {!task.done && (
            <button
              onClick={(e) => { e.stopPropagation(); isThisTaskActive ? pauseGlobalTimer() : startGlobalTimer(task.id); }}
              aria-label={isThisTaskActive ? "Pause focus session" : "Start focus session"}
              className={`hidden md:flex flex-shrink-0 w-7 h-7 rounded-full items-center justify-center transition-all duration-200 ${
                isThisTaskActive
                  ? "bg-violet-500/25 text-violet-300 ring-1 ring-violet-400/40 shadow-[0_0_10px_rgba(139,92,246,0.35)]"
                  : "bg-white/[0.04] text-slate-500 border border-white/[0.07] opacity-0 group-hover:opacity-100 hover:bg-violet-500/20 hover:text-violet-400 hover:border-violet-500/30"
              }`}
            >
              {isThisTaskActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3 h-3 translate-x-[1px]" />}
            </button>
          )}

          {/* Delete */}
          <button
            onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
            aria-label="Delete task"
            className="hidden md:flex flex-shrink-0 w-7 h-7 rounded-full items-center justify-center opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export default function ProjectsCard() {
  const { tasks, projects, spheres, sessions, tags, calendarJump, setCalendarJump } = useDashboard();

  const [activeSphereId,       setActiveSphereId]       = useState<string>(() => spheres[0]?.id ?? "");
  const [unfoldedProjects,     setUnfoldedProjects]      = useState<Record<string, boolean>>({});
  const [showCompletedInProject, setShowCompletedInProject] = useState<Record<string, boolean>>({});
  const [showModal,            setShowModal]             = useState(false);
  const [inspectTask,          setInspectTask]           = useState<Task | null>(null);
  const [showManageSpheres,    setShowManageSpheres]     = useState(false);
  const [editProjectId,        setEditProjectId]         = useState<string | null>(null);

  useEffect(() => {
    if (!calendarJump || calendarJump.type !== "task") return;
    const task = tasks.find((t) => t.id === calendarJump.id);
    if (task) { setInspectTask(task); setCalendarJump(null); }
  }, [calendarJump]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleProject   = (id: string) => setUnfoldedProjects((p) => ({ ...p, [id]: !p[id] }));
  const toggleCompleted = (id: string) => setShowCompletedInProject((p) => ({ ...p, [id]: !p[id] }));

  // Resolve active sphere — falls back to first if current id was deleted
  const activeSphereObj = spheres.find((s) => s.id === activeSphereId) ?? spheres[0];
  const activeSphere    = activeSphereObj?.name ?? "";

  const sphereProjects = projects
    .filter((p) => p.sphere === activeSphere)
    .map((project) => {
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

      const allTagObjs = (project.tagIds ?? []).map(
        (id) => tags.find((t) => t.id === id) ?? { id, label: "—", color: "violet" }
      );

      // Composite urgency rank: urgent×high=10, urgent×med=5, urgent×low=2, else 0
      const openTasks    = projectTasks.filter((t) => !t.done);
      const urgencyScore = openTasks.reduce((sum, t) => {
        if (t.urgency !== "urgent") return sum;
        if (t.priority === "High")  return sum + 10;
        if (t.priority === "Med")   return sum + 5;
        return sum + 2;
      }, 0);

      return {
        ...project,
        progress,
        taskTotal: total,
        taskDone: done,
        projectTasks,
        projectLoggedSecs,
        projectSessionCount,
        taskLoggedSecsMap,
        allTagObjs,
        urgencyScore,
        openTaskCount: openTasks.length,
        index: 0, // re-assigned after sort
      };
    })
    .sort((a, b) => {
      if (b.urgencyScore !== a.urgencyScore) return b.urgencyScore - a.urgencyScore;
      if (b.openTaskCount !== a.openTaskCount) return b.openTaskCount - a.openTaskCount;
      return a.progress - b.progress; // less complete rises
    })
    .map((project, i) => ({ ...project, index: i }));

  const avgProgress = sphereProjects.length > 0
    ? Math.round(sphereProjects.reduce((s, p) => s + p.progress, 0) / sphereProjects.length)
    : 0;
  const totalTasks = sphereProjects.reduce((s, p) => s + p.taskTotal, 0);
  const doneTasks  = sphereProjects.reduce((s, p) => s + p.taskDone,  0);

  // Expand / Collapse All — scoped to the active sphere's visible projects
  const isAnyProjectOpen = sphereProjects.some((p) => !!unfoldedProjects[p.id]);

  function handleToggleAllProjects() {
    const target = !isAnyProjectOpen;
    setUnfoldedProjects((prev) => {
      const next = { ...prev };
      for (const p of sphereProjects) next[p.id] = target;
      return next;
    });
  }

  return (
    <>
      <TaskModal open={showModal} onClose={() => setShowModal(false)} defaultSphere={activeSphere} />
      <TaskInspectModal task={inspectTask} onClose={() => setInspectTask(null)} />
      {showManageSpheres && <ManageSpheresModal onClose={() => setShowManageSpheres(false)} />}
      <ProjectEditModal
        project={projects.find((p) => p.id === editProjectId) ?? null}
        onClose={() => setEditProjectId(null)}
      />

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-violet-400" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Projects &amp; Tasks</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-xs text-slate-500">{doneTasks}/{totalTasks} tasks</span>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1 px-2.5 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 text-[11px] font-medium hover:bg-violet-600/30 hover:border-violet-500/50 transition-all duration-150"
            >
              <Plus className="w-3 h-3" /> <span className="hidden md:inline">Add</span>
            </button>
          </div>
        </div>

        {/* Sphere tabs + manage button */}
        <div className="flex items-center gap-2">
          {/* Deduplicated sphere pills — swipeable single row on mobile, wraps on desktop */}
          <div
            className="flex items-center gap-2 flex-1 min-w-0 flex-nowrap overflow-x-auto whitespace-nowrap md:flex-wrap md:overflow-visible md:whitespace-normal [&::-webkit-scrollbar]:hidden max-md:[mask-image:linear-gradient(to_left,transparent,black_32px,black_100%)]"
            style={{ scrollbarWidth: "none" }}
          >
            {[...new Map(spheres.map((s) => [s.id, s])).values()].map((sphere) => {
              const isActive = activeSphereObj?.id === sphere.id;
              const pill     = areaColor(sphere.labelColor);
              return (
                <button
                  key={sphere.id}
                  onClick={() => setActiveSphereId(sphere.id)}
                  className={`flex-shrink-0 px-3 h-7 rounded-full text-xs font-medium border transition-all duration-150 ${
                    isActive ? pill.pillActive : pill.pillInactive
                  }`}
                >
                  {sphere.name}
                </button>
              );
            })}
          </div>
          {/* Manage spheres — anchored to the right of the swipe track so it never scrolls off-screen */}
          <button
            onClick={() => setShowManageSpheres(true)}
            title="Manage areas"
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border bg-white/[0.04] border-white/[0.05] text-slate-600 hover:text-violet-300 hover:bg-violet-600/20 hover:border-violet-500/40 transition-all duration-150"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          {/* Expand / Collapse All — pushed to far right, desktop only */}
          {sphereProjects.length > 0 && (
            <button
              type="button"
              onClick={handleToggleAllProjects}
              title={isAnyProjectOpen ? "Collapse All Projects" : "Expand All Projects"}
              className="hidden md:flex flex-shrink-0 h-7 px-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] text-[11px] font-medium items-center gap-1.5 transition-colors duration-150"
            >
              {isAnyProjectOpen ? "▲ Collapse All" : "▼ Expand All"}
            </button>
          )}
        </div>

        {/* Sub-header */}
        <div className="flex items-center justify-between -mt-1 pb-1 border-b border-white/[0.05]">
          <div className="min-w-0 flex-1">
            {activeSphereObj?.description && (
              <p className={`text-xs text-slate-400 font-sans border-l-2 pl-2 truncate whitespace-nowrap overflow-hidden ${areaColor(activeSphereObj.labelColor).borderAccent}`}>
                {activeSphereObj.description}
              </p>
            )}
          </div>
          <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
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
            <p className="text-xs text-slate-600 text-center py-4">No projects in this area yet.</p>
          )}

          {sphereProjects.map((project) => {
            const status    = STATUS_CONFIG[project.status];
            const isOpen    = !!unfoldedProjects[project.id];
            const openTasks = project.projectTasks.filter((t) => !t.done).length;

            return (
              <div key={project.id} className="flex flex-col gap-0">

                {/* Project header — clickable div (avoids button-in-button) */}
                <div
                  onClick={() => toggleProject(project.id)}
                  className="group flex flex-col gap-1.5 px-3 py-2 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08] hover:bg-white/[0.03] transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="hidden md:block text-[10px] font-mono text-slate-600 w-4 flex-shrink-0">
                      {String(project.index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-medium text-white flex-1 leading-none flex items-center gap-1.5 min-w-0">
                      {project.emoji && <span className="text-base leading-none flex-shrink-0">{project.emoji}</span>}
                      <span className="truncate whitespace-nowrap overflow-hidden">{project.name}</span>
                    </span>
                    {/* Visible tags — up to 3, then overflow tooltip */}
                    {project.allTagObjs.slice(0, 3).map((tag) => (
                      <span
                        key={tag.id}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${TAG_COLORS[tag.color] ?? TAG_COLORS.violet}`}
                      >
                        {tag.label}
                      </span>
                    ))}
                    {project.allTagObjs.length > 3 && (
                      <div className="relative group/overflow flex-shrink-0">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-white/[0.06] text-slate-400 border border-white/[0.08] cursor-default select-none">
                          +{project.allTagObjs.length - 3}
                        </span>
                        {/* Hover tooltip listing the hidden tags */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/overflow:flex flex-col gap-1 bg-[#0d1426] border border-white/[0.14] rounded-xl px-3 py-2.5 shadow-2xl z-[60] min-w-max pointer-events-none">
                          <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5">More tags</p>
                          {project.allTagObjs.slice(3).map((tag) => (
                            <span
                              key={tag.id}
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${TAG_COLORS[tag.color] ?? TAG_COLORS.violet}`}
                            >
                              {tag.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <span className="hidden md:inline-block text-sm font-semibold text-white w-10 text-right tabular-nums">{project.progress}%</span>
                    {/* Edit button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditProjectId(project.id); }}
                      title="Edit project"
                      className="hidden md:flex flex-shrink-0 w-6 h-6 rounded-md items-center justify-center text-slate-600 opacity-0 group-hover:opacity-100 hover:text-violet-400 hover:bg-violet-500/10 transition-all duration-150"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-600 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </div>

                  {/* Progress bar — hidden when expanded to keep header minimal */}
                  {!isOpen && (
                    <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${barGradient(project.progress)} transition-all duration-700`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Meta row — hidden when project is expanded */}
                  {!isOpen && (
                    <div className="flex items-center gap-3 pl-5">
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
                        <span className="hidden md:contents">
                          <span className="text-slate-700 text-[10px]">·</span>
                          <span className="text-[10px] text-violet-400">{openTasks} open</span>
                        </span>
                      )}
                      <div className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${status.color} ${status.bg}`}>
                        {status.icon}{status.label}
                      </div>
                    </div>
                  )}
                </div>

                {/* Nested task list */}
                {(() => {
                  const activeTasks    = sortTasks(project.projectTasks.filter((t) => !t.done));
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
                        <div className="flex flex-col gap-0.5 pt-1 pl-2 pr-0.5">
                          {activeTasks.map((task) => (
                            <TaskRow key={task.id} task={task} onInspect={setInspectTask} loggedSeconds={(project.taskLoggedSecsMap[task.id] ?? 0) + (task.manualMinutes ?? 0) * 60} />
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
                                  <TaskRow key={task.id} task={task} onInspect={setInspectTask} loggedSeconds={(project.taskLoggedSecsMap[task.id] ?? 0) + (task.manualMinutes ?? 0) * 60} />
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
