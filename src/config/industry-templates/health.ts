import type { IndustryTemplate } from "./types";

// ── Nutritionist — Weight Loss & Lifestyle Coaching ───────────────────────────
// Meal plans, client check-ins, and the daily discipline of helping people
// build a relationship with food that actually lasts.

export const healthTemplate: IndustryTemplate = {
  id: "health",
  label: "Nutritionist",
  description: "Helping clients lose weight and build lasting healthy habits through personalised nutrition coaching.",

  areas: [
    { areaKey: "clients",  name: "Client Coaching",  color: "emerald" },
  ],

  projects: [
    { projectKey: "meal-plans",  areaKey: "clients",  name: "Client Meal Plans",         emoji: "🥗", tags: ["Nutrition", "Plans"] },
    { projectKey: "group-prog",  areaKey: "clients",  name: "12-Week Group Programme",    emoji: "👥", tags: ["Group", "Coaching"] },
  ],

  tasks: [
    {
      projectKey: "meal-plans",
      title: "Build and send updated 4-week meal plan for Maria — plateau phase adjustment",
      isCompleted: false,
      notes: "Maria has stalled at the same weight for 10 days. Reduce refined carbs on non-training days, increase protein to 1.8g/kg, add one refeed day on Saturday. Send via the client portal with a voice note explaining the rationale.",
      priority: "High",
      energy: "Flow",
      intent: "finish",
      queueToday: true,
    },
    {
      projectKey: "meal-plans",
      title: "Review weekly food diary submissions for all active 1:1 clients",
      isCompleted: false,
      notes: "Clients: Maria, Tomas, Riitta, and Aleksi. Flag anyone under 1,400 kcal daily average — risk of metabolic adaptation. Leave personalised feedback comment in the portal for each.",
      priority: "Med",
      energy: "Flow",
    },
    {
      projectKey: "group-prog",
      title: "Send Week 5 progress summary and encouragement message to the group",
      isCompleted: true,
      notes: "Group average: 2.1 kg lost over 5 weeks. Highlight the non-scale wins — energy, sleep, clothing fit. Keep the tone celebratory.",
    },
  ],

  focusTimer: [
    { projectKey: "meal-plans", taskTitle: "Client meal plan creation session",        durationMinutes: 60, daysAgo: 1 },
    { projectKey: "group-prog", taskTitle: "Group coaching call prep and review",      durationMinutes: 45, daysAgo: 2 },
  ],

  quickNotes: [
    {
      text: "Maria plateau note: consider a 2-day diet break at maintenance calories before restarting the deficit. Evidence supports this resetting leptin sensitivity. Bring up at next check-in.",
      areaKeys: ["clients"],
      favorite: true,
      simulatedTime: "09:00",
    },
    {
      text: "Recipe idea: Greek yoghurt overnight oats with chia and berries — 35g protein, under 400 kcal. Test this week and photograph for Instagram if it holds together well.",
      areaKeys: ["content"],
      favorite: true,
      simulatedTime: "Yesterday",
    },
  ],

  habits: [
    { title: "30-minute walk or movement session",                                 areaKey: "clients",  routine: "Day",     frequency: "daily",  targetCount: 1, completedDays: "all" },
    { title: "Post one piece of value-driven content to Instagram or newsletter",  areaKey: "content",  routine: "Day",     frequency: "weekly", targetCount: 1, completedDays: 1 },
  ],

  network: [
    { name: "Mika (Personal Trainer)",           groupLabel: "Collaborators",     notes: "Cross-refer clients who need a training plan alongside nutrition coaching. Split-package idea pending discussion.", birthday: "today" },
    { name: "Henna (Client — Group Programme)", groupLabel: "Clients",           notes: "Week 6, doing really well. Flagged stress eating at work. Follow up with coping strategies worksheet." },
  ],

  recurringResponsibilities: [
    { title: "Review all active client food diaries and leave feedback",        areaKey: "clients",  intervalDays: 7,  intervalLabel: "Every Monday" },
    { title: "Send weekly newsletter to subscriber list",                       areaKey: "content",  intervalDays: 7,  intervalLabel: "Every Thursday" },
  ],
};
