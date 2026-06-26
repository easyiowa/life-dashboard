"use client";

import { useState, useEffect, useRef } from "react";
import { X, FolderKanban, Plus, Pencil, Trash2, GripVertical, Check } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDashboard, type Project } from "@/context/DashboardContext";
import { areaColor } from "@/lib/areaColors";
import EmojiPickerButton from "@/components/EmojiPickerButton";
import { useModalOverlay } from "@/hooks/useModalOverlay";

// ── Style maps — mirrored from ProjectEditModal so tag pills read identically ──

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

const TAG_ACTIVE: Record<string, string> = {
  emerald: "bg-emerald-500/25 text-emerald-900 dark:text-emerald-200 border border-emerald-400/60 shadow-[0_0_10px_rgba(16,185,129,0.3)]",
  violet:  "bg-violet-500/25 text-violet-900 dark:text-violet-200 border border-violet-400/60 shadow-[0_0_10px_rgba(139,92,246,0.3)]",
  sky:     "bg-sky-500/25 text-sky-900 dark:text-sky-200 border border-sky-400/60 shadow-[0_0_10px_rgba(14,165,233,0.3)]",
  amber:   "bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.3)]",
  pink:    "bg-pink-500/25 text-pink-900 dark:text-pink-200 border border-pink-400/60 shadow-[0_0_10px_rgba(236,72,153,0.3)]",
  teal:    "bg-teal-500/25 text-teal-900 dark:text-teal-200 border border-teal-400/60 shadow-[0_0_10px_rgba(20,184,166,0.3)]",
  blue:    "bg-blue-500/25 text-blue-900 dark:text-blue-200 border border-blue-400/60 shadow-[0_0_10px_rgba(59,130,246,0.3)]",
  rose:    "bg-rose-500/25 text-rose-900 dark:text-rose-200 border border-rose-400/60 shadow-[0_0_10px_rgba(244,63,94,0.3)]",
  orange:  "bg-orange-500/25 text-orange-900 dark:text-orange-200 border border-orange-400/60 shadow-[0_0_10px_rgba(249,115,22,0.3)]",
  indigo:  "bg-indigo-500/25 text-indigo-900 dark:text-indigo-200 border border-indigo-400/60 shadow-[0_0_10px_rgba(99,102,241,0.3)]",
};

const PTAG_COLORS: Array<{ name: string; dot: string; ring: string }> = [
  { name: "violet",  dot: "bg-violet-500",  ring: "ring-violet-400"  },
  { name: "emerald", dot: "bg-emerald-500", ring: "ring-emerald-400" },
  { name: "rose",    dot: "bg-rose-500",    ring: "ring-rose-400"    },
  { name: "amber",   dot: "bg-amber-500",   ring: "ring-amber-400"   },
  { name: "indigo",  dot: "bg-indigo-500",  ring: "ring-indigo-400"  },
];

// ── Dynamic tag selector — controlled, reused for both the creation row and ────
// each project row's inline edit state.

