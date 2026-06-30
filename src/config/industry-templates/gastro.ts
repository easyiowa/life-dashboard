import type { IndustryTemplate } from "./types";

// ── Restaurant Owner ──────────────────────────────────────────────────────────
// Seasonal menus, supplier deals, and a nightly cash-drawer ritual — one
// Restaurant Operations area running the whole kitchen.

export const gastroTemplate: IndustryTemplate = {
  id: "gastro",
  label: "Restaurant Owner",
  description: "Overseeing daily dining operations, menu design, and local ingredient sourcing.",

  areas: [
    { areaKey: "gastro", name: "Restaurant Operations", color: "rose" },
  ],

  projects: [
    { projectKey: "menu-refresh",   areaKey: "gastro", name: "Summer Bistro Menu Launch",        emoji: "🍽️", tags: ["Kitchen", "Seasonal"] },
    { projectKey: "supplier-deal",  areaKey: "gastro", name: "Local Eco-Distributor Onboarding", emoji: "🚜", tags: ["Supply-Chain"] },
    { projectKey: "gastro_simple",  areaKey: "gastro", name: "Simple Tasks",                     emoji: "📝" },
  ],

  tasks: [
    {
      projectKey: "menu-refresh",
      title: "Source fresh seasonal items from organic regional producers",
      isCompleted: false,
      notes: "Verify morning harvest dispatch schedules for wild herbs and heirloom tomatoes.",
      queueToday: true,
    },
    {
      projectKey: "supplier-deal",
      title: "Review draft freight agreement terms with the farming co-op coordinator",
      isCompleted: true,
      notes: "Logistics parameters match kitchen budget caps.",
    },
  ],

  focusTimer: [
    { projectKey: "menu-refresh",  taskTitle: "Kitchen recipe costing optimization",  durationMinutes: 45, daysAgo: 1 },
    { projectKey: "supplier-deal", taskTitle: "Negotiating distribution bulk rates",   durationMinutes: 20, daysAgo: 2 },
  ],

  quickNotes: [
    {
      text: "Schedule technical repairs for walk-in freezer tracking gauge before weekend rush hours",
      areaKeys: ["gastro"],
      favorite: true,
      simulatedTime: "16:45",
    },
  ],

  habits: [
    { title: "Run evening cash register audit balances", areaKey: "gastro", routine: "Evening", frequency: "daily", targetCount: 1, completedDays: "all" },
  ],

  network: [
    { name: "Chef Dmitry", groupLabel: "Kitchen Staff", notes: "Review plate presentation steps and ingredient costing parameters for trout dish", birthday: "2 days ago" },
  ],

  recurringResponsibilities: [
    { title: "Complete food safety sanitation compliance audits", areaKey: "gastro", intervalDays: 7, intervalLabel: "Every Monday" },
  ],
};
