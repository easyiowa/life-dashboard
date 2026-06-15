"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus } from "lucide-react";
import { useDashboard, type Project } from "@/context/DashboardContext";
import EmojiPickerButton from "@/components/EmojiPickerButton";

interface Props {
  project: Project | null;
  onClose: () => void;
}

// ── Emoji suggestion engine ───────────────────────────────────────────────────

const PROJECT_EMOJI_RULES: { pattern: RegExp; emoji: string }[] = [
  { pattern: /product|launch|ship|release/i,    emoji: "🚀" },
  { pattern: /brand|design|creative|identity/i, emoji: "🎨" },
  { pattern: /market|campaign|ads?|social/i,    emoji: "📣" },
  { pattern: /client|customer|account/i,        emoji: "👥" },
  { pattern: /website|web|frontend|backend|laptop|computer|\bpc\b|screen|coding|dev/i, emoji: "💻" },
  { pattern: /finance|budget|revenue|money/i,   emoji: "💰" },
  { pattern: /meeting|sync|standup/i,           emoji: "💬" },
  { pattern: /home|house|renovat/i,             emoji: "🏡" },
  { pattern: /garden|landscape|outdoor/i,       emoji: "🌿" },
  { pattern: /content|blog|video|write/i,       emoji: "✍️" },
  { pattern: /data|analytic|report|metric/i,    emoji: "📊" },
  { pattern: /partner|deal|outreach|bizdev/i,   emoji: "🤝" },
  { pattern: /influenc/i,                       emoji: "⭐" },
  { pattern: /operat|process|system/i,          emoji: "⚙️" },
  { pattern: /strateg|plan|roadmap/i,           emoji: "🗺️" },
];

function suggestProjectEmoji(name: string): string {
  const lower = name.toLowerCase().trim();
  for (const { pattern, emoji } of PROJECT_EMOJI_RULES) {
    if (pattern.test(lower)) return emoji;
  }
  return "📁";
}

// ── Style maps ────────────────────────────────────────────────────────────────

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

// Active pill styles — full literal class strings so Tailwind JIT includes them
const TAG_ACTIVE: Record<string, string> = {
  emerald: "bg-emerald-500/25 text-emerald-200 border border-emerald-400/60 shadow-[0_0_10px_rgba(16,185,129,0.3)]",
  violet:  "bg-violet-500/25 text-violet-200 border border-violet-400/60 shadow-[0_0_10px_rgba(139,92,246,0.3)]",
  sky:     "bg-sky-500/25 text-sky-200 border border-sky-400/60 shadow-[0_0_10px_rgba(14,165,233,0.3)]",
  amber:   "bg-amber-500/25 text-amber-200 border border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.3)]",
  pink:    "bg-pink-500/25 text-pink-200 border border-pink-400/60 shadow-[0_0_10px_rgba(236,72,153,0.3)]",
  teal:    "bg-teal-500/25 text-teal-200 border border-teal-400/60 shadow-[0_0_10px_rgba(20,184,166,0.3)]",
  blue:    "bg-blue-500/25 text-blue-200 border border-blue-400/60 shadow-[0_0_10px_rgba(59,130,246,0.3)]",
  rose:    "bg-rose-500/25 text-rose-200 border border-rose-400/60 shadow-[0_0_10px_rgba(244,63,94,0.3)]",
  orange:  "bg-orange-500/25 text-orange-200 border border-orange-400/60 shadow-[0_0_10px_rgba(249,115,22,0.3)]",
  indigo:  "bg-indigo-500/25 text-indigo-200 border border-indigo-400/60 shadow-[0_0_10px_rgba(99,102,241,0.3)]",
};

const STATUS_OPTIONS: { value: Project["status"]; label: string; active: string }[] = [
  { value: "ahead",    label: "Ahead",    active: "bg-emerald-600/20 border-emerald-500/50 text-emerald-300" },
  { value: "on-track", label: "On Track", active: "bg-white/[0.05] border-white/[0.12] text-slate-300"       },
  { value: "at-risk",  label: "At Risk",  active: "bg-amber-600/20 border-amber-500/50 text-amber-300"       },
];

const INACTIVE_STATUS = "border-white/[0.07] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]";

// ── Tag colour picker palette ─────────────────────────────────────────────────

