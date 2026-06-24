import type { IndustryTemplate } from "./types";

// ── Communication Teacher / YouTuber ─────────────────────────────────────────
// Scripting video chapters, polishing slide decks, and warming up the voice
// before every recording — all under one Education area.

export const educationTemplate: IndustryTemplate = {
  id: "education",
  label: "Communication Teacher / YouTuber",
  description: "Creating educational video tracks, managing student scripts, and editing loops.",

  areas: [
    { areaKey: "edu", name: "Education", color: "amber" },
  ],

  projects: [
    { projectKey: "yt-growth",    areaKey: "edu", name: "Public Speaking Video Masterclass", emoji: "🎬", tags: ["YouTube", "Content"] },
    { projectKey: "course-build", areaKey: "edu", name: "Interactive Cohort Syllabus",        emoji: "📚", tags: ["Teaching"] },
  ],

  tasks: [
    {
      projectKey: "yt-growth",
      title: "Finish writing the script outline for intro chapter 3",
      isCompleted: false,
      notes: "Keep the hook under 15 seconds. High energy.",
      queueToday: true,
    },
    {
      projectKey: "course-build",
      title: "Proofread lecture slide deck for communication training modules",
      isCompleted: true,
      notes: "All graphics and layout spacing optimized.",
    },
  ],

  focusTimer: [
    { projectKey: "yt-growth",    taskTitle: "Video clip editing session",  durationMinutes: 55, daysAgo: 1 },
    { projectKey: "course-build", taskTitle: "Syllabus review & mapping",   durationMinutes: 30, daysAgo: 2 },
  ],

  quickNotes: [
    {
      text: "Video idea: why people sound robotic and formal when reading presentation slides verbatim",
      areaKeys: ["edu"],
      favorite: false,
      simulatedTime: "08:20",
    },
  ],

  habits: [
    { title: "Practice vocal exercises & warmups", areaKey: "edu", routine: "Morning", frequency: "daily", targetCount: 1, completedDays: 3 },
  ],

  network: [
    { name: "Tanel (Video Editor)", groupLabel: "Production", notes: "Check status on thumbnail concepts for the next course upload" },
  ],

  recurringResponsibilities: [
    { title: "Publish new weekly educational masterclass capsule", areaKey: "edu", intervalDays: 7, intervalLabel: "Every Thursday" },
  ],
};
