# Project Memory & Learned Lessons

> AI Instruction: Read this file to prevent repeating past engineering errors. When a new error occurs and is fixed, update this file with a 1-line lesson learned ONLY after asking for human confirmation.

## Active Lessons Learned
- [State Management] Always read from `stateRef.current` inside async handlers in `DashboardContext` to avoid stale closures.
- [React 19 / StrictMode] Effects run twice in development; use `useRef` flags to protect data seeding and fetch initializations from double-invoking.
- [Onboarding Seeder] Every `areaKey` referenced in template objects *must* exist inside that template's `areas` array, or the seeder will abort.
- [Supabase client] The Supabase singleton can return `null` if env vars are missing. Always use `if (db && uid)` guard blocks before any query.