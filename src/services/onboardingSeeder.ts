import { supabase } from "@/lib/supabase";
import type { IndustryTemplate } from "@/config/industry-templates/types";
import { cleanSlateTemplate } from "@/config/industry-templates";

// ── Onboarding sample-data seeder ───────────────────────────────────────────
//
// Takes a fully declarative IndustryTemplate (template-local areaKey/projectKey
// references only) and writes it into the live schema for one authenticated user,
// resolving every key into a real database UUID as it goes.
//
// The Supabase JS client has no multi-statement transaction primitive over REST,
// so "transaction chain" here means a strict sequential await chain — each phase
// throws immediately on the first error rather than continuing with partial state,
// which is the closest practical equivalent to a rollback for a one-shot setup
// pipeline like this (as opposed to the fire-and-forget mutation style used
// elsewhere in DashboardContext for live UI edits).
//
// IDs are generated client-side via crypto.randomUUID() and passed explicitly in
// every insert — the same convention DashboardContext uses for addSphere/addProject/etc.
// — so each phase already knows the UUIDs it just wrote without a round-trip read-back.

export interface SeedResult {
  areaIds: Record<string, string>;
  projectIds: Record<string, string>;
  taskCount: number;
  focusSessionCount: number;
  quickNoteCount: number;
  habitCount: number;
  contactCount: number;
  recurringCount: number;
}

function parseRelativeTime(input: string | undefined): Date {
  const now = new Date();
  if (!input) return now;
  const lower = input.trim().toLowerCase();
  if (lower === "today" || lower === "now") return now;
  if (lower === "yesterday") { const d = new Date(now); d.setDate(d.getDate() - 1); return d; }
  if (lower === "tomorrow")  { const d = new Date(now); d.setDate(d.getDate() + 1); return d; }

  const hours = lower.match(/^(\d+)\s*h(our)?s?\s*ago$/);
  if (hours) { const d = new Date(now); d.setHours(d.getHours() - Number(hours[1])); return d; }

  const mins = lower.match(/^(\d+)\s*m(in)?(ute)?s?\s*ago$/);
  if (mins) { const d = new Date(now); d.setMinutes(d.getMinutes() - Number(mins[1])); return d; }

  const days = lower.match(/^(\d+)\s*d(ay)?s?\s*ago$/);
  if (days) { const d = new Date(now); d.setDate(d.getDate() - Number(days[1])); return d; }

  // Plain clock time, e.g. "09:41" — anchored to today at that time.
  const clock = lower.match(/^(\d{1,2}):(\d{2})$/);
  if (clock) { const d = new Date(now); d.setHours(Number(clock[1]), Number(clock[2]), 0, 0); return d; }

  // Literal "YYYY-MM-DD" — used as-is rather than treated as an unrecognized format.
  const isoDate = lower.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) return new Date(`${lower}T00:00:00`);

  return now; // unrecognized format — fall back to "now" rather than guessing
}

// Mirrors HabitTrackerCard's getWeekDates() window (Monday-based current week) so seeded
// checkmarks land on days the tracker actually renders, and never on a day that hasn't
// happened yet — "all" caps at however many days have elapsed since Monday, inclusive of today.
function resolveWeekCompletionDates(completedDays: number | "all" | undefined): string[] {
  if (!completedDays) return [];
  const today = new Date();
  const elapsedSinceMonday = (today.getDay() + 6) % 7; // 0 = Monday … 6 = Sunday
  const elapsedCount = elapsedSinceMonday + 1; // Monday..today, inclusive
  const n = completedDays === "all" ? elapsedCount : Math.min(completedDays, elapsedCount);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    return d.toLocaleDateString("en-CA");
  });
}

function resolveParent(
  template: IndustryTemplate,
  templateId: string,
  areaIds: Record<string, string>,
  projectIds: Record<string, string>,
  entityLabel: string,
  projectKey?: string,
  areaKey?: string,
): { sphereId: string | null; projectId: string | null } {
  if (projectKey) {
    const projectId = projectIds[`${templateId}_${projectKey}`];
    if (!projectId) throw new Error(`${entityLabel} references unknown projectKey "${projectKey}".`);
    const parentProject = template.projects.find((p) => p.projectKey === projectKey);
    const sphereId = parentProject ? areaIds[`${templateId}_${parentProject.areaKey}`] ?? null : null;
    return { sphereId, projectId };
  }
  if (areaKey) {
    const sphereId = areaIds[`${templateId}_${areaKey}`];
    if (!sphereId) throw new Error(`${entityLabel} references unknown areaKey "${areaKey}".`);
    return { sphereId, projectId: null };
  }
  return { sphereId: null, projectId: null };
}

