"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { secsToMins } from "@/lib/time";
import { useAuth } from "@/context/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { seedOnboardingTemplate } from "@/services/onboardingSeeder";
import { cleanSlateTemplate } from "@/config/industry-templates";

// ── Widget layout constants ───────────────────────────────────────────────────

const WIDGET_LAYOUT_KEY = "ld_widget_layout";

// Mirrors DEFAULT_ORDER in DashboardGrid — used as the fallback when no saved
// layout exists yet so every widget is treated as active out of the box.
const DEFAULT_WIDGET_IDS = [
  "quick-notes", "daily-focus",
  "time-tracker", "projects",
  "activity-log", "progress",
  "calendar", "habits", "recurring", "network",
];

// ── Public types ─────────────────────────────────────────────────────────────

export type SphereId  = string;
export type CalendarJump = { type: "contact"; id: string } | { type: "task"; id: string };
export type Priority  = "High" | "Med" | "Low";
export type Energy    = "Flow" | "Quick" | "Easy";
export type Urgency   = "urgent" | "not-urgent";

export interface Tag {
  id: string;
  label: string;
  color: string; // palette key matching TAG_COLORS in ProjectsCard
}

export interface Sphere {
  id: string;
  name: string;
  labelColor: string; // palette key: "emerald" | "violet" | "sky" | "amber" | …
  description?: string;
}

export interface DailyTrackingEntry {
  timeSpentMinutes: number;           // focus minutes logged on this specific date
  intent: "finish" | "time" | "maybe";
  dailyTargetMinutes: number | null;
}

export interface Task {
  id: string;
  sphere: SphereId;
  project: string;
  title: string;
  priority: Priority;
  energy: Energy;
  urgency?: Urgency;                   // defaults to "not-urgent"
  done: boolean;
  deadline: string | null; // "YYYY-MM-DD"
  notes: string;
  manualMinutes: number;
  // ── Daily planning queue ──────────────────────────────────────────────────
  queuedDate?: string | null;          // "YYYY-MM-DD" when pushed to a day's deck
  timeSpentMinutes?: number;           // cumulative focus time across all time (historical)
  intent?: "finish" | "time" | "maybe"; // kept for backward compat; authoritative source is dailyTracking
  dailyTargetMinutes?: number | null;  // kept for backward compat
  rolloverCount?: number;              // increments when unfinished at day end
  dailyTracking?: Record<string, DailyTrackingEntry>; // per-date isolated tracking
  isSample?: boolean;                   // seeded by the onboarding template seeder — Dudu tracks deletions of these
}

export interface Project {
  id: string;
  sphere: SphereId;
  name: string;
  emoji?: string;                        // decorative project icon; defaults to "📁"
  tagIds: string[]; // references Tag.id — supports multiple tags
  status: "ahead" | "on-track" | "at-risk";
  milestone: string;
  sortOrder: number; // manual per-area order, set via "Manage Projects" drag-reorder
  isSample?: boolean; // seeded by the onboarding template seeder — Dudu tracks deletions of these
}

export interface ActiveTask {
  id: string;
  title: string;
  project: string;
  sphere: string;
  estimatedMinutes?: number; // used by the timer ring; defaults to 25
}

export interface FocusSession {
  id: string;
  taskName: string;
  project?: string;
  sphere?: string;
  durationSeconds: number;
  completedAt: Date;
  completedAtDateString: string; // "YYYY-MM-DD" in local time — used for day grouping
  isManual?: boolean;
}

export interface Habit {
  id: string;
  title: string;
  type: "start" | "stop";                        // start = build positive, stop = break negative
  routine?: "morning" | "day" | "evening";       // which part of the day; defaults to "day"
  frequency: "daily" | "weekly" | "monthly";
  targetCount: number;                           // how many completions per frequency window
  emoji: string;
  notes: string;
  history: Record<string, boolean>;              // { "YYYY-MM-DD": true }
}

export interface QuickNote {
  id: string;
  text: string;
  sphere: string;
  projectId?: string;    // optional project assignment
  createdAt: string;     // "YYYY-MM-DD HH:MM"
  isImportant?: boolean;
}

export const GROUP_COLOR_PALETTE = ["rose", "sky", "amber", "emerald", "violet", "teal", "orange", "pink"] as const;
export type GroupColor = typeof GROUP_COLOR_PALETTE[number];

export interface RelationshipGroup {
  id: string;
  label: string;
  emoji: string;
  color: GroupColor;
}

export interface ContactEvent {
  id: string;
  title: string;
  date: string | null;  // "YYYY-MM-DD"
  notes: string;
  completed: boolean;
}

export interface NetworkContact {
  id: string;
  name: string;
  relationshipType: string;      // references RelationshipGroup.label
  birthday: string | null;       // "YYYY-MM-DD" or null
  notes: string;
  lastTouchpoint: string | null; // "YYYY-MM-DD" or null
  events: ContactEvent[];
  cycleCompleted: boolean;
}

export interface TaskArchiveMeta {
  intent: string;
  target: number | null;   // dailyTargetMinutes for "time" intent
  minutes: number;         // sessions + manual at lock time
  goalMet: boolean;
}

export interface DailyCheckIn {
  date: string;     // YYYY-MM-DD — the tracking date this belongs to
  moodKey: string;  // "energized" | "calm" | "tired" | "stressed"
  mood: string;     // display string, e.g. "⚡ Energized"
  tags: string[];   // e.g. ["#motivated", "#focused"]
  note: string;
}

export interface MindStateClosure {
  morningMoodKey: string;   // "energized" | "calm" | "tired" | "stressed"
  morningMood: string;      // display string e.g. "⚡ Energized"
  morningTags: string[];
  morningNote: string;
  endDelta: "better" | "same" | "worse";
  closureNote: string;
}

export interface HistoricalLog {
  date: string;
  dayVelocity: number;
  recap: string;
  completedTasks: string[];
  rolledOverTasks: string[];
  taskMeta?: Record<string, TaskArchiveMeta>;
  mindStateClosure?: MindStateClosure;
}

export interface RecurringHistoryEntry {
  id: string;
  completedAt: string; // "Month DD, YYYY, HH:MM"
}

export interface RecurringTask {
  id: string;
  title: string;
  notes: string;
  intervalDays: number;
  intervalLabel: string;
  anchorDay?: number;        // kept for legacy seed data; prefer startDate for new tasks
  startDate?: string;        // ISO YYYY-MM-DD: the cycle anchor for all countdown calculations
  sphere: SphereId;
  lastDoneDate: Date | null;
  completionCount: number;
  history: RecurringHistoryEntry[];
}

// (Seed data removed — new accounts start clean and are hydrated from Supabase)

// ── State & actions ──────────────────────────────────────────────────────────

interface State {
  tags: Tag[];
  spheres: Sphere[];
  habits: Habit[];
  tasks: Task[];
  projects: Project[];
  activeTask: ActiveTask | null;
  running: boolean;
  elapsed: number;
  committedSecs: number; // elapsed already written to task.timeSpentMinutes; avoids double-count on finish
  // Wall-clock ms timestamp of when the *current* running segment began (null while paused/stopped).
  // elapsed is re-derived from this every tick (committedSecs + (Date.now() - startedAt) / 1000)
  // rather than incremented by the interval itself — a backgrounded tab throttles setInterval to
  // as little as one callback per minute, so a counter that only ever does "+1 per tick" silently
  // drifts behind real time; recomputing from an absolute timestamp self-corrects on the very next
  // tick (or immediately on tab refocus — see the visibilitychange listener on the ticking effect).
  startedAt: number | null;
  sessions: FocusSession[];
  recurringTasks: RecurringTask[];
  quickNotes: QuickNote[];
  networkContacts: NetworkContact[];
  relationshipGroups: RelationshipGroup[];
  currentTrackingDate: string;  // "YYYY-MM-DD" — operational date of the dashboard
  showNightlyReview: boolean;   // gate shown when tracking date lags real date
  historicalLogs: HistoricalLog[];
  yesterdayRecap: string;
  dailyCheckIn: DailyCheckIn | null;
}

type Action =
  | { type: "HYDRATE"; state: Partial<State> }
  | { type: "START_TASK"; task: ActiveTask }
  | { type: "START_FREE" }
  | { type: "PAUSE_SESSION" }
  | { type: "RESET" }
  | { type: "TICK" }
  | { type: "FINISH_SESSION"; _sessionId?: string }
  | { type: "SET_ESTIMATE"; minutes: number }
  | { type: "TOGGLE_TASK_FOR_TODAY"; id: string; dateString: string; intent: Task["intent"]; targetMinutes: number | null }
  | { type: "UPDATE_TASK_DAILY"; id: string; dateKey: string; changes: Partial<DailyTrackingEntry> }
  | { type: "UPDATE_TASK_TIME_SPENT"; id: string; minutes: number }
  | { type: "TRANSITION_TO_NEXT_DAY" }
  | { type: "REQUEST_NIGHTLY_REVIEW" }
  | { type: "DISMISS_NIGHTLY_REVIEW" }
  | { type: "ADD_TASK"; task: Omit<Task, "id">; _id?: string }
  | { type: "UPDATE_TASK"; id: string; fields: Partial<Task> }
  | { type: "ADD_PROJECT"; project: Omit<Project, "id">; _id?: string }
  | { type: "ADD_MANUAL_TIME"; projectId: string; minutes: number; _sessionId?: string }
  | { type: "ADD_RECURRING_TASK"; task: Omit<RecurringTask, "id" | "completionCount" | "history">; _id?: string }
  | { type: "UPDATE_RECURRING_TASK"; id: string; fields: Partial<Pick<RecurringTask, "title" | "notes" | "sphere" | "intervalDays" | "intervalLabel" | "anchorDay" | "startDate">> }
  | { type: "DELETE_RECURRING_TASK"; id: string }
  | { type: "COMPLETE_RECURRING_TASK"; id: string; _historyEntryId?: string }
  | { type: "ADD_SPHERE"; name: string; labelColor: string; _id?: string }
  | { type: "UPDATE_SPHERE"; id: string; fields: Partial<Pick<Sphere, "name" | "labelColor" | "description">> }
  | { type: "DELETE_SPHERE"; id: string }
  | { type: "REORDER_SPHERES"; startIndex: number; endIndex: number }
  | { type: "REORDER_RELATIONSHIP_GROUPS"; startIndex: number; endIndex: number }
  | { type: "UPDATE_PROJECT"; id: string; fields: Partial<Omit<Project, "id">> }
  | { type: "DELETE_PROJECT"; id: string }
  | { type: "REORDER_PROJECTS"; sphereName: string; startIndex: number; endIndex: number }
  | { type: "ADD_TAG"; tag: Omit<Tag, "id">; _id?: string }
  | { type: "UPDATE_TAG"; id: string; fields: Partial<Omit<Tag, "id">> }
  | { type: "DELETE_TAG"; id: string }
  | { type: "ADD_HABIT"; habit: Omit<Habit, "id" | "history">; _id?: string }
  | { type: "TOGGLE_HABIT_DATE"; id: string; dateString: string }
  | { type: "UPDATE_HABIT"; id: string; fields: Partial<Omit<Habit, "id" | "history">> }
  | { type: "DELETE_HABIT"; id: string }
  | { type: "DELETE_TASK"; id: string }
  | { type: "ADD_QUICK_NOTE"; note: Omit<QuickNote, "id">; _id?: string }
  | { type: "DELETE_QUICK_NOTE"; id: string }
  | { type: "TOGGLE_QUICK_NOTE_IMPORTANT"; id: string }
  | { type: "UPDATE_QUICK_NOTE_TEXT"; id: string; text: string }
  | { type: "ADD_NETWORK_CONTACT"; contact: Omit<NetworkContact, "id">; _id?: string }
  | { type: "UPDATE_NETWORK_CONTACT"; id: string; fields: Partial<Omit<NetworkContact, "id">> }
  | { type: "DELETE_NETWORK_CONTACT"; id: string }
  | { type: "ADD_RELATIONSHIP_GROUP"; group: Omit<RelationshipGroup, "id">; _id?: string }
  | { type: "UPDATE_RELATIONSHIP_GROUP"; id: string; fields: Partial<Omit<RelationshipGroup, "id">> }
  | { type: "DELETE_RELATIONSHIP_GROUP"; id: string }
  | { type: "RENAME_TASK_REFS"; taskId: string; oldTitle: string; newTitle: string }
  | { type: "LOCK_DAY"; date: string; dayVelocity: number; recap: string; completedTasks: string[]; rolledOverTasks: string[]; taskMeta?: Record<string, TaskArchiveMeta>; mindStateClosure?: MindStateClosure }
  | { type: "SAVE_CHECK_IN"; checkIn: DailyCheckIn };

