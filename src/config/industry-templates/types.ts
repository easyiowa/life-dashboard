// ── Onboarding sample-data template types ──────────────────────────────────────
//
// An IndustryTemplate is a flat, declarative description of a "starter dashboard"
// — every entity references its parent by a template-local key (areaKey/projectKey),
// never by a live database UUID. The onboarding seeder (src/services/onboardingSeeder.ts)
// is the only place those keys get resolved into real foreign keys.
//
// Color tokens (TemplateAreaColor) are palette KEYS, not hex strings — this app's
// entire color system (see src/lib/areaColors.ts, ProjectsCard's COLOR_PALETTE, etc.)
// resolves color through named tokens like "violet" / "amber" / "sky", and every
// Sphere.labelColor in the live schema already stores one of those tokens. Templates
// use the same vocabulary so seeded areas render identically to user-created ones.

/** Palette key matching Sphere.labelColor — e.g. "violet", "emerald", "amber", "sky". */
export type TemplateAreaColor = string;

export interface TemplateArea {
  /** Unique within this template. Referenced by projects/tasks/focusTimer/recurringResponsibilities. */
  areaKey: string;
  name: string;
  color: TemplateAreaColor;
}

export interface TemplateProject {
  /** Unique within this template. Referenced by tasks/focusTimer via projectKey. */
  projectKey: string;
  /** Parent area — must match a TemplateArea.areaKey in the same template. */
  areaKey: string;
  name: string;
  emoji?: string;
  /** Free-form tag labels — created on demand during seeding if they don't already exist. */
  tags?: string[];
}

export interface TemplateTask {
  /**
   * Exactly one of these should be set. If projectKey is set, the task's area is
   * inherited from that project — areaKey is only needed for area-level tasks
   * with no parent project.
   */
  projectKey?: string;
  areaKey?: string;
  title: string;
  isCompleted?: boolean;
  /** HTML/markdown-ish rich text — stored verbatim into tasks.notes. */
  notes?: string;
  priority?: "High" | "Med" | "Low";
  energy?: "Flow" | "Quick" | "Easy";
  intent?: "finish" | "time" | "maybe";
  /** Drops the task straight into Today's Focus by setting queuedDate to the signup date. */
  queueToday?: boolean;
}

export interface TemplateFocusSession {
  /** Exactly one of these should be set, same convention as TemplateTask. */
  projectKey?: string;
  areaKey?: string;
  /** Defaults to a generic "(Sample Session)" label when omitted. */
  taskTitle?: string;
  durationMinutes: number;
  /** How many days before "today" this session was logged. 0 = today. Default 0. */
  daysAgo?: number;
}

export interface TemplateQuickNote {
  text: string;
  /** Areas this note is tagged with — the first entry is used as the note's primary sphere. */
  areaKeys: string[];
  /** Maps to quick_notes.is_important — shows the 🔥 favorite badge. */
  favorite?: boolean;
  /** Simulated relative time, e.g. "2h ago", "Yesterday" — backdates created_at at seed time. */
  simulatedTime?: string;
}

export interface TemplateHabit {
  /**
   * Habits have no area foreign key in the live schema today — this is kept purely
   * for template-side cross-linking / future UI grouping, and is not written to the DB.
   */
  areaKey?: string;
  title: string;
  type?: "start" | "stop";
  routine: "Morning" | "Day" | "Evening";
  frequency: "daily" | "weekly" | "monthly";
  targetCount: number;
  /**
   * Pre-checks days in the habit tracker's current Monday–Sunday week, counting back
   * from today (1 = just today, 2 = today + yesterday, etc.), clipped to however many
   * days have actually elapsed this week so it never marks a future day. Use "all" to
   * check every elapsed day from Monday through today.
   */
  completedDays?: number | "all";
}

export interface TemplateNetworkContact {
  name: string;
  /** Matches a RelationshipGroup label — created on demand during seeding if missing. */
  groupLabel: string;
  /** Either a "YYYY-MM-DD" date or a loose frequency descriptor like "Monthly". */
  lastContacted?: string;
  /** Free-form reminder/context — maps to network_contacts.notes. */
  notes?: string;
  /**
   * A literal "YYYY-MM-DD", or a relative expression resolved at seed time —
   * "today"/"yesterday"/"tomorrow", or "N days ago" (e.g. "3 days ago") — so birthdays
   * land on a specific day relative to signup instead of a fixed calendar date.
   */
  birthday?: string;
}

export interface TemplateRecurringResponsibility {
  title: string;
  areaKey: string;
  intervalDays: number;
  intervalLabel: string;
}

export interface IndustryTemplate {
  id: string;
  label: string;
  description: string;
  areas: TemplateArea[];
  projects: TemplateProject[];
  tasks: TemplateTask[];
  focusTimer: TemplateFocusSession[];
  quickNotes: TemplateQuickNote[];
  habits: TemplateHabit[];
  network: TemplateNetworkContact[];
  recurringResponsibilities: TemplateRecurringResponsibility[];
}