export async function seedOnboardingTemplate(template: IndustryTemplate, userId: string): Promise<SeedResult> {
  if (!supabase) throw new Error("Supabase is not configured — cannot seed onboarding data.");
  const db = supabase;

  // Single source of truth for "today" across this whole seed run — reused for the
  // dashboard's tracking date, queueToday tasks, and "today" birthdays, so they all
  // agree on the same calendar day even if seeding straddles a midnight boundary.
  const todayDateString = new Date().toLocaleDateString("en-CA");

  // Industry template files reuse generic areaKey/projectKey values across files
  // (e.g. "product", "growth"). Scoping every key to this template's own id keeps
  // the in-memory areaIds/projectIds maps collision-proof if this function's state
  // is ever shared or composed across multiple templates in the future.
  const scopedAreaKey    = (key: string) => `${template.id}_${key}`;
  const scopedProjectKey = (key: string) => `${template.id}_${key}`;

  // ── Step 0: ensure a user_dashboard_state row exists ─────────────────────────
  // Independent of template content — every account needs this row to exist
  // before the dashboard's timer/tracking-date logic can read it.
  const { error: dashStateError } = await db
    .from("user_dashboard_state")
    .upsert(
      { user_id: userId, current_tracking_date: todayDateString },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (dashStateError) throw new Error(`Failed to initialize user_dashboard_state: ${dashStateError.message}`);

  // ── Step 1: areas (spheres) — capture areaKey -> live sphere UUID ────────────
  const areaIds: Record<string, string> = {};
  if (template.areas.length > 0) {
    const areaRows = template.areas.map((area) => {
      const id = crypto.randomUUID();
      areaIds[scopedAreaKey(area.areaKey)] = id;
      return { id, user_id: userId, name: area.name, label_color: area.color, is_sample: true };
    });
    const { error } = await db.from("spheres").insert(areaRows);
    if (error) throw new Error(`Failed to seed areas: ${error.message}`);
  }

  // ── Step 2: projects — translate areaKey -> sphere_id, capture project_id ────
  const projectIds: Record<string, string> = {};
  const tagIdByLabel = new Map<string, string>();
  const { data: existingTags } = await db.from("tags").select("id, label").eq("user_id", userId);
  for (const t of existingTags ?? []) tagIdByLabel.set((t.label as string).toLowerCase(), t.id as string);

  async function resolveTagId(label: string): Promise<string> {
    const key = label.toLowerCase();
    const cached = tagIdByLabel.get(key);
    if (cached) return cached;
    const id = crypto.randomUUID();
    const { error } = await db.from("tags").insert({ id, user_id: userId, label, color: "violet" });
    if (error) throw new Error(`Failed to create tag "${label}": ${error.message}`);
    tagIdByLabel.set(key, id);
    return id;
  }

  if (template.projects.length > 0) {
    const projectRows = template.projects.map((project) => {
      const sphereId = areaIds[scopedAreaKey(project.areaKey)];
      if (!sphereId) throw new Error(`Project "${project.name}" references unknown areaKey "${project.areaKey}".`);
      const id = crypto.randomUUID();
      projectIds[scopedProjectKey(project.projectKey)] = id;
      return {
        id, user_id: userId, sphere_id: sphereId, name: project.name,
        emoji: project.emoji ?? "📁", status: "on-track", milestone: "", is_sample: true,
      };
    });
    const { error } = await db.from("projects").insert(projectRows);
    if (error) throw new Error(`Failed to seed projects: ${error.message}`);

    for (const project of template.projects) {
      if (!project.tags?.length) continue;
      const tagIds = await Promise.all(project.tags.map(resolveTagId));
      const { error: tagLinkError } = await db.from("project_tags").insert(
        tagIds.map((tagId) => ({ project_id: projectIds[scopedProjectKey(project.projectKey)], tag_id: tagId })),
      );
      if (tagLinkError) throw new Error(`Failed to link tags for project "${project.name}": ${tagLinkError.message}`);
    }
  }

  // ── Step 3: leaf-node tables — bulk-inserted in one pass each ────────────────

  if (template.tasks.length > 0) {
    const taskRows = template.tasks.map((task) => {
      const { sphereId, projectId } = resolveParent(template, template.id, areaIds, projectIds, `Task "${task.title}"`, task.projectKey, task.areaKey);
      return {
        id: crypto.randomUUID(), user_id: userId, sphere_id: sphereId, project_id: projectId,
        title: task.title, priority: task.priority ?? "Med", energy: task.energy ?? "Flow",
        urgency: "not-urgent", done: task.isCompleted ?? false,
        notes: task.notes ?? "", intent: task.intent ?? "finish",
        queued_date: task.queueToday ? todayDateString : null, is_sample: true,
      };
    });
    const { error } = await db.from("tasks").insert(taskRows);
    if (error) throw new Error(`Failed to seed tasks: ${error.message}`);
  }

  if (template.focusTimer.length > 0) {
    const sessionRows = template.focusTimer.map((session) => {
      const { sphereId, projectId } = resolveParent(template, template.id, areaIds, projectIds, "Focus session", session.projectKey, session.areaKey);
      const completedAt = parseRelativeTime(session.daysAgo != null ? `${session.daysAgo}d ago` : undefined);
      const projectName = projectId
        ? template.projects.find((p) => projectIds[scopedProjectKey(p.projectKey)] === projectId)?.name ?? null
        : null;
      const areaName = sphereId
        ? template.areas.find((a) => areaIds[scopedAreaKey(a.areaKey)] === sphereId)?.name ?? null
        : null;
      return {
        id: crypto.randomUUID(), user_id: userId,
        task_name: session.taskTitle ?? "(Sample Session)",
        project_name: projectName, sphere_name: areaName,
        duration_seconds: Math.max(0, Math.round(session.durationMinutes * 60)),
        is_manual: true,
        completed_at: completedAt.toISOString(),
        completed_at_date_string: completedAt.toLocaleDateString("en-CA"),
        is_sample: true,
      };
    });
    const { error } = await db.from("focus_sessions").insert(sessionRows);
    if (error) throw new Error(`Failed to seed focus sessions: ${error.message}`);
  }

  if (template.habits.length > 0) {
    const habitIds = template.habits.map(() => crypto.randomUUID());
    const habitRows = template.habits.map((habit, i) => ({
      id: habitIds[i], user_id: userId, title: habit.title, type: habit.type ?? "start",
      routine: habit.routine.toLowerCase(), frequency: habit.frequency,
      target_count: habit.targetCount, emoji: "⭐", notes: "", is_sample: true,
    }));
    const { error } = await db.from("habits").insert(habitRows);
    if (error) throw new Error(`Failed to seed habits: ${error.message}`);

    const completionRows = template.habits.flatMap((habit, i) =>
      resolveWeekCompletionDates(habit.completedDays).map((completedOn) => ({
        habit_id: habitIds[i], completed_on: completedOn,
      })),
    );
    if (completionRows.length > 0) {
      const { error: completionError } = await db.from("habit_completions").insert(completionRows);
      if (completionError) throw new Error(`Failed to seed habit completions: ${completionError.message}`);
    }
  }

  if (template.quickNotes.length > 0) {
    const noteRows = template.quickNotes.map((note) => {
      const primaryAreaKey = note.areaKeys[0];
      const sphereId = primaryAreaKey ? areaIds[scopedAreaKey(primaryAreaKey)] ?? null : null;
      const createdAt = parseRelativeTime(note.simulatedTime);
      return {
        id: crypto.randomUUID(), user_id: userId, sphere_id: sphereId, text: note.text,
        is_important: note.favorite ?? false,
        created_at: createdAt.toISOString(), is_sample: true,
      };
    });
    const { error } = await db.from("quick_notes").insert(noteRows);
    if (error) throw new Error(`Failed to seed quick notes: ${error.message}`);
  }

  if (template.network.length > 0) {
    // Resolve every unique group label up front with ONE bulk insert, before touching
    // contacts — the previous version called an async "find-or-create" per contact inside
    // a Promise.all, so two contacts sharing a label could both miss the cache and each
    // insert their own copy of the same group (the duplicate "Team" group bug).
    const uniqueLabels = Array.from(new Set(template.network.map((c) => c.groupLabel).filter(Boolean)));

    const { data: existingGroups } = await db.from("relationship_groups").select("id, label").eq("user_id", userId);
    const groupMap: Record<string, string> = {}; // e.g. { "team": "database-uuid" }
    for (const g of existingGroups ?? []) groupMap[(g.label as string).toLowerCase()] = g.id as string;

    const labelsToCreate = uniqueLabels.filter((label) => !groupMap[label.toLowerCase()]);
    if (labelsToCreate.length > 0) {
      const newGroupRows = labelsToCreate.map((label) => ({ id: crypto.randomUUID(), user_id: userId, label, is_sample: true }));
      const { error: groupError } = await db.from("relationship_groups").insert(newGroupRows);
      if (groupError) {
        if (groupError.code !== "42703") {
          throw new Error(`Failed to create relationship groups: ${groupError.message}`);
        }
        // Migration 20260627100000_relationship_groups_is_sample.sql not yet applied —
        // fall back to inserting without the flag so seeding can proceed. Groups created
        // this way won't be auto-removed by "Remove Sample Data" until the migration runs.
        const rowsWithoutFlag = newGroupRows.map(({ is_sample: _f, ...rest }) => rest);
        const { error: fallbackError } = await db.from("relationship_groups").insert(rowsWithoutFlag);
        if (fallbackError) throw new Error(`Failed to create relationship groups: ${fallbackError.message}`);
        console.error("[onboardingSeeder] relationship_groups.is_sample column missing — please run: supabase db push");
      }
      for (const row of newGroupRows) groupMap[row.label.toLowerCase()] = row.id;
    }

    const contactRows = template.network.map((contact) => {
      const groupId = groupMap[contact.groupLabel.toLowerCase()] ?? null;
      const lastTouchpoint = contact.lastContacted && /^\d{4}-\d{2}-\d{2}$/.test(contact.lastContacted)
        ? contact.lastContacted
        : null;
      const birthday = contact.birthday
        ? parseRelativeTime(contact.birthday).toLocaleDateString("en-CA")
        : null;
      return {
        id: crypto.randomUUID(), user_id: userId, name: contact.name, relationship_group_id: groupId,
        birthday, last_touchpoint: lastTouchpoint, cycle_completed: false, notes: contact.notes ?? "", is_sample: true,
      };
    });
    const { error } = await db.from("network_contacts").insert(contactRows);
    if (error) throw new Error(`Failed to seed network contacts: ${error.message}`);
  }

  if (template.recurringResponsibilities.length > 0) {
    const recurringRows = template.recurringResponsibilities.map((item) => {
      const sphereId = areaIds[scopedAreaKey(item.areaKey)];
      if (!sphereId) throw new Error(`Recurring responsibility "${item.title}" references unknown areaKey "${item.areaKey}".`);
      return {
        id: crypto.randomUUID(), user_id: userId, sphere_id: sphereId, title: item.title, notes: "",
        interval_days: item.intervalDays, interval_label: item.intervalLabel, is_sample: true,
      };
    });
    const { error } = await db.from("recurring_tasks").insert(recurringRows);
    if (error) throw new Error(`Failed to seed recurring responsibilities: ${error.message}`);
  }

  return {
    areaIds, projectIds,
    taskCount: template.tasks.length,
    focusSessionCount: template.focusTimer.length,
    quickNoteCount: template.quickNotes.length,
    habitCount: template.habits.length,
    contactCount: template.network.length,
    recurringCount: template.recurringResponsibilities.length,
  };
}

// ── Multi-template merge entry point ────────────────────────────────────────
//
// Centralizes the "merge multiple selected tracks into one dashboard" policy so
// it lives in one place instead of being re-implemented by each caller:
//   - Every template the caller actually resolved (Personal Life intent card +
//     each industry chip with a real template mapping) is seeded — chips with no
//     mapping (e.g. Creative/Events/Health) are simply absent from the list the
//     caller passes in, never silently swapped for cleanSlateTemplate.
//   - cleanSlateTemplate is ONLY used as a whole-list fallback, and only when the
//     caller passed an empty array — it never overwrites or replaces templates
//     that were actually selected.
//   - Seeding is sequential, not Promise.all — concurrent calls would race their
//     relationship-group/tag "find or create" lookups against each other across
//     templates, the same class of bug fixed for a single template's own contacts.
//   - Each template gets its own try/catch so one failure can't silently skip
//     every template queued after it.
export async function seedSelectedTemplates(templates: IndustryTemplate[], userId: string): Promise<void> {
  const toSeed = templates.length > 0 ? templates : [cleanSlateTemplate];
  for (const template of toSeed) {
    try {
      await seedOnboardingTemplate(template, userId);
    } catch (err) {
      console.error(`[onboardingSeeder] seeding "${template.id}" failed:`, err);
    }
  }
}
