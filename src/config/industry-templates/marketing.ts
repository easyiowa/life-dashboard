import type { IndustryTemplate } from "./types";

// ── Head of Marketing ────────────────────────────────────────────────────────
// Paid spend, SEO content, and a daily ROAS gut-check — one Marketing area
// running the whole growth engine.

export const marketingTemplate: IndustryTemplate = {
  id: "marketing",
  label: "Head of Marketing",
  description: "Driving user growth, creative content pipelines, and paid targeting campaigns.",

  areas: [
    { areaKey: "mktg", name: "Marketing", color: "sky" },
  ],

  projects: [
    { projectKey: "paid-ads",    areaKey: "mktg", name: "Q3 Paid Acquisition", emoji: "🎯", tags: ["Growth", "Ads"] },
    { projectKey: "seo-boost",   areaKey: "mktg", name: "SEO Content Engine",  emoji: "🚀", tags: ["Content"] },
    { projectKey: "mktg_simple", areaKey: "mktg", name: "Simple Tasks",        emoji: "📝" },
  ],

  tasks: [
    {
      projectKey: "paid-ads",
      title: "A/B test creative copy variations for landing page registration ads",
      isCompleted: true,
      notes: "Focus on the casual, all-in-one life dashboard hook.",
      queueToday: false,
    },
    {
      projectKey: "seo-boost",
      title: "Draft target keyword outline for incoming pillar articles",
      isCompleted: false,
      notes: "Focus heavily on optimization tools and productivity setups.",
      queueToday: true,
    },
  ],

  focusTimer: [
    { projectKey: "paid-ads",  taskTitle: "Reviewing ad network attribution flows", durationMinutes: 60, daysAgo: 3 },
    { projectKey: "seo-boost", taskTitle: "Keyword discovery analysis sprint",      durationMinutes: 35, daysAgo: 1 },
  ],

  quickNotes: [
    {
      text: "Look into analytics conversion script fixes for our primary video landing component",
      areaKeys: ["mktg"],
      favorite: true,
      simulatedTime: "15:30",
    },
  ],

  habits: [
    { title: "Review active spend ROAS metrics", areaKey: "mktg", routine: "Morning", frequency: "daily", targetCount: 1, completedDays: "all" },
  ],

  network: [
    { name: "Liisa (Ad Designer)", groupLabel: "Team", notes: "Review new portrait asset banners for upcoming social ad sets", birthday: "tomorrow" },
  ],

  recurringResponsibilities: [
    { title: "Weekly growth dashboard metrics update sync", areaKey: "mktg", intervalDays: 7, intervalLabel: "Every Monday" },
  ],
};
