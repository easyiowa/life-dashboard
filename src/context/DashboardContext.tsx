"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

// ── Public types ─────────────────────────────────────────────────────────────

export type SphereId  = string;
export type Priority  = "High" | "Med" | "Low";
export type Energy    = "Flow" | "Quick" | "Easy";

export interface Sphere {
  id: string;
  name: string;
  labelColor: string; // palette key: "emerald" | "violet" | "sky" | "amber" | …
}

export interface Task {
  id: string;
  sphere: SphereId;
  project: string;
  title: string;
  priority: Priority;
  energy: Energy;
  done: boolean;
  deadline: string | null; // "YYYY-MM-DD"
  notes: string;
  manualMinutes: number;
}

export interface Project {
  id: string;
  sphere: SphereId;
  name: string;
  tag: string;
  tagColor: string;
  status: "ahead" | "on-track" | "at-risk";
  milestone: string;
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
  project: string;
  sphere: string;
  durationSeconds: number;
  completedAt: Date;
  completedAtDateString: string; // "YYYY-MM-DD" in local time — used for day grouping
  isManual?: boolean;
}

export interface Habit {
  id: string;
  title: string;
  type: "start" | "stop";        // start = build positive, stop = break negative
  frequency: "daily" | "weekly" | "monthly";
  targetCount: number;           // how many completions per frequency window
  emoji: string;
  notes: string;
  history: Record<string, boolean>; // { "YYYY-MM-DD": true }
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
  sphere: SphereId;
  lastDoneDate: Date | null;
  completionCount: number;
  history: RecurringHistoryEntry[];
}

// ── Sphere seed data ─────────────────────────────────────────────────────────

const INITIAL_SPHERES: Sphere[] = [
  { id: "sphere-private", name: "Private",    labelColor: "emerald" },
  { id: "sphere-b1",      name: "Business 1", labelColor: "violet"  },
  { id: "sphere-b2",      name: "Business 2", labelColor: "sky"     },
];

// ── Habit seed data ──────────────────────────────────────────────────────────

const _today = new Date().toLocaleDateString("en-CA");
const _yd    = new Date(Date.now() - 86_400_000).toLocaleDateString("en-CA");
const _2d    = new Date(Date.now() - 2 * 86_400_000).toLocaleDateString("en-CA");
const _3d    = new Date(Date.now() - 3 * 86_400_000).toLocaleDateString("en-CA");
const _4d    = new Date(Date.now() - 4 * 86_400_000).toLocaleDateString("en-CA");

const INITIAL_HABITS: Habit[] = [
  {
    id: "habit-1",
    title:       "Read Books",
    type:        "start",
    frequency:   "daily",
    targetCount: 5,
    emoji:       "📚",
    notes:       "At least 20 pages before bed.",
    history:     { [_yd]: true, [_2d]: true, [_3d]: true, [_4d]: true },
  },
  {
    id: "habit-2",
    title:       "Morning Workout",
    type:        "start",
    frequency:   "daily",
    targetCount: 5,
    emoji:       "💪",
    notes:       "30 min run or gym session.",
    history:     { [_today]: true, [_2d]: true, [_4d]: true },
  },
  {
    id: "habit-3",
    title:       "Eat Junk Food",
    type:        "stop",
    frequency:   "weekly",
    targetCount: 2,
    emoji:       "🍔",
    notes:       "Max 2 cheat meals per week.",
    history:     { [_yd]: true },
  },
  {
    id: "habit-4",
    title:       "Late Night Screen Time",
    type:        "stop",
    frequency:   "daily",
    targetCount: 3,
    emoji:       "📵",
    notes:       "No screens after 22:00.",
    history:     { [_2d]: true, [_3d]: true },
  },
];

// ── Recurring seed data ───────────────────────────────────────────────────────

