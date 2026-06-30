import type { IndustryTemplate } from "./types";

// ── Real Estate Agent ─────────────────────────────────────────────────────────
// Showings, listings, and warm-lead follow-ups — one Real Estate area for
// every deal in motion.

export const realEstateTemplate: IndustryTemplate = {
  id: "real-estate",
  label: "Real Estate Agent",
  description: "Managing property listings, showing luxury listings, and sealing deals.",

  areas: [
    { areaKey: "re", name: "Real Estate", color: "sky" },
  ],

  projects: [
    { projectKey: "listing-push",  areaKey: "re", name: "Noblessner Seaside Apartment Sale", emoji: "🏢", tags: ["Listings", "Luxury"] },
    { projectKey: "brokerage-out", areaKey: "re", name: "Commercial Portfolio Expansion",    emoji: "🤝", tags: ["Acquisitions"] },
    { projectKey: "re_simple",     areaKey: "re", name: "Simple Tasks",                      emoji: "📝" },
  ],

  tasks: [
    {
      projectKey: "listing-push",
      title: "Coordinate open-house showing slots with the photography crew",
      isCompleted: true,
      notes: "Make sure daylight hits the sea-view balcony layouts perfectly.",
    },
    {
      projectKey: "brokerage-out",
      title: "Draft pitch presentation guidelines for commercial land developers",
      isCompleted: false,
      notes: "Incorporate recent city center commercial pricing trends.",
      queueToday: true,
    },
  ],

  focusTimer: [
    { projectKey: "listing-push",  taskTitle: "Client walkthrough preparation",  durationMinutes: 40, daysAgo: 1 },
    { projectKey: "brokerage-out", taskTitle: "Market appraisal data mapping",    durationMinutes: 30, daysAgo: 2 },
  ],

  quickNotes: [
    {
      text: "Call property management company regarding building energy validation certificates",
      areaKeys: ["re"],
      favorite: false,
      simulatedTime: "11:15",
    },
  ],

  habits: [
    { title: "Follow up with warm buyer leads", areaKey: "re", routine: "Day", frequency: "daily", targetCount: 3, completedDays: 2 },
  ],

  network: [
    { name: "Helen (Buyer Lead)", groupLabel: "Leads", notes: "Send exact floorplan configurations for the 3-room coastal penthouse" },
  ],

  recurringResponsibilities: [
    { title: "Update active marketplace property portal descriptions", areaKey: "re", intervalDays: 7, intervalLabel: "Every Tuesday" },
  ],
};
