import type { IndustryTemplate } from "./types";

// ── PR Agency Manager ────────────────────────────────────────────────────────
// Pitching journalists, drafting press releases, and keeping a crisis playbook
// on standby — all under one PR & Agency area.

export const mediaTemplate: IndustryTemplate = {
  id: "media",
  label: "PR Agency Manager",
  description: "Juggling media outreach, press releases, and client brand strategies.",

  areas: [
    { areaKey: "pr", name: "PR & Agency", color: "violet" },
  ],

  projects: [
    { projectKey: "launch-wire", areaKey: "pr", name: "Startup Media Push",      emoji: "📰", tags: ["Campaign", "Tallinn"] },
    { projectKey: "brand-strat", areaKey: "pr", name: "Crisis Management Guide", emoji: "🛡️", tags: ["Internal"] },
    { projectKey: "pr_simple",   areaKey: "pr", name: "Simple Tasks",            emoji: "📝" },
  ],

  tasks: [
    {
      projectKey: "launch-wire",
      title: "Pitch exclusive feature profile to local tech editors",
      isCompleted: false,
      notes: "Follow up via phone if no reply by Wednesday afternoon.",
      queueToday: true,
    },
    {
      projectKey: "brand-strat",
      title: "Review draft templates for internal escalation channels",
      isCompleted: true,
      notes: "Approved by senior leadership crew.",
    },
  ],

  focusTimer: [
    { projectKey: "launch-wire", taskTitle: "Drafting punchy press release hooks",        durationMinutes: 45, daysAgo: 2 },
    { projectKey: "brand-strat", taskTitle: "Assembling communication response matrix",   durationMinutes: 25, daysAgo: 3 },
  ],

  quickNotes: [
    {
      text: "Idea: pitch a joint feature story on sustainable architectural spaces in Noblessner quarter",
      areaKeys: ["pr"],
      favorite: false,
      simulatedTime: "10:15",
    },
  ],

  habits: [
    { title: "Scan morning news streams for mentions", areaKey: "pr", routine: "Morning", frequency: "daily", targetCount: 1, completedDays: 2 },
  ],

  network: [
    { name: "Martin (Tech Journalist)", groupLabel: "Media", notes: "Grab coffee at Telliskivi next week to chat about launch waves", birthday: "tomorrow" },
  ],

  recurringResponsibilities: [
    { title: "Compile client media coverage reports", areaKey: "pr", intervalDays: 30, intervalLabel: "End of month" },
  ],
};
