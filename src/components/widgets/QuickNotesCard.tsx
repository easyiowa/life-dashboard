"use client";

import { useState, useMemo, useEffect, type ReactNode } from "react";
import { NotebookPen, Trash2, X, Search, Zap, ChevronDown } from "lucide-react";
import { useDashboard, type QuickNote, type Sphere } from "@/context/DashboardContext";
import { areaColor } from "@/lib/areaColors";
import TaskModal from "@/components/TaskModal";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, horizontalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TODAY   = new Date().toLocaleDateString("en-CA");
const ALL_TAB = "__all__";

function fmtTime(createdAt: string): string {
  return createdAt.split(" ")[1] ?? "";
}

function fmtDateHeader(datePart: string): string {
  const [y, mo, d] = datePart.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function toTaskTitle(text: string): string {
  const first = text.split("\n")[0].trim();
  if (first.length <= 40) return first;
  const words = first.split(/\s+/).filter(Boolean);
  const slug  = words.slice(0, 3).join(" ");
  return (slug || "Review Note") + "...";
}

// ── Note row (today feed) ─────────────────────────────────────────────────────

function NoteRow({
  note,
  showArea,
  onDelete,
  onToggleImportant,
  onConvertToTask,
  sphereColor,
}: {
  note: QuickNote;
  showArea?: boolean;
  onDelete: () => void;
  onToggleImportant: () => void;
  onConvertToTask: () => void;
  sphereColor?: string;
}) {
  const ac = areaColor(sphereColor);
  return (
    <div className={`group flex flex-col gap-1 p-2.5 bg-white/[0.01] border-l-2 ${ac.borderLMuted} rounded-r-lg w-full transition-all duration-150 hover:bg-white/[0.03]`}>
      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
        {note.text}
      </p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600 tabular-nums">{fmtTime(note.createdAt)}</span>
          {showArea && note.sphere && (
            <>
              <span className="text-slate-700 text-[10px]">·</span>
              <span className={`text-[10px] ${ac.text}`}>{note.sphere}</span>
            </>
          )}
          {note.projectId && (
            <>
              <span className="text-slate-700 text-[10px]">·</span>
              <span className="text-[10px] text-slate-600">{note.projectId}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {/* Important toggle — always visible when flagged, hover-only when not */}
          <button
            onClick={onToggleImportant}
            title={note.isImportant ? "Unmark important" : "Mark as important"}
            className={`p-1 rounded-md transition-all text-[11px] leading-none ${
              note.isImportant
                ? "opacity-100 hover:bg-amber-500/10"
                : "opacity-0 group-hover:opacity-100 hover:bg-amber-500/10"
            }`}
          >
            🔥
          </button>
          {/* Convert to task */}
          <button
            onClick={onConvertToTask}
            title="Convert to task"
            className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-all"
          >
            <Zap className="w-2.5 h-2.5" />
            <span>Task</span>
          </button>
          {/* Delete */}
          <button
            onClick={onDelete}
            title="Delete note"
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Archive note item ─────────────────────────────────────────────────────────

function ArchiveNoteItem({
  note,
  spheres,
  onDelete,
  onToggleImportant,
  onConvertToTask,
}: {
  note: QuickNote;
  spheres: Sphere[];
  onDelete: () => void;
  onToggleImportant: () => void;
  onConvertToTask: () => void;
}) {
  const ac = areaColor(spheres.find((s) => s.name === note.sphere)?.labelColor);
  return (
    <div
      className={`group flex flex-col gap-1 p-2.5 bg-white/[0.01] border-l-2 ${ac.borderLMuted} rounded-r-lg transition-all hover:bg-white/[0.03]`}
    >
      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
        {note.text}
      </p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600 tabular-nums">{fmtTime(note.createdAt)}</span>
          {note.sphere && (
            <>
              <span className="text-slate-700 text-[10px]">·</span>
              <span className={`text-[10px] ${ac.text}`}>{note.sphere}</span>
            </>
          )}
          {note.projectId && (
            <>
              <span className="text-slate-700 text-[10px]">·</span>
              <span className="text-[10px] text-slate-600">{note.projectId}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onToggleImportant}
            title={note.isImportant ? "Unmark important" : "Mark as important"}
            className={`p-1 rounded-md transition-all text-[11px] leading-none ${
              note.isImportant
                ? "opacity-100 hover:bg-amber-500/10"
                : "opacity-0 group-hover:opacity-100 hover:bg-amber-500/10"
            }`}
          >
            🔥
          </button>
          <button
            onClick={onConvertToTask}
            title="Convert to task"
            className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-all"
          >
            <Zap className="w-2.5 h-2.5" />
            <span>Task</span>
          </button>
          <button
            onClick={onDelete}
            title="Delete note"
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Archive grouping & accordion ─────────────────────────────────────────────

interface NoteDayGroup {
  key: string;
  label: string;
  notes: QuickNote[];
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day  = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function dk(d: Date): string { return d.toLocaleDateString("en-CA"); }

function fmtMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function groupNotesByDay(notes: QuickNote[]): NoteDayGroup[] {
  const map = new Map<string, QuickNote[]>();
  for (const note of notes) {
    const key = note.createdAt.split(" ")[0];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(note);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, dayNotes]) => ({
      key,
      label: key === TODAY ? "Today" : fmtDateHeader(key),
      notes: dayNotes,
    }));
}

interface NoteBucket { id: string; label: string; days: NoteDayGroup[] }

function bucketNotes(notes: QuickNote[]): {
  currentWeek: NoteBucket;
  previousWeek: NoteBucket;
  monthlyArchive: NoteBucket[];
} {
  const today      = new Date();
  const thisMonday = getMonday(today);
  const thisSunday = addDays(thisMonday, 6);
  const prevMonday = addDays(thisMonday, -7);
  const prevSunday = addDays(thisMonday, -1);

  const allDays  = groupNotesByDay(notes);
  const curDays:  NoteDayGroup[] = [];
  const prevDays: NoteDayGroup[] = [];
  const archDays: NoteDayGroup[] = [];

  for (const g of allDays) {
    if      (g.key >= dk(thisMonday) && g.key <= dk(thisSunday)) curDays.push(g);
    else if (g.key >= dk(prevMonday) && g.key <= dk(prevSunday)) prevDays.push(g);
    else archDays.push(g);
  }

  const monthMap = new Map<string, NoteDayGroup[]>();
  for (const g of archDays) {
    const mk = g.key.slice(0, 7);
    if (!monthMap.has(mk)) monthMap.set(mk, []);
    monthMap.get(mk)!.push(g);
  }

  return {
    currentWeek:  { id: "cur",  label: "Current Week",  days: curDays },
    previousWeek: { id: "prev", label: "Previous Week", days: prevDays },
    monthlyArchive: Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([mk, days]) => ({ id: mk, label: fmtMonthKey(mk), days })),
  };
}

function NoteSectionNode({
  label, sublabel, isOpen, onToggle, children, accent = false,
}: {
  label: string; sublabel?: string; isOpen: boolean; onToggle: () => void;
  children: ReactNode; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border overflow-hidden ${
      accent ? "border-violet-500/20 bg-violet-600/[0.03]" : "border-white/[0.06] bg-white/[0.01]"
    }`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-4 py-2.5 transition-colors duration-150 ${
          accent ? "hover:bg-violet-600/[0.06]" : "hover:bg-white/[0.03]"
        }`}
      >
        <span className={`text-xs font-semibold flex-1 text-left ${accent ? "text-violet-200" : "text-slate-300"}`}>
          {label}
        </span>
        {sublabel && <span className="text-[10px] text-slate-500 tabular-nums">{sublabel}</span>}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-600 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isOpen ? "3000px" : "0px" }}
      >
        <div className="px-3 pb-3 pt-1 flex flex-col gap-1.5">
          {children}
        </div>
      </div>
    </div>
  );
}

function NoteDayAccordion({
  group, isOpen, onToggle, spheres, onDelete, onToggleImportant, onConvertToTask,
}: {
  group: NoteDayGroup;
  isOpen: boolean;
  onToggle: () => void;
  spheres: Sphere[];
  onDelete: (id: string) => void;
  onToggleImportant: (id: string) => void;
  onConvertToTask: (note: QuickNote) => void;
}) {
  return (
    <div className="rounded-lg border border-white/[0.04] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 bg-white/[0.02] hover:bg-white/[0.04] transition-colors duration-150"
      >
        <span className="text-[11px] font-semibold text-white flex-1 text-left">{group.label}</span>
        <span className="text-[10px] text-slate-500 tabular-nums">
          {group.notes.length} note{group.notes.length !== 1 ? "s" : ""}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-600 ml-1 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isOpen ? `${group.notes.length * 120 + 24}px` : "0px" }}
      >
        <div className="px-3 pt-1 pb-2 flex flex-col gap-1.5">
          {group.notes.map((note) => (
            <ArchiveNoteItem
              key={note.id}
              note={note}
              spheres={spheres}
              onDelete={() => onDelete(note.id)}
              onToggleImportant={() => onToggleImportant(note.id)}
              onConvertToTask={() => onConvertToTask(note)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Archive modal ─────────────────────────────────────────────────────────────

function ArchiveModal({
  notes,
  spheres,
  onClose,
  onDelete,
  onToggleImportant,
  onConvertToTask,
}: {
  notes: QuickNote[];
  spheres: Sphere[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleImportant: (id: string) => void;
  onConvertToTask: (note: QuickNote) => void;
}) {
  const [query,          setQuery]          = useState("");
  const [favoritesOnly,  setFavoritesOnly]  = useState(false);
  // Single dictionary for ALL accordion open states: section keys ("cur", "prev", month id) + day keys (date strings)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ cur: true, [TODAY]: true });

  const filtered = useMemo(() => {
    let list = notes;
    if (favoritesOnly) list = list.filter((n) => n.isImportant);
    const q = query.toLowerCase().trim();
    if (q) list = list.filter((n) => n.text.toLowerCase().includes(q));
    return list;
  }, [notes, query, favoritesOnly]);

  const buckets = useMemo(() => bucketNotes(filtered), [filtered]);

  const favoriteCount = notes.filter((n) => n.isImportant).length;

  const totalNotes = buckets.currentWeek.days.reduce((s, g) => s + g.notes.length, 0)
    + buckets.previousWeek.days.reduce((s, g) => s + g.notes.length, 0)
    + buckets.monthlyArchive.reduce((s, b) => s + b.days.reduce((ds, g) => ds + g.notes.length, 0), 0);

  // Every unique key that should be open when "Expand All" fires: section node ids + every day date string
  const allExpandKeys = useMemo(() => {
    const nodeKeys: string[] = [];
    if (buckets.currentWeek.days.length)  nodeKeys.push("cur");
    if (buckets.previousWeek.days.length) nodeKeys.push("prev");
    buckets.monthlyArchive.forEach((m) => nodeKeys.push(m.id));

    const dayKeys = [
      ...buckets.currentWeek.days,
      ...buckets.previousWeek.days,
      ...buckets.monthlyArchive.flatMap((m) => m.days),
    ].map((g) => g.key);

    return [...nodeKeys, ...dayKeys];
  }, [buckets]);

  const isAllExpanded = allExpandKeys.length > 0 && allExpandKeys.every((k) => !!expandedGroups[k]);

  function handleExpandCollapseAll() {
    if (isAllExpanded) {
      // Collapse all: wipe every key from the dictionary
      setExpandedGroups({});
    } else {
      // Expand all: mark every section node AND every day key as open
      setExpandedGroups(Object.fromEntries(allExpandKeys.map((k) => [k, true])));
    }
  }

  // Lock background scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#0F1629] border border-white/[0.08] rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2">
            <NotebookPen className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-white">Notes Archive</h2>
            <span className="text-[10px] text-slate-500 tabular-nums">{notes.length} total</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search + filters */}
        <div className="px-5 py-3 border-b border-white/[0.05] flex-shrink-0 flex flex-col gap-2">
          <div className="flex items-center gap-2 h-8 px-3 rounded-lg bg-white/[0.04] border border-white/[0.07] focus-within:border-purple-500/50 transition-colors">
            <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes…"
              className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-600 outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {/* Favorites filter + expand/collapse all */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setFavoritesOnly((v) => !v)}
              className={`flex items-center gap-1.5 px-3 h-6 rounded-full text-[11px] font-medium border transition-all duration-150 ${
                favoritesOnly
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]"
              }`}
            >
              🔥 Favorites{favoriteCount > 0 && <span className="tabular-nums">({favoriteCount})</span>}
            </button>
            {totalNotes > 0 && (
              <button
                type="button"
                onClick={handleExpandCollapseAll}
                className="text-[11px] font-normal text-violet-400/70 hover:text-violet-300 transition-colors"
              >
                {isAllExpanded ? "▲ Collapse All" : "▼ Expand All"}
              </button>
            )}
          </div>
        </div>

        {/* Outer scroll window — owns overflow clipping, no flex-col */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
        {/* Inner layout box — owns flex-col spacing, no overflow */}
        <div className="px-5 pt-3 pb-4 flex flex-col gap-2">
          {totalNotes === 0 ? (
            <p className="text-xs text-slate-600 text-center py-8">
              {favoritesOnly ? "No favorites yet — mark notes with 🔥 to save them here." : query ? "No notes match your search." : "No notes captured yet."}
            </p>
          ) : (
            <>
              {/* Current week */}
              {buckets.currentWeek.days.length > 0 && (
                <NoteSectionNode
                  label={buckets.currentWeek.label}
                  sublabel={`${buckets.currentWeek.days.reduce((s, g) => s + g.notes.length, 0)} notes`}
                  isOpen={!!expandedGroups["cur"]}
                  onToggle={() => setExpandedGroups((p) => ({ ...p, cur: !p["cur"] }))}
                  accent
                >
                  {buckets.currentWeek.days.map((g) => (
                    <NoteDayAccordion
                      key={g.key}
                      group={g}
                      isOpen={!!expandedGroups[g.key]}
                      onToggle={() => setExpandedGroups((p) => ({ ...p, [g.key]: !p[g.key] }))}
                      spheres={spheres}
                      onDelete={onDelete}
                      onToggleImportant={onToggleImportant}
                      onConvertToTask={onConvertToTask}
                    />
                  ))}
                </NoteSectionNode>
              )}

              {/* Previous week */}
              {buckets.previousWeek.days.length > 0 && (
                <NoteSectionNode
                  label={buckets.previousWeek.label}
                  sublabel={`${buckets.previousWeek.days.reduce((s, g) => s + g.notes.length, 0)} notes`}
                  isOpen={!!expandedGroups["prev"]}
                  onToggle={() => setExpandedGroups((p) => ({ ...p, prev: !p["prev"] }))}
                >
                  {buckets.previousWeek.days.map((g) => (
                    <NoteDayAccordion
                      key={g.key}
                      group={g}
                      isOpen={!!expandedGroups[g.key]}
                      onToggle={() => setExpandedGroups((p) => ({ ...p, [g.key]: !p[g.key] }))}
                      spheres={spheres}
                      onDelete={onDelete}
                      onToggleImportant={onToggleImportant}
                      onConvertToTask={onConvertToTask}
                    />
                  ))}
                </NoteSectionNode>
              )}

              {/* Monthly archive */}
              {buckets.monthlyArchive.map((month) => (
                <NoteSectionNode
                  key={month.id}
                  label={month.label}
                  sublabel={`${month.days.reduce((s, g) => s + g.notes.length, 0)} notes`}
                  isOpen={!!expandedGroups[month.id]}
                  onToggle={() => setExpandedGroups((p) => ({ ...p, [month.id]: !p[month.id] }))}
                >
                  {month.days.map((g) => (
                    <NoteDayAccordion
                      key={g.key}
                      group={g}
                      isOpen={!!expandedGroups[g.key]}
                      onToggle={() => setExpandedGroups((p) => ({ ...p, [g.key]: !p[g.key] }))}
                      spheres={spheres}
                      onDelete={onDelete}
                      onToggleImportant={onToggleImportant}
                      onConvertToTask={onConvertToTask}
                    />
                  ))}
                </NoteSectionNode>
              ))}
            </>
          )}
        </div>{/* end inner layout box */}
        </div>{/* end outer scroll window */}
      </div>
    </div>
  );
}

// ── Sortable sphere pill ──────────────────────────────────────────────────────

function SortablePill({
  sphere, isActive, onClick,
}: { sphere: Sphere; isActive: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sphere.id });
  const pill = areaColor(sphere.labelColor);
  return (
    <button
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`px-3 h-7 rounded-full text-xs font-medium border transition-all duration-150 cursor-grab active:cursor-grabbing select-none touch-none ${
        isActive ? pill.pillActive : pill.pillInactive
      }`}
    >
      {sphere.name}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export default function QuickNotesCard() {
  const {
    spheres, projects, quickNotes,
    addQuickNote, deleteQuickNote, toggleQuickNoteImportant,
  } = useDashboard();

  // Persisted sphere ordering — saved to localStorage so custom order survives refresh
  const [sphereOrder, setSphereOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("qn-sphere-order");
      if (saved) return [...new Set(JSON.parse(saved) as string[])]; // deduplicate stale IDs
    } catch { /* */ }
    return [...new Set(spheres.map((s) => s.id))];
  });

  // Active tab initialises to 'Private' sphere, falling back to first sphere in persisted order
  const [activeSphereId, setActiveSphereId] = useState<string>(() => {
    const privateId = spheres.find((s) => s.name === "Private")?.id;
    if (privateId) return privateId;
    try {
      const saved = localStorage.getItem("qn-sphere-order");
      if (saved) {
        const order = JSON.parse(saved) as string[];
        if (order.length > 0) return order[0];
      }
    } catch { /* */ }
    return spheres[0]?.id ?? ALL_TAB;
  });

  const [text,              setText]              = useState("");
  const [projectId,         setProjectId]         = useState("");
  const [showAllNotesModal, setShowAllNotesModal] = useState(false);

  // Task conversion modal state
  const [taskModalOpen,     setTaskModalOpen]     = useState(false);
  const [taskModalDefaults, setTaskModalDefaults] = useState<{ title: string; notes: string; sphere: string }>({ title: "", notes: "", sphere: "" });

  // Stable ordered sphere list — persisted order + any newly added spheres appended, deduped by id
  const orderedSpheres = useMemo(() => {
    const ordered = sphereOrder
      .map((id) => spheres.find((s) => s.id === id))
      .filter(Boolean) as Sphere[];
    const added = spheres.filter((s) => !sphereOrder.includes(s.id));
    const seen = new Set<string>();
    return [...ordered, ...added].filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [spheres, sphereOrder]);

  // Drag sensor: require 5px of movement before activating drag so clicks still fire normally
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSphereOrder((prev) => {
      const from = prev.indexOf(String(active.id));
      const to   = prev.indexOf(String(over.id));
      const next = arrayMove(prev, from, to);
      try { localStorage.setItem("qn-sphere-order", JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  }

  const isAll = activeSphereId === ALL_TAB;

  const activeSphereObj = isAll ? undefined : (spheres.find((s) => s.id === activeSphereId) ?? spheres[0]);
  const activeSphere    = activeSphereObj?.name ?? "";
  const sphereProjects  = isAll ? [] : projects.filter((p) => p.sphere === activeSphere);

  // Notes shown in the main feed — favorites always float to the top
  const todayNotes: QuickNote[] = (
    isAll
      ? quickNotes.filter((n) => n.createdAt.startsWith(TODAY))
      : quickNotes.filter((n) => n.sphere === activeSphere && n.createdAt.startsWith(TODAY))
  ).slice().sort((a, b) => Number(b.isImportant) - Number(a.isImportant));

  function handleConvertToTask(note: QuickNote) {
    setTaskModalDefaults({
      title:  toTaskTitle(note.text),
      notes:  note.text,
      sphere: note.sphere,
    });
    setTaskModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isAll) return;
    addQuickNote(trimmed, activeSphere, projectId || undefined);
    setText("");
    setProjectId("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <>
      {showAllNotesModal && (
        <ArchiveModal
          notes={quickNotes}
          spheres={spheres}
          onClose={() => setShowAllNotesModal(false)}
          onDelete={deleteQuickNote}
          onToggleImportant={toggleQuickNoteImportant}
          onConvertToTask={(note) => { setShowAllNotesModal(false); handleConvertToTask(note); }}
        />
      )}

      <TaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        defaultSphere={taskModalDefaults.sphere}
        defaultTitle={taskModalDefaults.title}
        defaultNotes={taskModalDefaults.notes}
      />

      <div className="w-full rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5 flex flex-col h-full min-h-[340px]">

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <NotebookPen className="w-4 h-4 text-purple-400" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Quick Notes
            </h2>
          </div>
          <button
            onClick={() => setShowAllNotesModal(true)}
            className="text-[11px] font-normal text-violet-400/70 hover:text-violet-300 hover:underline transition-colors whitespace-nowrap"
          >
            View Archive →
          </button>
        </div>

        {/* Area tabs — drag to reorder, order persisted to localStorage */}
        <div className="flex items-center gap-2 flex-wrap mt-4 flex-shrink-0">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedSpheres.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
              {orderedSpheres.map((sphere) => (
                <SortablePill
                  key={sphere.id}
                  sphere={sphere}
                  isActive={activeSphereObj?.id === sphere.id}
                  onClick={() => { setActiveSphereId(sphere.id); setProjectId(""); }}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* All tab — always at the far right */}
          <button
            type="button"
            onClick={() => { setActiveSphereId(ALL_TAB); setProjectId(""); }}
            className={`px-3 h-7 rounded-full text-xs font-medium border transition-all duration-150 ${
              isAll
                ? "bg-violet-600 text-white border-transparent shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                : "bg-white/[0.04] border-white/[0.05] text-slate-400 hover:text-slate-300 hover:bg-white/[0.07]"
            }`}
          >
            All
          </button>
        </div>

        {/* Capture form — hidden when "All" is active */}
        {isAll ? (
          <p className="mt-4 text-[11px] text-slate-600 flex-shrink-0">Select an area above to add a note.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-4 flex-shrink-0">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Capture an idea before it slips away…"
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder:text-slate-600 outline-none focus:border-purple-500/50 focus:bg-white/[0.06] transition-colors resize-none"
            />
            <div className="flex items-center gap-2">
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="flex-1 h-8 px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-xs text-slate-400 outline-none focus:border-purple-500/40 transition-colors appearance-none cursor-pointer"
              >
                <option value="" className="bg-[#0F1629]">No project</option>
                {sphereProjects.map((p) => (
                  <option key={p.id} value={p.name} className="bg-[#0F1629]">{p.name}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!text.trim()}
                className="px-4 h-8 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-white font-medium transition-all flex-shrink-0"
              >
                Save
              </button>
            </div>
            <p className="text-[10px] text-slate-700">⌘ + Enter to save quickly</p>
          </form>
        )}

        {/* Notes feed */}
        <div className="flex-1 overflow-y-auto mt-3 flex flex-col gap-1.5 pr-1 min-h-0">
          {todayNotes.length === 0 ? (
            <p className="text-xs text-slate-700 text-center py-4">
              {isAll ? "No notes today across any area." : `No notes today for ${activeSphere}.`}
            </p>
          ) : (
            todayNotes.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                showArea={isAll}
                onDelete={() => deleteQuickNote(note.id)}
                onToggleImportant={() => toggleQuickNoteImportant(note.id)}
                onConvertToTask={() => handleConvertToTask(note)}
                sphereColor={spheres.find((s) => s.name === note.sphere)?.labelColor}
              />
            ))
          )}
        </div>

      </div>
    </>
  );
}
