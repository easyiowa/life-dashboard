"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { NotebookPen, Trash2, X, Search, Zap, Pencil, MoreVertical } from "lucide-react";
import { useDashboard, type QuickNote, type Sphere } from "@/context/DashboardContext";
import ManageAreasModal from "@/components/modals/ManageAreasModal";
import ChecklistEditor, { type ChecklistEditorHandle } from "@/components/ui/ChecklistEditor";
import ScrollFadeContainer from "@/components/ui/ScrollFadeContainer";
import SwipeToDeleteRow from "@/components/ui/SwipeToDeleteRow";
import { areaColor } from "@/lib/areaColors";
import { stripHtml, makeChecklistToggleHandler } from "@/lib/richText";
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
  onUpdateText,
  onEdit,
  sphereColor,
}: {
  note: QuickNote;
  showArea?: boolean;
  onDelete: () => void;
  onToggleImportant: () => void;
  onConvertToTask: () => void;
  onUpdateText: (id: string, text: string) => void;
  onEdit: () => void;
  sphereColor?: string;
}) {
  const ac = areaColor(sphereColor);
  return (
    <SwipeToDeleteRow
      roundedClassName="rounded-r-lg"
      actions={[
        {
          icon: <span className="text-sm leading-none">🔥</span>,
          label: note.isImportant ? "Unmark important" : "Mark as important",
          toneClassName: "bg-amber-500/20 text-amber-400",
          onClick: onToggleImportant,
        },
        {
          icon: <Zap className="w-3.5 h-3.5" />,
          label: "Convert to task",
          toneClassName: "bg-violet-500/20 text-violet-400",
          onClick: onConvertToTask,
        },
        {
          icon: <Trash2 className="w-3.5 h-3.5" />,
          label: "Delete note",
          toneClassName: "bg-red-500/20 text-red-400",
          onClick: onDelete,
        },
      ]}
    >
    <div className={`group flex flex-col gap-1 p-2.5 bg-white/[0.01] border-l-2 ${ac.borderLMuted} rounded-r-lg w-full transition-all duration-150 hover:bg-white/[0.03]`}>
      <div
        className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap break-words"
        onClick={makeChecklistToggleHandler((html) => onUpdateText(note.id, html))}
        dangerouslySetInnerHTML={{ __html: note.text }}
      />
      {/* Single compact footer line — timestamp/badge/meta on the left, desktop hover
          utilities + the always-visible Edit trigger on the far right. Folding Edit into
          this row (instead of its own line below) keeps every card the same fixed height. */}
      <div className="flex items-center justify-between w-full gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600 tabular-nums">{fmtTime(note.createdAt)}</span>
          {note.isImportant && <span className="text-[10px] leading-none">🔥</span>}
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
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Desktop hover utilities — fully hidden on mobile, replaced by the swipe-left tray above */}
          <div className="hidden md:flex items-center gap-0.5">
            {/* Important toggle — always visible when flagged, hover-only when not */}
            <button
              onClick={onToggleImportant}
              title={note.isImportant ? "Unmark important" : "Mark as important"}
              className="p-1 rounded-md transition-all text-[11px] leading-none opacity-0 group-hover:opacity-100 hover:bg-amber-500/10"
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
          {/* Edit trigger — loads this note back into the composer above, switching it into update mode */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-violet-300 transition-colors"
          >
            <Pencil className="w-2.5 h-2.5" />
            Edit
          </button>
        </div>
      </div>
    </div>
    </SwipeToDeleteRow>
  );
}

// ── Archive note item (inline-editable) ──────────────────────────────────────

