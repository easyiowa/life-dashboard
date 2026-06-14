"use client";

import { useState, useEffect, useCallback } from "react";
import type { ComponentType } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { motion } from "framer-motion";

import SortableWidget from "@/components/SortableWidget";
import { useAuth } from "@/context/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

import TimeTrackerCard    from "@/components/widgets/TimeTrackerCard";
import DailyFocusQueueCard from "@/components/widgets/DailyFocusQueueCard";
import ProgressCard       from "@/components/widgets/ProgressCard";
import CalendarCard       from "@/components/widgets/CalendarCard";
import ProjectsCard       from "@/components/widgets/ProjectsCard";
import ActivityLogCard    from "@/components/widgets/ActivityLogCard";
import RecurringCard      from "@/components/widgets/RecurringCard";
import NetworkCard        from "@/components/widgets/NetworkCard";
import HabitTrackerCard   from "@/components/widgets/HabitTrackerCard";
import QuickNotesCard     from "@/components/widgets/QuickNotesCard";

// ── Widget registry ────────────────────────────────────────────────────────────
// To add a new widget: import its component above and add an entry here.
// It will automatically gain drag-and-drop support.

interface WidgetDef {
  label:     string;
  component: ComponentType;
  colSpan:   1 | 2 | 3;
}

const REGISTRY: Record<string, WidgetDef> = {
  "quick-notes":  { label: "Quick Notes",               component: QuickNotesCard,      colSpan: 1 },
  "daily-focus":  { label: "Daily Focus Queue",         component: DailyFocusQueueCard, colSpan: 2 },
  "time-tracker": { label: "Time Tracker",              component: TimeTrackerCard,     colSpan: 1 },
  "projects":     { label: "Projects & Tasks",          component: ProjectsCard,        colSpan: 2 },
  "activity-log": { label: "Activity Log",              component: ActivityLogCard,     colSpan: 1 },
  "progress":     { label: "Progress",                  component: ProgressCard,        colSpan: 2 },
  "calendar":     { label: "Calendar",                  component: CalendarCard,        colSpan: 3 },
  "habits":       { label: "Habit Tracker",             component: HabitTrackerCard,    colSpan: 3 },
  "recurring":    { label: "Recurring Responsibilities",component: RecurringCard,       colSpan: 3 },
  "network":      { label: "Network",                   component: NetworkCard,         colSpan: 3 },
};

// Default order produces a gap-free 3-column layout:
// Row 1: quick-notes(1) + daily-focus(2)  = 3
// Row 2: time-tracker(1) + projects(2)    = 3
// Row 3: activity-log(1) + progress(2)    = 3
// Rows 4–7: calendar, habits, recurring, network (each span 3)
const DEFAULT_ORDER = [
  "quick-notes", "daily-focus",
  "time-tracker", "projects",
  "activity-log", "progress",
  "calendar", "habits", "recurring", "network",
];

const LAYOUT_KEY = "ld_widget_layout";

// ── Drag overlay card ──────────────────────────────────────────────────────────

function OverlayCard({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-violet-500/40 bg-[#0F1629]/90 backdrop-blur-xl px-5 py-4 shadow-2xl ring-1 ring-violet-500/20 pointer-events-none">
      <p className="text-sm font-medium text-violet-300">{label}</p>
    </div>
  );
}

// ── Grid ───────────────────────────────────────────────────────────────────────

export default function DashboardGrid() {
  const { user } = useAuth();
  const [widgetIds, setWidgetIds] = useState<string[]>(DEFAULT_ORDER);
  const [activeId,  setActiveId]  = useState<string | null>(null);

  // Load saved layout: Supabase user metadata takes priority over localStorage.
  // Honor the explicit selection — do NOT append unselected widgets.
  useEffect(() => {
    const fromMeta    = user?.user_metadata?.widget_layout as string[] | undefined;
    const fromStorage = (() => {
      try { return JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? "null") as string[] | null; }
      catch { return null; }
    })();

    const saved = fromMeta ?? fromStorage;
    if (Array.isArray(saved) && saved.length > 0) {
      const valid = saved.filter(id => id in REGISTRY);
      setWidgetIds(valid.length > 0 ? valid : DEFAULT_ORDER);
    }
  }, [user]);

  // Real-time sync when SettingsModal changes the active widget set
  useEffect(() => {
    function onLayoutChanged(e: Event) {
      const newLayout = (e as CustomEvent<string[]>).detail;
      if (Array.isArray(newLayout)) {
        const valid = newLayout.filter(id => id in REGISTRY);
        setWidgetIds(valid.length > 0 ? valid : DEFAULT_ORDER);
      }
    }
    window.addEventListener("ld:widget-layout", onLayoutChanged);
    return () => window.removeEventListener("ld:widget-layout", onLayoutChanged);
  }, []);

  // Sensors: mouse (8px tolerance), touch (250ms hold + 5px tolerance), keyboard
  const sensors = useSensors(
    useSensor(MouseSensor,    { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,    { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
    // Haptic feedback on mobile devices that support it
    if (typeof navigator !== "undefined") navigator.vibrate?.(15);
  }, []);

  const onDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    setWidgetIds(prev => {
      const next = arrayMove(
        prev,
        prev.indexOf(active.id as string),
        prev.indexOf(over.id  as string),
      );

      // Persist locally (immediate) then to Supabase (background)
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
      if (isSupabaseConfigured && supabase && user) {
        supabase.auth
          .updateUser({ data: { widget_layout: next } })
          .catch(console.error);
      }

      return next;
    });
  }, [user]);

  const activeLabel = activeId ? REGISTRY[activeId]?.label ?? null : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToWindowEdges]}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
        {/* 1-col on mobile, 3-col on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {widgetIds.map(id => {
            const def = REGISTRY[id];
            if (!def) return null;
            const Widget = def.component;
            return (
              <SortableWidget key={id} id={id} colSpan={def.colSpan}>
                <Widget />
              </SortableWidget>
            );
          })}
        </div>
      </SortableContext>

      {/* Floating preview while dragging */}
      <DragOverlay modifiers={[restrictToWindowEdges]}>
        {activeLabel ? (
          <motion.div
            initial={{ scale: 0.97, opacity: 0.8 }}
            animate={{ scale: 1.03, opacity: 1 }}
            transition={{ duration: 0.1 }}
          >
            <OverlayCard label={activeLabel} />
          </motion.div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
