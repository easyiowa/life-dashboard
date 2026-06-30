import type { IndustryTemplate } from "./types";

// ── Old Town Shop Owner ───────────────────────────────────────────────────────
// Window styling, fresh stock intake, and end-of-day drawer counts — one
// Boutique Shop Operations area for the whole storefront.

export const retailTemplate: IndustryTemplate = {
  id: "retail",
  label: "Old Town Shop Owner",
  description: "Managing designer clothing retail stock, vendor accounts, and boutique window styling.",

  areas: [
    { areaKey: "retail", name: "Boutique Shop Operations", color: "pink" },
  ],

  projects: [
    { projectKey: "window-style",   areaKey: "retail", name: "Midsummer Collection Showcase", emoji: "👗", tags: ["Visuals", "Merch"] },
    { projectKey: "stock-intake",   areaKey: "retail", name: "Capsule Brand Onboarding",      emoji: "📦", tags: ["Inventory"] },
    { projectKey: "retail_simple",  areaKey: "retail", name: "Simple Tasks",                  emoji: "📝" },
  ],

  tasks: [
    {
      projectKey: "window-style",
      title: "Arrange premium linen apparel cuts on storefront mannequins",
      isCompleted: true,
      notes: "Position accent spotlights to draw attention from the busy cobblestone alley walk.",
    },
    {
      projectKey: "stock-intake",
      title: "Inspect arriving merchandise delivery batches for stitching defects",
      isCompleted: false,
      notes: "Cross-reference box counts against itemized packing lists.",
      queueToday: true,
    },
  ],

  focusTimer: [
    { projectKey: "window-style", taskTitle: "Store front layout arrangement session",  durationMinutes: 35, daysAgo: 1 },
    { projectKey: "stock-intake", taskTitle: "Tagging barcodes & scanning pricing sheets", durationMinutes: 40, daysAgo: 2 },
  ],

  quickNotes: [
    {
      text: "Confirm arrival clearance parameters with our Italian knitwear distributor rep",
      areaKeys: ["retail"],
      favorite: false,
      simulatedTime: "14:10",
    },
  ],

  habits: [
    { title: "Review retail daily drawer totals", areaKey: "retail", routine: "Evening", frequency: "daily", targetCount: 1, completedDays: "all" },
  ],

  network: [
    { name: "Sandra (Floor Stylist)", groupLabel: "Floor Staff", notes: "Review new inventory placement maps for the organic silk scarf bundles" },
  ],

  recurringResponsibilities: [
    { title: "Perform complete warehouse item inventory stock audit", areaKey: "retail", intervalDays: 30, intervalLabel: "Monthly, every 1st" },
  ],
};
