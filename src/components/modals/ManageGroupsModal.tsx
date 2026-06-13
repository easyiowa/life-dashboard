"use client";

import { useState } from "react";
import { X, Settings, Plus, Pencil, Trash2, GripVertical, Check } from "lucide-react";
import {
  useDashboard,
  type RelationshipGroup,
  GROUP_COLOR_PALETTE,
  type GroupColor,
} from "@/context/DashboardContext";
import EmojiPickerButton from "@/components/EmojiPickerButton";

// ── Color helpers ─────────────────────────────────────────────────────────────

const DOT: Record<GroupColor, string> = {
  rose:    "bg-rose-400",
  sky:     "bg-sky-400",
  amber:   "bg-amber-400",
  emerald: "bg-emerald-400",
  violet:  "bg-violet-400",
  teal:    "bg-teal-400",
  orange:  "bg-orange-400",
  pink:    "bg-pink-400",
};

function ColorSwatches({
  value,
  onChange,
}: {
  value: GroupColor;
  onChange: (c: GroupColor) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {GROUP_COLOR_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-4 h-4 rounded-full flex-shrink-0 transition-all ${DOT[c]} ${
            value === c
              ? "ring-2 ring-white/50 ring-offset-1 ring-offset-[#0F1629] scale-110"
              : "opacity-50 hover:opacity-90"
          }`}
        />
      ))}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageGroupsModal({ isOpen, onClose }: Props) {
  const {
    relationshipGroups,
    addRelationshipGroup,
    updateRelationshipGroup,
    deleteRelationshipGroup,
  } = useDashboard();

  // ── New group form ────────────────────────────────────────────────────────
  const [newLabel,       setNewLabel]       = useState("");
  const [newEmoji,       setNewEmoji]       = useState("👥");
  const [newEmojiLocked, setNewEmojiLocked] = useState(false);
  const [newColor,       setNewColor]       = useState<GroupColor>("violet");
  const [newErr,         setNewErr]         = useState(false);

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editId,         setEditId]         = useState<string | null>(null);
  const [editLabel,      setEditLabel]      = useState("");
  const [editEmoji,      setEditEmoji]      = useState("👥");
  const [editEmojiLocked,setEditEmojiLocked]= useState(true);
  const [editColor,      setEditColor]      = useState<GroupColor>("violet");

  function handleAdd() {
    if (!newLabel.trim()) { setNewErr(true); return; }
    addRelationshipGroup({ label: newLabel.trim(), emoji: newEmoji, color: newColor });
    setNewLabel(""); setNewEmoji("👥"); setNewEmojiLocked(false); setNewErr(false);
  }

  function startEdit(g: RelationshipGroup) {
    setEditId(g.id);
    setEditLabel(g.label);
    setEditEmoji(g.emoji);
    setEditEmojiLocked(true);
    setEditColor(g.color);
  }

  function commitEdit() {
    if (!editLabel.trim() || !editId) return;
    updateRelationshipGroup(editId, {
      label: editLabel.trim(),
      emoji: editEmoji,
      color: editColor,
    });
    setEditId(null);
  }

  function cancelEdit() { setEditId(null); }

  function handleClose() {
    setEditId(null);
    setNewLabel(""); setNewEmoji("👥"); setNewEmojiLocked(false); setNewErr(false);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      {/* Panel — no overflow-hidden so emoji picker popovers render freely */}
      <div className="relative bg-[#0F1629] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Manage Groups</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">

          {/* ── NEW GROUP — creation block at top ─────────────────────────── */}
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">New Group</label>

            <div className="flex items-center gap-2">
              <EmojiPickerButton
                emoji={newEmoji}
                locked={newEmojiLocked}
                onPick={(e) => { setNewEmoji(e); setNewEmojiLocked(true); }}
              />
              <input
                type="text"
                value={newLabel}
                onChange={(e) => { setNewLabel(e.target.value); setNewErr(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                placeholder="Group name…"
                className={`flex-1 h-10 px-3 rounded-xl bg-white/[0.04] border text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors ${
                  newErr ? "border-red-500/60" : "border-white/[0.07]"
                }`}
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newLabel.trim()}
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white font-medium disabled:opacity-30 transition-all shadow-[0_0_16px_rgba(139,92,246,0.4)] disabled:shadow-none"
                style={{ background: "linear-gradient(to right, #8B5CF6, #7C3AED)" }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Color swatches for new group */}
            <div className="flex items-center gap-2 pl-12">
              <span className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Color</span>
              <ColorSwatches value={newColor} onChange={setNewColor} />
            </div>

            {newErr && (
              <p className="text-[10px] text-red-400 pl-12">Group name is required.</p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.05]" />

          {/* ── EXISTING GROUPS ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Existing Groups
              <span className="ml-2 text-slate-700 normal-case font-normal tracking-normal">
                {relationshipGroups.length} total
              </span>
            </label>

            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {relationshipGroups.map((g) => {
                if (editId === g.id) {
                  return (
                    <div
                      key={g.id}
                      className="flex flex-col gap-3 p-3 rounded-xl bg-violet-500/[0.06] border border-violet-500/20"
                    >
                      {/* Edit row: emoji + input */}
                      <div className="flex items-center gap-2">
                        <EmojiPickerButton
                          emoji={editEmoji}
                          locked={editEmojiLocked}
                          onPick={(e) => { setEditEmoji(e); setEditEmojiLocked(true); }}
                        />
                        <input
                          autoFocus
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="flex-1 h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors"
                        />
                      </div>

                      {/* Color + actions */}
                      <div className="flex items-center justify-between pl-12">
                        <ColorSwatches value={editColor} onChange={setEditColor} />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="h-7 px-3 rounded-lg border border-white/[0.07] text-xs text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={commitEdit}
                            disabled={!editLabel.trim()}
                            className="h-7 px-3 rounded-lg text-xs text-white font-medium disabled:opacity-30 transition-all flex items-center gap-1.5"
                            style={{ background: "linear-gradient(to right, #8B5CF6, #7C3AED)" }}
                          >
                            <Check className="w-3 h-3" />
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={g.id}
                    className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.07] transition-all"
                  >
                    {/* Drag handle */}
                    <GripVertical className="w-3.5 h-3.5 text-slate-700 flex-shrink-0 cursor-grab" />

                    {/* Color dot */}
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT[g.color]}`} />

                    {/* Emoji + label */}
                    <span className="flex-1 text-sm text-slate-200 truncate min-w-0">
                      {g.emoji} {g.label}
                    </span>

                    {/* Actions — revealed on hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(g)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all"
                        title="Edit group"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRelationshipGroup(g.id)}
                        disabled={relationshipGroups.length <= 1}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-700 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        title="Delete group"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Close footer */}
          <button
            type="button"
            onClick={handleClose}
            className="w-full h-10 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
