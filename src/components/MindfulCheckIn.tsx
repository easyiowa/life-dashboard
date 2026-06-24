"use client";

import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { useDashboard, type DailyCheckIn } from "@/context/DashboardContext";
import MindsetTrendsModal from "@/components/MindsetTrendsModal";
import AutoExpandingTextarea from "@/components/ui/AutoExpandingTextarea";
import ScrollFadeContainer from "@/components/ui/ScrollFadeContainer";

// ── Mood definitions ──────────────────────────────────────────────────────────

const MOODS = [
  {
    key: "energized",
    emoji: "⚡",
    label: "Energized",
    tags: ["#motivated", "#powerful", "#focused"],
    pillActive:   "bg-violet-500 border-violet-500 text-white md:shadow-[0_0_12px_rgba(139,92,246,0.4)]",
    pillInactive: "bg-violet-500/10 border-violet-500/25 text-violet-400 hover:bg-violet-500/20",
  },
  {
    key: "calm",
    emoji: "☕",
    label: "Calm",
    tags: ["#peaceful", "#clear", "#grounded"],
    pillActive:   "bg-teal-500 border-teal-500 text-white md:shadow-[0_0_12px_rgba(20,184,166,0.4)]",
    pillInactive: "bg-teal-500/10 border-teal-500/25 text-teal-400 hover:bg-teal-500/20",
  },
  {
    key: "tired",
    emoji: "💤",
    label: "Tired",
    tags: ["#drained", "#slow", "#foggy"],
    pillActive:   "bg-blue-500 border-blue-500 text-white md:shadow-[0_0_12px_rgba(59,130,246,0.4)]",
    pillInactive: "bg-blue-500/10 border-blue-500/25 text-blue-400 hover:bg-blue-500/20",
  },
  {
    key: "stressed",
    emoji: "🌪️",
    label: "Stressed",
    tags: ["#anxious", "#frustrated", "#overwhelmed"],
    pillActive:   "bg-amber-500 border-amber-500 text-white md:shadow-[0_0_12px_rgba(245,158,11,0.4)]",
    pillInactive: "bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/20",
  },
] as const;

type MoodKey = typeof MOODS[number]["key"];

const TAG_PILL_ACTIVE   = "bg-white/[0.10] border-white/[0.25] text-white";
const TAG_PILL_INACTIVE = "bg-white/[0.03] border-white/[0.08] text-slate-400 hover:bg-white/[0.07] hover:text-slate-200";

function getPlaceholder(moodKey: MoodKey | null, activeTags: string[]): string {
  if (moodKey === "stressed" || activeTags.some((t) => ["#anxious", "#frustrated", "#overwhelmed"].includes(t))) {
    return "What's the main blocker or anxiety right now?";
  }
  if (moodKey === "tired" || activeTags.some((t) => ["#drained", "#slow", "#foggy"].includes(t))) {
    return "What's one small win we can target?";
  }
  return "What are we smashing today?";
}

