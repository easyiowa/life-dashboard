import type { IndustryTemplate } from "./types";

// ── Clean Slate ──────────────────────────────────────────────────────────────
// The dashboard's native baseline — just the two areas every account starts
// with, and nothing else. No sample projects, tasks, habits, notes, or contacts.

export const cleanSlateTemplate: IndustryTemplate = {
  id: "clean-slate",
  label: "Clean Slate",
  description: "Start fresh with just the two baseline areas — no sample data.",

  areas: [
    { areaKey: "private",  name: "Private",  color: "amber" }, // warm tone
    { areaKey: "business", name: "Business", color: "sky"   }, // distinct, cooler hue
  ],

  projects: [],
  tasks: [],
  focusTimer: [],
  quickNotes: [],
  habits: [],
  network: [],
  recurringResponsibilities: [],
};
