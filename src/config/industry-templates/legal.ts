import type { IndustryTemplate } from "./types";

// ── Lawyer ────────────────────────────────────────────────────────────────────
// Compliance audits, trademark filings, and billable hours — one Legal
// Practice area keeping every case file in one place.
//
// Note: the requested color token was "slate", which isn't one of this app's
// supported area colors (only emerald/violet/sky/amber/pink/teal/blue/rose/
// orange/indigo exist in areaColor() — an unknown key silently falls back to
// violet). Using "blue" instead — closest in tone, and not already claimed by
// any of the other industry templates.

export const legalTemplate: IndustryTemplate = {
  id: "legal",
  label: "Lawyer",
  description: "Reviewing active legal cases, drafting corporate contracts, and managing litigation files.",

  areas: [
    { areaKey: "law", name: "Legal Practice", color: "blue" },
  ],

  projects: [
    { projectKey: "corp-audit",    areaKey: "law", name: "Corporate Compliance Audit",     emoji: "⚖️", tags: ["Corporate", "Funding"] },
    { projectKey: "ip-protection", areaKey: "law", name: "Trademark Registration Package", emoji: "🔒", tags: ["IP"] },
    { projectKey: "law_simple",    areaKey: "law", name: "Simple Tasks",                   emoji: "📝" },
  ],

  tasks: [
    {
      projectKey: "corp-audit",
      title: "Review articles of association for local startup funding round",
      isCompleted: false,
      notes: "Ensure investor liquidation preferences match standard EU frameworks.",
      queueToday: true,
    },
    {
      projectKey: "ip-protection",
      title: "File updated brand class applications with the local registry office",
      isCompleted: true,
      notes: "All standard state processing fees submitted smoothly.",
    },
  ],

  focusTimer: [
    { projectKey: "corp-audit",    taskTitle: "Deep contract clause auditing",     durationMinutes: 75, daysAgo: 1 },
    { projectKey: "ip-protection", taskTitle: "Filing forms preparation loop",      durationMinutes: 20, daysAgo: 3 },
  ],

  quickNotes: [
    {
      text: "Send updated power of attorney signature documents to the Notary office in City Center",
      areaKeys: ["law"],
      favorite: true,
      simulatedTime: "13:40",
    },
  ],

  habits: [
    { title: "Log billable client operations hours", areaKey: "law", routine: "Evening", frequency: "daily", targetCount: 1, completedDays: "all" },
  ],

  network: [
    { name: "Andres (Client Founder)", groupLabel: "Clients", notes: "Send updated stock option pool distribution guidelines", birthday: "3 days ago" },
  ],

  recurringResponsibilities: [
    { title: "Review updated EU regional data compliance frameworks", areaKey: "law", intervalDays: 90, intervalLabel: "Quarterly Regulatory Audit" },
  ],
};