function buildSummary(mood: string, tags: string[], note: string): string {
  const tagStr = tags.length > 0
    ? tags.map((t) => t.replace("#", "")).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" & ")
    : "";
  const parts = [mood, tagStr].filter(Boolean).join(" · ");
  return note.trim() ? `${parts} — ${note.trim()}` : parts;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MindfulCheckIn() {
  const { currentTrackingDate, dailyCheckIn, saveDailyCheckIn } = useDashboard();

  // If a saved check-in exists for today, start in summary mode
  const existingToday = dailyCheckIn?.date === currentTrackingDate ? dailyCheckIn : null;

  const [activeMood,  setActiveMood]  = useState<MoodKey | null>((existingToday?.moodKey as MoodKey) ?? null);
  const [activeTags,  setActiveTags]  = useState<string[]>(existingToday?.tags ?? []);
  const [note,        setNote]        = useState(existingToday?.note ?? "");
  const [saved,       setSaved]       = useState(!!existingToday);
  const [showTrends,  setShowTrends]  = useState(false);

  // Keep form in sync if context changes (e.g. after day lock or async DB load)
  useEffect(() => {
    const ci = dailyCheckIn?.date === currentTrackingDate ? dailyCheckIn : null;
    if (!ci) {
      setActiveMood(null);
      setActiveTags([]);
      setNote("");
      setSaved(false);
    } else {
      setActiveMood(ci.moodKey as MoodKey);
      setActiveTags(ci.tags);
      setNote(ci.note);
      setSaved(true);
    }
  }, [currentTrackingDate, dailyCheckIn]);

  const activeMoodDef = MOODS.find((m) => m.key === activeMood) ?? null;
  const placeholder   = getPlaceholder(activeMood, activeTags);

  function toggleTag(tag: string) {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function handleMoodSelect(key: MoodKey) {
    if (activeMood === key) {
      setActiveMood(null);
      setActiveTags([]);
    } else {
      setActiveMood(key);
      setActiveTags([]);
    }
  }

  function handleSave() {
    if (!activeMood) return;
    const moodDef = MOODS.find((m) => m.key === activeMood)!;
    const checkIn: DailyCheckIn = {
      date:    currentTrackingDate,
      moodKey: activeMood,
      mood:    `${moodDef.emoji} ${moodDef.label}`,
      tags:    activeTags,
      note:    note.trim(),
    };
    saveDailyCheckIn(checkIn);
    setSaved(true);
  }

  function handleEdit() {
    setSaved(false);
  }

  // ── Summary view ────────────────────────────────────────────────────────────
  if (saved && dailyCheckIn?.date === currentTrackingDate) {
    const summary = buildSummary(dailyCheckIn.mood, dailyCheckIn.tags, dailyCheckIn.note);
    return (
      <>
        <div className="mb-4 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-xl">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex-shrink-0">Status</span>
          <p className="text-sm text-slate-300 flex-1 leading-normal truncate">{summary}</p>
          <button
            type="button"
            onClick={() => setShowTrends(true)}
            className="text-[11px] text-violet-400/70 hover:text-violet-300 transition-colors flex-shrink-0 whitespace-nowrap"
          >
            View all →
          </button>
          <button
            type="button"
            onClick={handleEdit}
            className="flex items-center gap-1 px-2.5 h-6 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[11px] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-all flex-shrink-0"
          >
            <Pencil className="w-2.5 h-2.5" />
            Edit
          </button>
        </div>
        {showTrends && <MindsetTrendsModal onClose={() => setShowTrends(false)} />}
      </>
    );
  }

  // ── Form view ───────────────────────────────────────────────────────────────
  return (
    <>
    <div className="mb-4 rounded-xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-xl px-4 py-3 flex flex-col gap-3">

      {/* Row 1 — Label + trends link + mood pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="order-1 md:order-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex-shrink-0 mr-1">
          How&apos;s your headspace?
        </span>
        <ScrollFadeContainer className="order-3 md:order-2 basis-full md:basis-auto">
          {MOODS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => handleMoodSelect(m.key)}
              className={`flex-shrink-0 px-3 h-7 rounded-full text-xs font-medium border transition-all duration-150 ${
                activeMood === m.key ? m.pillActive : m.pillInactive
              }`}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </ScrollFadeContainer>
        <button
          type="button"
          onClick={() => setShowTrends(true)}
          className="order-2 md:order-3 ml-auto text-[11px] text-violet-400/50 hover:text-violet-300 transition-colors flex-shrink-0 whitespace-nowrap"
        >
          View all →
        </button>
      </div>

      {/* Row 2 — Micro-tag cloud (slide-in) */}
      <div
        className="overflow-hidden transition-all duration-250 ease-in-out"
        style={{ maxHeight: activeMoodDef ? "48px" : "0px", opacity: activeMoodDef ? 1 : 0 }}
      >
        {activeMoodDef && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeMoodDef.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-2.5 h-6 rounded-full text-[11px] font-medium border transition-all duration-100 ${
                  activeTags.includes(tag) ? TAG_PILL_ACTIVE : TAG_PILL_INACTIVE
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Row 3 — Journal input */}
      <div className="flex flex-col md:flex-row md:items-start gap-2">
        <AutoExpandingTextarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } }}
          placeholder={placeholder}
          minRows={1}
          maxHeightVariant="widget"
          className="w-full md:w-auto md:flex-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/50 transition-colors"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!activeMood}
          className="w-full md:w-auto px-4 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-white font-medium transition-all md:flex-shrink-0"
        >
          Save Check-In
        </button>
      </div>

    </div>
    {showTrends && <MindsetTrendsModal onClose={() => setShowTrends(false)} />}
    </>
  );
}
