import type { IndustryTemplate } from "./types";

// ── Nightclub Owner — Minimal / Electronic Scene ─────────────────────────────
// Booking international artists, running the night, and keeping the crowd
// coming back — the full operational life of an independent electronic music venue.

export const eventsTemplate: IndustryTemplate = {
  id: "events",
  label: "Nightclub Owner",
  description: "Booking international minimal artists, running club nights, and growing a dedicated electronic music crowd.",

  areas: [
    { areaKey: "bookings",  name: "Artist Bookings",  color: "violet" },
  ],

  projects: [
    { projectKey: "feb-night",       areaKey: "bookings", name: "February Closing Set",    emoji: "🎛️", tags: ["Headliner", "Minimal"] },
    { projectKey: "spring-series",   areaKey: "bookings", name: "Spring Residency Series", emoji: "🔊", tags: ["Residents", "Series"] },
    { projectKey: "bookings_simple", areaKey: "bookings", name: "Simple Tasks",            emoji: "📝" },
  ],

  tasks: [
    {
      projectKey: "feb-night",
      title: "Finalise rider and hospitality details with Raresh's booking agent",
      isCompleted: false,
      notes: "Flight from Madrid confirmed. Hotel: Standard room, check-in Friday 18:00. Rider: still waiting on confirmed guest-list allocation and stage plot. Chase by Thursday.",
      priority: "High",
      energy: "Quick",
      intent: "finish",
      queueToday: true,
    },
    {
      projectKey: "spring-series",
      title: "Negotiate a three-date residency deal with Inland agency for Function",
      isCompleted: false,
      notes: "Proposed dates: March, May, July. Target fee band per night. Offer merchandise split as sweetener. Get exclusivity radius clause in writing.",
      priority: "Med",
      energy: "Flow",
    },
  ],

  focusTimer: [
    { projectKey: "feb-night",    taskTitle: "Artist contract and rider review",          durationMinutes: 45, daysAgo: 1 },
    { projectKey: "spring-series", taskTitle: "Residency proposal drafting session",      durationMinutes: 60, daysAgo: 2 },
  ],

  quickNotes: [
    {
      text: "Agent contacts: Inland (Function) — bookings@inlandagency.com. Planet Rhythm (Roel Salemink) — contact via RA messages. Prologue (Luis Flores) — email only, no WhatsApp.",
      areaKeys: ["bookings"],
      favorite: true,
      simulatedTime: "10:30",
    },
  ],

  habits: [
    { title: "Check Resident Advisor event listings and new artist activity",       areaKey: "bookings",  routine: "Morning", frequency: "daily",  targetCount: 1, completedDays: "all" },
    { title: "Reply to all booking inquiries and DM artist interest messages",      areaKey: "bookings",  routine: "Evening", frequency: "daily",  targetCount: 1, completedDays: 3 },
  ],

  network: [
    { name: "Claudia (Booking Agent, Inland)",   groupLabel: "Agents",    notes: "Primary agent for Function and several other Tresor-affiliated artists. Responds fast on email, prefers not to WhatsApp." },
    { name: "Marco (Soundtech / Funktion-One)",  groupLabel: "Technical", notes: "Certified Funktion-One tech. Book minimum 3 weeks ahead. Rates on file.", birthday: "3 days ago" },
  ],

  recurringResponsibilities: [
    { title: "Pay artist and agent invoices within agreed payment window",        areaKey: "bookings",  intervalDays: 30,  intervalLabel: "Monthly accounts run" },
  ],
};
