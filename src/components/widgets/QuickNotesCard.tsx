"use client";

import { useState, useMemo } from "react";
import { NotebookPen, Trash2, X, Search } from "lucide-react";
import { useDashboard, type QuickNote } from "@/context/DashboardContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TODAY = new Date().toLocaleDateString("en-CA");

function fmtTime(createdAt: string): string {
  return createdAt.split(" ")[1] ?? "";
}

function fmtDateHeader(datePart: string): string {
  const [y, mo, d] = datePart.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

// ── Note row (today feed) ─────────────────────────────────────────────────────

function NoteRow({ note, onDelete }: { note: QuickNote; onDelete: () => void }) {
  return (
    <div className="group flex flex-col gap-1 p-2.5 bg-white/[0.01] border-l-2 border-l-purple-500/50 rounded-r-lg w-full transition-all duration-150 hover:bg-white/[0.03]">
      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
        {note.text}
      </p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600 tabular-nums">{fmtTime(note.createdAt)}</span>
          {note.projectId && (
            <>
              <span className="text-slate-700 text-[10px]">·</span>
              <span className="text-[10px] text-slate-600">{note.projectId}</span>
            </>
          )}
        </div>
        <button
          onClick={onDelete}
          title="Delete note"
          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}

// ── Archive modal ─────────────────────────────────────────────────────────────

function ArchiveModal({
  notes,
  onClose,
  onDelete,
}: {
  notes: QuickNote[];
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? notes.filter((n) => n.text.toLowerCase().includes(q)) : notes;
  }, [notes, query]);

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

        {/* Search */}
        <div className="px-5 py-3 border-b border-white/[0.05] flex-shrink-0">
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
        </div>

        {/* Grouped notes */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {grouped.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-8">
              {query ? "No notes match your search." : "No notes captured yet."}
            </p>
          ) : (
            grouped.map(([date, dateNotes]) => (
              <div key={date} className="flex flex-col gap-2">
                {/* Date header */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex-shrink-0">
                    {date === TODAY ? "Today" : fmtDateHeader(date)}
                  </span>
                  <span className="flex-1 h-px bg-white/[0.05]" />
                  <span className="text-[10px] text-slate-700 tabular-nums flex-shrink-0">
                    {dateNotes.length}
                  </span>
                </div>
                {/* Notes for this date */}
                <div className="flex flex-col gap-1.5">
                  {dateNotes.map((note) => (
                    <div
                      key={note.id}
                      className="group flex flex-col gap-1 p-2.5 bg-white/[0.01] border-l-2 border-l-purple-500/40 rounded-r-lg transition-all hover:bg-white/[0.03]"
                    >
                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                        {note.text}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-600 tabular-nums">{fmtTime(note.createdAt)}</span>
                          <span className="text-slate-700 text-[10px]">·</span>
                          <span className="text-[10px] text-slate-600">{note.sphere}</span>
                          {note.projectId && (
                            <>
                              <span className="text-slate-700 text-[10px]">·</span>
                              <span className="text-[10px] text-slate-600">{note.projectId}</span>
                            </>
                          )}
                        </div>
                        <button
                          onClick={() => onDelete(note.id)}
                          title="Delete note"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
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
  const { spheres, projects, quickNotes, addQuickNote, deleteQuickNote } = useDashboard();

  const [activeSphereId,    setActiveSphereId]    = useState<string>(() => spheres[0]?.id ?? "");
  const [text,              setText]              = useState("");
  const [projectId,         setProjectId]         = useState("");
  const [showAllNotesModal, setShowAllNotesModal] = useState(false);

  const activeSphereObj = spheres.find((s) => s.id === activeSphereId) ?? spheres[0];
  const activeSphere    = activeSphereObj?.name ?? "";
  const sphereProjects  = projects.filter((p) => p.sphere === activeSphere);

  // Feed: today's notes for the active sphere only
  const todayNotes: QuickNote[] = quickNotes.filter(
    (n) => n.sphere === activeSphere && n.createdAt.startsWith(TODAY)
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
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
          onClose={() => setShowAllNotesModal(false)}
          onDelete={deleteQuickNote}
        />
      )}

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

        {/* Sphere tabs */}
        <div className="flex items-center gap-2 flex-wrap mt-4 flex-shrink-0">
          {spheres.map((sphere) => (
            <button
              key={sphere.id}
              type="button"
              onClick={() => { setActiveSphereId(sphere.id); setProjectId(""); }}
              className={`px-3 h-7 rounded-full text-xs font-medium border transition-all duration-150 ${
                activeSphereObj?.id === sphere.id
                  ? "bg-violet-600 text-white border-transparent shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                  : "bg-white/[0.04] border-white/[0.05] text-slate-400 hover:text-slate-300 hover:bg-white/[0.07]"
              }`}
            >
              {sphere.name}
            </button>
          ))}
        </div>

        {/* Capture form */}
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

        {/* Today's notes feed — scrollable, fills remaining height */}
        <div className="flex-1 overflow-y-auto mt-3 flex flex-col gap-1.5 pr-1 min-h-0">
          {todayNotes.length === 0 ? (
            <p className="text-xs text-slate-700 text-center py-4">
              No notes today for {activeSphere}.
            </p>
          ) : (
            todayNotes.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                onDelete={() => deleteQuickNote(note.id)}
              />
            ))
          )}
        </div>

      </div>
    </>
  );
}
