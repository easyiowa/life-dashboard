"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus } from "lucide-react";
import ChecklistEditor from "@/components/ui/ChecklistEditor";
import DatePickerInput from "@/components/ui/DatePickerInput";
import {
  useDashboard,
  type Priority,
  type Energy,
  type Urgency,
  type Task,
} from "@/context/DashboardContext";
import EmojiPickerButton from "@/components/EmojiPickerButton";
import { areaColor } from "@/lib/areaColors";

// ── Project tag colour palette ─────────────────────────────────────────────────

const PTAG_COLORS: Array<{ name: string; dot: string; ring: string }> = [
  { name: "violet",  dot: "bg-violet-500",  ring: "ring-violet-400"  },
  { name: "emerald", dot: "bg-emerald-500", ring: "ring-emerald-400" },
  { name: "rose",    dot: "bg-rose-500",    ring: "ring-rose-400"    },
  { name: "amber",   dot: "bg-amber-500",   ring: "ring-amber-400"   },
  { name: "indigo",  dot: "bg-indigo-500",  ring: "ring-indigo-400"  },
];

// Full dot + pill lookup for all tag colours used in the system
const TAG_DOT: Record<string, string> = {
  violet: "bg-violet-500", emerald: "bg-emerald-500", rose: "bg-rose-500",
  amber: "bg-amber-500", indigo: "bg-indigo-500", blue: "bg-blue-500",
  pink: "bg-pink-500", teal: "bg-teal-500", sky: "bg-sky-500", orange: "bg-orange-500",
};
const TAG_PILL: Record<string, string> = {
  violet:  "bg-violet-500/25  border-violet-400/60  text-violet-200",
  emerald: "bg-emerald-500/25 border-emerald-400/60 text-emerald-200",
  rose:    "bg-rose-500/25    border-rose-400/60    text-rose-200",
  amber:   "bg-amber-500/25   border-amber-400/60   text-amber-200",
  indigo:  "bg-indigo-500/25  border-indigo-400/60  text-indigo-200",
  blue:    "bg-blue-500/25    border-blue-400/60    text-blue-200",
  pink:    "bg-pink-500/25    border-pink-400/60    text-pink-200",
  teal:    "bg-teal-500/25    border-teal-400/60    text-teal-200",
  sky:     "bg-sky-500/25     border-sky-400/60     text-sky-200",
  orange:  "bg-orange-500/25  border-orange-400/60  text-orange-200",
};

// ── Form helpers ───────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  defaultSphere?: string;
  defaultTitle?: string;
  defaultNotes?: string;
}

type FormData = Omit<Task, "id" | "done">;

const PRIORITY_ACTIVE: Record<Priority, string> = {
  High: "bg-red-500/20 border-red-500/50 text-red-300",
  Med:  "bg-amber-500/20 border-amber-500/50 text-amber-300",
  Low:  "bg-slate-500/20 border-slate-500/40 text-slate-300",
};
const ENERGY_ACTIVE: Record<Energy, string> = {
  Flow:  "bg-violet-500/20 border-violet-500/50 text-violet-300",
  Quick: "bg-teal-500/20 border-teal-500/50 text-teal-300",
  Easy:  "bg-green-500/20 border-green-500/50 text-green-300",
};
const INACTIVE = "border-white/[0.07] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]";

