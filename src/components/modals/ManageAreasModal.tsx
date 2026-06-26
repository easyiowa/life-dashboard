"use client";

import { useState } from "react";
import { X, Settings2, Plus, Trash2, GripVertical } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDashboard, type Sphere } from "@/context/DashboardContext";
import { areaColor } from "@/lib/areaColors";
import { useModalOverlay } from "@/hooks/useModalOverlay";

// ── Color palette ─────────────────────────────────────────────────────────────
// Swatch-picker dot colors only — the row's own background tint comes from areaColor()
// below (same bg-{color}-500/10 + border-{color}-500/25 language as the category pills),
// so the two stay in lockstep without a second hand-maintained color map.

const COLOR_PALETTE: { value: string; dot: string }[] = [
  { value: "emerald", dot: "bg-emerald-500" },
  { value: "violet",  dot: "bg-violet-500"  },
  { value: "sky",     dot: "bg-sky-500"     },
  { value: "amber",   dot: "bg-amber-500"   },
  { value: "pink",    dot: "bg-pink-500"    },
  { value: "teal",    dot: "bg-teal-500"    },
  { value: "blue",    dot: "bg-blue-500"    },
  { value: "rose",    dot: "bg-rose-500"    },
  { value: "orange",  dot: "bg-orange-500"  },
  { value: "indigo",  dot: "bg-indigo-500"  },
];

// ── Sortable area row ──────────────────────────────────────────────────────────

function SortableAreaRow({ sphere, canDelete }: { sphere: Sphere; canDelete: boolean }) {
  const { updateSphere, deleteSphere } = useDashboard();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sphere.id });

  const [name,    setName]    = useState(sphere.name);
  const [color,   setColor]   = useState(sphere.labelColor);
  const [confirm, setConfirm] = useState(false);

  const isDirty = name !== sphere.name || color !== sphere.labelColor;

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    updateSphere(sphere.id, { name: trimmed, labelColor: color });
  }

  const style = { transform: CSS.Transform.toString(transform), transition };
  const ac = areaColor(color);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border p-3 flex flex-col gap-2 transition-all duration-150 ${
        isDragging
          ? "shadow-2xl border-purple-500/30 bg-white/[0.04] scale-[1.01] z-50 opacity-80"
          : `${ac.bgTint} ${ac.border}`
      }`}
    >
      {confirm ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-300">
            Delete <span className="text-white font-medium">&quot;{sphere.name}&quot;</span>? All tasks will be reassigned to the first area.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirm(false)}
              className="flex-1 h-7 rounded-lg border border-white/[0.07] bg-white/[0.03] text-xs text-slate-400 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => { deleteSphere(sphere.id); setConfirm(false); }}
              className="flex-1 h-7 rounded-lg bg-red-600 hover:bg-red-500 text-xs text-white font-medium transition-all"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="flex-shrink-0 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing transition-colors touch-none"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          {/* Name input — the row's own tinted background now carries the color, no separate dot */}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 min-w-0 h-8 px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 transition-colors"
          />
          {/* Save */}
          {isDirty && (
            <button
              onClick={save}
              className="px-2.5 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs text-white font-medium transition-all flex-shrink-0"
            >
              Save
            </button>
          )}
          {/* Delete */}
          <button
            onClick={() => setConfirm(true)}
            disabled={!canDelete}
            className="w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title={!canDelete ? "Cannot delete last area" : "Delete area"}
          >
            <Trash2 className="w-3 h-3" />
          </button>
          {/* Color picker — indented to align under name */}
          <div className="hidden" />
        </div>
      )}
      {!confirm && (
        <div className="flex gap-1.5 pl-6">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={`w-4 h-4 rounded-full ${c.dot} transition-all ${
                color === c.value ? "ring-2 ring-white/60 ring-offset-1 ring-offset-[#0F1629]" : "opacity-50 hover:opacity-100"
              }`}
              title={c.value}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageAreasModal({ isOpen, onClose }: Props) {
  useModalOverlay(isOpen);
  const { spheres, addSphere, reorderSpheres } = useDashboard();

  const [newName,  setNewName]  = useState("");
  const [newColor, setNewColor] = useState("blue");
  const [newErr,   setNewErr]   = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = spheres.findIndex((s) => s.id === active.id);
    const to   = spheres.findIndex((s) => s.id === over.id);
    if (from !== -1 && to !== -1) reorderSpheres(from, to);
  }

  function handleAdd() {
    if (!newName.trim()) { setNewErr(true); return; }
    addSphere(newName.trim(), newColor);
    setNewName("");
    setNewColor("blue");
    setNewErr(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0F1629] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-[#0F1629] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Manage Areas</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto overflow-x-hidden">

          {/* Sortable area list */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={spheres.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {spheres.map((s) => (
                  <SortableAreaRow key={s.id} sphere={s} canDelete={spheres.length > 1} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Divider */}
          <div className="border-t border-white/[0.05]" />

          {/* Add new area */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">New Area</p>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${COLOR_PALETTE.find(c => c.value === newColor)?.dot ?? "bg-slate-500"}`} />
              <input
                type="text"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setNewErr(false); }}
                placeholder="Area name…"
                className={`flex-1 h-9 px-3 rounded-xl bg-white/[0.04] border text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 transition-colors ${
                  newErr ? "border-red-500/60" : "border-white/[0.07]"
                }`}
              />
              <button
                onClick={handleAdd}
                className="px-3 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs text-white font-medium transition-all flex-shrink-0 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> <span className="hidden md:inline">Add</span>
              </button>
            </div>
            {newErr && <p className="text-[10px] text-red-400 -mt-1">Name is required.</p>}
            <div className="flex gap-1.5">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setNewColor(c.value)}
                  className={`w-4 h-4 rounded-full ${c.dot} transition-all ${
                    newColor === c.value ? "ring-2 ring-white/60 ring-offset-1 ring-offset-[#0F1629]" : "opacity-50 hover:opacity-100"
                  }`}
                  title={c.value}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
