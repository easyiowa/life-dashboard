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
  MoreVertical,
  X,
  Target,
  Trash2,
  Pencil,
  FileText,
} from "lucide-react";
import {
  useDashboard,
  type Task,
  type Priority,
  type Energy,
} from "@/context/DashboardContext";
import TaskModal from "@/components/TaskModal";
import TaskInspectModal from "@/components/TaskInspectModal";
import ProjectEditModal from "@/components/ProjectEditModal";
import ManageAreasModal from "@/components/modals/ManageAreasModal";
import ManageProjectsModal from "@/components/modals/ManageProjectsModal";
import { fmtSecs } from "@/lib/time";
import { areaColor } from "@/lib/areaColors";
import SwipeToDeleteRow from "@/components/ui/SwipeToDeleteRow";
import ScrollFadeContainer from "@/components/ui/ScrollFadeContainer";
import { stripHtml } from "@/lib/richText";

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
  const { updateTask, deleteTask, activeTaskId, timerIsRunning, startGlobalTimer, pauseGlobalTimer, toggleTaskForToday, currentTrackingDate, activeWidgetIds } = useDashboard();
  const hasDailyFocus = activeWidgetIds.includes("daily-focus");
  const isThisTaskActive = activeTaskId === task.id && timerIsRunning;
  const isQueued         = (task.queuedDate ?? null) === currentTrackingDate;
  const timeLabel        = fmtDuration(loggedSeconds);
  const hasNote          = !!(task.notes && stripHtml(task.notes).trim().length > 0);
  const noteIconRef      = useRef<HTMLSpanElement>(null);
  const [notePos, setNotePos] = useState<{ top: number; left: number } | null>(null);

  return (
    <SwipeToDeleteRow onDelete={() => deleteTask(task.id)} onClick={() => onInspect(task)} roundedClassName="rounded-lg">
    <div
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
            <p className={`text-sm leading-normal pb-1 truncate ${task.done ? "line-through text-slate-500" : isQueued ? "text-slate-400" : "text-white"}`}>
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
              className="w-max max-w-xs bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 text-xs rounded-lg px-3 py-2.5 shadow-xl backdrop-blur-md whitespace-pre-wrap break-words leading-relaxed pointer-events-none"
              dangerouslySetInnerHTML={{ __html: task.notes }}
            />,
            document.body
          )}

          {/* Queue toggle — only rendered when the Today's Focus widget is active */}
          {!task.done && hasDailyFocus && (
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
    </SwipeToDeleteRow>
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
  const [showManageAreas,      setShowManageAreas]       = useState(false);
  const [showManageProjects,   setShowManageProjects]    = useState(false);
  const [editProjectId,        setEditProjectId]         = useState<string | null>(null);
  const [menuOpen,              setMenuOpen]             = useState(false);
  const [menuPos,               setMenuPos]              = useState({ top: 0, left: 0 });
  const menuBtnRef = useRef<HTMLButtonElement>(null);

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
      };
    })
    .sort((a, b) => {
      if (b.urgencyScore !== a.urgencyScore) return b.urgencyScore - a.urgencyScore;
      if (b.openTaskCount !== a.openTaskCount) return b.openTaskCount - a.openTaskCount;
      return a.progress - b.progress; // less complete rises
    });

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
      <ManageAreasModal isOpen={showManageAreas} onClose={() => setShowManageAreas(false)} />
      <ManageProjectsModal isOpen={showManageProjects} onClose={() => setShowManageProjects(false)} />
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
            <button
              ref={menuBtnRef}
              onClick={() => {
                const rect = menuBtnRef.current?.getBoundingClientRect();
                if (rect) setMenuPos({ top: rect.bottom + 8, left: rect.right - 176 });
                setMenuOpen((o) => !o);
              }}
              title="Manage areas & projects"
              className="flex-shrink-0 p-1 text-slate-500 hover:text-violet-300 active:opacity-70 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Areas / Projects context menu — portaled to <body>, see CalendarCard's month picker for the same pattern */}
        {menuOpen && createPortal(
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setMenuOpen(false)} />
            <div
              className="fixed z-[110] w-44 bg-[#0d1426] border border-white/[0.12] rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <button
                onClick={() => { setMenuOpen(false); setShowManageAreas(true); }}
                className="text-left px-2.5 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                Manage Areas
              </button>
              <button
                onClick={() => { setMenuOpen(false); setShowManageProjects(true); }}
                className="text-left px-2.5 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                Manage Projects
              </button>
            </div>
          </>,
          document.body
        )}

        {/* Sphere tabs + manage button */}
        <div className="flex items-center gap-2">
          {/* Deduplicated sphere pills — swipeable single row on mobile, wraps on desktop */}
          <ScrollFadeContainer className="flex-1 min-w-0">
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
          </ScrollFadeContainer>
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
                    {/* De-emphasized while expanded — shifts visual weight onto the task rows
                        below. Real `opacity` (not text-white/40's color-alpha) so the emoji
                        actually dims too — color-emoji glyphs ignore the CSS `color` property,
                        but not paint-level opacity. */}
                    <span className={`text-sm font-medium text-white flex-1 leading-normal flex items-center gap-1.5 min-w-0 transition-opacity duration-200 ${isOpen ? "opacity-40" : ""}`}>
                      {project.emoji && <span className="text-base leading-none flex-shrink-0">{project.emoji}</span>}
                      <span className="truncate whitespace-nowrap overflow-hidden pb-0.5">{project.name}</span>
                    </span>
                    {/* Visible tag — just the first, then overflow tooltip. Keeps the title
                        string the lion's share of the row instead of competing with a row of pills. */}
                    {project.allTagObjs.slice(0, 1).map((tag) => (
                      <span
                        key={tag.id}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${TAG_COLORS[tag.color] ?? TAG_COLORS.violet}`}
                      >
                        {tag.label}
                      </span>
                    ))}
                    {project.allTagObjs.length > 1 && (
                      <div className="relative flex items-center group/overflow flex-shrink-0">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-white/[0.06] text-slate-400 border border-white/[0.08] cursor-default select-none">
                          +{project.allTagObjs.length - 1}
                        </span>
                        {/* Hover tooltip listing the hidden tags */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/overflow:flex flex-col gap-1 bg-white dark:bg-[#0d1426] border border-black/[0.10] dark:border-white/[0.14] rounded-xl px-3 py-2.5 shadow-2xl z-[60] min-w-max pointer-events-none">
                          <p className="text-[9px] font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-widest mb-0.5">More tags</p>
                          {project.allTagObjs.slice(1).map((tag) => (
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
                        <span className="hidden md:contents">
                          <span className="text-slate-700 text-[10px]">·</span>
                          <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                            {project.projectSessionCount} session{project.projectSessionCount !== 1 ? "s" : ""} · {fmtDuration(project.projectLoggedSecs)}
                          </span>
                        </span>
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
                        <div className="flex flex-col gap-0.5 pt-1">
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
