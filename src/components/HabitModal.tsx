"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useDashboard, type Habit } from "@/context/DashboardContext";
import EmojiPickerButton from "@/components/EmojiPickerButton";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── Emoji suggestion engine ───────────────────────────────────────────────────

const EMOJI_RULES: { pattern: RegExp; emoji: string }[] = [
  { pattern: /water|hydrat|drink|fluid/i,          emoji: "💧" },
  { pattern: /gym|workout|run|lift|exercise|sport/i,emoji: "💪" },
  { pattern: /smok|cigaret|tobacco/i,               emoji: "🚭" },
  { pattern: /sugar|junk|fast.?food|burger|fries/i, emoji: "🍔" },
  { pattern: /read|book|study|learn/i,              emoji: "📚" },
  { pattern: /meditat|mindful|breath/i,             emoji: "🧘" },
  { pattern: /sleep|rest|nap/i,                     emoji: "😴" },
  { pattern: /walk|step|hike/i,                     emoji: "🚶" },
  { pattern: /cook|meal|eat healthy/i,              emoji: "🥗" },
  { pattern: /journal|diary|write/i,                emoji: "📝" },
  { pattern: /screen|phone|social.?media|scroll/i,  emoji: "📵" },
  { pattern: /coffee|caffeine/i,                    emoji: "☕" },
  { pattern: /alcohol|drink|wine|beer/i,            emoji: "🍷" },
  { pattern: /code|program|dev|laptop|computer|\bpc\b|coding/i, emoji: "💻" },
  { pattern: /stretch|yoga|flexib/i,                emoji: "🤸" },
];

function suggestEmoji(title: string): string {
  const lower = title.toLowerCase().trim();
  for (const { pattern, emoji } of EMOJI_RULES) {
    if (pattern.test(lower)) return emoji;
  }
  return "⭐";
}

// ── Toggle group helper ───────────────────────────────────────────────────────

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  activeClass,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  activeClass: string;
}) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 h-8 rounded-lg text-xs font-medium border transition-all duration-150 ${
            value === opt.value
              ? activeClass
              : "border-white/[0.07] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: Habit["type"]; label: string }[] = [
  { value: "start", label: "🔥 Start (build)" },
  { value: "stop",  label: "🛑 Stop (break)"  },
];
const FREQ_OPTIONS: { value: Habit["frequency"]; label: string }[] = [
  { value: "daily",   label: "Daily"   },
  { value: "weekly",  label: "Weekly"  },
  { value: "monthly", label: "Monthly" },
];
const ROUTINE_OPTIONS: { value: NonNullable<Habit["routine"]>; label: string }[] = [
  { value: "morning", label: "☀️ Morning" },
  { value: "day",     label: "🌤️ Day"     },
  { value: "evening", label: "🌙 Evening" },
];

export default function HabitModal({ open, onClose }: Props) {
  const { addHabit } = useDashboard();

  const [title,       setTitle]       = useState("");
  const [type,        setType]        = useState<Habit["type"]>("start");
  const [routine,     setRoutine]     = useState<NonNullable<Habit["routine"]>>("morning");
  const [frequency,   setFrequency]   = useState<Habit["frequency"]>("daily");
  const [targetCount, setTargetCount] = useState<number | "">(5);
  const [emoji,       setEmoji]       = useState("⭐");
  const [emojiLocked, setEmojiLocked] = useState(false);
  const [notes,       setNotes]       = useState("");
  const [titleErr,    setTitleErr]    = useState(false);

  // Live emoji suggestion while the user types (unless they've overridden it)
  useEffect(() => {
    if (!emojiLocked) setEmoji(suggestEmoji(title));
  }, [title, emojiLocked]);

  function reset() {
    setTitle(""); setType("start"); setRoutine("morning"); setFrequency("daily");
    setTargetCount(5); setEmoji("⭐"); setEmojiLocked(false);
    setNotes(""); setTitleErr(false);
  }

  function handleClose() { reset(); onClose(); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setTitleErr(true); return; }
    addHabit({ title: title.trim(), type, routine, frequency, targetCount: targetCount || 1, emoji, notes });
    handleClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-[#0F1629] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl overflow-visible">

        {/* Header */}
        <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">New Habit</h2>
          <button onClick={handleClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

          {/* Title + live emoji */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Habit Name *</label>
            <div className="flex gap-2">
              <EmojiPickerButton
                emoji={emoji}
                locked={emojiLocked}
                onPick={(e) => { setEmoji(e); setEmojiLocked(true); }}
              />
              <input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setTitleErr(false); }}
                placeholder="e.g. Read 20 pages"
                className={`flex-1 h-10 px-3 rounded-xl bg-white/[0.04] border text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors ${
                  titleErr ? "border-red-500/60" : "border-white/[0.07]"
                }`}
              />
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
            <ToggleGroup
              options={TYPE_OPTIONS}
              value={type}
              onChange={setType}
              activeClass={
                type === "start"
                  ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-300"
                  : "bg-red-600/20 border-red-500/50 text-red-300"
              }
            />
          </div>

          {/* Routine */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Assign Routine</label>
            <ToggleGroup
              options={ROUTINE_OPTIONS}
              value={routine}
              onChange={setRoutine}
              activeClass="bg-violet-600/20 border-violet-500/50 text-violet-200"
            />
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
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Target ({frequency === "daily" ? "days/wk" : frequency === "weekly" ? "times/mo" : "times/mo"})
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={targetCount}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") { setTargetCount(""); return; }
                  const n = parseInt(v, 10);
                  if (!isNaN(n)) setTargetCount(n);
                }}
                className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white outline-none focus:border-violet-500/60 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context or triggers…"
              rows={2}
              className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={handleClose} className="flex-1 h-10 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">
              Cancel
            </button>
            <button type="submit" className="flex-1 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm text-white font-medium transition-all shadow-[0_0_20px_rgba(124,58,237,0.35)]">
              Add Habit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
