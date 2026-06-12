"use client";

import { useState, useMemo } from "react";
import { NotebookPen, Trash2, X, Search, Zap } from "lucide-react";
import { useDashboard, type QuickNote, type Sphere } from "@/context/DashboardContext";
import { areaColor } from "@/lib/areaColors";
import TaskModal from "@/components/TaskModal";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TODAY        = new Date().toLocaleDateString("en-CA");
const ALL_TAB      = "__all__";
const FAVORITES_TAB = "__favorites__";

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
  const [query,         setQuery]         = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = notes;
    if (favoritesOnly) list = list.filter((n) => n.isImportant);
    const q = query.toLowerCase().trim();
    if (q) list = list.filter((n) => n.text.toLowerCase().includes(q));
    return list;
  }, [notes, query, favoritesOnly]);

  // Group by date descending
  const grouped = useMemo(() => {
    const map = new Map<string, QuickNote[]>();
    for (const note of filtered) {
      const date = note.createdAt.split(" ")[0];
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(note);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const favoriteCount = notes.filter((n) => n.isImportant).length;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#0F1629] border border-white/[0.08] rounded-2xl w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">

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
          {/* Favorites filter */}
          <button
            type="button"
            onClick={() => setFavoritesOnly((v) => !v)}
            className={`self-start flex items-center gap-1.5 px-3 h-6 rounded-full text-[11px] font-medium border transition-all duration-150 ${
              favoritesOnly
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                : "bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]"
            }`}
          >
            🔥 Favorites{favoriteCount > 0 && <span className="tabular-nums">({favoriteCount})</span>}
          </button>
        </div>

        {/* Grouped notes */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {grouped.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-8">
              {favoritesOnly ? "No favorites yet — mark notes with 🔥 to save them here." : query ? "No notes match your search." : "No notes captured yet."}
            </p>
          ) : (
            grouped.map(([date, dateNotes]) => (
              <div key={date} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex-shrink-0">
                    {date === TODAY ? "Today" : fmtDateHeader(date)}
                  </span>
                  <span className="flex-1 h-px bg-white/[0.05]" />
                  <span className="text-[10px] text-slate-700 tabular-nums flex-shrink-0">
                    {dateNotes.length}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {dateNotes.map((note) => (
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export default function QuickNotesCard() {
  const {
    spheres, projects, quickNotes,
    addQuickNote, deleteQuickNote, toggleQuickNoteImportant,
  } = useDashboard();

  const [activeSphereId,    setActiveSphereId]    = useState<string>(ALL_TAB);
  const [text,              setText]              = useState("");
  const [projectId,         setProjectId]         = useState("");
  const [showAllNotesModal, setShowAllNotesModal] = useState(false);

  // Task conversion modal state
  const [taskModalOpen,     setTaskModalOpen]     = useState(false);
  const [taskModalDefaults, setTaskModalDefaults] = useState<{ title: string; notes: string; sphere: string }>({ title: "", notes: "", sphere: "" });

  const isAll       = activeSphereId === ALL_TAB;
  const isFavorites = activeSphereId === FAVORITES_TAB;

  const activeSphereObj = (isAll || isFavorites) ? undefined : (spheres.find((s) => s.id === activeSphereId) ?? spheres[0]);
  const activeSphere    = activeSphereObj?.name ?? "";
  const sphereProjects  = (isAll || isFavorites) ? [] : projects.filter((p) => p.sphere === activeSphere);

  // Notes shown in the main feed
  const todayNotes: QuickNote[] = isFavorites
    ? quickNotes.filter((n) => n.isImportant)
    : isAll
      ? quickNotes.filter((n) => n.createdAt.startsWith(TODAY))
      : quickNotes.filter((n) => n.sphere === activeSphere && n.createdAt.startsWith(TODAY));

  const favoriteCount = quickNotes.filter((n) => n.isImportant).length;

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
    if (!trimmed || isAll || isFavorites) return;
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
            className="text-[10px] text-purple-400/70 hover:text-purple-300 transition-colors cursor-pointer border border-purple-500/20 bg-purple-500/5 px-2 py-0.5 rounded-full"
          >
            📂 View All Archive
          </button>
        </div>

        {/* Area tabs */}
        <div className="flex items-center gap-2 flex-wrap mt-4 flex-shrink-0">
          {/* All tab */}
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

          {spheres.map((sphere) => {
            const pill = areaColor(sphere.labelColor);
            return (
              <button
                key={sphere.id}
                type="button"
                onClick={() => { setActiveSphereId(sphere.id); setProjectId(""); }}
                className={`px-3 h-7 rounded-full text-xs font-medium border transition-all duration-150 ${
                  activeSphereObj?.id === sphere.id ? pill.pillActive : pill.pillInactive
                }`}
              >
                {sphere.name}
              </button>
            );
          })}

          {/* Favorites filter pill */}
          <button
            type="button"
            onClick={() => { setActiveSphereId(FAVORITES_TAB); setProjectId(""); }}
            className={`px-3 h-7 rounded-full text-xs font-medium border transition-all duration-150 ${
              isFavorites
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                : "bg-white/[0.04] border-white/[0.05] text-slate-400 hover:text-amber-400/70 hover:bg-amber-500/[0.06] hover:border-amber-500/20"
            }`}
          >
            🔥 Favorites{favoriteCount > 0 && <span className="ml-1 tabular-nums text-[10px]">({favoriteCount})</span>}
          </button>
        </div>

        {/* Capture form — hidden when "All" or "Favorites" is active */}
        {(isAll || isFavorites) ? (
          <p className="mt-4 text-[11px] text-slate-600 flex-shrink-0">
            {isFavorites ? "Showing all notes marked as important." : "Select an area above to add a note."}
          </p>
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
              {isFavorites
                ? "No important notes yet — hover a note and click 🔥 to flag it."
                : isAll
                  ? "No notes today across any area."
                  : `No notes today for ${activeSphere}.`}
            </p>
          ) : (
            todayNotes.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                showArea={isAll || isFavorites}
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
