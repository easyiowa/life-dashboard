import type { IndustryTemplate } from "./types";

// ── Bookkeeper ───────────────────────────────────────────────────────────────
// Tax season never really ends — ledgers, client filings, and the occasional
// audit scramble, all living under one tidy Finance area.

export const financeTemplate: IndustryTemplate = {
  id: "finance",
  label: "Bookkeeper",
  description: "Managing client ledgers, tax filings, and bank reconciliations.",

  areas: [
    { areaKey: "ops", name: "Finance", color: "emerald" },
  ],

  projects: [
    { projectKey: "tax-vault",   areaKey: "ops", name: "Q2 Tax Filings",     emoji: "📊", tags: ["EMTA", "Quarterly"] },
    { projectKey: "audit-ready", areaKey: "ops", name: "Client Audit Prep", emoji: "📑", tags: ["Internal"] },
  ],

  tasks: [
    {
      projectKey: "tax-vault",
      title: "Reconcile June statements for local tech clients",
      isCompleted: false,
      notes: "Verify all foreign currency transfers match daily ECB reference rates.",
      queueToday: true,
    },
    {
      projectKey: "audit-ready",
      title: "Archive physical expense receipts from last quarter",
      isCompleted: true,
      notes: "Stored safely in the primary storage cabinets.",
    },
  ],

  focusTimer: [
    { projectKey: "tax-vault",   taskTitle: "Ledger processing sprint",          durationMinutes: 50, daysAgo: 1 },
    { projectKey: "audit-ready", taskTitle: "Document auditing & compilation",   durationMinutes: 30, daysAgo: 2 },
  ],

  quickNotes: [
    {
      text: "Check EMTA server maintenance windows before running the monthly payroll batch",
      areaKeys: ["ops"],
      favorite: true,
      simulatedTime: "11:00",
    },
  ],

  habits: [
    { title: "Log client business expense receipts", areaKey: "ops", routine: "Evening", frequency: "daily", targetCount: 1, completedDays: "all" },
  ],

  network: [
    { name: "Kristiina (Tax Auditor)", groupLabel: "Partners", notes: "Ask about new cross-border VAT exemptions", birthday: "yesterday" },
  ],

  recurringResponsibilities: [
    { title: "Submit monthly payroll declarations", areaKey: "ops", intervalDays: 30, intervalLabel: "Monthly, every 10th" },
  ],
};