function mkDateString(d: Date): string {
  return d.toLocaleDateString("en-CA"); // "YYYY-MM-DD" in local time
}

// Single source of truth for "how many seconds has the current timer segment actually run,
// right now" — used by the reducer's TICK/PAUSE_SESSION/FINISH_SESSION cases and by the
// startGlobalTimer/pauseGlobalTimer/pauseSession/finishSession wrapper functions below, so
// none of them ever fall back to a possibly-stale `elapsed` left over from before a
// backgrounded-tab throttling gap.
function computeLiveElapsed(s: Pick<State, "running" | "startedAt" | "committedSecs" | "elapsed">): number {
  return s.running && s.startedAt != null
    ? s.committedSecs + Math.floor((Date.now() - s.startedAt) / 1000)
    : s.elapsed;
}

function mkSession(task: ActiveTask | null, elapsed: number, id?: string): FocusSession {
  const now = new Date();
  return {
    id: id ?? crypto.randomUUID(),
    taskName: task?.title ?? "Session",
    project:  task?.project,
    sphere:   task?.sphere,
    durationSeconds: elapsed,
    completedAt: now,
    completedAtDateString: mkDateString(now),
  };
}

function addDailyMinutes(tasks: Task[], taskId: string, dateKey: string, minutes: number): Task[] {
  return tasks.map((t) => {
    if (t.id !== taskId) return t;
    const cur = t.dailyTracking?.[dateKey];
    const entry: DailyTrackingEntry = cur
      ? { ...cur, timeSpentMinutes: cur.timeSpentMinutes + minutes }
      : { timeSpentMinutes: minutes, intent: "finish", dailyTargetMinutes: null };
    return { ...t, dailyTracking: { ...(t.dailyTracking ?? {}), [dateKey]: entry } };
  });
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.state };
    case "START_TASK": {
      const sessions =
        state.activeTask && state.elapsed > 0
          ? [...state.sessions, mkSession(state.activeTask, state.elapsed)]
          : state.sessions;
      // Only commit uncommitted delta — paused portion was already written to timeSpentMinutes.
      const interruptUncommitted = state.elapsed - (state.committedSecs ?? 0);
      const interruptedMinutes = state.activeTask && interruptUncommitted > 0 ? secsToMins(interruptUncommitted) : 0;
      const tasksAfterInterrupt = interruptedMinutes > 0
        ? state.tasks.map((t) =>
            t.id === state.activeTask!.id
              ? { ...t, timeSpentMinutes: (t.timeSpentMinutes ?? 0) + interruptedMinutes }
              : t
          )
        : state.tasks;
      const tasks = interruptedMinutes > 0 && state.activeTask
        ? addDailyMinutes(tasksAfterInterrupt, state.activeTask.id, state.currentTrackingDate, interruptedMinutes)
        : tasksAfterInterrupt;
      return { ...state, activeTask: action.task, running: true, elapsed: 0, committedSecs: 0, startedAt: Date.now(), sessions, tasks };
    }
    case "START_FREE":
      // Resuming an already-active-but-paused task: committedSecs carries the prior segments'
      // total forward, and a fresh startedAt baselines the next absolute-delta calculation.
      return { ...state, running: true, startedAt: Date.now() };

    case "PAUSE_SESSION": {
      // Recompute the live value from the absolute timestamp rather than trusting state.elapsed,
      // which may be stale if the tab was backgrounded since the last tick.
      const liveElapsed = computeLiveElapsed(state);
      // Commit the uncommitted delta to the task's timeSpentMinutes so the progress bar updates immediately.
      const pauseDelta = liveElapsed - state.committedSecs;
      const pauseMinutes = state.activeTask && pauseDelta > 0 ? secsToMins(pauseDelta) : 0;
      const pauseTasksRoot = pauseMinutes > 0
        ? state.tasks.map((t) =>
            t.id === state.activeTask!.id
              ? { ...t, timeSpentMinutes: (t.timeSpentMinutes ?? 0) + pauseMinutes }
              : t
          )
        : state.tasks;
      const pauseTasks = pauseMinutes > 0 && state.activeTask
        ? addDailyMinutes(pauseTasksRoot, state.activeTask.id, state.currentTrackingDate, pauseMinutes)
        : pauseTasksRoot;
      return { ...state, running: false, elapsed: liveElapsed, committedSecs: liveElapsed, startedAt: null, tasks: pauseTasks };
    }

    case "RESET":
      // Abandon the current session without logging any time.
      return { ...state, activeTask: null, running: false, elapsed: 0, committedSecs: 0, startedAt: null };

    case "FINISH_SESSION": {
      const liveElapsed = computeLiveElapsed(state);
      const sessions =
        liveElapsed > 0
          ? [...state.sessions, mkSession(state.activeTask, liveElapsed, action._sessionId)]
          : state.sessions;
      // Only commit the portion not yet written during pause — avoids double-counting.
      const uncommittedSecs = liveElapsed - state.committedSecs;
      const uncommittedMinutes = state.activeTask && uncommittedSecs > 0 ? secsToMins(uncommittedSecs) : 0;
      const finishTasksRoot = uncommittedMinutes > 0
        ? state.tasks.map((t) =>
            t.id === state.activeTask!.id
              ? { ...t, timeSpentMinutes: (t.timeSpentMinutes ?? 0) + uncommittedMinutes }
              : t
          )
        : state.tasks;
      const tasks = uncommittedMinutes > 0 && state.activeTask
        ? addDailyMinutes(finishTasksRoot, state.activeTask.id, state.currentTrackingDate, uncommittedMinutes)
        : finishTasksRoot;
      return { ...state, activeTask: null, running: false, elapsed: 0, committedSecs: 0, startedAt: null, sessions, tasks };
    }

    case "SET_ESTIMATE":
      return state.activeTask
        ? { ...state, activeTask: { ...state.activeTask, estimatedMinutes: action.minutes } }
        : state;
    case "TICK":
      // Absolute-delta recompute, not a "+1" increment — see the startedAt field comment above.
      return state.running && state.startedAt != null
        ? { ...state, elapsed: state.committedSecs + Math.floor((Date.now() - state.startedAt) / 1000) }
        : state;

    case "ADD_TASK": {
      const task: Task = { ...action.task, id: action._id ?? crypto.randomUUID() };
      const sessions = [...state.sessions];
      if (task.manualMinutes > 0) {
        const manualNow = new Date();
        sessions.unshift({
          id: crypto.randomUUID(),
          taskName: `${task.title} (Manual Entry)`,
          project: task.project,
          sphere: task.sphere,
          durationSeconds: task.manualMinutes * 60,
          completedAt: manualNow,
          completedAtDateString: mkDateString(manualNow),
          isManual: true,
        });
      }
      return { ...state, tasks: [...state.tasks, task], sessions };
    }

    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, ...action.fields } : t)),
      };

    case "RENAME_TASK_REFS": {
      const updatedActiveTask =
        state.activeTask?.id === action.taskId
          ? { ...state.activeTask, title: action.newTitle }
          : state.activeTask;
      const updatedSessions = state.sessions.map((s) =>
        s.taskName === action.oldTitle ? { ...s, taskName: action.newTitle } : s
      );
      return { ...state, activeTask: updatedActiveTask, sessions: updatedSessions };
    }

    case "DELETE_TASK": {
      const target = state.tasks.find((t) => t.id === action.id);
      if (!target) return state;
      const updatedTasks = state.tasks.filter((t) => t.id !== action.id);
      const stillHasTasks = updatedTasks.some(
        (t) => t.project === target.project && t.sphere === target.sphere
      );
      const updatedProjects = stillHasTasks
        ? state.projects
        : state.projects.filter(
            (p) => !(p.name === target.project && p.sphere === target.sphere)
          );
      return { ...state, tasks: updatedTasks, projects: updatedProjects };
    }

    case "ADD_PROJECT": {
      const project: Project = {
        ...action.project,
        id: action._id ?? crypto.randomUUID(),
      };
      return { ...state, projects: [...state.projects, project] };
    }

    case "ADD_MANUAL_TIME": {
      const project = state.projects.find((p) => p.id === action.projectId);
      if (!project || action.minutes <= 0) return state;
      const manualNow2 = new Date();
      const session: FocusSession = {
        id: action._sessionId ?? crypto.randomUUID(),
        taskName: "(Manual Entry)",
        project: project.name,
        sphere: project.sphere,
        durationSeconds: action.minutes * 60,
        completedAt: manualNow2,
        completedAtDateString: mkDateString(manualNow2),
        isManual: true,
      };
      return { ...state, sessions: [session, ...state.sessions] };
    }

    case "ADD_RECURRING_TASK": {
      const task: RecurringTask = {
        ...action.task,
        id: action._id ?? crypto.randomUUID(),
        completionCount: 0,
        history: [],
      };
      return { ...state, recurringTasks: [...state.recurringTasks, task] };
    }

    case "UPDATE_RECURRING_TASK":
      return {
        ...state,
        recurringTasks: state.recurringTasks.map((r) =>
          r.id !== action.id ? r : { ...r, ...action.fields }
        ),
      };

    case "DELETE_RECURRING_TASK":
      return {
        ...state,
        recurringTasks: state.recurringTasks.filter((r) => r.id !== action.id),
      };

    case "COMPLETE_RECURRING_TASK": {
      const now = new Date();
      const entry: RecurringHistoryEntry = {
        id: action._historyEntryId ?? crypto.randomUUID(),
        completedAt: now.toLocaleString("en-US", {
          month: "long", day: "numeric", year: "numeric",
          hour: "2-digit", minute: "2-digit", hour12: false,
        }),
      };
      return {
        ...state,
        recurringTasks: state.recurringTasks.map((r) =>
          r.id !== action.id
            ? r
            : {
                ...r,
                lastDoneDate: now,
                completionCount: r.completionCount + 1,
                history: [entry, ...r.history],
              }
        ),
      };
    }

    case "TOGGLE_TASK_FOR_TODAY":
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== action.id) return t;
          // Already queued for this date → remove
          if ((t.queuedDate ?? null) === action.dateString) {
            return { ...t, queuedDate: null };
          }
          // Add to queue — always start with a clean daily slate for this date
          return {
            ...t,
            queuedDate:         action.dateString,
            intent:             "finish",
            dailyTargetMinutes: null,
            dailyTracking: {
              ...(t.dailyTracking ?? {}),
              [action.dateString]: { timeSpentMinutes: 0, intent: "finish", dailyTargetMinutes: null },
            },
          };
        }),
      };

    case "UPDATE_TASK_TIME_SPENT":
      return {
        ...state,
        tasks: addDailyMinutes(
          state.tasks.map((t) =>
            t.id !== action.id ? t : { ...t, timeSpentMinutes: (t.timeSpentMinutes ?? 0) + action.minutes }
          ),
          action.id, state.currentTrackingDate, action.minutes
        ),
      };

    case "UPDATE_TASK_DAILY":
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== action.id) return t;
          const cur = t.dailyTracking?.[action.dateKey] ?? { timeSpentMinutes: 0, intent: "finish" as const, dailyTargetMinutes: null };
          return {
            ...t,
            dailyTracking: { ...(t.dailyTracking ?? {}), [action.dateKey]: { ...cur, ...action.changes } },
          };
        }),
      };

    case "TRANSITION_TO_NEXT_DAY": {
      const newDate = new Date().toLocaleDateString("en-CA");
      return {
        ...state,
        currentTrackingDate: newDate,
        showNightlyReview:   false,
        tasks: state.tasks.map((t) => {
          if ((t.queuedDate ?? null) !== state.currentTrackingDate) return t;
          if (t.done) return { ...t, queuedDate: null };
          if ((t.intent ?? "finish") === "maybe") return { ...t, queuedDate: null };
          // Incomplete commitment → increment rollover, remove from queue
          return { ...t, queuedDate: null, rolloverCount: (t.rolloverCount ?? 0) + 1 };
        }),
      };
    }

    case "SAVE_CHECK_IN": {
      const ci = action.checkIn;
      const morningClosure: MindStateClosure = {
        morningMoodKey: ci.moodKey,
        morningMood:    ci.mood,
        morningTags:    ci.tags,
        morningNote:    ci.note,
        endDelta:       "same",
        closureNote:    "",
      };
      const existingIdx = state.historicalLogs.findIndex((l) => l.date === ci.date);
      let updatedLogs: HistoricalLog[];
      if (existingIdx === -1) {
        // No historical entry yet — prepend a synthetic one so the modal shows it immediately
        const syntheticEntry: HistoricalLog = {
          date: ci.date, dayVelocity: 0, recap: "",
          completedTasks: [], rolledOverTasks: [],
          mindStateClosure: morningClosure,
        };
        updatedLogs = [syntheticEntry, ...state.historicalLogs];
      } else {
        // Entry exists — overlay new morning fields but keep any real end-of-day data
        const prev = state.historicalLogs[existingIdx].mindStateClosure;
        updatedLogs = state.historicalLogs.map((l, i) =>
          i === existingIdx
            ? {
                ...l,
                mindStateClosure: {
                  morningMoodKey: morningClosure.morningMoodKey,
                  morningMood:    morningClosure.morningMood,
                  morningTags:    morningClosure.morningTags,
                  morningNote:    morningClosure.morningNote,
                  endDelta:       prev?.endDelta    ?? morningClosure.endDelta,
                  closureNote:    prev?.closureNote ?? morningClosure.closureNote,
                },
              }
            : l
        );
      }
      return { ...state, dailyCheckIn: ci, historicalLogs: updatedLogs };
    }

    case "LOCK_DAY": {
      const newDate = new Date().toLocaleDateString("en-CA");
      const logEntry: HistoricalLog = {
        date:              action.date,
        dayVelocity:       action.dayVelocity,
        recap:             action.recap,
        completedTasks:    action.completedTasks,
        rolledOverTasks:   action.rolledOverTasks,
        taskMeta:          action.taskMeta,
        mindStateClosure:  action.mindStateClosure,
      };
      const existingIndex = state.historicalLogs.findIndex((l) => l.date === action.date);
      const updatedLogs = existingIndex !== -1
        ? state.historicalLogs.map((l, i) => (i === existingIndex ? logEntry : l))
        : [logEntry, ...state.historicalLogs];

      return {
        ...state,
        currentTrackingDate: newDate,
        showNightlyReview:   false,
        yesterdayRecap:      action.recap,
        historicalLogs:      updatedLogs,
        dailyCheckIn:        null,
        tasks: state.tasks.map((t) => {
          if ((t.queuedDate ?? null) !== state.currentTrackingDate) return t;
          if (t.done) return { ...t, queuedDate: null };
          if ((t.intent ?? "finish") === "maybe") return { ...t, queuedDate: null };
          return { ...t, queuedDate: null, rolloverCount: (t.rolloverCount ?? 0) + 1 };
        }),
      };
    }

    case "REQUEST_NIGHTLY_REVIEW":
      return { ...state, showNightlyReview: true };

    case "DISMISS_NIGHTLY_REVIEW":
      return { ...state, showNightlyReview: false };

    case "ADD_TAG": {
      const tag: Tag = {
        ...action.tag,
        id: action._id ?? crypto.randomUUID(),
      };
      return { ...state, tags: [...state.tags, tag] };
    }

    case "UPDATE_TAG":
      return {
        ...state,
        tags: state.tags.map((t) => t.id !== action.id ? t : { ...t, ...action.fields }),
      };

    case "DELETE_TAG":
      return { ...state, tags: state.tags.filter((t) => t.id !== action.id) };

    case "UPDATE_PROJECT": {
      const old = state.projects.find((p) => p.id === action.id);
      const updatedProjects = state.projects.map((p) =>
        p.id !== action.id ? p : { ...p, ...action.fields }
      );
      if (old && action.fields.name && action.fields.name !== old.name) {
        const oldName = old.name;
        const newName = action.fields.name;
        return {
          ...state,
          projects: updatedProjects,
          tasks: state.tasks.map((t) => t.project === oldName ? { ...t, project: newName } : t),
        };
      }
      return { ...state, projects: updatedProjects };
    }

    case "DELETE_PROJECT": {
      const proj = state.projects.find((p) => p.id === action.id);
      if (!proj) return state;
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.id),
        tasks: state.tasks.filter((t) => !(t.project === proj.name && t.sphere === proj.sphere)),
      };
    }

    case "REORDER_PROJECTS": {
      const scoped = state.projects
        .filter((p) => p.sphere === action.sphereName)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const [moved] = scoped.splice(action.startIndex, 1);
      scoped.splice(action.endIndex, 0, moved);
      const newOrderById = new Map(scoped.map((p, i) => [p.id, i]));
      return {
        ...state,
        projects: state.projects.map((p) =>
          newOrderById.has(p.id) ? { ...p, sortOrder: newOrderById.get(p.id)! } : p
        ),
      };
    }

    case "ADD_SPHERE": {
      const sphere: Sphere = {
        id: action._id ?? crypto.randomUUID(),
        name: action.name,
        labelColor: action.labelColor,
      };
      return { ...state, spheres: [...state.spheres, sphere] };
    }

    case "UPDATE_SPHERE": {
      const old = state.spheres.find((s) => s.id === action.id);
      const updatedSpheres = state.spheres.map((s) =>
        s.id !== action.id ? s : { ...s, ...action.fields }
      );
      if (old && action.fields.name && action.fields.name !== old.name) {
        const oldName = old.name;
        const newName = action.fields.name;
        return {
          ...state,
          spheres:        updatedSpheres,
          tasks:          state.tasks.map((t) => t.sphere === oldName ? { ...t, sphere: newName } : t),
          projects:       state.projects.map((p) => p.sphere === oldName ? { ...p, sphere: newName } : p),
          recurringTasks: state.recurringTasks.map((r) => r.sphere === oldName ? { ...r, sphere: newName } : r),
        };
      }
      return { ...state, spheres: updatedSpheres };
    }

    case "DELETE_SPHERE": {
      if (state.spheres.length <= 1) return state;
      const deleted   = state.spheres.find((s) => s.id === action.id);
      const remaining = state.spheres.filter((s) => s.id !== action.id);
      if (!deleted) return state;
      const fallback  = remaining[0].name;
      return {
        ...state,
        spheres:        remaining,
        tasks:          state.tasks.map((t) => t.sphere === deleted.name ? { ...t, sphere: fallback } : t),
        projects:       state.projects.map((p) => p.sphere === deleted.name ? { ...p, sphere: fallback } : p),
        recurringTasks: state.recurringTasks.map((r) => r.sphere === deleted.name ? { ...r, sphere: fallback } : r),
      };
    }

    case "REORDER_SPHERES": {
      const next = [...state.spheres];
      const [moved] = next.splice(action.startIndex, 1);
      next.splice(action.endIndex, 0, moved);
      return { ...state, spheres: next };
    }

    case "REORDER_RELATIONSHIP_GROUPS": {
      const next = [...state.relationshipGroups];
      const [moved] = next.splice(action.startIndex, 1);
      next.splice(action.endIndex, 0, moved);
      return { ...state, relationshipGroups: next };
    }

    case "ADD_HABIT": {
      const habit: Habit = {
        ...action.habit,
        id: action._id ?? crypto.randomUUID(),
        history: {},
      };
      return { ...state, habits: [...state.habits, habit] };
    }

    case "TOGGLE_HABIT_DATE": {
      return {
        ...state,
        habits: state.habits.map((h) =>
          h.id !== action.id
            ? h
            : {
                ...h,
                history: {
                  ...h.history,
                  [action.dateString]: !h.history[action.dateString],
                },
              }
        ),
      };
    }

    case "UPDATE_HABIT":
      return {
        ...state,
        habits: state.habits.map((h) =>
          h.id !== action.id ? h : { ...h, ...action.fields }
        ),
      };

    case "DELETE_HABIT":
      return { ...state, habits: state.habits.filter((h) => h.id !== action.id) };

    case "ADD_QUICK_NOTE": {
      const note: QuickNote = {
        ...action.note,
        id: action._id ?? crypto.randomUUID(),
      };
      return { ...state, quickNotes: [note, ...state.quickNotes] };
    }

    case "DELETE_QUICK_NOTE":
      return { ...state, quickNotes: state.quickNotes.filter((n) => n.id !== action.id) };

    case "TOGGLE_QUICK_NOTE_IMPORTANT":
      return {
        ...state,
        quickNotes: state.quickNotes.map((n) =>
          n.id !== action.id ? n : { ...n, isImportant: !n.isImportant }
        ),
      };

    case "UPDATE_QUICK_NOTE_TEXT":
      return {
        ...state,
        quickNotes: state.quickNotes.map((n) =>
          n.id !== action.id ? n : { ...n, text: action.text }
        ),
      };

    case "ADD_NETWORK_CONTACT": {
      const contact: NetworkContact = {
        ...action.contact,
        id: action._id ?? crypto.randomUUID(),
      };
      return { ...state, networkContacts: [...state.networkContacts, contact] };
    }

    case "UPDATE_NETWORK_CONTACT":
      return {
        ...state,
        networkContacts: state.networkContacts.map((c) =>
          c.id !== action.id ? c : { ...c, ...action.fields }
        ),
      };

    case "DELETE_NETWORK_CONTACT":
      return { ...state, networkContacts: state.networkContacts.filter((c) => c.id !== action.id) };

    case "ADD_RELATIONSHIP_GROUP": {
      const group: RelationshipGroup = {
        ...action.group,
        id: action._id ?? crypto.randomUUID(),
      };
      return { ...state, relationshipGroups: [...state.relationshipGroups, group] };
    }

    case "UPDATE_RELATIONSHIP_GROUP":
      return {
        ...state,
        relationshipGroups: state.relationshipGroups.map((g) =>
          g.id !== action.id ? g : { ...g, ...action.fields }
        ),
      };

    case "DELETE_RELATIONSHIP_GROUP":
      return { ...state, relationshipGroups: state.relationshipGroups.filter((g) => g.id !== action.id) };

    default:
      return state;
  }
}

