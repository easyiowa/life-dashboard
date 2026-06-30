import type { IndustryTemplate } from "./types";

// ── Photographer / Creative Freelancer ───────────────────────────────────────
// Shooting seasons, client galleries, and the endless art of the edit — all
// the moving parts of a freelance visual creative in one dashboard.

export const creativeTemplate: IndustryTemplate = {
  id: "creative",
  label: "Photographer",
  description: "Managing client shoots, gallery deliveries, and portfolio growth as a freelance photographer.",

  areas: [
    { areaKey: "portfolio", name: "Portfolio & Brand", color: "violet" },
  ],

  projects: [
    { projectKey: "portfolio",        areaKey: "portfolio", name: "Portfolio Refresh", emoji: "🖼️", tags: ["Branding", "Website"] },
    { projectKey: "portfolio_simple", areaKey: "portfolio", name: "Simple Tasks",      emoji: "📝" },
  ],

  tasks: [
    {
      projectKey: "portfolio",
      title: "Update hero section of portfolio website with spring work",
      isCompleted: false,
      notes: "Replace top 6 images, refresh bio copy, and update the booking CTA button link.",
      priority: "Med",
      energy: "Flow",
    },
    {
      projectKey: "portfolio",
      title: "TFP shoots with new faces from Model Agency",
      isCompleted: true,
      notes: "Artsy pics for my portfolio",
    },
  ],

  focusTimer: [
    { projectKey: "portfolio", taskTitle: "Website image selection and upload",   durationMinutes: 60, daysAgo: 3 },
  ],

  quickNotes: [
    {
      text: "Golden hour window this week: 20:45–21:10. Book outdoor sessions to end at 20:30.",
      areaKeys: ["portfolio"],
      favorite: true,
      simulatedTime: "08:15",
    },
  ],

  habits: [
    { title: "Send inquiry follow-up emails",                              areaKey: "portfolio",    routine: "Day",     frequency: "weekly",  targetCount: 1, completedDays: 1 },
  ],

  network: [
    { name: "Laura (Second Shooter)",            groupLabel: "Colleagues", notes: "Available Saturdays in August — confirm before booking any new weddings" },
  ],

  recurringResponsibilities: [
    { title: "Back up all client galleries to cold storage",             areaKey: "portfolio",    intervalDays: 7,  intervalLabel: "Weekly, every Sunday" },
    { title: "Post one piece of new work to Instagram and website blog", areaKey: "portfolio", intervalDays: 7,  intervalLabel: "Weekly" },
  ],
};