const PTAG_COLORS: Array<{ name: string; dot: string; ring: string }> = [
  { name: "violet",  dot: "bg-violet-500",  ring: "ring-violet-400"  },
  { name: "emerald", dot: "bg-emerald-500", ring: "ring-emerald-400" },
  { name: "rose",    dot: "bg-rose-500",    ring: "ring-rose-400"    },
  { name: "amber",   dot: "bg-amber-500",   ring: "ring-amber-400"   },
  { name: "indigo",  dot: "bg-indigo-500",  ring: "ring-indigo-400"  },
];

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function ProjectEditModal({ project, onClose }: Props) {
  const { tags, addTag, updateTag, deleteTag, updateProject } = useDashboard();

  const [name,        setName]        = useState("");
  const [emoji,       setEmoji]       = useState("📁");
  const [emojiLocked, setEmojiLocked] = useState(false);
  const [tagIds,      setTagIds]      = useState<string[]>([]);
  const [status,      setStatus]      = useState<Project["status"]>("on-track");
  const [nameErr,     setNameErr]     = useState(false);
  // Used to auto-select a newly created tag after the reducer updates
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  // Tag creation panel
  const [addingPTag,   setAddingPTag]   = useState(false);
  const [newTagName,   setNewTagName]   = useState("");
  const [newTagColor,  setNewTagColor]  = useState("violet");
  // Tag edit popover
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName,  setEditTagName]  = useState("");
  const [editTagColor, setEditTagColor] = useState("violet");

  const newTagRef  = useRef<HTMLInputElement>(null);
  const editTagRef = useRef<HTMLInputElement>(null);

  // Auto-focus refs
  useEffect(() => { if (addingPTag)    newTagRef.current?.focus();  }, [addingPTag]);
  useEffect(() => { if (editingTagId) editTagRef.current?.focus(); }, [editingTagId]);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setEmoji(project.emoji ?? "📁");
      setEmojiLocked(true);
      setTagIds(project.tagIds ?? []);
      setStatus(project.status);
      setNameErr(false);
      setAddingPTag(false);
      setNewTagName("");
      setNewTagColor("violet");
      setEditingTagId(null);
      setPendingLabel(null);
    }
  }, [project]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-suggest emoji while the user types (when not manually locked)
  useEffect(() => {
    if (!emojiLocked) setEmoji(suggestProjectEmoji(name));
  }, [name, emojiLocked]);

  // Auto-select newly created tag once it appears in the tags array
  useEffect(() => {
    if (!pendingLabel) return;
    const match = tags.find((t) => t.label === pendingLabel);
    if (match) {
      setTagIds((prev) => prev.includes(match.id) ? prev : [...prev, match.id]);
      setPendingLabel(null);
    }
  }, [tags, pendingLabel]);

  if (!project) return null;

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
    setTagIds((prev) => prev.filter((x) => x !== id));
    if (editingTagId === id) setEditingTagId(null);
  }

  function handleSave() {
    if (!name.trim()) { setNameErr(true); return; }
    updateProject(project!.id, {
      name:      name.trim(),
      emoji,
      tagIds,
      status,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#0F1629] border border-white/[0.08] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0F1629] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Edit Project</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">

          {/* Project name + emoji */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Project Name</label>
            <div className="flex gap-2">
              <EmojiPickerButton
                emoji={emoji}
                locked={emojiLocked}
                onPick={(e) => { setEmoji(e); setEmojiLocked(true); }}
              />
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameErr(false); }}
                className={`flex-1 h-10 px-3 rounded-xl bg-white/[0.04] border text-sm text-white outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors ${nameErr ? "border-red-500/60" : "border-white/[0.07]"}`}
              />
            </div>
            {nameErr && <p className="text-[10px] text-red-400">Name is required.</p>}
            {!emojiLocked && name.length > 0 && (
              <p className="text-[10px] text-slate-600">
                Auto-suggested: <span className="text-slate-400">{emoji}</span> · Click the emoji to browse all.
              </p>
            )}
          </div>

          {/* ── Tags ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Tags
              {tagIds.length > 0 && (
                <span className="ml-1.5 text-violet-400 font-normal normal-case tracking-normal">
                  {tagIds.length} selected
                </span>
              )}
            </label>

            {/* Tag pill row */}
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
                          setTagIds((prev) => [...prev, tag.id]);
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
                            setTagIds((prev) => prev.filter((x) => x !== tag.id));
                            if (isEditing) setEditingTagId(null);
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
                  ref={newTagRef}
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); commitNewTag(); }
                    if (e.key === "Escape") { setNewTagName(""); setNewTagColor("violet"); setAddingPTag(false); }
                  }}
                  onBlur={commitNewTag}
                  placeholder="Tag name…"
                  className="flex-1 min-w-[100px] h-7 px-2.5 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[11px] text-white placeholder:text-slate-600 outline-none focus:border-violet-500/50"
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
                <button type="button"
                  onMouseDown={(e) => { e.preventDefault(); setNewTagName(""); setNewTagColor("violet"); setAddingPTag(false); }}
                  className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-400 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Status</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`flex-1 h-8 rounded-lg text-xs font-medium border transition-all duration-150 ${status === opt.value ? opt.active : INACTIVE_STATUS}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm text-white font-medium transition-all shadow-[0_0_20px_rgba(124,58,237,0.35)]"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