function TagSelector({ tagIds, onChange }: { tagIds: string[]; onChange: (next: string[]) => void }) {
  const { tags, addTag, updateTag, deleteTag } = useDashboard();

  const [addingPTag,   setAddingPTag]   = useState(false);
  const [newTagName,   setNewTagName]   = useState("");
  const [newTagColor,  setNewTagColor]  = useState("violet");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName,  setEditTagName]  = useState("");
  const [editTagColor, setEditTagColor] = useState("violet");
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  const newTagRef  = useRef<HTMLInputElement>(null);
  const editTagRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (addingPTag)   newTagRef.current?.focus();  }, [addingPTag]);
  useEffect(() => { if (editingTagId) editTagRef.current?.focus(); }, [editingTagId]);

  // Auto-select a newly created tag once it lands in the global tags array
  useEffect(() => {
    if (!pendingLabel) return;
    const match = tags.find((t) => t.label === pendingLabel);
    if (match) {
      onChange(tagIds.includes(match.id) ? tagIds : [...tagIds, match.id]);
      setPendingLabel(null);
    }
  }, [tags, pendingLabel]); // eslint-disable-line react-hooks/exhaustive-deps

  function commitNewTag() {
    const label = newTagName.trim();
    if (label) {
      addTag({ label, color: newTagColor });
      setPendingLabel(label);
    }
    setNewTagName("");
    setNewTagColor("violet");
    setAddingPTag(false);
  }

  function commitEditTag(id: string) {
    const label = editTagName.trim();
    if (label) updateTag(id, { label, color: editTagColor });
    setEditingTagId(null);
  }

  function handleDeleteTag(id: string) {
    deleteTag(id);
    onChange(tagIds.filter((x) => x !== id));
    if (editingTagId === id) setEditingTagId(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const isSelected = tagIds.includes(tag.id);
          const isEditing  = editingTagId === tag.id;
          const dot  = COLOR_PALETTE.find((c) => c.value === tag.color)?.dot ?? "bg-slate-500";
          const pill = TAG_ACTIVE[tag.color] ?? TAG_ACTIVE.violet;
          const cm   = PTAG_COLORS.find((c) => c.name === tag.color) ?? PTAG_COLORS[0];

          return (
            <div key={tag.id} className="relative">
              <button
                type="button"
                onClick={() => {
                  if (isEditing) { setEditingTagId(null); return; }
                  if (isSelected) {
                    setEditingTagId(tag.id);
                    setEditTagName(tag.label);
                    setEditTagColor(tag.color);
                  } else {
                    onChange([...tagIds, tag.id]);
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
                      onChange(tagIds.filter((x) => x !== tag.id));
                      if (isEditing) setEditingTagId(null);
                    }}
                    className="ml-0.5 w-3.5 h-3.5 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 hover:bg-white/10 transition-all"
                  >
                    <X className="w-2.5 h-2.5" />
                  </span>
                )}
              </button>

              {isEditing && (
                <div className="absolute top-full left-0 mt-1 z-30 w-52 rounded-xl border border-white/[0.12] bg-[#0B0F1C] shadow-2xl p-3 flex flex-col gap-2.5">
                  <input
                    ref={editTagRef}
                    value={editTagName}
                    onChange={(e) => setEditTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); commitEditTag(tag.id); }
                      if (e.key === "Escape") setEditingTagId(null);
                    }}
                    onBlur={() => commitEditTag(tag.id)}
                    className="h-7 px-2.5 rounded-lg bg-white/[0.06] border border-white/[0.10] text-xs text-white outline-none focus:border-violet-500/50 transition-colors"
                  />
                  <div className="flex items-center gap-2">
                    {PTAG_COLORS.map((co) => (
                      <button key={co.name} type="button"
                        onMouseDown={(e) => { e.preventDefault(); setEditTagColor(co.name); updateTag(tag.id, { color: co.name }); }}
                        className={`w-5 h-5 rounded-full flex-shrink-0 ${co.dot} transition-all ${
                          editTagColor === co.name
                            ? `ring-2 ring-offset-[2px] ring-offset-[#0B0F1C] ${co.ring} scale-110`
                            : "opacity-50 hover:opacity-90 hover:scale-105"
                        }`}
                      />
                    ))}
                    <button type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleDeleteTag(tag.id); }}
                      className="ml-auto text-[10px] text-red-400/60 hover:text-red-400 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!addingPTag && (
          <button type="button" onClick={() => setAddingPTag(true)}
            className="flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full border border-dashed border-white/[0.10] bg-white/[0.02] text-[11px] text-slate-500 hover:border-emerald-500/40 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all duration-150">
            <Plus className="w-2.5 h-2.5" /> New Tag
          </button>
        )}
      </div>

      {addingPTag && (
        <div className="flex items-center gap-2 flex-wrap p-2 rounded-xl bg-white/[0.02] border border-white/[0.07]">
          <input
            ref={newTagRef}
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitNewTag(); }
              if (e.key === "Escape") { setNewTagName(""); setNewTagColor("violet"); setAddingPTag(false); }
            }}
            placeholder="Tag name…"
            className="flex-1 min-w-[80px] h-7 px-2.5 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[11px] text-white placeholder:text-slate-600 outline-none focus:border-violet-500/50"
          />
          <div className="flex items-center gap-1.5">
            {PTAG_COLORS.map((co) => (
              <button key={co.name} type="button"
                onMouseDown={(e) => { e.preventDefault(); setNewTagColor(co.name); }}
                className={`w-4 h-4 rounded-full flex-shrink-0 ${co.dot} transition-all ${
                  newTagColor === co.name
                    ? `ring-2 ring-offset-[2px] ring-offset-[#0F1629] ${co.ring} scale-110`
                    : "opacity-50 hover:opacity-80"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); commitNewTag(); }}
            className="w-6 h-6 rounded-lg flex items-center justify-center bg-violet-600/80 hover:bg-violet-500 text-white transition-all flex-shrink-0"
            title="Save tag"
          >
            <Check className="w-3 h-3" />
          </button>
          <button type="button"
            onMouseDown={(e) => { e.preventDefault(); setNewTagName(""); setNewTagColor("violet"); setAddingPTag(false); }}
            className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sortable project row ──────────────────────────────────────────────────────

function SortableProjectRow({ project, tintClassName }: { project: Project; tintClassName: string }) {
  const { updateProject, deleteProject } = useDashboard();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: project.id });

  const [editing,      setEditing]      = useState(false);
  const [name,         setName]         = useState(project.name);
  const [emoji,        setEmoji]        = useState(project.emoji ?? "📁");
  const [emojiLocked,  setEmojiLocked]  = useState(true);
  const [tagIds,       setTagIds]       = useState<string[]>(project.tagIds ?? []);
  const [confirm,      setConfirm]      = useState(false);

  useEffect(() => { if (!editing) setName(project.name); }, [project.name, editing]);

  function startEdit() {
    setName(project.name);
    setEmoji(project.emoji ?? "📁");
    setEmojiLocked(true);
    setTagIds(project.tagIds ?? []);
    setEditing(true);
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    updateProject(project.id, { name: trimmed, emoji, tagIds });
    setEditing(false);
  }

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border p-3 flex flex-col gap-2 transition-all duration-150 ${
        isDragging ? "shadow-2xl border-purple-500/30 bg-white/[0.04] scale-[1.01] z-50 opacity-80" : tintClassName
      }`}
    >
      <div className="flex items-center gap-2.5">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing transition-colors touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {confirm ? (
          <div className="flex-1 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-300 truncate">
              Delete <span className="text-white font-medium">&quot;{project.name}&quot;</span> and all its tasks?
            </p>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => setConfirm(false)}
                className="h-7 px-2.5 rounded-lg border border-white/[0.07] bg-white/[0.03] text-xs text-slate-400 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteProject(project.id)}
                className="h-7 px-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs text-white font-medium transition-all"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        ) : editing ? (
          <>
            <EmojiPickerButton
              emoji={emoji}
              locked={emojiLocked}
              onPick={(e) => { setEmoji(e); setEmojiLocked(true); }}
            />
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") { setName(project.name); setEditing(false); }
              }}
              className="flex-1 h-8 px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 transition-colors"
            />
            <button
              onClick={save}
              disabled={!name.trim()}
              className="w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-violet-300 hover:bg-violet-500/15 disabled:opacity-30 transition-all"
              title="Save"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <span className="text-sm flex-shrink-0">{project.emoji ?? "📁"}</span>
            <span className="flex-1 text-sm text-slate-200 truncate min-w-0">{project.name}</span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={startEdit}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all"
                title="Edit project"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setConfirm(true)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Delete project"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      {editing && !confirm && (
        <div className="pl-7">
          <TagSelector tagIds={tagIds} onChange={setTagIds} />
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

export default function ManageProjectsModal({ isOpen, onClose }: Props) {
  useModalOverlay(isOpen);
  const { spheres, projects, addProject, reorderProjects } = useDashboard();

  const [filterSphereId, setFilterSphereId] = useState<string>("");
  const [newName,        setNewName]        = useState("");
  const [newErr,         setNewErr]         = useState(false);
  const [newEmoji,       setNewEmoji]       = useState("📁");
  const [newEmojiLocked, setNewEmojiLocked] = useState(false);
  const [newTagIds,      setNewTagIds]      = useState<string[]>([]);
  const [newFocused,     setNewFocused]     = useState(false);

  useEffect(() => {
    if (isOpen && !filterSphereId && spheres.length > 0) setFilterSphereId(spheres[0].id);
  }, [isOpen, filterSphereId, spheres]);

  const activeSphere = spheres.find((s) => s.id === filterSphereId) ?? spheres[0];

  const scopedProjects = projects
    .filter((p) => p.sphere === activeSphere?.name)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !activeSphere) return;
    const from = scopedProjects.findIndex((p) => p.id === active.id);
    const to   = scopedProjects.findIndex((p) => p.id === over.id);
    if (from !== -1 && to !== -1) reorderProjects(activeSphere.name, from, to);
  }

  function handleAdd() {
    if (!newName.trim() || !activeSphere) { setNewErr(true); return; }
    addProject({
      sphere: activeSphere.name,
      name: newName.trim(),
      emoji: newEmoji,
      tagIds: newTagIds,
      status: "on-track",
      milestone: "",
    });
    setNewName("");
    setNewErr(false);
    setNewEmoji("📁");
    setNewEmojiLocked(false);
    setNewTagIds([]);
    setNewFocused(false);
  }

  // Stays revealed while focused, or while there's anything staged for creation
  const newProjectExpanded = newFocused || newName.trim().length > 0 || newTagIds.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0F1629] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-[#0F1629] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Manage Projects</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">

          {/* Area filter pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {spheres.map((s) => {
              const isActive = activeSphere?.id === s.id;
              const pill = areaColor(s.labelColor);
              return (
                <button
                  key={s.id}
                  onClick={() => setFilterSphereId(s.id)}
                  className={`px-3 h-7 rounded-full text-xs font-medium border transition-all duration-150 ${
                    isActive ? pill.pillActive : pill.pillInactive
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>

          {/* New project */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <EmojiPickerButton
                emoji={newEmoji}
                locked={newEmojiLocked}
                onPick={(e) => { setNewEmoji(e); setNewEmojiLocked(true); }}
              />
              <input
                type="text"
                value={newName}
                onFocus={() => setNewFocused(true)}
                onBlur={() => setNewFocused(false)}
                onChange={(e) => { setNewName(e.target.value); setNewErr(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                placeholder="New project…"
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
            {newErr && <p className="text-[10px] text-red-400">Project name is required.</p>}
            {newProjectExpanded && (
              <div className="pl-11">
                <TagSelector tagIds={newTagIds} onChange={setNewTagIds} />
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.05]" />

          {/* Sortable project list — scoped to the selected area */}
          {activeSphere && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={scopedProjects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2">
                  {scopedProjects.map((p) => (
                    <SortableProjectRow
                      key={p.id}
                      project={p}
                      tintClassName={`${areaColor(activeSphere.labelColor).bgTint} ${areaColor(activeSphere.labelColor).border}`}
                    />
                  ))}
                  {scopedProjects.length === 0 && (
                    <p className="text-xs text-slate-600 text-center py-4">No projects in this area yet.</p>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}
