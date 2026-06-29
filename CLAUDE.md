# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **AGENTS.md is also active** — read it too. It warns that this is Next.js 16 with breaking changes from prior versions.

---

## Commands

```bash
npm run dev        # start dev server on :3000
npm run build      # production build
npm run lint       # ESLint (eslint.config.mjs, Next.js ruleset)
npx tsc --noEmit   # type-check without emitting (no test runner exists)
supabase db push   # apply pending migrations to Supabase cloud
```

There are no unit tests. Type-checking (`npx tsc --noEmit`) is the primary correctness gate.

---

## Stack

- **Next.js 16** / **React 19** / **TypeScript** — App Router, all components are `"use client"` (no RSC logic in widgets)
- **Tailwind v4** — PostCSS plugin; `@tailwindcss/postcss` not `tailwindcss` in PostCSS config
- **Supabase** (`@supabase/ssr`) — auth + Postgres; client singleton at `src/lib/supabase.ts` (returns `null` when env vars absent, enabling local dev without Supabase)
- **@dnd-kit** — drag-and-drop for the widget grid
- **lucide-react v1.16** — icons; import names may differ from older versions

---

## Architecture

### Provider stack (outermost → innermost, defined in `src/app/layout.tsx`)

```
ThemeProvider → AuthProvider → AuthGate → PasscodeLock → DashboardProvider → PWAInstallerProvider
```

`DashboardProvider` only mounts after `AuthGate` confirms `is_onboarded: true`. This ordering is load-bearing — components inside `DashboardProvider` can always assume a valid user session and a hydrated state.

### Central state: `DashboardContext`

`src/context/DashboardContext.tsx` (~1800 lines) is the entire app's state store. It uses `useReducer` for synchronous optimistic updates, then fires Supabase mutations as fire-and-forget `.then(() => {})` calls. Pattern:

```ts
dispatch({ type: "ADD_TASK", task, _id });
if (db && uid) db.from("tasks").insert({ ... }).then(() => {});
```

On load, `loadDashboardData()` fetches all tables in one `Promise.all`, then dispatches `HYDRATE` — which **replaces** the entire state (not appended). Running `HYDRATE` twice is idempotent.

**React 18 StrictMode is active** (Next.js App Router default). Effects run twice in development. Use `useRef` guards for any one-shot effect (e.g., seeding, initializing a fetch), not local variables.

### Widgets

All widgets live in `src/components/widgets/`. To register a new widget:
1. Create `src/components/widgets/MyWidget.tsx`
2. Add an entry to `REGISTRY` in `src/components/DashboardGrid.tsx` with `label`, `component`, and `colSpan` (1 | 2 | 3)

The widget ID string in `REGISTRY` is the canonical identifier used in `widget_layout` user metadata, localStorage, and onboarding templates.

### Color system

Sphere/area colors are stored as named palette keys (`"violet"`, `"emerald"`, `"sky"`, `"amber"`, `"rose"`, `"teal"`, `"blue"`, `"orange"`, `"pink"`, `"indigo"`). Resolve to Tailwind class sets via `areaColor(labelColor)` from `src/lib/areaColors.ts`. Never hardcode color classes — always go through `AREA_COLORS`.

### Theming (light / dark)

Custom `ThemeContext` (`src/context/ThemeContext.tsx`) — **not** next-themes. Reads/writes `localStorage` key `ld_theme_mode` and toggles a class on `<html>`. A blocking inline script in `layout.tsx` applies the stored class before hydration to prevent FOUC. Theme-aware components check `mode === "light"` from `useTheme()`.

### Onboarding flow

`OnboardingFlow` (4 steps) → calls `onStartLoader(config: LoaderConfig)` → `AuthGate` mounts `OnboardingLoader` as a fixed overlay at `z-[60]`. The loader is intentionally **outside** `OnboardingFlow` so it survives the component unmount that happens when `is_onboarded` flips to `true`. Sequence:

1. `seedFn()` runs (data seeding, see below)
2. Loader animation completes → calls `onDone()`
3. `AuthGate.handleLoaderDone()`: calls `completeFn()` (sets `is_onboarded: true`), waits 500 ms for dashboard to paint, then fades out the loader

### Seeder (`src/services/onboardingSeeder.ts`)

Strictly sequential `await` chain — no transactions. All IDs are generated client-side with `crypto.randomUUID()` and passed explicitly into inserts (avoids round-trip reads). Seeded rows are tagged `is_sample: true` for cleanup by `deleteAllSampleData`.

**Industry templates** (`src/config/industry-templates/`) are declarative objects using local `areaKey`/`projectKey` references. The seeder resolves these into live UUIDs. When adding a template:
- Every `areaKey` referenced in `recurringResponsibilities` and `tasks`/`focusTimer` **must** be defined in that template's `areas` array — the seeder throws otherwise, aborting the template
- `quickNotes.areaKeys` and `habits.areaKey` are tolerant (fall back to `null` sphere)
- `network.groupLabel` strings are created on demand in `relationship_groups`

`seedSelectedTemplates` catches per-template errors with `console.error` and continues — failures are silent to the user.

### Database migrations

Migrations live in `supabase/migrations/`. Apply with `supabase db push`. The init migration (`20260613000000_init.sql`) documents every table's TypeScript mapping in comments. The `is_sample` column was added to most tables in `20260627000000_dudu_assistant.sql`.

### Agent server (`agent-server/`)

A local Node.js server that supports the Dudu/Benicio AI assistant feature. Actions it queues are written to the `agent_actions_queue` Supabase table and polled by the frontend via `GET /api/agent-pending`. The bot reads live context directly from Supabase on every turn — no local snapshot file is used. `agent-server/BENICIO.md` defines the AI assistant persona.

---

## Key conventions

- **Sphere names are denormalized** into tasks, sessions, and quick notes as plain strings (not FK IDs) for display convenience. The canonical source is the `spheres` table.
- **`stateRef`** in `DashboardContext` mirrors the current state for use inside closures/callbacks that would otherwise capture stale state. Always read from `stateRef.current` inside async handlers.
- **`is_onboarded`** lives in Supabase Auth `user_metadata`, not in a DB table. Check `user.user_metadata?.is_onboarded`.
- Widget layout order is persisted in Auth `user_metadata.widget_layout` (array of widget IDs) and also in `localStorage` key `ld_widget_layout`.
- The Supabase client (`src/lib/supabase.ts`) can be `null` — always guard `if (db && uid)` before any DB call.
