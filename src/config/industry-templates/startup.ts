import type { IndustryTemplate } from "./types";

// ── Startup Founder ──────────────────────────────────────────────────────────
// A streamlined workspace for a solo founder running lean—consolidating software
// development, team milestones, and financial operations entirely inside one main hub.

export const startupTemplate: IndustryTemplate = {
  id: "startup",
  label: "Startup Founder",
  description: "Building a life dashboard to keep personal life, habits, team alignment, and product milestones completely organized in one place.",

  // 1. Consolidated down to a single master area
  areas: [
    { areaKey: "product", name: "Startup", color: "sky" },
  ],

  // 2. All projects moved under the Startup area
  projects: [
    { projectKey: "life-dash",      areaKey: "product", name: "Launch Life Dashboard", emoji: "🔮", tags: ["Personal", "V1"] },
    { projectKey: "mvp-build",      areaKey: "product", name: "Build MVP, FAST!",      emoji: "🚀", tags: ["Dev", "Sprint-1"] },
    { projectKey: "beta-push",      areaKey: "product", name: "Friends as Testers",    emoji: "📣", tags: ["Marketing", "Tallinn"] },
    { projectKey: "product_simple", areaKey: "product", name: "Simple Tasks",          emoji: "📝" },
  ],

  // 3. All tasks now point under projects housed in the Startup area
  tasks: [
    {
      projectKey: "life-dash",
      title: "Brainstorm widget checklist layout options",
      isCompleted: true,
      notes: "<div>Keep it super clean:</div><ul><li>☐ Check mobile card spacing</li><li>☐ Test the new uncollapse button logic</li></ul>",
      queueToday: true, // also surfaced in Today's Focus
    },
    {
      projectKey: "mvp-build",
      title: "Fix background tab drift tracking loop",
      isCompleted: false,
      notes: "<div>Derive everything from absolute timestamps so timers never fall behind.</div>",
    },
    {
      projectKey: "beta-push",
      title: "Reach out to 5 local founders in Tallinn for initial feedback",
      isCompleted: false,
      notes: "<div>Ping them casually on LinkedIn or grab a coffee at Telliskivi.</div>",
    },
  ],

  // 4. Activity log tracking session redirected under the Startup area project keys
  focusTimer: [
    { projectKey: "mvp-build", taskTitle: "MVP coding sprint",           durationMinutes: 45, daysAgo: 0 },
    { projectKey: "life-dash", taskTitle: "Dashboard tinkering session", durationMinutes: 25, daysAgo: 1 },
  ],

  // 5. Quick notes cleaned up and routed to the Startup area
  quickNotes: [
    {
      text: "Idea: marketplace for custom skins, users can make their dashboard cozy",
      areaKeys: ["product"],
      favorite: true,
      simulatedTime: "09:41",
    },
    {
      text: "Remember to book dinner tables in Old Town for the team sync next week",
      areaKeys: ["product"],
      favorite: false,
      simulatedTime: "14:20",
    },
  ],

  // 6. Signature routines mapped to the Startup area
  habits: [
    { title: "Deep Focus in Blocks", areaKey: "product", routine: "Day",     frequency: "daily", targetCount: 2, completedDays: "all" },
    { title: "Call it a day RECAP",  areaKey: "product", routine: "Evening", frequency: "daily", targetCount: 1, completedDays: 2 },
    { title: "Plan the day",         areaKey: "product", routine: "Morning", frequency: "daily", targetCount: 1, completedDays: 1 },
  ],

  // 7. Team-only Network view — Mihkel's birthday always lands on the signup date
  network: [
    { name: "Ernest",                    groupLabel: "Team", notes: "Catch up on website concepts" },
    { name: "Mihkel (Content Marketer)", groupLabel: "Team", notes: "Job Interview", birthday: "today" },
  ],

  // 8. Consolidated tracking routines + new 3rd of the month payment tracking
  recurringResponsibilities: [
    { title: "Review weekly user feedback & growth", areaKey: "product", intervalDays: 7,  intervalLabel: "Every Sunday" },
    { title: "Pay Invoices",                         areaKey: "product", intervalDays: 30, intervalLabel: "Monthly, every 3rd" },
  ],
};