const now = Date.now();
const INITIAL_RECURRING: RecurringTask[] = [
  {
    id: "rec-1", title: "Buy Vitamins",      notes: "Nordic Naturals Omega-3 + Vitamin D3.", intervalDays: 30,  intervalLabel: "Every 30 Days",
    sphere: "Private",    lastDoneDate: new Date(now - 22 * 86_400_000),  completionCount: 6,  history: [],
  },
  {
    id: "rec-2", title: "Teeth Cleaning",    notes: "Book at Helsinki Dental Centre.",        intervalDays: 180, intervalLabel: "Every 6 Months",
    sphere: "Private",    lastDoneDate: new Date(now - 140 * 86_400_000), completionCount: 3,  history: [],
  },
  {
    id: "rec-3", title: "Car Service",       notes: "Full service + tyre rotation.",          intervalDays: 90,  intervalLabel: "Every 3 Months",
    sphere: "Private",    lastDoneDate: new Date(now - 60 * 86_400_000),  completionCount: 4,  history: [],
  },
  {
    id: "rec-4", title: "Review Finances",   notes: "Check budget vs actuals in YNAB.",       intervalDays: 30,  intervalLabel: "Every Month",
    sphere: "Private",    lastDoneDate: new Date(now - 5 * 86_400_000),   completionCount: 8,  history: [],
  },
  {
    id: "rec-5", title: "Team 1:1 Catchup", notes: "30 min sync — blockers + next sprint.",  intervalDays: 14,  intervalLabel: "Every 2 Weeks",
    sphere: "Business 1", lastDoneDate: new Date(now - 10 * 86_400_000),  completionCount: 12, history: [],
  },
  {
    id: "rec-6", title: "Invoice Clients",  notes: "Send via Holvi. Net-14 terms.",           intervalDays: 30,  intervalLabel: "Every Month",
    sphere: "Business 2", lastDoneDate: new Date(now - 28 * 86_400_000),  completionCount: 5,  history: [],
  },
];

// ── Seed data ────────────────────────────────────────────────────────────────

const INITIAL_PROJECTS: Project[] = [
  { id: "priv-1", sphere: "Private",    name: "Home Renovation",         tag: "Home",         tagColor: "amber",   status: "on-track", milestone: "Kitchen complete · Jun 15" },
  { id: "priv-2", sphere: "Private",    name: "Garden Landscaping",      tag: "Outdoor",      tagColor: "emerald", status: "at-risk",  milestone: "Design sign-off · Jul 1"  },
  { id: "priv-3", sphere: "Private",    name: "Personal Finance Plan",   tag: "Finance",      tagColor: "blue",    status: "on-track", milestone: "Q3 review · Aug 1"        },
  { id: "b1-1",   sphere: "Business 1", name: "Q2 Marketing Strategy",   tag: "Marketing",    tagColor: "violet",  status: "ahead",    milestone: "Campaign live · Jun 1"    },
  { id: "b1-2",   sphere: "Business 1", name: "Product Launch v2.0",     tag: "Product",      tagColor: "blue",    status: "on-track", milestone: "Beta release · Jul 15"    },
  { id: "b1-3",   sphere: "Business 1", name: "Brand Identity Refresh",  tag: "Design",       tagColor: "pink",    status: "on-track", milestone: "Final review · Jun 30"    },
  { id: "b2-1",   sphere: "Business 2", name: "Client Onboarding System",tag: "Operations",   tagColor: "teal",    status: "on-track", milestone: "Soft launch · Jun 20"     },
  { id: "b2-2",   sphere: "Business 2", name: "Revenue Dashboard",       tag: "Analytics",    tagColor: "violet",  status: "at-risk",  milestone: "MVP · Aug 1"              },
  { id: "b2-3",   sphere: "Business 2", name: "Partnership Outreach",    tag: "Business Dev", tagColor: "amber",   status: "ahead",    milestone: "2 deals signed · Jun 10"  },
];

