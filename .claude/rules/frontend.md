# Frontend & Widget Rules

## Color System
- Sphere/area colors must use named palette keys (`"violet"`, `"emerald"`, `"sky"`, `"amber"`, `"rose"`, `"teal"`, `"pink"`, `"indigo"`).
- **CRITICAL:** Never hardcode color classes. Resolve them strictly via `areaColor(labelColor)` from `src/lib/areaColors.ts`.

## Widget Architecture
- All widgets live in `src/components/widgets/`.
- To register a widget, you must append an entry to `REGISTRY` in `src/components/DashboardGrid.tsx` specifying `label`, `component`, and `colSpan` (1 to 3).
- Every component must start with `"use client"`. No RSC logic allowed inside widgets.