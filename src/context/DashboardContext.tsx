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
  timeSpentMinutes?: number;           // accumulated focus time this session cycle
  intent?: "finish" | "time" | "maybe"; // defaults to "finish"
  dailyTargetMinutes?: number | null;  // explicit allocation for "time" intent
  rolloverCount?: number;              // increments when unfinished at day end
}

export interface Project {
  id: string;
  sphere: SphereId;
  name: string;
  emoji?: string;                        // decorative project icon; defaults to "📁"
  tagIds: string[]; // references Tag.id — supports multiple tags
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

// ── Tag seed data ────────────────────────────────────────────────────────────

const INITIAL_TAGS: Tag[] = [
  { id: "tag-home",        label: "Home",         color: "amber"   },
  { id: "tag-outdoor",     label: "Outdoor",      color: "emerald" },
  { id: "tag-finance",     label: "Finance",      color: "blue"    },
  { id: "tag-marketing",   label: "Marketing",    color: "violet"  },
  { id: "tag-product",     label: "Product",      color: "violet"  },
  { id: "tag-design",      label: "Design",       color: "pink"    },
  { id: "tag-operations",  label: "Operations",   color: "teal"    },
  { id: "tag-analytics",   label: "Analytics",    color: "violet"  },
  { id: "tag-bizdev",      label: "Business Dev", color: "amber"   },
  { id: "tag-brand",       label: "Brand",        color: "rose"    },
  { id: "tag-business",    label: "Business",     color: "amber"   },
  { id: "tag-website",     label: "Website",      color: "blue"    },
  { id: "tag-clients",     label: "Clients",      color: "teal"    },
  { id: "tag-content",     label: "Content",      color: "orange"  },
  { id: "tag-meetings",    label: "Meetings",     color: "sky"     },
  { id: "tag-influencers", label: "Influencers",  color: "indigo"  },
];

// ── Sphere seed data ─────────────────────────────────────────────────────────

const INITIAL_SPHERES: Sphere[] = [
  { id: "sphere-private", name: "Private",    labelColor: "emerald", description: "Personal life & wellbeing"   },
  { id: "sphere-b1",      name: "Business 1", labelColor: "violet",  description: "Core business operations"    },
  { id: "sphere-b2",      name: "Business 2", labelColor: "sky",     description: "Secondary venture & growth"  },
  { id: "sphere-siin",    name: "siin",       labelColor: "rose",    description: "Local loyalty & discovery app" },
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
    routine:     "evening",
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
    routine:     "morning",
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
    routine:     "day",
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
    routine:     "evening",
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
  { id: "priv-1", sphere: "Private",    emoji: "🏡", name: "Home Renovation",         tagIds: ["tag-home"],       status: "on-track", milestone: "Kitchen complete · Jun 15" },
  { id: "priv-2", sphere: "Private",    emoji: "🌿", name: "Garden Landscaping",      tagIds: ["tag-outdoor"],    status: "at-risk",  milestone: "Design sign-off · Jul 1"  },
  { id: "priv-3", sphere: "Private",    emoji: "💰", name: "Personal Finance Plan",   tagIds: ["tag-finance"],    status: "on-track", milestone: "Q3 review · Aug 1"        },
  { id: "b1-1",   sphere: "Business 1", emoji: "📣", name: "Q2 Marketing Strategy",   tagIds: ["tag-marketing"],  status: "ahead",    milestone: "Campaign live · Jun 1"    },
  { id: "b1-2",   sphere: "Business 1", emoji: "🚀", name: "Product Launch v2.0",     tagIds: ["tag-product"],    status: "on-track", milestone: "Beta release · Jul 15"    },
  { id: "b1-3",   sphere: "Business 1", emoji: "🎨", name: "Brand Identity Refresh",  tagIds: ["tag-design"],     status: "on-track", milestone: "Final review · Jun 30"    },
  { id: "b2-1",   sphere: "Business 2", emoji: "👥", name: "Client Onboarding System",tagIds: ["tag-operations"], status: "on-track", milestone: "Soft launch · Jun 20"     },
  { id: "b2-2",   sphere: "Business 2", emoji: "📊", name: "Revenue Dashboard",       tagIds: ["tag-analytics"],  status: "at-risk",  milestone: "MVP · Aug 1"              },
  { id: "b2-3",   sphere: "Business 2", emoji: "🤝", name: "Partnership Outreach",    tagIds: ["tag-bizdev"],     status: "ahead",    milestone: "2 deals signed · Jun 10"  },
  // ── siin ──────────────────────────────────────────────────────────────────
  { id: "siin-p1", sphere: "siin", emoji: "🎨", name: "Brand",       tagIds: ["tag-brand"],       status: "on-track", milestone: "In progress" },
  { id: "siin-p2", sphere: "siin", emoji: "💼", name: "Business",    tagIds: ["tag-business"],    status: "on-track", milestone: "In progress" },
  { id: "siin-p3", sphere: "siin", emoji: "🚀", name: "Product",     tagIds: ["tag-product"],     status: "on-track", milestone: "In progress" },
  { id: "siin-p4", sphere: "siin", emoji: "💻", name: "Website",     tagIds: ["tag-website"],     status: "on-track", milestone: "In progress" },
  { id: "siin-p5", sphere: "siin", emoji: "📣", name: "Marketing",   tagIds: ["tag-marketing"],   status: "on-track", milestone: "In progress" },
  { id: "siin-p6", sphere: "siin", emoji: "👥", name: "Clients",     tagIds: ["tag-clients"],     status: "on-track", milestone: "In progress" },
  { id: "siin-p7", sphere: "siin", emoji: "✍️", name: "Content",     tagIds: ["tag-content"],     status: "on-track", milestone: "In progress" },
  { id: "siin-p8", sphere: "siin", emoji: "💬", name: "Meetings",    tagIds: ["tag-meetings"],    status: "on-track", milestone: "In progress" },
  { id: "siin-p9", sphere: "siin", emoji: "⭐", name: "Influencers", tagIds: ["tag-influencers"], status: "on-track", milestone: "In progress" },
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
  // ── siin ──────────────────────────────────────────────────────────────────
  { id: "siin-t1",  sphere: "siin", project: "Brand",       title: "Siin Foundation Doc",                      priority: "Med", energy: "Flow",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t2",  sphere: "siin", project: "Business",    title: "Update PP/TC",                             priority: "Med", energy: "Quick", done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t3",  sphere: "siin", project: "Product",     title: "Google maps",                              priority: "Med", energy: "Quick", done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t4",  sphere: "siin", project: "Product",     title: "Reports Loyalty Program",                  priority: "Med", energy: "Flow",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t5",  sphere: "siin", project: "Product",     title: "In-app copy (Discount)",                   priority: "Med", energy: "Easy",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t6",  sphere: "siin", project: "Website",     title: "Skeleton Customers",                       priority: "Med", energy: "Flow",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t7",  sphere: "siin", project: "Website",     title: "Skeleton Businesses",                      priority: "Med", energy: "Flow",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t8",  sphere: "siin", project: "Product",     title: "Paywall",                                  priority: "Med", energy: "Flow",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t9",  sphere: "siin", project: "Marketing",   title: "Message Cafes",                            priority: "Med", energy: "Easy",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t10", sphere: "siin", project: "Clients",     title: "Instruction 'How to' for Põhjala Businesses", priority: "Med", energy: "Easy",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t11", sphere: "siin", project: "Content",     title: "Finish intro videos",                      priority: "Med", energy: "Flow",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t12", sphere: "siin", project: "Clients",     title: "Inform old users (Email)",                 priority: "Med", energy: "Easy",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t13", sphere: "siin", project: "Meetings",    title: "Rotermann Manager",                        priority: "Med", energy: "Quick", done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t14", sphere: "siin", project: "Meetings",    title: "KIOSK Georg",                              priority: "Med", energy: "Quick", done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t15", sphere: "siin", project: "Clients",     title: "Add koligriv to majaline",                 priority: "Med", energy: "Quick", done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t16", sphere: "siin", project: "Product",     title: "Add checkbox (Marketing)",                 priority: "Med", energy: "Easy",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t17", sphere: "siin", project: "Product",     title: "Sentry Errors (Agent)",                    priority: "Med", energy: "Flow",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t18", sphere: "siin", project: "Influencers", title: "Message old influencers",                  priority: "Med", energy: "Easy",  done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t19", sphere: "siin", project: "Meetings",    title: "Andrei Kazakov",                           priority: "Med", energy: "Quick", done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t20", sphere: "siin", project: "Meetings",    title: "Taavet/Silver",                            priority: "Med", energy: "Quick", done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t21", sphere: "siin", project: "Meetings",    title: "Jahuu (Ksenia)",                           priority: "Med", energy: "Quick", done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t22", sphere: "siin", project: "Clients",     title: "Buy black holders (temu)",                 priority: "Med", energy: "Quick", done: false, deadline: null, notes: "", manualMinutes: 0 },
  { id: "siin-t23", sphere: "siin", project: "Meetings",    title: "Alexandr Zdank",                           priority: "Med", energy: "Quick", done: false, deadline: null, notes: "", manualMinutes: 0 },
];

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
  sessions: FocusSession[];
  recurringTasks: RecurringTask[];
  quickNotes: QuickNote[];
  currentTrackingDate: string;  // "YYYY-MM-DD" — operational date of the dashboard
  showNightlyReview: boolean;   // gate shown when tracking date lags real date
}

type Action =
  | { type: "START_TASK"; task: ActiveTask }
  | { type: "START_FREE" }
  | { type: "PAUSE_SESSION" }
  | { type: "RESET" }
  | { type: "TICK" }
  | { type: "FINISH_SESSION" }
  | { type: "SET_ESTIMATE"; minutes: number }
  | { type: "TOGGLE_TASK_FOR_TODAY"; id: string; dateString: string; intent: Task["intent"]; targetMinutes: number | null }
  | { type: "UPDATE_TASK_TIME_SPENT"; id: string; minutes: number }
  | { type: "TRANSITION_TO_NEXT_DAY" }
  | { type: "REQUEST_NIGHTLY_REVIEW" }
  | { type: "DISMISS_NIGHTLY_REVIEW" }
  | { type: "ADD_TASK"; task: Omit<Task, "id"> }
  | { type: "UPDATE_TASK"; id: string; fields: Partial<Task> }
  | { type: "ADD_PROJECT"; project: Omit<Project, "id"> }
  | { type: "ADD_MANUAL_TIME"; projectId: string; minutes: number }
  | { type: "ADD_RECURRING_TASK"; task: Omit<RecurringTask, "id" | "completionCount" | "history"> }
  | { type: "UPDATE_RECURRING_TASK"; id: string; fields: Partial<Pick<RecurringTask, "title" | "notes" | "sphere" | "intervalDays" | "intervalLabel">> }
  | { type: "DELETE_RECURRING_TASK"; id: string }
  | { type: "COMPLETE_RECURRING_TASK"; id: string }
  | { type: "ADD_SPHERE"; name: string; labelColor: string }
  | { type: "UPDATE_SPHERE"; id: string; fields: Partial<Pick<Sphere, "name" | "labelColor" | "description">> }
  | { type: "DELETE_SPHERE"; id: string }
  | { type: "REORDER_SPHERES"; startIndex: number; endIndex: number }
  | { type: "UPDATE_PROJECT"; id: string; fields: Partial<Omit<Project, "id">> }
  | { type: "ADD_TAG"; tag: Omit<Tag, "id"> }
  | { type: "UPDATE_TAG"; id: string; fields: Partial<Omit<Tag, "id">> }
  | { type: "DELETE_TAG"; id: string }
  | { type: "ADD_HABIT"; habit: Omit<Habit, "id" | "history"> }
  | { type: "TOGGLE_HABIT_DATE"; id: string; dateString: string }
  | { type: "UPDATE_HABIT"; id: string; fields: Partial<Omit<Habit, "id" | "history">> }
  | { type: "DELETE_HABIT"; id: string }
  | { type: "DELETE_TASK"; id: string }
  | { type: "ADD_QUICK_NOTE"; note: Omit<QuickNote, "id"> }
  | { type: "DELETE_QUICK_NOTE"; id: string };

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
      const sessions =
        state.activeTask && state.elapsed > 0
          ? [...state.sessions, mkSession(state.activeTask, state.elapsed)]
          : state.sessions;
      // Auto-accumulate focus minutes on the task being worked on
      const elapsedMinutes = Math.round(state.elapsed / 60);
      const tasks = state.activeTask && elapsedMinutes > 0
        ? state.tasks.map((t) =>
            t.id === state.activeTask!.id
              ? { ...t, timeSpentMinutes: (t.timeSpentMinutes ?? 0) + elapsedMinutes }
              : t
          )
        : state.tasks;
      return { ...state, activeTask: null, running: false, elapsed: 0, sessions, tasks };
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

