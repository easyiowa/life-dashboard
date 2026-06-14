"use client";

import { useState, useEffect, useCallback } from "react";
import type { ComponentType } from "react";
import {
  X, GripVertical, LayoutGrid, Plus,
  CalendarDays, Flame, FolderKanban, Timer, NotebookPen,
  Target, Activity, TrendingUp, RefreshCw, Users,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";

// ── Widget metadata ────────────────────────────────────────────────────────────
// colSpan mirrors DashboardGrid REGISTRY — must stay in sync.

interface WidgetMeta {
  label:   string;
  colSpan: 1 | 2 | 3;
  Icon:    ComponentType<{ className?: string }>;
}

const WIDGET_META: Record<string, WidgetMeta> = {
  "calendar":     { label: "Calendar",     colSpan: 3, Icon: CalendarDays },
  "habits":       { label: "Habits",       colSpan: 3, Icon: Flame        },
  "projects":     { label: "Projects",     colSpan: 2, Icon: FolderKanban },
  "time-tracker": { label: "Focus Timer",  colSpan: 1, Icon: Timer        },
  "quick-notes":  { label: "Quick Notes",  colSpan: 1, Icon: NotebookPen  },
  "daily-focus":  { label: "Daily Focus",  colSpan: 2, Icon: Target       },
  "activity-log": { label: "Activity Log", colSpan: 1, Icon: Activity     },
  "progress":     { label: "Progress",     colSpan: 2, Icon: TrendingUp   },
  "recurring":    { label: "Recurring",    colSpan: 3, Icon: RefreshCw    },
  "network":      { label: "Network",      colSpan: 3, Icon: Users        },
};

// Tailwind col-span classes must be explicit strings (no template literals)
const SPAN_CLS: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
};

// ── Row packer ─────────────────────────────────────────────────────────────────
// Greedy bin-fill: pack widget IDs into rows that sum to ≤ 3 columns.
// Each row slot is either a widget or an empty placeholder.

type WidgetSlot = { type: "widget"; id: string; colSpan: 1 | 2 | 3 };
type EmptySlot  = { type: "empty";  cols: number; anchorId: string }; // anchorId = last widget ID in row
type RowSlot    = WidgetSlot | EmptySlot;

function packRows(ids: string[]): RowSlot[][] {
  const rows: RowSlot[][] = [];
  let row: RowSlot[]  = [];
  let rowSum = 0;
  let lastId = "";

  for (const id of ids) {
    const span = WIDGET_META[id]?.colSpan ?? 1;
    if (rowSum + span > 3) {
      if (rowSum < 3) row.push({ type: "empty", cols: 3 - rowSum, anchorId: lastId });
      rows.push(row);
      row = [];
      rowSum = 0;
    }
    row.push({ type: "widget", id, colSpan: span });
    rowSum += span;
    lastId = id;
  }

  if (row.length > 0) {
    if (rowSum < 3) row.push({ type: "empty", cols: 3 - rowSum, anchorId: lastId });
    rows.push(row);
  }

  return rows;
}

// ── Sortable widget card ───────────────────────────────────────────────────────

