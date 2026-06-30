import type { IndustryTemplate } from "./types";

// ── Personal & Family Life ────────────────────────────────────────────────────
// School runs, bedtime stories, and a pantry that's finally organized — one
// Home & Family area for the whole household.

export const personalLifeTemplate: IndustryTemplate = {
  id: "personal-life",
  label: "Personal & Family Life",
  description: "Managing home tasks, family schedules, and routines for a household with 2 kids.",

  areas: [
    { areaKey: "home", name: "Home & Family", color: "amber" },
  ],

  projects: [
    { projectKey: "family-sync",  areaKey: "home", name: "Family Planning",      emoji: "📅", tags: ["Kids", "Schedules"] },
    { projectKey: "home-upgrade", areaKey: "home", name: "Kitchen Organization", emoji: "🏡", tags: ["Home"] },
    { projectKey: "home_simple",  areaKey: "home", name: "Simple Tasks",         emoji: "📝" },
  ],

  tasks: [
    {
      projectKey: "family-sync",
      title: "Coordinate kids school schedules and soccer practices",
      isCompleted: false,
      notes: "Check calendar alignment for the upcoming term.",
      queueToday: true,
    },
    {
      projectKey: "home-upgrade",
      title: "Set up the new modular pantry shelves",
      isCompleted: true,
      notes: "Sort dry ingredients into clear jars and label spice racks.",
    },
  ],

  focusTimer: [
    { projectKey: "family-sync", taskTitle: "Weekly calendar review", durationMinutes: 30, daysAgo: 1 },
  ],

  quickNotes: [
    {
      text: "Remember to re-order the kids multivitamin gummies",
      areaKeys: ["home"],
      favorite: true,
      simulatedTime: "09:30",
    },
  ],

  habits: [
    { title: "Read bedtime story to the kids", areaKey: "home", routine: "Evening", frequency: "daily", targetCount: 1, completedDays: "all" },
  ],

  network: [
    { name: "Katri (Kindergarten Teacher)", groupLabel: "School/Kids", notes: "Ask about the upcoming class field trip plans" },
  ],

  recurringResponsibilities: [
    { title: "Plan out the weekly family dinner menu and grocery run", areaKey: "home", intervalDays: 7, intervalLabel: "Every Sunday" },
  ],
};