    case "TOGGLE_TASK_FOR_TODAY":
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== action.id) return t;
          // Already queued for this date → remove
          if ((t.queuedDate ?? null) === action.dateString) {
            return { ...t, queuedDate: null };
          }
          // Add to queue with intent
          return {
            ...t,
            queuedDate:         action.dateString,
            intent:             action.intent ?? "finish",
            dailyTargetMinutes: action.targetMinutes,
          };
        }),
      };

    case "UPDATE_TASK_TIME_SPENT":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id !== action.id
            ? t
            : { ...t, timeSpentMinutes: (t.timeSpentMinutes ?? 0) + action.minutes }
        ),
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

    case "REQUEST_NIGHTLY_REVIEW":
      return { ...state, showNightlyReview: true };

    case "DISMISS_NIGHTLY_REVIEW":
      return { ...state, showNightlyReview: false };

    case "ADD_TAG": {
      const tag: Tag = {
        ...action.tag,
        id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
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

    case "REORDER_SPHERES": {
      const next = [...state.spheres];
      const [moved] = next.splice(action.startIndex, 1);
      next.splice(action.endIndex, 0, moved);
      return { ...state, spheres: next };
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

    case "ADD_QUICK_NOTE": {
      const note: QuickNote = {
        ...action.note,
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      return { ...state, quickNotes: [note, ...state.quickNotes] };
    }

    case "DELETE_QUICK_NOTE":
      return { ...state, quickNotes: state.quickNotes.filter((n) => n.id !== action.id) };

    default:
      return state;
  }
}

// ── Persistence helpers ───────────────────────────────────────────────────────

const STORAGE_KEY = "life_dashboard_state";

function reviveState(raw: Record<string, unknown>): State {
  // JSON.parse loses Date prototypes — restore them before use.
  const sessions = ((raw.sessions as unknown[]) ?? []).map((s) => {
    const session = s as Record<string, unknown>;
    return {
      ...session,
      completedAt: new Date(session.completedAt as string),
    } as FocusSession;
  });

  const recurringTasks = ((raw.recurringTasks as unknown[]) ?? []).map((r) => {
    const task = r as Record<string, unknown>;
    return {
      ...task,
      lastDoneDate: task.lastDoneDate ? new Date(task.lastDoneDate as string) : null,
    } as RecurringTask;
  });

  // Migrate projects from old tag/tagColor schema to tagId; backfill emoji
  const liveTags = ((raw.tags as Tag[]) ?? INITIAL_TAGS);
  const projects = ((raw.projects as unknown[]) ?? []).map((p) => {
    const proj = p as Record<string, unknown>;
    const withEmoji = (base: Record<string, unknown>) =>
      ({ emoji: "📁", ...base } as unknown as Project);
    // Already new schema (tagIds array)
    if (Array.isArray(proj.tagIds)) return withEmoji(proj);
    // Previous schema: tagId as single string
    if (typeof proj.tagId === "string" && proj.tagId) {
      return withEmoji({ ...proj, tagIds: [proj.tagId] });
    }
    // Legacy schema: tag/tagColor raw strings
    const match = liveTags.find((t) => t.label === proj.tag);
    return withEmoji({ ...proj, tagIds: [match?.id ?? liveTags[0]?.id ?? "tag-product"] });
  });

  // Migrate habits — backfill routine field for records saved before it existed
  const habits = ((raw.habits as Habit[]) ?? INITIAL_HABITS).map((h) => ({
    ...h,
    routine: h.routine ?? "day",
  })) as Habit[];

  // If the stored tracking date is behind today, surface the nightly review gate.
  const today              = new Date().toLocaleDateString("en-CA");
  const savedTrackingDate  = (raw.currentTrackingDate as string) ?? today;
  const showNightlyReview  = savedTrackingDate !== today;

  const quickNotes = ((raw.quickNotes as QuickNote[]) ?? []);

  return {
    ...(raw as unknown as State),
    tags: liveTags,
    habits,
    sessions,
    recurringTasks,
    quickNotes,
    projects,
    currentTrackingDate: savedTrackingDate,
    showNightlyReview,
    running: false,
    elapsed: (raw.elapsed as number) ?? 0,
  };
}

// ── Initial state ────────────────────────────────────────────────────────────

function buildInitialState(): State {
  // Attempt to restore persisted state on the client.
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return reviveState(JSON.parse(saved) as Record<string, unknown>);
    } catch {
      // Corrupted storage — fall through to seeds.
    }
  }

  const now = Date.now();
  return {
    currentTrackingDate: new Date().toLocaleDateString("en-CA"),
    showNightlyReview:   false,
    tags: INITIAL_TAGS,
    spheres: INITIAL_SPHERES,
    habits: INITIAL_HABITS,
    tasks: INITIAL_TASKS,
    projects: INITIAL_PROJECTS,
    recurringTasks: INITIAL_RECURRING,
    quickNotes: [],
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
  currentTrackingDate: string;
  showNightlyReview: boolean;
  toggleTaskForToday: (id: string, dateString: string, intent: Task["intent"], targetMinutes: number | null) => void;
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
  sessions: FocusSession[];
  recurringTasks: RecurringTask[];
  quickNotes: QuickNote[];
  addQuickNote: (text: string, sphere: string, projectId?: string) => void;
  deleteQuickNote: (id: string) => void;
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
  updateProject: (id: string, fields: Partial<Omit<Project, "id">>) => void;
  addTask: (task: Omit<Task, "id">) => void;
  updateTask: (id: string, fields: Partial<Task>) => void;
  toggleTaskComplete: (id: string) => void;
  deleteTask: (id: string) => void;
  addProject: (project: Omit<Project, "id">) => void;
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

  // Persist data slices to localStorage whenever they change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota exceeded or private-browsing restriction — silently ignore.
    }
  }, [state.tasks, state.projects, state.sessions, state.recurringTasks, state.spheres, state.habits, state.activeTask, state.currentTrackingDate, state.quickNotes]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DashboardContext.Provider
      value={{
        currentTrackingDate:  state.currentTrackingDate,
        showNightlyReview:    state.showNightlyReview,
        toggleTaskForToday:   (id, dateString, intent, targetMinutes) => dispatch({ type: "TOGGLE_TASK_FOR_TODAY", id, dateString, intent: intent ?? "finish", targetMinutes }),
        updateTaskTimeSpent:  (id, minutes)    => dispatch({ type: "UPDATE_TASK_TIME_SPENT", id, minutes }),
        transitionToNextDay:  ()               => dispatch({ type: "TRANSITION_TO_NEXT_DAY" }),
        requestNightlyReview: ()               => dispatch({ type: "REQUEST_NIGHTLY_REVIEW" }),
        dismissNightlyReview: ()               => dispatch({ type: "DISMISS_NIGHTLY_REVIEW" }),
        tags: state.tags,
        spheres: state.spheres,
        habits: state.habits,
        tasks: state.tasks,
        projects: state.projects,
        activeTask: state.activeTask,
        running: state.running,
        elapsed: state.elapsed,
        sessions: state.sessions,
        recurringTasks: state.recurringTasks,
        quickNotes:     state.quickNotes,
        addQuickNote:   (text, sphere, projectId) => {
          const now = new Date();
          const h = String(now.getHours()).padStart(2, "0");
          const m = String(now.getMinutes()).padStart(2, "0");
          const createdAt = `${now.toLocaleDateString("en-CA")} ${h}:${m}`;
          dispatch({ type: "ADD_QUICK_NOTE", note: { text, sphere, projectId, createdAt } });
        },
        deleteQuickNote: (id) => dispatch({ type: "DELETE_QUICK_NOTE", id }),
        addTag:    (tag)          => dispatch({ type: "ADD_TAG", tag }),
        updateTag: (id, fields)   => dispatch({ type: "UPDATE_TAG", id, fields }),
        deleteTag: (id)           => dispatch({ type: "DELETE_TAG", id }),
        addHabit:        (habit)         => dispatch({ type: "ADD_HABIT", habit }),
        toggleHabitDate: (id, dateString)=> dispatch({ type: "TOGGLE_HABIT_DATE", id, dateString }),
        updateHabit:     (id, fields)    => dispatch({ type: "UPDATE_HABIT", id, fields }),
        deleteHabit:     (id)            => dispatch({ type: "DELETE_HABIT", id }),
        addSphere:      (name, labelColor)           => dispatch({ type: "ADD_SPHERE", name, labelColor }),
        updateSphere:   (id, fields)                => dispatch({ type: "UPDATE_SPHERE", id, fields }),
        deleteSphere:   (id)                        => dispatch({ type: "DELETE_SPHERE", id }),
        reorderSpheres: (startIndex, endIndex)      => dispatch({ type: "REORDER_SPHERES", startIndex, endIndex }),
        updateProject: (id, fields)      => dispatch({ type: "UPDATE_PROJECT", id, fields }),
        addTask:              (task)              => dispatch({ type: "ADD_TASK", task }),
        updateTask:           (id, fields)        => dispatch({ type: "UPDATE_TASK", id, fields }),
        toggleTaskComplete:   (id)               => {
          const t = state.tasks.find((task) => task.id === id);
          if (t) dispatch({ type: "UPDATE_TASK", id, fields: { done: !t.done } });
        },
        deleteTask:           (id)               => dispatch({ type: "DELETE_TASK", id }),
        addProject:           (project)           => dispatch({ type: "ADD_PROJECT", project }),
        addManualTime:        (projectId, minutes)=> dispatch({ type: "ADD_MANUAL_TIME", projectId, minutes }),
        startTask:            (task)              => dispatch({ type: "START_TASK", task }),
        startFree:            ()                  => dispatch({ type: "START_FREE" }),
        pauseSession:         ()                  => dispatch({ type: "PAUSE_SESSION" }),
        activeTaskId:         state.activeTask?.id ?? null,
        timerIsRunning:       state.running,
        startGlobalTimer:     (taskId) => {
          // Resume: same task is already loaded but paused — preserve elapsed, just restart the ticker
          if (state.activeTask?.id === taskId && !state.running) {
            dispatch({ type: "START_FREE" });
            return;
          }
          // New task: commit any in-progress elapsed as a partial session, then start fresh
          const t = state.tasks.find((task) => task.id === taskId);
          if (!t) return;
          dispatch({ type: "START_TASK", task: { id: t.id, title: t.title, project: t.project, sphere: t.sphere, estimatedMinutes: t.dailyTargetMinutes ?? undefined } });
        },
        pauseGlobalTimer:     () => dispatch({ type: "PAUSE_SESSION" }),
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