function BlueprintCard({ id, colSpan }: { id: string; colSpan: 1 | 2 | 3 }) {
  const meta = WIDGET_META[id];
  const Icon = meta?.Icon;

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${SPAN_CLS[colSpan]} flex items-center gap-2.5 px-3 py-3 rounded-xl border select-none transition-all duration-150 ${
        isDragging
          ? "opacity-25 border-white/[0.05] bg-transparent"
          : "bg-[#0F1629] border-white/[0.09] hover:border-violet-500/40 hover:bg-[#131929]"
      }`}
    >
      {/* Drag handle — only activates drag; rest of card stays click-safe */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="shrink-0 text-slate-700 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none transition-colors"
      >
        <GripVertical className="w-3 h-3" />
      </div>

      {/* System icon (no emoji) */}
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0 text-slate-500" />}

      {/* Label */}
      <span className="text-xs font-medium text-slate-300 truncate flex-1 leading-none">
        {meta?.label ?? id}
      </span>

      {/* Column-span badge */}
      <span className="shrink-0 text-[9px] text-slate-700 font-mono leading-none">
        {colSpan}×
      </span>
    </div>
  );
}

// ── Empty slot placeholder ─────────────────────────────────────────────────────
// useDroppable makes it a valid drop target in the DnD context.

function EmptySlot({ id, cols }: { id: string; cols: number }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`${SPAN_CLS[cols as 1 | 2 | 3]} h-[46px] rounded-xl border border-dashed flex items-center justify-center gap-1.5 transition-all duration-150 ${
        isOver
          ? "border-violet-500/50 bg-violet-500/[0.07] text-violet-400"
          : "border-white/[0.10] text-slate-700"
      }`}
    >
      <Plus className="w-3 h-3" />
      <span className="text-[10px] font-medium">Empty Slot</span>
    </div>
  );
}

// ── Floating overlay card (shown under cursor while dragging) ─────────────────

function OverlayCard({ id }: { id: string }) {
  const meta = WIDGET_META[id];
  const Icon = meta?.Icon;
  return (
    <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl border border-violet-500/55 bg-[#0F1629]/95 backdrop-blur-xl shadow-2xl ring-1 ring-violet-500/25 pointer-events-none">
      <GripVertical className="w-3 h-3 text-slate-600 shrink-0" />
      {Icon && <Icon className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
      <span className="text-xs font-medium text-violet-300">{meta?.label ?? id}</span>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────

interface Props {
  isOpen:       boolean;
  onClose:      () => void;
  initialOrder: string[];
  onApply:      (newOrder: string[]) => void;
}

export default function DashboardBlueprintModal({ isOpen, onClose, initialOrder, onApply }: Props) {
  const [items,    setItems]    = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setItems(initialOrder.filter(id => id in WIDGET_META));
    }
  }, [isOpen, initialOrder]);

  const sensors = useSensors(
    useSensor(MouseSensor,    { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,    { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
    if (typeof navigator !== "undefined") navigator.vibrate?.(10);
  }, []);

  const onDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const overId    = over.id as string;
    const activeIdx = items.indexOf(active.id as string);

    if (overId.startsWith("slot-")) {
      // Dropped onto an empty slot — move widget to directly after the slot's anchor widget
      const anchorId  = overId.slice("slot-".length);
      const anchorIdx = items.indexOf(anchorId);
      if (anchorIdx === -1 || activeIdx === -1) return;

      setItems(prev => {
        const next = [...prev];
        next.splice(activeIdx, 1);
        // Insert right after anchor; account for the removal shifting the index
        const insertAt = activeIdx < anchorIdx ? anchorIdx : anchorIdx + 1;
        next.splice(insertAt, 0, active.id as string);
        return next;
      });
    } else {
      // Dropped onto another widget — standard swap
      const overIdx = items.indexOf(overId);
      if (overIdx === -1) return;
      setItems(prev => arrayMove(prev, activeIdx, overIdx));
    }
  }, [items]);

  function handleApply() {
    onApply(items);
    onClose();
  }

  if (!isOpen) return null;

  const rows = packRows(items);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Wider panel so the 3-col layout has breathing room */}
      <div className="relative w-full max-w-lg bg-[#0B0F19] border border-white/[0.09] rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
          <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
            <LayoutGrid className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white leading-none">Blueprint Mode</h2>
            <p className="text-[10px] text-slate-600 mt-0.5">
              Drag blocks to reorder · dashed slots show available column space
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Legend ──────────────────────────────────────────────── */}
        <div className="px-5 pt-3.5 pb-1 flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-3 rounded-sm bg-white/[0.08] border border-white/[0.10]" />
            <span className="text-[9px] text-slate-600">⅓ col</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-10 h-3 rounded-sm bg-white/[0.08] border border-white/[0.10]" />
            <span className="text-[9px] text-slate-600">⅔ col</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-14 h-3 rounded-sm bg-white/[0.08] border border-white/[0.10]" />
            <span className="text-[9px] text-slate-600">full row</span>
          </div>
          <span className="ml-auto text-[9px] text-slate-700">
            {items.length} widget{items.length !== 1 ? "s" : ""} · {rows.length} row{rows.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Sortable blueprint canvas ────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToWindowEdges]}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {rows.map((row, rowIdx) => (
                  <div key={rowIdx} className="grid grid-cols-3 gap-2">
                    {row.map((slot, slotIdx) =>
                      slot.type === "widget" ? (
                        <BlueprintCard
                          key={slot.id}
                          id={slot.id}
                          colSpan={slot.colSpan}
                        />
                      ) : (
                        <EmptySlot
                          key={`empty-${rowIdx}-${slotIdx}`}
                          id={`slot-${slot.anchorId}`}
                          cols={slot.cols}
                        />
                      )
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>

            <DragOverlay modifiers={[restrictToWindowEdges]}>
              {activeId ? <OverlayCard id={activeId} /> : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-white/[0.08] text-sm font-medium text-slate-400 hover:text-slate-300 hover:bg-white/[0.05] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 h-10 rounded-xl text-sm font-semibold text-white transition-all shadow-[0_0_20px_rgba(139,92,246,0.35)]"
            style={{ background: "linear-gradient(to right, #8B5CF6, #7C3AED)" }}
          >
            Apply Layout
          </button>
        </div>

      </div>
    </div>
  );
}
