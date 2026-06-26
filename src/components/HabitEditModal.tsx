"use client";

import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { useDashboard, type Habit } from "@/context/DashboardContext";
import EmojiPickerButton from "@/components/EmojiPickerButton";
import AutoExpandingTextarea from "@/components/ui/AutoExpandingTextarea";
import { useModalOverlay } from "@/hooks/useModalOverlay";

interface Props {
  habit: Habit | null;
  onClose: () => void;
}

// ── Emoji suggestion engine (mirrored from HabitModal) ────────────────────────

const EMOJI_RULES: { pattern: RegExp; emoji: string }[] = [
  { pattern: /water|hydrat|drink|fluid/i,           emoji: "💧" },
  { pattern: /gym|workout|run|lift|exercise|sport/i, emoji: "💪" },
  { pattern: /smok|cigaret|tobacco/i,                emoji: "🚭" },
  { pattern: /sugar|junk|fast.?food|burger|fries/i,  emoji: "🍔" },
  { pattern: /read|book|study|learn/i,               emoji: "📚" },
  { pattern: /meditat|mindful|breath/i,              emoji: "🧘" },
  { pattern: /sleep|rest|nap/i,                      emoji: "😴" },
  { pattern: /walk|step|hike/i,                      emoji: "🚶" },
  { pattern: /cook|meal|eat healthy/i,               emoji: "🥗" },
  { pattern: /journal|diary|write/i,                 emoji: "📝" },
  { pattern: /screen|phone|social.?media|scroll/i,   emoji: "📵" },
  { pattern: /coffee|caffeine/i,                     emoji: "☕" },
  { pattern: /alcohol|drink|wine|beer/i,             emoji: "🍷" },
  { pattern: /code|program|dev|laptop|computer|\bpc\b|coding/i, emoji: "💻" },
  { pattern: /stretch|yoga|flexib/i,                 emoji: "🤸" },
];

function suggestEmoji(title: string): string {
  const lower = title.toLowerCase().trim();
  for (const { pattern, emoji } of EMOJI_RULES) {
    if (pattern.test(lower)) return emoji;
  }
  return "⭐";
}

// ── Style helpers ─────────────────────────────────────────────────────────────

const INACTIVE = "border-white/[0.07] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]";

const TYPE_STYLES: Record<Habit["type"], string> = {
  start: "bg-emerald-600/20 border-emerald-500/50 text-emerald-300",
  stop:  "bg-red-600/20 border-red-500/50 text-red-300",
};

const ROUTINE_OPTIONS: { value: NonNullable<Habit["routine"]>; label: string }[] = [
  { value: "morning", label: "☀️ Morning" },
  { value: "day",     label: "🌤️ Day"     },
  { value: "evening", label: "🌙 Evening" },
];

const FREQ_OPTIONS: { value: Habit["frequency"]; label: string }[] = [
  { value: "daily",   label: "Daily"   },
  { value: "weekly",  label: "Weekly"  },
  { value: "monthly", label: "Monthly" },
];

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function HabitEditModal({ habit, onClose }: Props) {
  const { updateHabit, deleteHabit } = useDashboard();
  useModalOverlay(!!habit);

  const [title,       setTitle]       = useState("");
  const [type,        setType]        = useState<Habit["type"]>("start");
  const [routine,     setRoutine]     = useState<NonNullable<Habit["routine"]>>("day");
  const [frequency,   setFrequency]   = useState<Habit["frequency"]>("daily");
  const [targetCount, setTargetCount] = useState(5);
  const [notes,       setNotes]       = useState("");
  const [emoji,       setEmoji]       = useState("⭐");
  const [emojiLocked, setEmojiLocked] = useState(false);
  const [titleErr,    setTitleErr]    = useState(false);

  // Seed form from the active habit whenever it changes
  useEffect(() => {
    if (habit) {
      setTitle(habit.title);
      setType(habit.type);
      setRoutine(habit.routine ?? "day");
      setFrequency(habit.frequency);
      setTargetCount(habit.targetCount);
      setNotes(habit.notes);
      setEmoji(habit.emoji);
      setEmojiLocked(true); // existing emoji treated as locked by default
      setTitleErr(false);
    }
  }, [habit]);

  // Live emoji suggestion while typing (when not locked)
  useEffect(() => {
    if (!emojiLocked) setEmoji(suggestEmoji(title));
  }, [title, emojiLocked]);

  if (!habit) return null;

  function handleSave() {
    if (!title.trim()) { setTitleErr(true); return; }
    updateHabit(habit!.id, { title: title.trim(), type, routine, frequency, targetCount, notes, emoji });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#0F1629] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Edit Habit</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">

          {/* Title + emoji */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Habit Name</label>
            <div className="flex gap-2">
              <EmojiPickerButton
                emoji={emoji}
                locked={emojiLocked}
                onPick={(e) => { setEmoji(e); setEmojiLocked(true); }}
              />
              <div className="relative flex-1">
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setTitleErr(false); }}
                  className={`w-full h-10 px-3 pr-10 rounded-xl bg-white/[0.04] border text-sm text-white outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors ${
                    titleErr ? "border-red-500/60" : "border-white/[0.07]"
                  }`}
                />
                {/* This modal only ever represents an existing habit (HabitEditModal requires a
                    non-null habit — see the early `if (!habit) return null` above), so the
                    delete action belongs here unconditionally; the separate "+" creation flow
                    goes through HabitModal instead, which has no such button. */}
                <button
                  type="button"
                  onClick={() => { deleteHabit(habit!.id); onClose(); }}
                  title="Delete habit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {titleErr && <p className="text-[10px] text-red-400">Habit name is required.</p>}
            {!emojiLocked && title.length > 0 && (
              <p className="text-[10px] text-slate-600">
                Auto-suggested: <span className="text-slate-400">{emoji}</span> · Click the emoji to browse all.
              </p>
            )}
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Type</label>
            <div className="flex gap-2">
              {(["start", "stop"] as Habit["type"][]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 h-8 rounded-lg text-xs font-medium border transition-all duration-150 ${
                    type === t ? TYPE_STYLES[t] : INACTIVE
                  }`}
                >
                  {t === "start" ? "🔥 Start (build)" : "🛑 Stop (break)"}
                </button>
              ))}
            </div>
          </div>

          {/* Routine */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Assign Routine</label>
            <div className="flex gap-2">
              {ROUTINE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRoutine(opt.value)}
                  className={`flex-1 h-8 rounded-lg text-xs font-medium border transition-all duration-150 ${
                    routine === opt.value
                      ? "bg-violet-600/20 border-violet-500/50 text-violet-200"
                      : INACTIVE
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency + Target */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Habit["frequency"])}
                className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 transition-colors appearance-none cursor-pointer"
              >
                {FREQ_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-[#0F1629]">{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Target</label>
              <input
                type="number"
                min={1}
                max={31}
                value={targetCount}
                onChange={(e) => setTargetCount(Math.max(1, Number(e.target.value)))}
                className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Notes</label>
            <AutoExpandingTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context or reminders…"
              minRows={2}
              maxHeightVariant="modal"
              className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
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