const INITIAL_TASKS: Task[] = [
  { id: "t1",  sphere: "Private",    project: "Home Renovation",          title: "Get kitchen renovation quotes",      priority: "High", energy: "Quick", done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "t2",  sphere: "Private",    project: "Home Renovation",          title: "Research cabinet suppliers",         priority: "Med",  energy: "Easy",  done: true,  deadline: null, notes: "", manualMinutes: 0 },
  { id: "t3",  sphere: "Private",    project: "Personal Finance Plan",    title: "Review monthly budget",              priority: "High", energy: "Flow",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "t4",  sphere: "Private",    project: "Personal Finance Plan",    title: "Set up investment tracking",         priority: "Med",  energy: "Easy",  done: true,  deadline: null, notes: "", manualMinutes: 0 },
  { id: "t5",  sphere: "Private",    project: "Garden Landscaping",       title: "Get landscaping quotes",             priority: "Low",  energy: "Easy",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "t6",  sphere: "Business 1", project: "Brand Identity Refresh",   title: "Design brand mockups",               priority: "High", energy: "Flow",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "t7",  sphere: "Business 1", project: "Brand Identity Refresh",   title: "Compile competitor brand analysis",  priority: "Med",  energy: "Quick", done: true,  deadline: null, notes: "", manualMinutes: 0 },
  { id: "t8",  sphere: "Business 1", project: "Q2 Marketing Strategy",    title: "Review campaign analytics",          priority: "Med",  energy: "Quick", done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "t9",  sphere: "Business 1", project: "Q2 Marketing Strategy",    title: "Draft campaign brief",               priority: "High", energy: "Flow",  done: true,  deadline: null, notes: "", manualMinutes: 0 },
  { id: "t10", sphere: "Business 1", project: "Product Launch v2.0",      title: "Define MVP feature set",             priority: "High", energy: "Flow",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "t11", sphere: "Business 2", project: "Client Onboarding System", title: "Document onboarding flow",           priority: "Med",  energy: "Quick", done: true,  deadline: null, notes: "", manualMinutes: 0 },
  { id: "t12", sphere: "Business 2", project: "Client Onboarding System", title: "Build welcome email template",       priority: "Low",  energy: "Easy",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "t13", sphere: "Business 2", project: "Revenue Dashboard",        title: "Design metrics layout",              priority: "Med",  energy: "Flow",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "t14", sphere: "Business 2", project: "Revenue Dashboard",        title: "Define KPI definitions",             priority: "High", energy: "Flow",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "t15", sphere: "Business 2", project: "Partnership Outreach",     title: "Send partnership deck to prospects", priority: "High", energy: "Flow",  done: true,  deadline: null, notes: "", manualMinutes: 0 },
  { id: "t16", sphere: "Business 2", project: "Partnership Outreach",     title: "Follow up on initial responses",     priority: "Med",  energy: "Quick", done: true,  deadline: null, notes: "", manualMinutes: 0 },
];

// ── State & actions ──────────────────────────────────────────────────────────

interface State {
  spheres: Sphere[];
  habits: Habit[];
  tasks: Task[];
  projects: Project[];
  activeTask: ActiveTask | null;
  running: boolean;
  elapsed: number;
  sessions: FocusSession[];
  recurringTasks: RecurringTask[];
}

type Action =
  | { type: "START_TASK"; task: ActiveTask }
  | { type: "START_FREE" }
  | { type: "PAUSE_SESSION" }
  | { type: "RESET" }
  | { type: "TICK" }
  | { type: "FINISH_SESSION" }
  | { type: "SET_ESTIMATE"; minutes: number }
  | { type: "ADD_TASK"; task: Omit<Task, "id"> }
  | { type: "UPDATE_TASK"; id: string; fields: Partial<Task> }
  | { type: "ADD_PROJECT"; project: Omit<Project, "id"> }
  | { type: "ADD_MANUAL_TIME"; projectId: string; minutes: number }
  | { type: "ADD_RECURRING_TASK"; task: Omit<RecurringTask, "id" | "completionCount" | "history"> }
  | { type: "UPDATE_RECURRING_TASK"; id: string; fields: Partial<Pick<RecurringTask, "title" | "notes" | "sphere" | "intervalDays" | "intervalLabel">> }
  | { type: "DELETE_RECURRING_TASK"; id: string }
  | { type: "COMPLETE_RECURRING_TASK"; id: string }
  | { type: "ADD_SPHERE"; name: string; labelColor: string }
  | { type: "UPDATE_SPHERE"; id: string; fields: Partial<Pick<Sphere, "name" | "labelColor">> }
  | { type: "DELETE_SPHERE"; id: string }
  | { type: "ADD_HABIT"; habit: Omit<Habit, "id" | "history"> }
  | { type: "TOGGLE_HABIT_DATE"; id: string; dateString: string }
  | { type: "UPDATE_HABIT"; id: string; fields: Partial<Omit<Habit, "id" | "history">> }
  | { type: "DELETE_HABIT"; id: string };

function mkDateString(d: Date): string {
  return d.toLocaleDateString("en-CA"); // "YYYY-MM-DD" in local time
}