function ToggleGroup<T extends string>({
  options, value, onChange, activeStyles,
}: {
  options: T[]; value: T; onChange: (v: T) => void; activeStyles: Record<T, string>;
}) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button key={opt} type="button" onClick={() => onChange(opt)}
          className={`flex-1 h-8 rounded-lg text-xs font-medium border transition-all duration-150 ${value === opt ? activeStyles[opt] : INACTIVE}`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function TaskModal({ open, onClose, defaultSphere, defaultTitle, defaultNotes }: Props) {
  const { spheres, projects, tags, tasks, addTask, addProject, addTag, updateTag, deleteTag } = useDashboard();

  const fallbackSphere  = spheres[0]?.name ?? "";
  const fallbackProject = projects.find((p) => p.sphere === fallbackSphere)?.name ?? "";

  const blank = (): FormData => ({
    sphere: fallbackSphere, project: fallbackProject, title: "",
    priority: "Med", energy: "Easy", urgency: "not-urgent",
    deadline: null, notes: "", manualMinutes: 0,
  });

  // ── Core form state ──────────────────────────────────────────────────────────
  const [form,       setForm]       = useState<FormData>(blank);
  const [titleError, setTitleError] = useState(false);
  // Bumped every time the form resets on open — used as the Notes ChecklistEditor's `key` so
  // it remounts (and re-seeds its defaultValue) exactly when the reset's new notes value is
  // actually ready, rather than capturing whatever form.notes was during the open=true render
  // that fires a tick before this same effect updates it.
  const [notesResetKey, setNotesResetKey] = useState(0);

  // ── New Project panel state ──────────────────────────────────────────────────
  const [showNewProject,        setShowNewProject]        = useState(false);
  const [newProjectName,        setNewProjectName]        = useState("");
  const [newProjectEmoji,       setNewProjectEmoji]       = useState("📁");
  const [newProjectEmojiLocked, setNewProjectEmojiLocked] = useState(false);
  const [newProjectSphere,      setNewProjectSphere]      = useState(fallbackSphere);
  const [newProjectTagIds,      setNewProjectTagIds]      = useState<string[]>(() => tags[0] ? [tags[0].id] : []);
  const [newProjectError,       setNewProjectError]       = useState(false);

  // ── Project tag creation/edit state ─────────────────────────────────────────
  const [addingPTag,     setAddingPTag]     = useState(false);
  const [newPTagName,    setNewPTagName]    = useState("");
  const [newPTagColor,   setNewPTagColor]   = useState("violet");
  const [pendingPTagLabel, setPendingPTagLabel] = useState<string | null>(null);
  const [editingPTagId,  setEditingPTagId]  = useState<string | null>(null);
  const [editPTagName,   setEditPTagName]   = useState("");
  const [editPTagColor,  setEditPTagColor]  = useState("violet");
  const newPTagRef  = useRef<HTMLInputElement>(null);
  const editPTagRef = useRef<HTMLInputElement>(null);

  // ── Auto-focus refs ──────────────────────────────────────────────────────────
  useEffect(() => { if (addingPTag)    newPTagRef.current?.focus();  }, [addingPTag]);
  useEffect(() => { if (editingPTagId) editPTagRef.current?.focus(); }, [editingPTagId]);

  // Auto-select newly created tag once the reducer fires
  useEffect(() => {
    if (!pendingPTagLabel) return;
    const match = tags.find((t) => t.label === pendingPTagLabel);
    if (match) {
      setNewProjectTagIds((prev) => prev.includes(match.id) ? prev : [...prev, match.id]);
      setPendingPTagLabel(null);
    }
  }, [tags, pendingPTagLabel]);

  // ── Reset on open ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      const targetSphere = defaultSphere ?? fallbackSphere;
      const sphereTasks  = tasks.filter((t) => t.sphere === targetSphere);
      const lastTask     = sphereTasks[sphereTasks.length - 1];
      const targetProject =
        lastTask?.project ??
        projects.find((p) => p.sphere === targetSphere)?.name ??
        fallbackProject;

      setForm({ ...blank(), sphere: targetSphere, project: targetProject, title: defaultTitle ?? "", notes: defaultNotes ?? "" });
      setNotesResetKey((k) => k + 1);
      setTitleError(false);
      setShowNewProject(false);
      setNewProjectName("");
      setNewProjectEmoji("📁");
      setNewProjectEmojiLocked(false);
      setNewProjectSphere(targetSphere);
      setNewProjectTagIds(tags[0] ? [tags[0].id] : []);
      setNewProjectError(false);
      setAddingPTag(false);
      setNewPTagName("");
      setNewPTagColor("violet");
      setPendingPTagLabel(null);
      setEditingPTagId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Computed ─────────────────────────────────────────────────────────────────
  const sphereProjects        = projects.filter((p) => p.sphere === form.sphere);
  const selectedSphereColor   = spheres.find((s) => s.name === form.sphere)?.labelColor;
  const ac                    = areaColor(selectedSphereColor);
  const newProjectSphereColor = spheres.find((s) => s.name === newProjectSphere)?.labelColor;
  const acNewProject          = areaColor(newProjectSphereColor);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleSphereChange(name: string) {
    const firstProject = projects.find((p) => p.sphere === name)?.name ?? "";
    setForm((f) => ({ ...f, sphere: name, project: firstProject }));
    setShowNewProject(false);
  }

  function handleSaveNewProject() {
    if (!newProjectName.trim()) { setNewProjectError(true); return; }
    addProject({
      sphere: newProjectSphere, name: newProjectName.trim(), emoji: newProjectEmoji,
      tagIds: newProjectTagIds.length > 0 ? newProjectTagIds : (tags[0] ? [tags[0].id] : []),
      status: "on-track", milestone: "In progress",
    });
    setForm((f) => ({ ...f, sphere: newProjectSphere, project: newProjectName.trim() }));
    setShowNewProject(false);
    setNewProjectName("");
    setNewProjectEmoji("📁");
    setNewProjectEmojiLocked(false);
    setNewProjectTagIds(tags[0] ? [tags[0].id] : []);
    setNewProjectError(false);
    setAddingPTag(false);
    setEditingPTagId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setTitleError(true); return; }

    // Auto-route fallback: if no project selected, find or create a "Random" catch-all.
    // When creating a new project we capture its generated ID and pass it explicitly to
    // addTask so the Supabase insert gets the correct project_id even though stateRef
    // hasn't been updated yet by the concurrent addProject dispatch.
    let projectName = form.project.trim();
    let resolvedProjectId: string | undefined;
    if (!projectName) {
      const existing = projects.find((p) => p.name === "Random" && p.sphere === form.sphere);
      if (existing) {
        projectName = existing.name;
      } else {
        resolvedProjectId = addProject({ sphere: form.sphere, name: "Random", emoji: "🎲", tagIds: [], status: "on-track", milestone: "In progress" });
        projectName = "Random";
      }
    }

    addTask({ ...form, project: projectName, done: false }, resolvedProjectId);
    onClose();
  }

  // ── Project tag helpers ───────────────────────────────────────────────────────
  function commitNewPTag() {
    const label = newPTagName.trim();
    if (label) {
      addTag({ label, color: newPTagColor });
      setPendingPTagLabel(label);
    }
    setNewPTagName("");
    setNewPTagColor("violet");
    setAddingPTag(false);
  }

  function commitEditPTag(id: string) {
    const label = editPTagName.trim();
    if (label) updateTag(id, { label, color: editPTagColor });
    setEditingPTagId(null);
  }

  function deletePTag(id: string) {
    deleteTag(id);
    setNewProjectTagIds((prev) => prev.filter((x) => x !== id));
    if (editingPTagId === id) setEditingPTagId(null);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0F1629] border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0F1629] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Add Task</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

          {/* Task Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Task Name *</label>
            <input type="text" value={form.title}
              onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setTitleError(false); }}
              placeholder="What needs to be done?"
              className={`w-full h-10 px-3 rounded-xl bg-white/[0.04] border text-sm text-white placeholder:text-slate-600 outline-none transition-colors focus:border-violet-500/60 focus:bg-white/[0.06] ${titleError ? "border-red-500/60" : "border-white/[0.07]"}`}
            />
            {titleError && <p className="text-[10px] text-red-400">Task name is required.</p>}
          </div>

          {/* Area + Project */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Area</label>
                <select value={form.sphere} onChange={(e) => handleSphereChange(e.target.value)}
                  className={`h-10 px-3 rounded-xl border text-sm text-white outline-none transition-colors appearance-none cursor-pointer ${ac.bgTint} ${ac.border}`}>
                  {spheres.map((s) => <option key={s.id} value={s.name} className="bg-[#0F1629]">{s.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Project</label>
                  <button type="button" onClick={() => { setShowNewProject((v) => !v); setNewProjectSphere(form.sphere); }}
                    className="flex items-center gap-0.5 text-[10px] text-violet-400 hover:text-violet-300 transition-colors">
                    <Plus className="w-3 h-3" /> New Project
                  </button>
                </div>
                <select value={form.project} onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}
                  className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors appearance-none cursor-pointer">
                  <option value="" className="bg-[#0F1629]">(🎲 Auto-route to Random)</option>
                  {sphereProjects.map((p) => <option key={p.id} value={p.name} className="bg-[#0F1629]">{p.name}</option>)}
                </select>
              </div>
            </div>

            {/* ── New Project panel ─────────────────────────────────────────── */}
            {showNewProject && (
              <div className="rounded-xl border border-violet-500/20 bg-violet-600/[0.05] p-4 flex flex-col gap-4">
                <p className="text-xs font-semibold text-violet-300">New Project</p>

                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Name *</label>
                  <div className="flex gap-1.5">
                    <EmojiPickerButton emoji={newProjectEmoji} locked={newProjectEmojiLocked}
                      onPick={(e) => { setNewProjectEmoji(e); setNewProjectEmojiLocked(true); }} />
                    <input type="text" value={newProjectName}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewProjectName(v);
                        setNewProjectError(false);
                        if (!newProjectEmojiLocked) {
                          const rules: { pattern: RegExp; emoji: string }[] = [
                            { pattern: /product|launch/i,  emoji: "🚀" },
                            { pattern: /brand|design/i,    emoji: "🎨" },
                            { pattern: /market|campaign/i, emoji: "📣" },
                            { pattern: /client/i,          emoji: "👥" },
                            { pattern: /website|web/i,     emoji: "💻" },
                            { pattern: /finance|budget/i,  emoji: "💰" },
                            { pattern: /meeting/i,         emoji: "💬" },
                          ];
                          let found = "📁";
                          for (const { pattern, emoji } of rules) { if (pattern.test(v)) { found = emoji; break; } }
                          setNewProjectEmoji(found);
                        }
                      }}
                      placeholder="e.g. Website Redesign"
                      className={`flex-1 h-9 px-3 rounded-lg bg-white/[0.04] border text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 transition-colors ${newProjectError ? "border-red-500/60" : "border-white/[0.07]"}`}
                    />
                  </div>
                  {newProjectError && <p className="text-[10px] text-red-400">Name required.</p>}
                </div>

                {/* Area */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Area</label>
                  <select value={newProjectSphere} onChange={(e) => setNewProjectSphere(e.target.value)}
                    className={`h-9 px-3 rounded-lg border text-sm text-white outline-none transition-colors appearance-none cursor-pointer ${acNewProject.bgTint} ${acNewProject.border}`}>
                    {spheres.map((s) => <option key={s.id} value={s.name} className="bg-[#0F1629]">{s.name}</option>)}
                  </select>
                </div>

                {/* ── Tags — dynamic inline creation ─────────────────────────── */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                    Tags
                    {newProjectTagIds.length > 0 && (
                      <span className="ml-1.5 text-violet-400 font-normal normal-case tracking-normal">
                        {newProjectTagIds.length} selected
                      </span>
                    )}
                  </label>

                  {/* Tag chip row */}
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => {
                      const isSelected = newProjectTagIds.includes(tag.id);
                      const isEditing  = editingPTagId === tag.id;
                      const dot  = TAG_DOT[tag.color]  ?? "bg-slate-500";
                      const pill = TAG_PILL[tag.color] ?? "bg-slate-500/25 border-slate-400/60 text-slate-200";
                      const cm   = PTAG_COLORS.find((c) => c.name === tag.color) ?? PTAG_COLORS[0];
                      return (
                        <div key={tag.id} className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) { setEditingPTagId(null); return; }
                              if (isSelected) {
                                setEditingPTagId(tag.id);
                                setEditPTagName(tag.label);
                                setEditPTagColor(tag.color);
                              } else {
                                setNewProjectTagIds((prev) => [...prev, tag.id]);
                              }
                            }}
                            className={`flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full border text-[11px] font-medium transition-all duration-150 cursor-pointer select-none ${
                              isSelected
                                ? `${pill} ${isEditing ? `ring-1 ring-offset-1 ring-offset-[#0F1629] ${cm.ring}` : ""}`
                                : "bg-white/[0.04] text-slate-400 border-white/[0.05] hover:border-white/[0.12] hover:text-slate-300"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                            {tag.label}
                            {isSelected && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewProjectTagIds((prev) => prev.filter((x) => x !== tag.id));
                                  if (isEditing) setEditingPTagId(null);
                                }}
                                className="ml-0.5 w-3.5 h-3.5 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 hover:bg-white/10 transition-all"
                              >
                                <X className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </button>

                          {/* Edit popover */}
                          {isEditing && (
                            <div className="absolute bottom-full left-0 mb-1 z-30 w-52 rounded-xl border border-white/[0.12] bg-[#0B0F1C] shadow-2xl p-3 flex flex-col gap-2.5">
                              <input
                                ref={editPTagRef}
                                value={editPTagName}
                                onChange={(e) => setEditPTagName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); commitEditPTag(tag.id); }
                                  if (e.key === "Escape") setEditingPTagId(null);
                                }}
                                onBlur={() => commitEditPTag(tag.id)}
                                className="h-7 px-2.5 rounded-lg bg-white/[0.06] border border-white/[0.10] text-xs text-white outline-none focus:border-violet-500/50 transition-colors"
                              />
                              <div className="flex items-center gap-2">
                                {PTAG_COLORS.map((co) => (
                                  <button key={co.name} type="button"
                                    onMouseDown={(e) => { e.preventDefault(); setEditPTagColor(co.name); updateTag(tag.id, { color: co.name }); }}
                                    className={`w-5 h-5 rounded-full flex-shrink-0 ${co.dot} transition-all ${
                                      editPTagColor === co.name
                                        ? `ring-2 ring-offset-[2px] ring-offset-[#0B0F1C] ${co.ring} scale-110`
                                        : "opacity-50 hover:opacity-90 hover:scale-105"
                                    }`}
                                  />
                                ))}
                                <button type="button"
                                  onMouseDown={(e) => { e.preventDefault(); deletePTag(tag.id); }}
                                  className="ml-auto text-[10px] text-red-400/60 hover:text-red-400 transition-colors">
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* + New Tag trigger */}
                    {!addingPTag && (
                      <button type="button" onClick={() => setAddingPTag(true)}
                        className="flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full border border-dashed border-white/[0.10] bg-white/[0.02] text-[11px] text-slate-500 hover:border-emerald-500/40 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all duration-150">
                        <Plus className="w-2.5 h-2.5" /> New Tag
                      </button>
                    )}
                  </div>

                  {/* Inline creation panel */}
                  {addingPTag && (
                    <div className="flex items-center gap-2 flex-wrap p-2 rounded-xl bg-white/[0.02] border border-white/[0.07]">
                      <input
                        ref={newPTagRef}
                        value={newPTagName}
                        onChange={(e) => setNewPTagName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); commitNewPTag(); }
                          if (e.key === "Escape") { setNewPTagName(""); setNewPTagColor("violet"); setAddingPTag(false); }
                        }}
                        onBlur={commitNewPTag}
                        placeholder="Tag name…"
                        className="flex-1 min-w-[100px] h-7 px-2.5 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[11px] text-white placeholder:text-slate-600 outline-none focus:border-violet-500/50"
                      />
                      <div className="flex items-center gap-1.5">
                        {PTAG_COLORS.map((co) => (
                          <button key={co.name} type="button"
                            onMouseDown={(e) => { e.preventDefault(); setNewPTagColor(co.name); }}
                            className={`w-4 h-4 rounded-full flex-shrink-0 ${co.dot} transition-all ${
                              newPTagColor === co.name
                                ? `ring-2 ring-offset-[2px] ring-offset-[#0F1629] ${co.ring} scale-110`
                                : "opacity-50 hover:opacity-80"
                            }`}
                          />
                        ))}
                      </div>
                      <button type="button"
                        onMouseDown={(e) => { e.preventDefault(); setNewPTagName(""); setNewPTagColor("violet"); setAddingPTag(false); }}
                        className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-400 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => { setShowNewProject(false); setNewProjectName(""); setNewProjectError(false); setAddingPTag(false); setEditingPTagId(null); }}
                    className="flex-1 h-8 rounded-lg border border-white/[0.07] bg-white/[0.03] text-xs text-slate-400 hover:text-white transition-all">
                    Cancel
                  </button>
                  <button type="button" onClick={handleSaveNewProject}
                    className="flex-1 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs text-white font-medium transition-all">
                    Create Project
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Priority</label>
            <ToggleGroup<Priority> options={["High", "Med", "Low"]} value={form.priority}
              onChange={(v) => setForm((f) => ({ ...f, priority: v }))} activeStyles={PRIORITY_ACTIVE} />
          </div>

          {/* Energy */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Energy</label>
            <ToggleGroup<Energy> options={["Flow", "Quick", "Easy"]} value={form.energy}
              onChange={(v) => setForm((f) => ({ ...f, energy: v }))} activeStyles={ENERGY_ACTIVE} />
          </div>

          {/* Urgency */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Urgency</label>
            <div className="flex gap-2">
              {([
                { value: "urgent",     label: "🔥 Urgent"    },
                { value: "not-urgent", label: "🧊 Not Urgent" },
              ] as { value: Urgency; label: string }[]).map(({ value, label }) => (
                <button key={value} type="button" onClick={() => setForm((f) => ({ ...f, urgency: value }))}
                  className={`flex-1 h-8 rounded-lg text-xs font-medium border transition-all duration-150 ${
                    (form.urgency ?? "not-urgent") === value
                      ? value === "urgent"
                        ? "bg-red-500/20 border-red-500/50 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.15)]"
                        : "bg-white/[0.06] border-white/[0.12] text-slate-300"
                      : "border-white/[0.07] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline + Manual Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Deadline</label>
              <DatePickerInput
                value={form.deadline ?? null}
                onChange={(v) => setForm((f) => ({ ...f, deadline: v }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Manual Time (min)</label>
              <input type="number" min={0} value={form.manualMinutes}
                onChange={(e) => setForm((f) => ({ ...f, manualMinutes: Math.max(0, Number(e.target.value)) }))}
                className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Notes — rich text (checklist + bullet list), saved as HTML */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Notes</label>
            <ChecklistEditor
              key={notesResetKey}
              defaultValue={form.notes}
              onChange={(html) => setForm((f) => ({ ...f, notes: html }))}
              placeholder="Optional context or links…"
              maxHeightVariant="modal"
              className="w-full rounded-xl bg-white/[0.04] border border-white/[0.07] transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">
              Cancel
            </button>
            <button
              type="submit"
              // Without this, mousedown blurs the still-focused Notes editor, its toolbar
              // unmounts mid-click, the layout shifts up underneath the pointer, and the
              // browser's click lands somewhere other than this button — same race fixed on
              // Quick Notes' Save button.
              onMouseDown={(e) => e.preventDefault()}
              className="flex-1 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm text-white font-medium transition-all shadow-[0_0_20px_rgba(124,58,237,0.35)]">
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
