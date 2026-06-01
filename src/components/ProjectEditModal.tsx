"use client";

import { useState, useEffect } from "react";
import { X, Trash2, Plus, Pencil, Check } from "lucide-react";
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

// ── New-tag mini form ─────────────────────────────────────────────────────────

function NewTagForm({
  onAdd,
  onCancel,
}: {
  onAdd: (label: string, color: string) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("violet");
  const [err,   setErr]   = useState(false);

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-600/[0.05] p-3 flex flex-col gap-2.5">
      <div className="flex gap-2 items-center">
        <input
          autoFocus
          type="text"
          value={label}
          onChange={(e) => { setLabel(e.target.value); setErr(false); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && label.trim()) onAdd(label.trim(), color);
            if (e.key === "Escape") onCancel();
          }}
          placeholder="Tag name…"
          className={`flex-1 h-7 px-2.5 rounded-lg bg-white/[0.04] border text-xs text-white placeholder:text-slate-700 outline-none focus:border-violet-500/60 transition-colors ${err ? "border-red-500/60" : "border-white/[0.07]"}`}
        />
        <button onClick={() => { if (!label.trim()) { setErr(true); return; } onAdd(label.trim(), color); }} className="px-2.5 h-7 rounded-lg bg-violet-600 hover:bg-violet-500 text-[11px] text-white font-medium flex-shrink-0 transition-all">
          Add
        </button>
        <button onClick={onCancel} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {err && <p className="text-[10px] text-red-400">Label required.</p>}
      <div className="flex gap-1.5">
        {COLOR_PALETTE.map((c) => (
          <button
            key={c.value}
            onClick={() => setColor(c.value)}
            className={`w-4 h-4 rounded-full ${c.dot} transition-all ${
              color === c.value ? "ring-2 ring-white/60 ring-offset-1 ring-offset-[#0F1629] scale-110" : "opacity-40 hover:opacity-80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function ProjectEditModal({ project, onClose }: Props) {
  const { tags, addTag, updateTag, deleteTag, updateProject } = useDashboard();

  const [name,        setName]        = useState("");
  const [emoji,       setEmoji]       = useState("📁");
  const [emojiLocked, setEmojiLocked] = useState(false);
  const [tagIds,      setTagIds]      = useState<string[]>([]);
  const [status,      setStatus]      = useState<Project["status"]>("on-track");
  const [milestone,   setMilestone]   = useState("");
  const [nameErr,     setNameErr]     = useState(false);
  const [showNewTag,  setShowNewTag]  = useState(false);
  const [renamingId,  setRenamingId]  = useState<string | null>(null);
  const [renameVal,   setRenameVal]   = useState("");
  // Used to auto-select a newly created tag after the reducer updates
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setEmoji(project.emoji ?? "📁");
      setEmojiLocked(true); // existing emoji treated as locked by default
      setTagIds(project.tagIds ?? []);
      setStatus(project.status);
      setMilestone(project.milestone);
      setNameErr(false);
      setShowNewTag(false);
      setRenamingId(null);
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

  function toggleTag(id: string) {
    setTagIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function commitRename(id: string) {
    const trimmed = renameVal.trim();
    if (trimmed) updateTag(id, { label: trimmed });
    setRenamingId(null);
  }

  function handleAddTag(label: string, color: string) {
    addTag({ label, color });
    setPendingLabel(label); // will be selected once the reducer fires
    setShowNewTag(false);
  }

  function handleDeleteTag(id: string) {
    deleteTag(id);
    setTagIds((prev) => prev.filter((x) => x !== id));
  }

  function handleSave() {
    if (!name.trim()) { setNameErr(true); return; }
    updateProject(project!.id, {
      name:      name.trim(),
      emoji,
      tagIds,
      status,
      milestone: milestone.trim(),
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

          {/* ── Tag grid ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Tags
                {tagIds.length > 0 && (
                  <span className="ml-1.5 text-violet-400 font-normal normal-case tracking-normal">{tagIds.length} selected</span>
                )}
              </label>
              <button
                type="button"
                onClick={() => setShowNewTag((v) => !v)}
                className="flex items-center gap-0.5 text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
              >
                <Plus className="w-3 h-3" /> New Tag
              </button>
            </div>

            {/* Pill grid */}
            <div className="flex flex-wrap gap-2 p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              {tags.map((tag) => {
                const isSelected  = tagIds.includes(tag.id);
                const isRenaming  = renamingId === tag.id;
                const activeStyle = TAG_ACTIVE[tag.color] ?? TAG_ACTIVE.violet;
                const dotClass    = COLOR_PALETTE.find((c) => c.value === tag.color)?.dot ?? "bg-slate-500";

                if (isRenaming) {
                  return (
                    <div
                      key={tag.id}
                      className="flex items-center gap-1 pl-2 pr-1.5 py-1 rounded-full border border-violet-500/50 bg-violet-600/10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
                      <input
                        autoFocus
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(tag.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="w-20 text-xs bg-transparent text-white outline-none"
                      />
                      <button
                        onClick={() => commitRename(tag.id)}
                        className="text-violet-400 hover:text-violet-200 transition-colors"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`group relative flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full border text-xs font-medium cursor-pointer select-none transition-all duration-150 ${
                      isSelected ? activeStyle : "bg-white/[0.04] text-slate-400 border border-white/[0.05] hover:border-white/[0.12] hover:text-slate-300"
                    }`}
                  >
                    {/* Color dot */}
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
                    {/* Label */}
                    <span className="leading-none">{tag.label}</span>
                    {/* Rename icon — always present, fades in on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingId(tag.id);
                        setRenameVal(tag.label);
                      }}
                      className="ml-0.5 opacity-0 group-hover:opacity-50 hover:!opacity-100 text-current transition-all duration-100"
                      title="Rename"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                    {/* Delete icon — hover-reveal at right edge */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTag(tag.id); }}
                      className="opacity-0 group-hover:opacity-40 hover:!opacity-100 text-current hover:text-red-400 transition-all duration-100"
                      title="Delete tag"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}

              {tags.length === 0 && (
                <p className="text-xs text-slate-600 w-full text-center py-2">No tags yet — create one above.</p>
              )}
            </div>

            {/* New tag inline form */}
            {showNewTag && (
              <NewTagForm
                onAdd={handleAddTag}
                onCancel={() => setShowNewTag(false)}
              />
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

          {/* Milestone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Milestone</label>
            <input
              type="text"
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
              placeholder="e.g. Launch · Jul 15"
              className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors"
            />
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