// ── Initial state (always empty — HYDRATE action populates from Supabase) ─────

function buildInitialState(): State {
  return {
    currentTrackingDate: new Date().toLocaleDateString("en-CA"),
    showNightlyReview:   false,
    historicalLogs:      [],
    yesterdayRecap:      "",
    dailyCheckIn:        null,
    tags:               [],
    spheres:            [],
    habits:             [],
    tasks:              [],
    projects:           [],
    recurringTasks:     [],
    quickNotes:         [],
    networkContacts:    [],
    relationshipGroups: [],
    activeTask:    null,
    running:       false,
    elapsed:       0,
    committedSecs: 0,
    startedAt:     null,
    sessions:      [],
  };
}

// ── Supabase data loader ──────────────────────────────────────────────────────

async function loadDashboardData(userId: string): Promise<Partial<State>> {
  if (!supabase) return {};

  const [
    spheresRes, tagsRes, projectsRes, tasksRes, sessionsRes,
    habitsRes, quickNotesRes, groupsRes, contactsRes,
    recurringRes, logsRes, checkInRes, dashStateRes,
  ] = await Promise.all([
    supabase.from("spheres").select("*").order("sort_order"),
    supabase.from("tags").select("*"),
    supabase.from("projects").select("*, project_tags(tag_id)"),
    supabase.from("tasks").select("*"),
    supabase.from("focus_sessions").select("*").order("completed_at", { ascending: false }),
    supabase.from("habits").select("*, habit_completions(completed_on)"),
    supabase.from("quick_notes").select("*").order("created_at", { ascending: false }),
    supabase.from("relationship_groups").select("*").order("sort_order"),
    supabase.from("network_contacts").select("*, contact_events(*)"),
    supabase.from("recurring_tasks").select("*, recurring_task_history(id, completed_at)"),
    supabase.from("historical_logs").select("*").order("date", { ascending: false }),
    supabase.from("daily_check_ins").select("*").order("date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("user_dashboard_state").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  const sphereRows  = spheresRes.data  ?? [];
  const projectRows = projectsRes.data ?? [];

  const sphereNameById  = new Map<string, string>(sphereRows.map((s: Record<string, string>) => [s.id, s.name]));
  const projectNameById = new Map<string, string>(projectRows.map((p: Record<string, string>) => [p.id, p.name]));
  const groupLabelById  = new Map<string, string>((groupsRes.data ?? []).map((g: Record<string, string>) => [g.id, g.label]));

  const spheres: Sphere[] = sphereRows.map((s: Record<string, string>) => ({
    id: s.id, name: s.name, labelColor: s.label_color, description: s.description ?? undefined,
  }));

  const tags: Tag[] = (tagsRes.data ?? []).map((t: Record<string, string>) => ({
    id: t.id, label: t.label, color: t.color,
  }));

  const projects: Project[] = projectRows.map((p: Record<string, unknown>) => ({
    id:        p.id as string,
    sphere:    sphereNameById.get(p.sphere_id as string) ?? "",
    name:      p.name as string,
    emoji:     (p.emoji as string) ?? "📁",
    tagIds:    ((p.project_tags as { tag_id: string }[]) ?? []).map(pt => pt.tag_id),
    status:    p.status as Project["status"],
    milestone: p.milestone as string,
    sortOrder: (p.sort_order as number) ?? 0,
    isSample:  (p.is_sample as boolean) ?? false,
  }));

  const tasks: Task[] = (tasksRes.data ?? []).map((t: Record<string, unknown>) => ({
    id:                 t.id as string,
    sphere:             sphereNameById.get(t.sphere_id as string) ?? "",
    project:            projectNameById.get(t.project_id as string) ?? "",
    title:              t.title as string,
    priority:           t.priority as Priority,
    energy:             t.energy as Energy,
    urgency:            (t.urgency as Urgency) ?? "not-urgent",
    done:               t.done as boolean,
    deadline:           (t.deadline as string) ?? null,
    notes:              (t.notes as string) ?? "",
    manualMinutes:      (t.manual_minutes as number) ?? 0,
    queuedDate:         (t.queued_date as string) ?? null,
    timeSpentMinutes:   (t.time_spent_minutes as number) ?? 0,
    intent:             (t.intent as Task["intent"]) ?? "finish",
    dailyTargetMinutes: (t.daily_target_minutes as number) ?? null,
    rolloverCount:      (t.rollover_count as number) ?? 0,
    dailyTracking:      (t.daily_tracking as Record<string, DailyTrackingEntry>) ?? {},
    isSample:           (t.is_sample as boolean) ?? false,
  }));

  const sessions: FocusSession[] = (sessionsRes.data ?? []).map((s: Record<string, unknown>) => ({
    id:                    s.id as string,
    taskName:              s.task_name as string,
    project:               (s.project_name as string) ?? undefined,
    sphere:                (s.sphere_name as string) ?? undefined,
    durationSeconds:       s.duration_seconds as number,
    completedAt:           new Date(s.completed_at as string),
    completedAtDateString: s.completed_at_date_string as string,
    isManual:              (s.is_manual as boolean) ?? false,
  }));

  const habits: Habit[] = (habitsRes.data ?? []).map((h: Record<string, unknown>) => {
    const history: Record<string, boolean> = {};
    ((h.habit_completions as { completed_on: string }[]) ?? []).forEach(c => { history[c.completed_on] = true; });
    return {
      id: h.id as string, title: h.title as string,
      type: h.type as Habit["type"], routine: (h.routine as Habit["routine"]) ?? "day",
      frequency: h.frequency as Habit["frequency"], targetCount: h.target_count as number,
      emoji: h.emoji as string, notes: (h.notes as string) ?? "", history,
    };
  });

  const quickNotes: QuickNote[] = (quickNotesRes.data ?? []).map((n: Record<string, unknown>) => {
    const ca = new Date(n.created_at as string);
    const hh = String(ca.getHours()).padStart(2, "0");
    const mm = String(ca.getMinutes()).padStart(2, "0");
    return {
      id: n.id as string, text: n.text as string,
      sphere: sphereNameById.get(n.sphere_id as string) ?? "",
      projectId: (n.project_id as string) ?? undefined,
      createdAt: `${ca.toLocaleDateString("en-CA")} ${hh}:${mm}`,
      isImportant: (n.is_important as boolean) ?? false,
    };
  });

  const relationshipGroups: RelationshipGroup[] = (groupsRes.data ?? []).map((g: Record<string, string>) => ({
    id: g.id, label: g.label, emoji: g.emoji, color: g.color as GroupColor,
  }));

  const networkContacts: NetworkContact[] = (contactsRes.data ?? []).map((c: Record<string, unknown>) => {
    const events: ContactEvent[] = ((c.contact_events as Record<string, unknown>[]) ?? []).map(e => ({
      id: e.id as string, title: (e.title as string) ?? "",
      date: (e.event_date as string) ?? null, notes: (e.notes as string) ?? "",
      completed: (e.completed as boolean) ?? false,
    }));
    return {
      id: c.id as string, name: c.name as string,
      relationshipType: groupLabelById.get(c.relationship_group_id as string) ?? "",
      birthday: (c.birthday as string) ?? null, notes: (c.notes as string) ?? "",
      lastTouchpoint: (c.last_touchpoint as string) ?? null,
      events, cycleCompleted: (c.cycle_completed as boolean) ?? false,
    };
  });

  const recurringTasks: RecurringTask[] = (recurringRes.data ?? []).map((r: Record<string, unknown>) => {
    const history: RecurringHistoryEntry[] = ((r.recurring_task_history as { id: string; completed_at: string }[]) ?? []).map(h => ({
      id: h.id,
      completedAt: new Date(h.completed_at).toLocaleString("en-US", {
        month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
      }),
    }));
    return {
      id: r.id as string, title: r.title as string, notes: (r.notes as string) ?? "",
      intervalDays: r.interval_days as number, intervalLabel: r.interval_label as string,
      anchorDay: (r.anchor_day as number) ?? undefined, startDate: (r.start_date as string) ?? undefined,
      sphere: sphereNameById.get(r.sphere_id as string) ?? "",
      lastDoneDate: r.last_done_date ? new Date(r.last_done_date as string) : null,
      completionCount: (r.completion_count as number) ?? 0, history,
    };
  });

  const historicalLogs: HistoricalLog[] = (logsRes.data ?? []).map((l: Record<string, unknown>) => ({
    date: l.date as string, dayVelocity: l.day_velocity as number, recap: (l.recap as string) ?? "",
    completedTasks: (l.completed_tasks as string[]) ?? [], rolledOverTasks: (l.rolled_over_tasks as string[]) ?? [],
    taskMeta: (l.task_meta as Record<string, TaskArchiveMeta>) ?? undefined,
    mindStateClosure: (l.mind_state_closure as MindStateClosure) ?? undefined,
  }));

  const checkInRow = checkInRes.data as Record<string, unknown> | null;
  const dailyCheckIn: DailyCheckIn | null = checkInRow ? {
    date: checkInRow.date as string, moodKey: checkInRow.mood_key as string,
    mood: checkInRow.mood as string, tags: (checkInRow.tags as string[]) ?? [], note: (checkInRow.note as string) ?? "",
  } : null;

  const dashState = dashStateRes.data as Record<string, unknown> | null;
  const today = new Date().toLocaleDateString("en-CA");
  const savedTrackingDate = (dashState?.current_tracking_date as string) ?? today;
  const dismissedDate = typeof window !== "undefined"
    ? localStorage.getItem("ld_nightly_review_dismissed") ?? ""
    : "";
  const showNightlyReview = savedTrackingDate !== today && dismissedDate !== today;

  // Re-hydrate the active timer segment from whatever's actually in the row — this is what lets
  // a headless trigger (e.g. a Telegram bot writing these same columns via a backend route)
  // start/stop a session while the dashboard is closed, and have it appear correctly the moment
  // it's opened. Gated on active_task_id (not just the snapshot/running flag) so a deleted task
  // — which ON DELETE SET NULL clears from active_task_id but can't reach into this JS object —
  // can't leave a ghost "running" timer behind.
  const hasActiveTimer  = !!dashState?.active_task_id;
  const activeTask      = hasActiveTimer ? ((dashState?.active_task_snapshot as ActiveTask | null) ?? null) : null;
  const timerRunning     = hasActiveTimer && !!dashState?.timer_running;
  const timerCommittedSecs = (dashState?.timer_committed_secs as number) ?? 0;
  const timerStartedAtMs  = timerRunning && dashState?.timer_started_at
    ? new Date(dashState.timer_started_at as string).getTime()
    : null;
  // Pre-computed so the very first paint already shows real elapsed time — the next tick
  // recomputes the same way and simply continues from here, no visible jump.
  const liveElapsedAtLoad = timerRunning && timerStartedAtMs != null
    ? timerCommittedSecs + Math.floor((Date.now() - timerStartedAtMs) / 1000)
    : timerCommittedSecs;

  // Default-area provisioning now happens exactly once, inside the onboarding
  // seeder (src/services/onboardingSeeder.ts) — every account picks either the
  // Clean Slate or an industry template during onboarding, which always seeds
  // its own areas. A client-side "spheres.length === 0" fallback here used to
  // race against that seeder and could insert a second Private/Business pair.

  return {
    spheres, tags, projects, tasks, sessions, habits, quickNotes,
    relationshipGroups, networkContacts, recurringTasks, historicalLogs,
    dailyCheckIn, currentTrackingDate: savedTrackingDate,
    yesterdayRecap: (dashState?.yesterday_recap as string) ?? "", showNightlyReview,
    activeTask, running: timerRunning, elapsed: liveElapsedAtLoad,
    committedSecs: timerCommittedSecs, startedAt: timerRunning ? timerStartedAtMs : null,
  };
}

// ── Context ──────────────────────────────────────────────────────────────────

interface DashboardContextType {
  isLoading: boolean;
  currentTrackingDate: string;
  showNightlyReview: boolean;
  historicalLogs: HistoricalLog[];
  yesterdayRecap: string;
  lockDay: (date: string, dayVelocity: number, recap: string, completedTasks: string[], rolledOverTasks: string[], taskMeta?: Record<string, TaskArchiveMeta>, mindStateClosure?: MindStateClosure) => void;
  dailyCheckIn: DailyCheckIn | null;
  saveDailyCheckIn: (checkIn: DailyCheckIn) => void;
  toggleTaskForToday: (id: string, dateString: string, intent: Task["intent"], targetMinutes: number | null) => void;
  updateTaskDaily: (id: string, dateKey: string, changes: Partial<DailyTrackingEntry>) => void;
  updateTaskTimeSpent: (id: string, minutes: number) => void;
  transitionToNextDay: () => void;
  requestNightlyReview: () => void;
  dismissNightlyReview: () => void;
  tags: Tag[];
  spheres: Sphere[];
  habits: Habit[];
  tasks: Task[];
  projects: Project[];
  activeTask: ActiveTask | null;
  running: boolean;
  elapsed: number;
  committedSecs: number;
  sessions: FocusSession[];
  recurringTasks: RecurringTask[];
  quickNotes: QuickNote[];
  addQuickNote: (text: string, sphere: string, projectId?: string) => void;
  deleteQuickNote: (id: string) => void;
  toggleQuickNoteImportant: (id: string) => void;
  updateQuickNoteText: (id: string, text: string) => void;
  networkContacts: NetworkContact[];
  addNetworkContact: (contact: Omit<NetworkContact, "id">) => void;
  updateNetworkContact: (id: string, fields: Partial<Omit<NetworkContact, "id">>) => void;
  deleteNetworkContact: (id: string) => void;
  relationshipGroups: RelationshipGroup[];
  addRelationshipGroup: (group: Omit<RelationshipGroup, "id">) => void;
  updateRelationshipGroup: (id: string, fields: Partial<Omit<RelationshipGroup, "id">>) => void;
  deleteRelationshipGroup: (id: string) => void;
  addTag: (tag: Omit<Tag, "id">) => void;
  updateTag: (id: string, fields: Partial<Omit<Tag, "id">>) => void;
  deleteTag: (id: string) => void;
  addHabit: (habit: Omit<Habit, "id" | "history">) => void;
  toggleHabitDate: (id: string, dateString: string) => void;
  updateHabit: (id: string, fields: Partial<Omit<Habit, "id" | "history">>) => void;
  deleteHabit: (id: string) => void;
  addSphere: (name: string, labelColor: string) => void;
  updateSphere: (id: string, fields: Partial<Pick<Sphere, "name" | "labelColor" | "description">>) => void;
  deleteSphere: (id: string) => void;
  reorderSpheres: (startIndex: number, endIndex: number) => void;
  reorderRelationshipGroups: (startIndex: number, endIndex: number) => void;
  updateProject: (id: string, fields: Partial<Omit<Project, "id">>) => void;
  deleteProject: (id: string) => void;
  reorderProjects: (sphereName: string, startIndex: number, endIndex: number) => void;
  addTask: (task: Omit<Task, "id">, projectId?: string) => void;
  updateTask: (id: string, fields: Partial<Task>) => void;
  toggleTaskComplete: (id: string) => void;
  deleteTask: (id: string) => void;
  sampleDeleteCount: number;
  deleteAllSampleData: () => Promise<void>;
  hasDraggedOnce: boolean;
  notifyDragStart: () => void;
  addProject: (project: Omit<Project, "id" | "sortOrder">) => string;
  addManualTime: (projectId: string, minutes: number) => void;
  startTask: (task: ActiveTask) => void;
  startFree: () => void;
  pauseSession: () => void;
  resetTimer: () => void;
  finishSession: () => void;
  setEstimate: (minutes: number) => void;
  activeTaskId: string | null;
  timerIsRunning: boolean;
  startGlobalTimer: (taskId: string) => void;
  pauseGlobalTimer: () => void;
  addRecurringTask: (task: Omit<RecurringTask, "id" | "completionCount" | "history">) => void;
  updateRecurringTask: (id: string, fields: Partial<Pick<RecurringTask, "title" | "notes" | "sphere" | "intervalDays" | "intervalLabel" | "anchorDay" | "startDate">>) => void;
  deleteRecurringTask: (id: string) => void;
  completeRecurringTask: (id: string) => void;
  calendarJump: CalendarJump | null;
  setCalendarJump: (j: CalendarJump | null) => void;
  taskModalOpen: boolean;
  openTaskModal: () => void;
  closeTaskModal: () => void;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  anyOverlayOpen: boolean;
  pushOverlay: () => void;
  popOverlay: () => void;
  activeWidgetIds: string[];
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [calendarJump, setCalendarJump] = useState<CalendarJump | null>(null);
  const [taskModalOpen,  setTaskModalOpen]  = useState(false);
  const [settingsOpen,   setSettingsOpen]   = useState(false);
  const overlayCountRef = useRef(0);
  const [anyOverlayOpen, setAnyOverlayOpen] = useState(false);
  // Counts deletions of sample (onboarding-seeded) tasks/projects this session — DuduAssistant
  // watches this to offer a one-click "delete all samples" once the user starts cleaning up.
  const [sampleDeleteCount, setSampleDeleteCount] = useState(0);

  // ── Active widget IDs — mirrors DashboardGrid's widgetIds ────────────────────
  // Initialized to all widgets (DEFAULT_WIDGET_IDS) so nothing is hidden on
  // first render. Two effects sync it to the real selection: one reads from
  // user metadata when the session loads, the other listens for live updates
  // dispatched by the SettingsModal via the ld:widget-layout custom event.
  const [activeWidgetIds, setActiveWidgetIds] = useState<string[]>(DEFAULT_WIDGET_IDS);

  useEffect(() => {
    const fromMeta = user?.user_metadata?.widget_layout as string[] | undefined;
    if (Array.isArray(fromMeta) && fromMeta.length > 0) {
      setActiveWidgetIds(fromMeta);
      return;
    }
    try {
      const stored = localStorage.getItem(WIDGET_LAYOUT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) { setActiveWidgetIds(parsed); return; }
      }
    } catch { /* */ }
  }, [user?.user_metadata?.widget_layout]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onLayoutChanged(e: Event) {
      const ids = (e as CustomEvent<string[]>).detail;
      if (Array.isArray(ids) && ids.length > 0) setActiveWidgetIds(ids);
    }
    window.addEventListener("ld:widget-layout", onLayoutChanged);
    return () => window.removeEventListener("ld:widget-layout", onLayoutChanged);
  }, []);

  // Flips true the instant the user starts their first widget drag — DuduAssistant
  // watches this to fire the rearrange tip immediately rather than waiting on a timer.
  const [hasDraggedOnce, setHasDraggedOnce] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // ── Lookup helpers (read from stateRef for pre-dispatch values) ──────────────
  const getSphereId = (name: string) => stateRef.current.spheres.find(s => s.name === name)?.id ?? null;
  const getProjectId = (projectName: string, sphereName: string) =>
    stateRef.current.projects.find(p => p.name === projectName && p.sphere === sphereName)?.id ?? null;
  const getGroupId = (label: string) => stateRef.current.relationshipGroups.find(g => g.label === label)?.id ?? null;

  // ── Load data from Supabase when user session is established ─────────────────
  useEffect(() => {
    if (!supabase || !user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    loadDashboardData(user.id)
      .then(payload => {
        dispatch({ type: "HYDRATE", state: payload });
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("[DashboardProvider] load failed:", err);
        setIsLoading(false);
      });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer tick ────────────────────────────────────────────────────────────────
  // The 1s interval is just a cheap "wake me up to recompute" pulse — TICK derives elapsed
  // from the absolute startedAt timestamp (see the reducer), so it's correct even though
  // background tabs throttle setInterval down to roughly once a minute. The visibilitychange/
  // focus listeners close the remaining gap: the instant the tab becomes visible/focused again,
  // force one immediate recompute rather than waiting for that throttled interval to fire.
  useEffect(() => {
    if (state.running) {
      intervalRef.current = setInterval(() => dispatch({ type: "TICK" }), 1000);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }

    function snapToNow() {
      if (document.visibilityState === "visible") dispatch({ type: "TICK" });
    }
    document.addEventListener("visibilitychange", snapToNow);
    window.addEventListener("focus", snapToNow);

    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      document.removeEventListener("visibilitychange", snapToNow);
      window.removeEventListener("focus", snapToNow);
    };
  }, [state.running]);

  // ── Agent-server sync (snapshot for AI assistant context) ────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    fetch("/api/agent-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tasks: state.tasks, habits: state.habits, projects: state.projects,
        spheres: state.spheres, recurringTasks: state.recurringTasks,
        quickNotes: state.quickNotes, currentTrackingDate: state.currentTrackingDate,
      }),
    }).catch(() => {});
  }, [state.tasks, state.habits, state.projects, state.recurringTasks, state.quickNotes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Agent-pending poll ────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    async function poll() {
      try {
        const res = await fetch("/api/agent-pending");
        if (!res.ok) return;
        const actions: Array<{ type: string; payload: Record<string, unknown> }> = await res.json();
        if (!actions.length) return;
        for (const action of actions) {
          if (action.type === "ADD_QUICK_NOTE")        dispatch({ type: "ADD_QUICK_NOTE",  note: action.payload as Omit<QuickNote, "id"> });
          else if (action.type === "DELETE_QUICK_NOTE") dispatch({ type: "DELETE_QUICK_NOTE", id: action.payload.id as string });
          else if (action.type === "ADD_HABIT")         dispatch({ type: "ADD_HABIT", habit: action.payload as Omit<Habit, "id" | "history"> });
          else if (action.type === "DELETE_HABIT")      dispatch({ type: "DELETE_HABIT", id: action.payload.id as string });
          else if (action.type === "TOGGLE_HABIT_DATE") dispatch({ type: "TOGGLE_HABIT_DATE", id: action.payload.id as string, dateString: action.payload.dateString as string });
          else if (action.type === "ADD_TASK")          dispatch({ type: "ADD_TASK", task: action.payload as Omit<Task, "id"> });
          else if (action.type === "UPDATE_TASK")       dispatch({ type: "UPDATE_TASK", id: action.payload.id as string, fields: action.payload.fields as Partial<Task> });
          else if (action.type === "RENAME_TASK_REFS")  dispatch({ type: "RENAME_TASK_REFS", taskId: action.payload.taskId as string, oldTitle: action.payload.oldTitle as string, newTitle: action.payload.newTitle as string });
          else if (action.type === "DELETE_TASK")       dispatch({ type: "DELETE_TASK", id: action.payload.id as string });
          else if (action.type === "ADD_PROJECT")       dispatch({ type: "ADD_PROJECT", project: action.payload as Omit<Project, "id"> });
          else if (action.type === "UPDATE_PROJECT")    dispatch({ type: "UPDATE_PROJECT", id: action.payload.id as string, fields: action.payload.fields as Partial<Omit<Project, "id">> });
          else if (action.type === "ADD_RECURRING_TASK")    dispatch({ type: "ADD_RECURRING_TASK", task: action.payload as Omit<RecurringTask, "id" | "completionCount" | "history"> });
          else if (action.type === "COMPLETE_RECURRING_TASK") dispatch({ type: "COMPLETE_RECURRING_TASK", id: action.payload.id as string });
          else if (action.type === "DELETE_RECURRING_TASK")   dispatch({ type: "DELETE_RECURRING_TASK", id: action.payload.id as string });
          else if (action.type === "START_TASK")   dispatch({ type: "START_TASK", task: action.payload as unknown as ActiveTask });
          else if (action.type === "PAUSE_SESSION") dispatch({ type: "PAUSE_SESSION" });
          else if (action.type === "LOCK_DAY")     dispatch({ type: "LOCK_DAY", date: action.payload.date as string, dayVelocity: action.payload.dayVelocity as number, recap: action.payload.recap as string, completedTasks: action.payload.completedTasks as string[], rolledOverTasks: action.payload.rolledOverTasks as string[] });
        }
        await fetch("/api/agent-pending", { method: "DELETE" });
      } catch { /* silent */ }
    }
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Supabase write helpers ────────────────────────────────────────────────────
  const db = supabase && user ? supabase : null;
  const uid = user?.id;

  // Mirrors the active timer segment to user_dashboard_state on every meaningful transition
  // (start/resume/pause/finish/reset — not every per-second tick, since elapsed is derivable
  // from started_at + committed_secs by anyone reading the row). This is what lets a headless
  // trigger (e.g. a Telegram bot hitting a backend route that writes these same columns) work
  // at all — loadDashboardData() re-hydrates activeTask/running/startedAt/committedSecs from
  // here on every load, so the web dashboard catches up to whatever the row says regardless of
  // whether this tab was the one that started or stopped the session.
  useEffect(() => {
    if (!db || !uid) return;
    db.from("user_dashboard_state").upsert({
      user_id: uid,
      active_task_id: state.activeTask?.id ?? null,
      active_task_snapshot: state.activeTask ?? null,
      timer_running: state.running,
      timer_started_at: state.startedAt != null ? new Date(state.startedAt).toISOString() : null,
      timer_committed_secs: state.committedSecs,
    }).then(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, state.activeTask, state.running, state.startedAt, state.committedSecs]);

  return (
    <DashboardContext.Provider
      value={{
        isLoading,
        currentTrackingDate:  state.currentTrackingDate,
        showNightlyReview:    state.showNightlyReview,
        historicalLogs:       state.historicalLogs,
        yesterdayRecap:       state.yesterdayRecap,

        toggleTaskForToday: (id, dateString, intent, targetMinutes) => {
          const task = stateRef.current.tasks.find(t => t.id === id);
          dispatch({ type: "TOGGLE_TASK_FOR_TODAY", id, dateString, intent: intent ?? "finish", targetMinutes });
          if (db && task) {
            const alreadyQueued = (task.queuedDate ?? null) === dateString;
            if (alreadyQueued) {
              db.from("tasks").update({ queued_date: null }).eq("id", id).then(({ error }) => {
                if (error) dispatch({ type: "TOGGLE_TASK_FOR_TODAY", id, dateString, intent: intent ?? "finish", targetMinutes });
              });
            } else {
              const newTracking = { ...(task.dailyTracking ?? {}), [dateString]: { timeSpentMinutes: 0, intent: "finish", dailyTargetMinutes: null } };
              db.from("tasks").update({ queued_date: dateString, daily_tracking: newTracking }).eq("id", id).then(({ error }) => {
                if (error) dispatch({ type: "TOGGLE_TASK_FOR_TODAY", id, dateString, intent: intent ?? "finish", targetMinutes });
              });
            }
          }
        },

        updateTaskTimeSpent: (id, minutes) => {
          const task = stateRef.current.tasks.find(t => t.id === id);
          dispatch({ type: "UPDATE_TASK_TIME_SPENT", id, minutes });
          if (db && task) {
            const newTotal = (task.timeSpentMinutes ?? 0) + minutes;
            const dateKey = stateRef.current.currentTrackingDate;
            const cur = task.dailyTracking?.[dateKey] ?? { timeSpentMinutes: 0, intent: "finish" as const, dailyTargetMinutes: null };
            const newTracking = { ...(task.dailyTracking ?? {}), [dateKey]: { ...cur, timeSpentMinutes: cur.timeSpentMinutes + minutes } };
            db.from("tasks").update({ time_spent_minutes: newTotal, daily_tracking: newTracking }).eq("id", id).then(() => {});
          }
        },

        updateTaskDaily: (id, dateKey, changes) => {
          const task = stateRef.current.tasks.find(t => t.id === id);
          dispatch({ type: "UPDATE_TASK_DAILY", id, dateKey, changes });
          if (db && task) {
            const cur = task.dailyTracking?.[dateKey] ?? { timeSpentMinutes: 0, intent: "finish" as const, dailyTargetMinutes: null };
            const newTracking = { ...(task.dailyTracking ?? {}), [dateKey]: { ...cur, ...changes } };
            db.from("tasks").update({ daily_tracking: newTracking }).eq("id", id).then(() => {});
          }
        },

        transitionToNextDay: () => {
          const currentDate = stateRef.current.currentTrackingDate;
          const rolledOver = stateRef.current.tasks.filter(t =>
            (t.queuedDate ?? null) === currentDate && !t.done && (t.intent ?? "finish") !== "maybe"
          );
          dispatch({ type: "TRANSITION_TO_NEXT_DAY" });
          if (db && uid) {
            const newDate = new Date().toLocaleDateString("en-CA");
            db.from("user_dashboard_state").upsert({ user_id: uid, current_tracking_date: newDate }).then(() => {});
            rolledOver.forEach(t => {
              db.from("tasks").update({ queued_date: null, rollover_count: (t.rolloverCount ?? 0) + 1 }).eq("id", t.id).then(() => {});
            });
          }
        },

        requestNightlyReview: () => dispatch({ type: "REQUEST_NIGHTLY_REVIEW" }),
        dismissNightlyReview: () => {
          try { localStorage.setItem("ld_nightly_review_dismissed", new Date().toLocaleDateString("en-CA")); } catch { /* */ }
          dispatch({ type: "DISMISS_NIGHTLY_REVIEW" });
        },

        lockDay: (date, dayVelocity, recap, completedTasks, rolledOverTasks, taskMeta, mindStateClosure) => {
          const rolledOver = stateRef.current.tasks.filter(t =>
            (t.queuedDate ?? null) === stateRef.current.currentTrackingDate && !t.done && (t.intent ?? "finish") !== "maybe"
          );
          dispatch({ type: "LOCK_DAY", date, dayVelocity, recap, completedTasks, rolledOverTasks, taskMeta, mindStateClosure });
          if (db && uid) {
            db.from("historical_logs").upsert({
              user_id: uid, date, day_velocity: dayVelocity, recap,
              completed_tasks: completedTasks, rolled_over_tasks: rolledOverTasks,
              task_meta: taskMeta ?? {}, mind_state_closure: mindStateClosure ?? null,
            }, { onConflict: "user_id,date" }).then(() => {});
            const newDate = new Date().toLocaleDateString("en-CA");
            db.from("user_dashboard_state").upsert({ user_id: uid, current_tracking_date: newDate, yesterday_recap: recap }).then(() => {});
            rolledOver.forEach(t => {
              db.from("tasks").update({ queued_date: null, rollover_count: (t.rolloverCount ?? 0) + 1 }).eq("id", t.id).then(() => {});
            });
          }
        },

        dailyCheckIn: state.dailyCheckIn,
        saveDailyCheckIn: (checkIn) => {
          dispatch({ type: "SAVE_CHECK_IN", checkIn });
          if (db && uid) {
            db.from("daily_check_ins").upsert({
              user_id: uid, date: checkIn.date, mood_key: checkIn.moodKey,
              mood: checkIn.mood, tags: checkIn.tags, note: checkIn.note,
            }, { onConflict: "user_id,date" }).then(() => {});

            // Bridge: write morning data into historical_logs so the Mindset Journal
            // shows this check-in without waiting for end-of-day lock.
            const morningClosure = {
              morningMoodKey: checkIn.moodKey,
              morningMood:    checkIn.mood,
              morningTags:    checkIn.tags,
              morningNote:    checkIn.note,
              endDelta:       "same" as const,
              closureNote:    "",
            };
            db.from("historical_logs").insert({
              user_id: uid, date: checkIn.date,
              day_velocity: 0, recap: "",
              completed_tasks: [], rolled_over_tasks: [], task_meta: {},
              mind_state_closure: morningClosure,
            }).then(({ error }) => {
              // Row already exists (day locked or prior check-in insert) —
              // update morning fields only for unlocked rows (velocity still 0)
              if (error) {
                db.from("historical_logs")
                  .update({ mind_state_closure: morningClosure })
                  .eq("user_id", uid).eq("date", checkIn.date).eq("day_velocity", 0)
                  .then(() => {});
              }
            });
          }
        },

        tags: state.tags,
        addTag: (tag) => {
          const _id = crypto.randomUUID();
          dispatch({ type: "ADD_TAG", tag, _id });
          if (db && uid) db.from("tags").insert({ id: _id, user_id: uid, label: tag.label, color: tag.color }).then(() => {});
        },
        updateTag: (id, fields) => {
          dispatch({ type: "UPDATE_TAG", id, fields });
          if (db) db.from("tags").update(fields).eq("id", id).then(() => {});
        },
        deleteTag: (id) => {
          dispatch({ type: "DELETE_TAG", id });
          if (db) db.from("tags").delete().eq("id", id).then(() => {});
        },

        spheres: state.spheres,
        addSphere: (name, labelColor) => {
          const _id = crypto.randomUUID();
          const sortOrder = stateRef.current.spheres.length;
          dispatch({ type: "ADD_SPHERE", name, labelColor, _id });
          if (db && uid) db.from("spheres").insert({ id: _id, user_id: uid, name, label_color: labelColor, sort_order: sortOrder }).then(() => {});
        },
        updateSphere: (id, fields) => {
          dispatch({ type: "UPDATE_SPHERE", id, fields });
          if (db) {
            const dbFields: Record<string, unknown> = {};
            if (fields.name !== undefined)        dbFields.name = fields.name;
            if (fields.labelColor !== undefined)  dbFields.label_color = fields.labelColor;
            if (fields.description !== undefined) dbFields.description = fields.description;
            db.from("spheres").update(dbFields).eq("id", id).then(() => {});
          }
        },
        deleteSphere: (id) => {
          dispatch({ type: "DELETE_SPHERE", id });
          if (db) db.from("spheres").delete().eq("id", id).then(() => {});
        },
        reorderSpheres: (startIndex, endIndex) => {
          dispatch({ type: "REORDER_SPHERES", startIndex, endIndex });
          if (db) {
            const next = [...stateRef.current.spheres];
            const [moved] = next.splice(startIndex, 1);
            next.splice(endIndex, 0, moved);
            Promise.all(next.map((s, i) => db.from("spheres").update({ sort_order: i }).eq("id", s.id))).catch(console.error);
          }
        },
        reorderRelationshipGroups: (startIndex, endIndex) => {
          dispatch({ type: "REORDER_RELATIONSHIP_GROUPS", startIndex, endIndex });
          if (db) {
            const next = [...stateRef.current.relationshipGroups];
            const [moved] = next.splice(startIndex, 1);
            next.splice(endIndex, 0, moved);
            Promise.all(next.map((g, i) => db.from("relationship_groups").update({ sort_order: i }).eq("id", g.id))).catch(console.error);
          }
        },

        projects: state.projects,
        addProject: (project) => {
          const _id = crypto.randomUUID();
          const sortOrder = stateRef.current.projects.filter((p) => p.sphere === project.sphere).length;
          dispatch({ type: "ADD_PROJECT", project: { ...project, sortOrder }, _id });
          if (db && uid) {
            const sId = getSphereId(project.sphere);
            Promise.resolve(db.from("projects").insert({
              id: _id, user_id: uid, sphere_id: sId,
              name: project.name, emoji: project.emoji ?? "📁",
              status: project.status, milestone: project.milestone,
              sort_order: sortOrder,
            })).then(async () => {
              if (project.tagIds?.length) {
                await db.from("project_tags").insert(project.tagIds.map(tid => ({ project_id: _id, tag_id: tid })));
              }
            }).catch(console.error);
          }
          return _id;
        },
        updateProject: (id, fields) => {
          dispatch({ type: "UPDATE_PROJECT", id, fields });
          if (db) {
            const dbFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (fields.name !== undefined)      dbFields.name = fields.name;
            if (fields.emoji !== undefined)     dbFields.emoji = fields.emoji;
            if (fields.status !== undefined)    dbFields.status = fields.status;
            if (fields.milestone !== undefined) dbFields.milestone = fields.milestone;
            if (fields.sphere !== undefined)    dbFields.sphere_id = getSphereId(fields.sphere);
            const run = async () => {
              await db.from("projects").update(dbFields).eq("id", id);
              if (fields.tagIds !== undefined) {
                await db.from("project_tags").delete().eq("project_id", id);
                if (fields.tagIds.length > 0) {
                  await db.from("project_tags").insert(fields.tagIds.map(tid => ({ project_id: id, tag_id: tid })));
                }
              }
            };
            run().catch(console.error);
          }
        },
        deleteProject: (id) => {
          if (stateRef.current.projects.find(p => p.id === id)?.isSample) {
            setSampleDeleteCount(c => c + 1);
          }
          dispatch({ type: "DELETE_PROJECT", id });
          if (db) {
            db.from("tasks").delete().eq("project_id", id).then(() => {
              db.from("projects").delete().eq("id", id).then(() => {});
            });
          }
        },
        reorderProjects: (sphereName, startIndex, endIndex) => {
          dispatch({ type: "REORDER_PROJECTS", sphereName, startIndex, endIndex });
          if (db) {
            const scoped = [...stateRef.current.projects]
              .filter((p) => p.sphere === sphereName)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            const [moved] = scoped.splice(startIndex, 1);
            scoped.splice(endIndex, 0, moved);
            Promise.all(scoped.map((p, i) => db.from("projects").update({ sort_order: i }).eq("id", p.id))).catch(console.error);
          }
        },

        tasks: state.tasks,
        addTask: (task, projectId) => {
          const _id = crypto.randomUUID();
          dispatch({ type: "ADD_TASK", task, _id });
          if (db && uid) {
            Promise.resolve(db.from("tasks").insert({
              id: _id, user_id: uid,
              sphere_id: getSphereId(task.sphere),
              project_id: projectId ?? getProjectId(task.project, task.sphere),
              title: task.title, priority: task.priority, energy: task.energy,
              urgency: task.urgency ?? "not-urgent", done: task.done,
              deadline: task.deadline, notes: task.notes ?? "",
              manual_minutes: task.manualMinutes ?? 0, queued_date: task.queuedDate ?? null,
              time_spent_minutes: task.timeSpentMinutes ?? 0, intent: task.intent ?? "finish",
              daily_target_minutes: task.dailyTargetMinutes ?? null,
              rollover_count: task.rolloverCount ?? 0, daily_tracking: task.dailyTracking ?? {},
            })).then(() => {
              if ((task.manualMinutes ?? 0) > 0) {
                const now = new Date();
                db.from("focus_sessions").insert({
                  id: crypto.randomUUID(), user_id: uid,
                  task_name: `${task.title} (Manual Entry)`,
                  project_name: task.project, sphere_name: task.sphere,
                  duration_seconds: (task.manualMinutes ?? 0) * 60,
                  is_manual: true, completed_at: now.toISOString(),
                  completed_at_date_string: now.toLocaleDateString("en-CA"),
                }).then(() => {});
              }
            }).catch(console.error);
          }
        },
        updateTask: (id, fields) => {
          dispatch({ type: "UPDATE_TASK", id, fields });
          if (db) {
            const dbFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (fields.title !== undefined)              dbFields.title = fields.title;
            if (fields.priority !== undefined)           dbFields.priority = fields.priority;
            if (fields.energy !== undefined)             dbFields.energy = fields.energy;
            if (fields.urgency !== undefined)            dbFields.urgency = fields.urgency;
            if (fields.done !== undefined)               dbFields.done = fields.done;
            if (fields.deadline !== undefined)           dbFields.deadline = fields.deadline;
            if (fields.notes !== undefined)              dbFields.notes = fields.notes;
            if (fields.manualMinutes !== undefined)      dbFields.manual_minutes = fields.manualMinutes;
            if (fields.queuedDate !== undefined)         dbFields.queued_date = fields.queuedDate;
            if (fields.timeSpentMinutes !== undefined)   dbFields.time_spent_minutes = fields.timeSpentMinutes;
            if (fields.intent !== undefined)             dbFields.intent = fields.intent;
            if (fields.dailyTargetMinutes !== undefined) dbFields.daily_target_minutes = fields.dailyTargetMinutes;
            if (fields.rolloverCount !== undefined)      dbFields.rollover_count = fields.rolloverCount;
            if (fields.dailyTracking !== undefined)      dbFields.daily_tracking = fields.dailyTracking;
            if (fields.sphere !== undefined)             dbFields.sphere_id = getSphereId(fields.sphere);
            if (fields.project !== undefined) {
              const sphereName = fields.sphere ?? stateRef.current.tasks.find(t => t.id === id)?.sphere ?? "";
              dbFields.project_id = getProjectId(fields.project, sphereName);
            }
            db.from("tasks").update(dbFields).eq("id", id).then(() => {});
          }
        },
        toggleTaskComplete: (id) => {
          const t = stateRef.current.tasks.find(task => task.id === id);
          if (!t) return;
          const newDone = !t.done;
          dispatch({ type: "UPDATE_TASK", id, fields: { done: newDone } });
          if (db) db.from("tasks").update({ done: newDone }).eq("id", id).then(({ error }) => {
            if (error) dispatch({ type: "UPDATE_TASK", id, fields: { done: !newDone } });
          });
        },
        deleteTask: (id) => {
          if (stateRef.current.tasks.find(t => t.id === id)?.isSample) {
            setSampleDeleteCount(c => c + 1);
          }
          dispatch({ type: "DELETE_TASK", id });
          if (db) db.from("tasks").delete().eq("id", id).then(() => {});
        },
        sampleDeleteCount,
        deleteAllSampleData: async () => {
          if (!db || !uid) return;
          // Leaf tables first so nothing churns through a transient ON DELETE SET NULL
          // before its own is_sample-scoped delete pass runs a moment later.
          const leafFirstTables = [
            "tasks", "focus_sessions", "quick_notes", "network_contacts",
            "recurring_tasks", "habits", "projects", "spheres",
            "relationship_groups",
          ];
          for (const table of leafFirstTables) {
            await db.from(table).delete().eq("user_id", uid).eq("is_sample", true);
          }
          // "Reset to Clean Slate" means re-establishing the two baseline areas, not
          // leaving the dashboard completely empty.
          await seedOnboardingTemplate(cleanSlateTemplate, uid);
          window.location.reload();
        },
        hasDraggedOnce,
        notifyDragStart: () => setHasDraggedOnce(true),

        habits: state.habits,
        addHabit: (habit) => {
          const _id = crypto.randomUUID();
          dispatch({ type: "ADD_HABIT", habit, _id });
          if (db && uid) db.from("habits").insert({
            id: _id, user_id: uid, title: habit.title, type: habit.type,
            routine: habit.routine ?? "day", frequency: habit.frequency,
            target_count: habit.targetCount, emoji: habit.emoji, notes: habit.notes ?? "",
          }).then(() => {});
        },
        toggleHabitDate: (id, dateString) => {
          const alreadyDone = stateRef.current.habits.find(h => h.id === id)?.history[dateString] ?? false;
          dispatch({ type: "TOGGLE_HABIT_DATE", id, dateString });
          if (db) {
            if (alreadyDone) {
              db.from("habit_completions").delete().eq("habit_id", id).eq("completed_on", dateString).then(() => {});
            } else {
              db.from("habit_completions").insert({ habit_id: id, completed_on: dateString }).then(() => {});
            }
          }
        },
        updateHabit: (id, fields) => {
          dispatch({ type: "UPDATE_HABIT", id, fields });
          if (db) {
            const dbFields: Record<string, unknown> = {};
            if (fields.title !== undefined)       dbFields.title = fields.title;
            if (fields.type !== undefined)        dbFields.type = fields.type;
            if (fields.routine !== undefined)     dbFields.routine = fields.routine;
            if (fields.frequency !== undefined)   dbFields.frequency = fields.frequency;
            if (fields.targetCount !== undefined) dbFields.target_count = fields.targetCount;
            if (fields.emoji !== undefined)       dbFields.emoji = fields.emoji;
            if (fields.notes !== undefined)       dbFields.notes = fields.notes;
            db.from("habits").update(dbFields).eq("id", id).then(() => {});
          }
        },
        deleteHabit: (id) => {
          dispatch({ type: "DELETE_HABIT", id });
          if (db) db.from("habits").delete().eq("id", id).then(() => {});
        },

        quickNotes: state.quickNotes,
        addQuickNote: (text, sphere, projectId) => {
          const _id = crypto.randomUUID();
          const now = new Date();
          const hh = String(now.getHours()).padStart(2, "0");
          const mm = String(now.getMinutes()).padStart(2, "0");
          const createdAt = `${now.toLocaleDateString("en-CA")} ${hh}:${mm}`;
          dispatch({ type: "ADD_QUICK_NOTE", note: { text, sphere, projectId, createdAt }, _id });
          if (db && uid) {
            db.from("quick_notes").insert({
              id: _id, user_id: uid, text,
              sphere_id: getSphereId(sphere),
              project_id: projectId ? getProjectId(projectId, sphere) : null,
              is_important: false,
            }).then(({ error }) => {
              if (error) dispatch({ type: "DELETE_QUICK_NOTE", id: _id });
            });
          }
        },
        deleteQuickNote: (id) => {
          dispatch({ type: "DELETE_QUICK_NOTE", id });
          if (db) db.from("quick_notes").delete().eq("id", id).then(() => {});
        },
        toggleQuickNoteImportant: (id) => {
          const n = stateRef.current.quickNotes.find(qn => qn.id === id);
          dispatch({ type: "TOGGLE_QUICK_NOTE_IMPORTANT", id });
          if (db && n) db.from("quick_notes").update({ is_important: !n.isImportant }).eq("id", id).then(() => {});
        },
        updateQuickNoteText: (id, text) => {
          dispatch({ type: "UPDATE_QUICK_NOTE_TEXT", id, text });
          if (db) db.from("quick_notes").update({ text }).eq("id", id).then(() => {});
        },

        relationshipGroups: state.relationshipGroups,
        addRelationshipGroup: (group) => {
          const _id = crypto.randomUUID();
          const sortOrder = stateRef.current.relationshipGroups.length;
          dispatch({ type: "ADD_RELATIONSHIP_GROUP", group, _id });
          if (db && uid) db.from("relationship_groups").insert({
            id: _id, user_id: uid, label: group.label, emoji: group.emoji, color: group.color, sort_order: sortOrder,
          }).then(() => {});
        },
        updateRelationshipGroup: (id, fields) => {
          dispatch({ type: "UPDATE_RELATIONSHIP_GROUP", id, fields });
          if (db) db.from("relationship_groups").update(fields).eq("id", id).then(() => {});
        },
        deleteRelationshipGroup: (id) => {
          dispatch({ type: "DELETE_RELATIONSHIP_GROUP", id });
          if (db) db.from("relationship_groups").delete().eq("id", id).then(() => {});
        },

        networkContacts: state.networkContacts,
        addNetworkContact: (contact) => {
          const _id = crypto.randomUUID();
          dispatch({ type: "ADD_NETWORK_CONTACT", contact, _id });
          if (db && uid) {
            const run = async () => {
              await db.from("network_contacts").insert({
                id: _id, user_id: uid, name: contact.name,
                relationship_group_id: getGroupId(contact.relationshipType),
                birthday: contact.birthday, notes: contact.notes ?? "",
                last_touchpoint: contact.lastTouchpoint, cycle_completed: contact.cycleCompleted ?? false,
              });
              if (contact.events?.length) {
                await db.from("contact_events").insert(contact.events.map(e => ({
                  id: e.id ?? crypto.randomUUID(), contact_id: _id,
                  title: e.title, event_date: e.date, notes: e.notes, completed: e.completed,
                })));
              }
            };
            run().catch(console.error);
          }
        },
        updateNetworkContact: (id, fields) => {
          dispatch({ type: "UPDATE_NETWORK_CONTACT", id, fields });
          if (db) {
            const run = async () => {
              const dbFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
              if (fields.name !== undefined)             dbFields.name = fields.name;
              if (fields.birthday !== undefined)         dbFields.birthday = fields.birthday;
              if (fields.notes !== undefined)            dbFields.notes = fields.notes;
              if (fields.lastTouchpoint !== undefined)   dbFields.last_touchpoint = fields.lastTouchpoint;
              if (fields.cycleCompleted !== undefined)   dbFields.cycle_completed = fields.cycleCompleted;
              if (fields.relationshipType !== undefined) dbFields.relationship_group_id = getGroupId(fields.relationshipType);
              if (Object.keys(dbFields).length > 1) await db.from("network_contacts").update(dbFields).eq("id", id);
              if (fields.events !== undefined) {
                await db.from("contact_events").delete().eq("contact_id", id);
                if (fields.events.length > 0) {
                  await db.from("contact_events").insert(fields.events.map(e => ({
                    id: e.id ?? crypto.randomUUID(), contact_id: id,
                    title: e.title, event_date: e.date, notes: e.notes, completed: e.completed,
                  })));
                }
              }
            };
            run().catch(console.error);
          }
        },
        deleteNetworkContact: (id) => {
          dispatch({ type: "DELETE_NETWORK_CONTACT", id });
          if (db) db.from("network_contacts").delete().eq("id", id).then(() => {});
        },

        recurringTasks: state.recurringTasks,
        addRecurringTask: (task) => {
          const _id = crypto.randomUUID();
          dispatch({ type: "ADD_RECURRING_TASK", task, _id });
          if (db && uid) db.from("recurring_tasks").insert({
            id: _id, user_id: uid, sphere_id: getSphereId(task.sphere),
            title: task.title, notes: task.notes ?? "",
            interval_days: task.intervalDays, interval_label: task.intervalLabel,
            anchor_day: task.anchorDay ?? null, start_date: task.startDate ?? null,
            last_done_date: null, completion_count: 0,
          }).then(() => {});
        },
        updateRecurringTask: (id, fields) => {
          dispatch({ type: "UPDATE_RECURRING_TASK", id, fields });
          if (db) {
            const dbFields: Record<string, unknown> = {};
            if (fields.title !== undefined)         dbFields.title = fields.title;
            if (fields.notes !== undefined)         dbFields.notes = fields.notes;
            if (fields.intervalDays !== undefined)  dbFields.interval_days = fields.intervalDays;
            if (fields.intervalLabel !== undefined) dbFields.interval_label = fields.intervalLabel;
            if (fields.anchorDay !== undefined)     dbFields.anchor_day = fields.anchorDay;
            if (fields.startDate !== undefined)     dbFields.start_date = fields.startDate;
            if (fields.sphere !== undefined)        dbFields.sphere_id = getSphereId(fields.sphere);
            db.from("recurring_tasks").update(dbFields).eq("id", id).then(() => {});
          }
        },
        deleteRecurringTask: (id) => {
          dispatch({ type: "DELETE_RECURRING_TASK", id });
          if (db) db.from("recurring_tasks").delete().eq("id", id).then(() => {});
        },
        completeRecurringTask: (id) => {
          const _historyEntryId = crypto.randomUUID();
          dispatch({ type: "COMPLETE_RECURRING_TASK", id, _historyEntryId });
          if (db) {
            const now = new Date();
            const lastDoneDate = now.toLocaleDateString("en-CA");
            const task = stateRef.current.recurringTasks.find(r => r.id === id);
            db.from("recurring_tasks").update({
              last_done_date: lastDoneDate,
              completion_count: (task?.completionCount ?? 0) + 1,
            }).eq("id", id).then(() => {});
            db.from("recurring_task_history").insert({
              id: _historyEntryId, recurring_task_id: id, completed_at: now.toISOString(),
            }).then(() => {});
          }
        },

        activeTask: state.activeTask,
        running: state.running,
        elapsed: state.elapsed,
        committedSecs: state.committedSecs,
        sessions: state.sessions,
        startTask:   (task) => dispatch({ type: "START_TASK", task }),
        startFree:   ()     => dispatch({ type: "START_FREE" }),
        pauseSession: () => {
          // Snapshot the live-recomputed elapsed *before* dispatching — PAUSE_SESSION clears
          // startedAt, so stateRef.current would read back as already-paused/stale afterward.
          const liveElapsed = computeLiveElapsed(stateRef.current);
          dispatch({ type: "PAUSE_SESSION" });
          if (db && stateRef.current.activeTask) {
            const pauseDelta = liveElapsed - stateRef.current.committedSecs;
            const pauseMins = pauseDelta > 0 ? secsToMins(pauseDelta) : 0;
            if (pauseMins > 0) {
              const tId = stateRef.current.activeTask.id;
              const cur = stateRef.current.tasks.find(t => t.id === tId);
              db.from("tasks").update({ time_spent_minutes: (cur?.timeSpentMinutes ?? 0) + pauseMins }).eq("id", tId).then(() => {});
            }
          }
        },
        resetTimer:    ()          => dispatch({ type: "RESET" }),
        finishSession: () => {
          const _sessionId = crypto.randomUUID();
          const elapsed = computeLiveElapsed(stateRef.current);
          dispatch({ type: "FINISH_SESSION", _sessionId });
          if (db && uid && elapsed > 0) {
            const { activeTask, committedSecs, currentTrackingDate } = stateRef.current;
            const uncommittedMins = secsToMins(elapsed - committedSecs);
            if (activeTask && uncommittedMins > 0) {
              const cur = stateRef.current.tasks.find(t => t.id === activeTask.id);
              db.from("tasks").update({ time_spent_minutes: (cur?.timeSpentMinutes ?? 0) + uncommittedMins }).eq("id", activeTask.id).then(() => {});
            }
            const now = new Date();
            db.from("focus_sessions").insert({
              id: _sessionId, user_id: uid,
              task_name: activeTask?.title ?? "Session",
              project_name: activeTask?.project ?? null,
              sphere_name: activeTask?.sphere ?? null,
              duration_seconds: elapsed,
              is_manual: false,
              completed_at: now.toISOString(),
              completed_at_date_string: currentTrackingDate,
            }).then(() => {});
          }
        },
        setEstimate:       (minutes) => dispatch({ type: "SET_ESTIMATE", minutes }),
        activeTaskId:      state.activeTask?.id ?? null,
        timerIsRunning:    state.running,
        startGlobalTimer: (taskId) => {
          if (stateRef.current.activeTask?.id === taskId && !stateRef.current.running) {
            dispatch({ type: "START_FREE" }); return;
          }
          const t = stateRef.current.tasks.find(task => task.id === taskId);
          if (!t) return;
          dispatch({ type: "START_TASK", task: { id: t.id, title: t.title, project: t.project, sphere: t.sphere, estimatedMinutes: t.dailyTargetMinutes ?? undefined } });
        },
        pauseGlobalTimer: () => dispatch({ type: "PAUSE_SESSION" }),

        addManualTime: (projectId, minutes) => {
          const _sessionId = crypto.randomUUID();
          dispatch({ type: "ADD_MANUAL_TIME", projectId, minutes, _sessionId });
          if (db && uid && minutes > 0) {
            const proj = stateRef.current.projects.find(p => p.id === projectId);
            if (proj) {
              const now = new Date();
              db.from("focus_sessions").insert({
                id: _sessionId, user_id: uid,
                task_name: "(Manual Entry)",
                project_name: proj.name, sphere_name: proj.sphere,
                duration_seconds: minutes * 60, is_manual: true,
                completed_at: now.toISOString(),
                completed_at_date_string: now.toLocaleDateString("en-CA"),
              }).then(() => {});
            }
          }
        },

        calendarJump, setCalendarJump,
        taskModalOpen,
        openTaskModal:  () => setTaskModalOpen(true),
        closeTaskModal: () => setTaskModalOpen(false),
        settingsOpen,
        openSettings:  () => setSettingsOpen(true),
        closeSettings: () => setSettingsOpen(false),
        anyOverlayOpen,
        pushOverlay: () => {
          overlayCountRef.current += 1;
          setAnyOverlayOpen(true);
        },
        popOverlay: () => {
          overlayCountRef.current = Math.max(0, overlayCountRef.current - 1);
          if (overlayCountRef.current === 0) setAnyOverlayOpen(false);
        },
        activeWidgetIds,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