function mkSession(task: ActiveTask, elapsed: number): FocusSession {
  const now = new Date();
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    taskName: task.title,
    project: task.project,
    sphere: task.sphere,
    durationSeconds: elapsed,
    completedAt: now,
    completedAtDateString: mkDateString(now),
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "START_TASK": {
      const sessions =
        state.activeTask && state.elapsed > 0
          ? [...state.sessions, mkSession(state.activeTask, state.elapsed)]
          : state.sessions;
      return { ...state, activeTask: action.task, running: true, elapsed: 0, sessions };
    }
    case "START_FREE":
      return { ...state, running: true };

    case "PAUSE_SESSION":
      // Stop the ticker but preserve elapsed — resume picks up where it left off.
      return { ...state, running: false };

    case "RESET":
      // Abandon the current session without logging any time.
      return { ...state, activeTask: null, running: false, elapsed: 0 };

    case "FINISH_SESSION": {
      // Log accumulated elapsed then fully reset.
      const sessions =
        state.activeTask && state.elapsed > 0
          ? [...state.sessions, mkSession(state.activeTask, state.elapsed)]
          : state.sessions;
      return { ...state, activeTask: null, running: false, elapsed: 0, sessions };
    }

    case "SET_ESTIMATE":
      return state.activeTask
        ? { ...state, activeTask: { ...state.activeTask, estimatedMinutes: action.minutes } }
        : state;
    case "TICK":
      return state.running ? { ...state, elapsed: state.elapsed + 1 } : state;

    case "ADD_TASK": {
      const task: Task = { ...action.task, id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` };
      const sessions = [...state.sessions];
      if (task.manualMinutes > 0) {
        const manualNow = new Date();
        sessions.unshift({
          id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
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

    case "ADD_PROJECT": {
      const project: Project = {
        ...action.project,
        id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      };
      return { ...state, projects: [...state.projects, project] };
    }

    case "ADD_MANUAL_TIME": {
      const project = state.projects.find((p) => p.id === action.projectId);
      if (!project || action.minutes <= 0) return state;
      const manualNow2 = new Date();
      const session: FocusSession = {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
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
        id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
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
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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

    case "ADD_SPHERE": {
      const sphere: Sphere = {
        id: `sphere-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
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

    case "ADD_HABIT": {
      const habit: Habit = {
        ...action.habit,
        id: `habit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
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

    default:
      return state;
  }
}

// ── Initial state ────────────────────────────────────────────────────────────

function buildInitialState(): State {
  const now = Date.now();
  return {
    spheres: INITIAL_SPHERES,
    habits: INITIAL_HABITS,
    tasks: INITIAL_TASKS,
    projects: INITIAL_PROJECTS,
    recurringTasks: INITIAL_RECURRING,
    activeTask: null,
    running: false,
    elapsed: 0,
    sessions: [
      // ── Today ──
      {
        id: "seed-1",
        taskName: "Review monthly budget",
        project: "Personal Finance Plan",
        sphere: "Private",
        durationSeconds: 2700,
        completedAt: new Date(now - 5 * 3_600_000),
        completedAtDateString: mkDateString(new Date(now - 5 * 3_600_000)),
      },
      {
        id: "seed-2",
        taskName: "Design brand mockups",
        project: "Brand Identity Refresh",
        sphere: "Business 1",
        durationSeconds: 4500,
        completedAt: new Date(now - 3 * 3_600_000),
        completedAtDateString: mkDateString(new Date(now - 3 * 3_600_000)),
      },
      {
        id: "seed-3",
        taskName: "Document onboarding flow",
        project: "Client Onboarding System",
        sphere: "Business 2",
        durationSeconds: 1500,
        completedAt: new Date(now - 90 * 60_000),
        completedAtDateString: mkDateString(new Date(now - 90 * 60_000)),
      },
      // ── Yesterday ──
      {
        id: "seed-4",
        taskName: "Draft campaign brief",
        project: "Q2 Marketing Strategy",
        sphere: "Business 1",
        durationSeconds: 5400,
        completedAt: new Date(now - 26 * 3_600_000),
        completedAtDateString: mkDateString(new Date(now - 26 * 3_600_000)),
      },
      {
        id: "seed-5",
        taskName: "Review monthly budget",
        project: "Personal Finance Plan",
        sphere: "Private",
        durationSeconds: 1800,
        completedAt: new Date(now - 29 * 3_600_000),
        completedAtDateString: mkDateString(new Date(now - 29 * 3_600_000)),
      },
      // ── Two days ago ──
      {
        id: "seed-6",
        taskName: "Send partnership deck to prospects",
        project: "Partnership Outreach",
        sphere: "Business 2",
        durationSeconds: 3600,
        completedAt: new Date(now - 52 * 3_600_000),
        completedAtDateString: mkDateString(new Date(now - 52 * 3_600_000)),
      },
      {
        id: "seed-7",
        taskName: "Define MVP feature set",
        project: "Product Launch v2.0",
        sphere: "Business 1",
        durationSeconds: 2700,
        completedAt: new Date(now - 55 * 3_600_000),
        completedAtDateString: mkDateString(new Date(now - 55 * 3_600_000)),
      },
    ],
  };
}

// ── Context ──────────────────────────────────────────────────────────────────

interface DashboardContextType {
  spheres: Sphere[];
  habits: Habit[];
  tasks: Task[];
  projects: Project[];
  activeTask: ActiveTask | null;
  running: boolean;
  elapsed: number;
  sessions: FocusSession[];
  recurringTasks: RecurringTask[];
  addHabit: (habit: Omit<Habit, "id" | "history">) => void;
  toggleHabitDate: (id: string, dateString: string) => void;
  updateHabit: (id: string, fields: Partial<Omit<Habit, "id" | "history">>) => void;
  deleteHabit: (id: string) => void;
  addSphere: (name: string, labelColor: string) => void;
  updateSphere: (id: string, fields: Partial<Pick<Sphere, "name" | "labelColor">>) => void;
  deleteSphere: (id: string) => void;
  addTask: (task: Omit<Task, "id">) => void;
  updateTask: (id: string, fields: Partial<Task>) => void;
  addProject: (project: Omit<Project, "id">) => void;
  addManualTime: (projectId: string, minutes: number) => void;
  startTask: (task: ActiveTask) => void;
  startFree: () => void;
  pauseSession: () => void;
  resetTimer: () => void;
  finishSession: () => void;
  setEstimate: (minutes: number) => void;
  addRecurringTask: (task: Omit<RecurringTask, "id" | "completionCount" | "history">) => void;
  updateRecurringTask: (id: string, fields: Partial<Pick<RecurringTask, "title" | "notes" | "sphere" | "intervalDays" | "intervalLabel">>) => void;
  deleteRecurringTask: (id: string) => void;
  completeRecurringTask: (id: string) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state.running) {
      intervalRef.current = setInterval(() => dispatch({ type: "TICK" }), 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.running]);

  return (
    <DashboardContext.Provider
      value={{
        spheres: state.spheres,
        habits: state.habits,
        tasks: state.tasks,
        projects: state.projects,
        activeTask: state.activeTask,
        running: state.running,
        elapsed: state.elapsed,
        sessions: state.sessions,
        recurringTasks: state.recurringTasks,
        addHabit:        (habit)         => dispatch({ type: "ADD_HABIT", habit }),
        toggleHabitDate: (id, dateString)=> dispatch({ type: "TOGGLE_HABIT_DATE", id, dateString }),
        updateHabit:     (id, fields)    => dispatch({ type: "UPDATE_HABIT", id, fields }),
        deleteHabit:     (id)            => dispatch({ type: "DELETE_HABIT", id }),
        addSphere:    (name, labelColor) => dispatch({ type: "ADD_SPHERE", name, labelColor }),
        updateSphere: (id, fields)       => dispatch({ type: "UPDATE_SPHERE", id, fields }),
        deleteSphere: (id)               => dispatch({ type: "DELETE_SPHERE", id }),
        addTask:              (task)              => dispatch({ type: "ADD_TASK", task }),
        updateTask:           (id, fields)        => dispatch({ type: "UPDATE_TASK", id, fields }),
        addProject:           (project)           => dispatch({ type: "ADD_PROJECT", project }),
        addManualTime:        (projectId, minutes)=> dispatch({ type: "ADD_MANUAL_TIME", projectId, minutes }),
        startTask:            (task)              => dispatch({ type: "START_TASK", task }),
        startFree:            ()                  => dispatch({ type: "START_FREE" }),
        pauseSession:         ()                  => dispatch({ type: "PAUSE_SESSION" }),
        resetTimer:           ()                  => dispatch({ type: "RESET" }),
        finishSession:        ()                  => dispatch({ type: "FINISH_SESSION" }),
        setEstimate:          (minutes)           => dispatch({ type: "SET_ESTIMATE", minutes }),
        addRecurringTask:     (task)           => dispatch({ type: "ADD_RECURRING_TASK", task }),
        updateRecurringTask:  (id, fields)    => dispatch({ type: "UPDATE_RECURRING_TASK", id, fields }),
        deleteRecurringTask:  (id)            => dispatch({ type: "DELETE_RECURRING_TASK", id }),
        completeRecurringTask:(id)            => dispatch({ type: "COMPLETE_RECURRING_TASK", id }),
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