function ArchiveNoteItem({
  note, spheres, onUpdateText,
}: {
  note: QuickNote; spheres: Sphere[]; onUpdateText: (id: string, text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState("");
  const ac = areaColor(spheres.find((s) => s.name === note.sphere)?.labelColor);

  function startEdit() {
    setDraft(note.text); // preserve HTML so ChecklistEditor can render existing formatting
    setEditing(true);
  }

  function save() {
    const trimmed = draft.trim();
    if (trimmed) onUpdateText(note.id, trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 py-2.5 border-b border-white/[0.04] last:border-0">
        <ChecklistEditor
          defaultValue={draft}
          autoFocus
          onChange={setDraft}
          onSubmitShortcut={save}
          maxHeightVariant="modal"
          className="w-full rounded-lg bg-white/[0.06] border border-violet-500/40 transition-colors"
        />
        <div className="flex items-center gap-2">
          <button onClick={save}
            className="px-3 h-6 rounded-md text-[11px] font-medium bg-violet-600/25 border border-violet-500/30 text-violet-300 hover:bg-violet-600/40 transition-colors">
            Save
          </button>
          <button onClick={() => setEditing(false)}
            className="px-3 h-6 rounded-md text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
            Cancel
          </button>
          <span className="text-[10px] text-slate-700 ml-auto">⌘↵ to save</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onDoubleClick={startEdit}
      className="group flex items-start gap-2 py-2.5 border-b border-white/[0.04] last:border-0 cursor-default"
    >
      <div className={`flex-1 min-w-0 border-l-2 ${ac.borderLMuted} pl-2.5 flex flex-col gap-1`}>
        <div
          className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap break-words"
          onClick={makeChecklistToggleHandler((html) => onUpdateText(note.id, html))}
          dangerouslySetInnerHTML={{ __html: note.text }}
        />
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600 tabular-nums">{fmtTime(note.createdAt)}</span>
          {note.isImportant && <span className="text-[10px] leading-none">🔥</span>}
          {note.sphere && (
            <>
              <span className="text-slate-700 text-[10px]">·</span>
              <span className={`text-[10px] ${ac.text}`}>{note.sphere}</span>
            </>
          )}
        </div>
      </div>
      <button
        onClick={startEdit}
        title="Edit note (or double-click)"
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all mt-0.5"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Archive flat bucketing ────────────────────────────────────────────────────

interface NoteDayGroup {
  key: string;
  label: string;
  notes: QuickNote[];
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

interface FlatBucket { id: string; label: string; notes: QuickNote[] }

function flatBuckets(notes: QuickNote[]): FlatBucket[] {
  const today    = new Date();
  const thisYear = today.getFullYear();

  const cutoff7  = new Date(today); cutoff7.setDate(cutoff7.getDate() - 7);
  const cutoff30 = new Date(today); cutoff30.setDate(cutoff30.getDate() - 30);
  const key7     = cutoff7.toLocaleDateString("en-CA");
  const key30    = cutoff30.toLocaleDateString("en-CA");

  const recent7:  QuickNote[] = [];
  const recent30: QuickNote[] = [];
  const monthMap = new Map<string, QuickNote[]>();
  const yearMap  = new Map<number, QuickNote[]>();

  for (const note of [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const dateKey = note.createdAt.split(" ")[0];
    const year    = parseInt(dateKey.split("-")[0], 10);
    if (dateKey >= key7) {
      recent7.push(note);
    } else if (dateKey >= key30) {
      recent30.push(note);
    } else if (year === thisYear) {
      const mk = dateKey.slice(0, 7);
      if (!monthMap.has(mk)) monthMap.set(mk, []);
      monthMap.get(mk)!.push(note);
    } else {
      if (!yearMap.has(year)) yearMap.set(year, []);
      yearMap.get(year)!.push(note);
    }
  }

  const result: FlatBucket[] = [];
  if (recent7.length)  result.push({ id: "7d",  label: "Previous 7 Days",  notes: recent7  });
  if (recent30.length) result.push({ id: "30d", label: "Previous 30 Days", notes: recent30 });

  Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .forEach(([mk, mNotes]) => {
      const [y, m] = mk.split("-").map(Number);
      result.push({ id: mk, label: new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long" }), notes: mNotes });
    });

  Array.from(yearMap.entries())
    .sort(([a], [b]) => b - a)
    .forEach(([year, yNotes]) => {
      result.push({ id: `y${year}`, label: String(year), notes: yNotes });
    });

  return result;
}

function SectionDivider({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-1.5 first:pt-2">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/[0.06]" />
      <span className="text-[10px] text-slate-700 tabular-nums">{count}</span>
    </div>
  );
}

// ── Archive modal ─────────────────────────────────────────────────────────────

function ArchiveModal({
  notes, spheres, onClose, onUpdateText,
}: {
  notes: QuickNote[]; spheres: Sphere[]; onClose: () => void;
  onUpdateText: (id: string, text: string) => void;
}) {
  const [query,         setQuery]         = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = notes;
    if (favoritesOnly) list = list.filter((n) => n.isImportant);
    const q = query.toLowerCase().trim();
    if (q) list = list.filter((n) => stripHtml(n.text).toLowerCase().includes(q));
    return list;
  }, [notes, query, favoritesOnly]);

  const buckets      = useMemo(() => flatBuckets(filtered), [filtered]);
  const favoriteCount = notes.filter((n) => n.isImportant).length;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#0F1629] border border-white/[0.08] rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
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

        {/* Search + favorites */}
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
          <button
            type="button"
            onClick={() => setFavoritesOnly((v) => !v)}
            className={`self-start flex items-center gap-1.5 px-3 h-6 rounded-full text-[11px] font-medium border transition-all duration-150 ${
              favoritesOnly
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                : "bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]"
            }`}
          >
            🔥 Favorites{favoriteCount > 0 && <span className="tabular-nums ml-0.5">({favoriteCount})</span>}
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-5 pt-1 pb-5">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-8">
                {favoritesOnly ? "No favorites yet — mark notes with 🔥 to save them here." : query ? "No notes match your search." : "No notes captured yet."}
              </p>
            ) : (
              buckets.map((bucket) => (
                <div key={bucket.id}>
                  <SectionDivider label={bucket.label} count={bucket.notes.length} />
                  {bucket.notes.map((note) => (
                    <ArchiveNoteItem
                      key={note.id}
                      note={note}
                      spheres={spheres}
                      onUpdateText={onUpdateText}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sortable sphere pill ──────────────────────────────────────────────────────

function SortablePill({
  sphere, isActive, onClick,
}: { sphere: Sphere; isActive: boolean; onClick: () => void }) {
  const { setNodeRef, transform, transition } = useSortable({ id: sphere.id });
  const pill = areaColor(sphere.labelColor);
  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onClick}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      className={`flex-shrink-0 px-3 h-7 rounded-full text-xs font-medium border transition-all duration-150 cursor-pointer select-none ${
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
    addQuickNote, deleteQuickNote, toggleQuickNoteImportant, updateQuickNoteText,
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

  // Tracks whether the user has explicitly clicked a tab. Used by the effect
  // below to avoid overwriting a deliberate choice (including "All") once the
  // user interacts with the widget.
  const hasUserChosen = useRef(false);

  const [text,              setText]              = useState(""); // HTML — mirrors the ChecklistEditor's live content
  const [projectId,         setProjectId]         = useState("");
  const [showAllNotesModal, setShowAllNotesModal] = useState(false);
  const [showManageAreas,   setShowManageAreas]   = useState(false);
  const [isExpandedToday,   setIsExpandedToday]   = useState(false);
  const editorRef     = useRef<ChecklistEditorHandle>(null);
  const [editorFocused, setEditorFocused] = useState(false);

  // Set while editing an existing note loaded back into the composer above — submitNote()
  // updates this record instead of creating a new one while it's non-null.
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

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

  // Production race condition: spheres arrive empty on first render because
  // Supabase hasn't resolved yet, so the useState initializer above falls back
  // to ALL_TAB. This effect fires once when orderedSpheres first populates and
  // the tab is still on the fallback default — it advances to the first sphere
  // automatically, mimicking what the initializer would have done if data had
  // been available at mount time.
  useEffect(() => {
    if (hasUserChosen.current) return;
    if (activeSphereId !== ALL_TAB) return;
    if (orderedSpheres.length === 0) return;
    setActiveSphereId(orderedSpheres[0].id);
  }, [orderedSpheres]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const todayNotesRaw: QuickNote[] = isAll
    ? quickNotes.filter((n) => n.createdAt.startsWith(TODAY))
    : quickNotes.filter((n) => n.sphere === activeSphere && n.createdAt.startsWith(TODAY));
  const todayNotes = [...todayNotesRaw].sort((a, b) => Number(b.isImportant) - Number(a.isImportant));

  // Collapsed view shows only the single most recently created note (not necessarily
  // todayNotes[0], which favorite status can bump ahead of a newer plain note).
  const mostRecentTodayNote = todayNotesRaw.length > 0
    ? [...todayNotesRaw].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    : null;
  const visibleTodayNotes = !isExpandedToday && todayNotes.length > 1
    ? (mostRecentTodayNote ? [mostRecentTodayNote] : [])
    : todayNotes;

  function handleConvertToTask(note: QuickNote) {
    setTaskModalDefaults({
      title:  toTaskTitle(stripHtml(note.text)),
      notes:  stripHtml(note.text),
      sphere: note.sphere,
    });
    setTaskModalOpen(true);
  }

  function submitNote() {
    const plain = stripHtml(text).trim();
    if (!plain || isAll) return;
    if (editingNoteId) {
      updateQuickNoteText(editingNoteId, text);
      setEditingNoteId(null);
    } else {
      addQuickNote(text, activeSphere, projectId || undefined);
    }
    setText("");
    setProjectId("");
    editorRef.current?.clear();
  }

  // Loads an existing note back into the composer above and flips submitNote() into update
  // mode for it — switches the active sphere tab to match so the composer is actually visible.
  function handleEditNote(note: QuickNote) {
    const matchingSphere = spheres.find((s) => s.name === note.sphere);
    if (matchingSphere) {
      hasUserChosen.current = true;
      setActiveSphereId(matchingSphere.id);
    }
    setProjectId(note.projectId ?? "");
    setEditingNoteId(note.id);
    setText(note.text);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitNote();
  }

  return (
    <>
      {showAllNotesModal && (
        <ArchiveModal
          notes={quickNotes}
          spheres={spheres}
          onClose={() => setShowAllNotesModal(false)}
          onUpdateText={updateQuickNoteText}
        />
      )}

      <TaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        defaultSphere={taskModalDefaults.sphere}
        defaultTitle={taskModalDefaults.title}
        defaultNotes={taskModalDefaults.notes}
      />

      <ManageAreasModal
        isOpen={showManageAreas}
        onClose={() => setShowManageAreas(false)}
      />

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <NotebookPen className="w-4 h-4 text-purple-400" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Quick Notes
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAllNotesModal(true)}
              className="text-[11px] font-normal text-violet-400/70 hover:text-violet-300 hover:underline transition-colors whitespace-nowrap"
            >
              View all →
            </button>
            <button
              onClick={() => setShowManageAreas(true)}
              title="Manage areas"
              className="flex-shrink-0 p-1 text-slate-500 hover:text-violet-300 active:opacity-70 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Area tabs — drag to reorder, order persisted to localStorage. Edge-fade scroll
            masking (right-only at rest, both edges mid-scroll, left-only at the end) is
            handled internally by ScrollFadeContainer — see that component for why a mask is
            used here instead of a solid-color overlay against this card's glassmorphic
            bg-white/[0.03] backdrop-blur-xl surface. */}
        <ScrollFadeContainer className="mt-4 flex-shrink-0">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedSpheres.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
              {orderedSpheres.map((sphere) => (
                <SortablePill
                  key={sphere.id}
                  sphere={sphere}
                  isActive={activeSphereObj?.id === sphere.id}
                  onClick={() => { hasUserChosen.current = true; setActiveSphereId(sphere.id); setProjectId(""); }}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* All tab — always at the far right */}
          <button
            type="button"
            onClick={() => { hasUserChosen.current = true; setActiveSphereId(ALL_TAB); setProjectId(""); }}
            className={`flex-shrink-0 px-3 h-7 rounded-full text-xs font-medium border transition-all duration-150 ${
              isAll
                ? "bg-violet-600 text-white border-transparent md:shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                : "bg-white/[0.04] border-white/[0.05] text-slate-400 hover:text-slate-300 hover:bg-white/[0.07]"
            }`}
          >
            All
          </button>
        </ScrollFadeContainer>

        {/* Capture form — hidden when "All" is active */}
        {isAll ? (
          <p className="mt-4 text-[11px] text-slate-600 flex-shrink-0">Select an area above to add a note.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-4 flex-shrink-0">
            <div
              onFocus={() => setEditorFocused(true)}
              onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setEditorFocused(false); }}
            >
              <ChecklistEditor
                // Remounts (and re-seeds defaultValue) whenever the edit target changes — the
                // form/editor often stays mounted across that transition (e.g. editing a note
                // that's already in the active sphere), so a key is the only reliable way to
                // load fresh content into what may already be a live, focused instance.
                key={editingNoteId ?? "composer"}
                ref={editorRef}
                defaultValue={text}
                // Edit-click sets editingNoteId, which both forces this remount (above) and
                // flips autoFocus on — ChecklistEditor's own mount effect then focuses and locks
                // the caret to the end of the freshly-seeded note text in one step.
                autoFocus={!!editingNoteId}
                onChange={setText}
                onSubmitShortcut={submitNote}
                placeholder="Capture an idea before it slips away…"
                maxHeightVariant="widget"
                className="w-full rounded-xl bg-white/[0.04] border border-white/[0.07] transition-colors"
              />
            </div>
            {editingNoteId && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-violet-400/80">Editing note…</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingNoteId(null);
                    setText("");
                    setProjectId("");
                    editorRef.current?.clear();
                  }}
                  className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
            {(editorFocused || !!stripHtml(text).trim() || !!editingNoteId) && (
              <>
                <div className="flex w-full items-center gap-2">
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="hidden md:flex flex-1 min-w-0 h-8 px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-xs text-slate-400 outline-none focus:border-purple-500/40 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#0F1629]">No project</option>
                    {sphereProjects.map((p) => (
                      <option key={p.id} value={p.name} className="bg-[#0F1629]">{p.name}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={!stripHtml(text).trim()}
                    // Without this, mousedown blurs the still-focused editor, its toolbar
                    // unmounts mid-click, the layout shifts up underneath the pointer, and the
                    // browser's click lands somewhere other than this button — requiring a
                    // second, now-accurate click. Keeping focus in the editor avoids the shift.
                    onMouseDown={(e) => e.preventDefault()}
                    className="w-full md:w-auto px-4 h-8 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-white font-medium transition-all flex-shrink-0"
                  >
                    {editingNoteId ? "Update" : "Save"}
                  </button>
                </div>
                <p className="hidden md:block text-[10px] text-slate-700">⌘ + Enter to save quickly</p>
              </>
            )}
          </form>
        )}

        {/* Notes feed — collapsed to just the most recent note once today's list grows past
            one, so a high-activity day doesn't push the whole widget into a long scroll. */}
        {todayNotes.length > 0 && (
        <div className="overflow-y-auto mt-3 flex flex-col gap-1.5 pr-1">
            <>
              {visibleTodayNotes.map((note) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  showArea={isAll}
                  onDelete={() => deleteQuickNote(note.id)}
                  onToggleImportant={() => toggleQuickNoteImportant(note.id)}
                  onConvertToTask={() => handleConvertToTask(note)}
                  onUpdateText={updateQuickNoteText}
                  onEdit={() => handleEditNote(note)}
                  sphereColor={spheres.find((s) => s.name === note.sphere)?.labelColor}
                />
              ))}
              {todayNotes.length > 1 && (
                <button
                  type="button"
                  onClick={() => setIsExpandedToday((v) => !v)}
                  className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-500 hover:text-violet-300 transition-colors py-1"
                >
                  {isExpandedToday ? "Show less" : `Show more (+${todayNotes.length - 1} note${todayNotes.length - 1 !== 1 ? "s" : ""})`}
                </button>
              )}
            </>
        </div>
        )}

      </div>
    </>
  );
}
