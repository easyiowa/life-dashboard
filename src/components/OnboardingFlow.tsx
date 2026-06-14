"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

// ── Mock widget previews ───────────────────────────────────────────────────────

function CalendarPreview() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const events: Record<number, { label: string; cls: string }> = {
    1: { label: "Team standup", cls: "bg-violet-500/30 border-l-2 border-violet-500 text-violet-300" },
    3: { label: "Client call",  cls: "bg-blue-500/30 border-l-2 border-blue-500 text-blue-300" },
    4: { label: "Deep work",    cls: "bg-emerald-500/30 border-l-2 border-emerald-500 text-emerald-300" },
    6: { label: "Gym",          cls: "bg-orange-500/30 border-l-2 border-orange-500 text-orange-300" },
  };
  return (
    <div className="select-none">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {days.map(d => <div key={d} className="text-center text-[9px] text-slate-600 font-medium">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-white/[0.03] border border-white/[0.05] p-1 relative overflow-hidden">
            <span className="text-[9px] text-slate-600">{i + 14}</span>
            {events[i] && (
              <div className={`absolute bottom-1 left-1 right-1 rounded px-1 py-0.5 text-[8px] leading-tight truncate ${events[i].cls}`}>
                {events[i].label}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HabitsPreview() {
  const habits = [
    { name: "Morning run",        streak: 12, done: true  },
    { name: "Read 30 min",        streak: 7,  done: true  },
    { name: "No phone after 9pm", streak: 3,  done: false },
    { name: "Cold shower",        streak: 21, done: true  },
  ];
  return (
    <div className="flex flex-col gap-2.5 select-none">
      {habits.map(h => (
        <div key={h.name} className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center border ${
            h.done ? "bg-emerald-500/20 border-emerald-500/50" : "bg-white/[0.03] border-white/[0.10]"
          }`}>
            {h.done && <Check className="w-3 h-3 text-emerald-400" />}
          </div>
          <span className={`text-xs flex-1 ${h.done ? "text-slate-300" : "text-slate-500"}`}>{h.name}</span>
          <span className="text-[10px] text-amber-500 font-medium">🔥 {h.streak}</span>
        </div>
      ))}
    </div>
  );
}

function ProjectsPreview() {
  const tasks = [
    { title: "Design onboarding flow",   done: true  },
    { title: "Build widget marketplace", done: false },
    { title: "Deploy to production",     done: false },
    { title: "Invite first users",       done: false },
  ];
  return (
    <div className="select-none">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-violet-500" />
        <span className="text-xs font-medium text-white">Life Dashboard</span>
        <span className="ml-auto text-[10px] text-slate-500">1 / 4 done</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {tasks.map(t => (
          <div key={t.title} className="flex items-center gap-2.5">
            <div className={`w-4 h-4 rounded shrink-0 border flex items-center justify-center ${
              t.done ? "bg-emerald-500/20 border-emerald-500/40" : "border-white/[0.10] bg-white/[0.02]"
            }`}>
              {t.done && <Check className="w-2.5 h-2.5 text-emerald-400" />}
            </div>
            <span className={`text-[11px] ${t.done ? "text-slate-500 line-through" : "text-slate-300"}`}>{t.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimerPreview() {
  const RADIUS = 36;
  const CIRC   = 2 * Math.PI * RADIUS;
  const pct    = 0.62;
  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={RADIUS} strokeWidth="5" stroke="rgba(255,255,255,0.05)" fill="none" />
          <circle cx="44" cy="44" r={RADIUS} strokeWidth="5" fill="none"
            stroke="#8B5CF6"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - pct)}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white font-mono">15:32</span>
          <span className="text-[9px] text-slate-500">remaining</span>
        </div>
      </div>
      <p className="text-xs text-slate-400">Deep work block · Session 2 / 4</p>
    </div>
  );
}

function NotesPreview() {
  const notes = [
    "Call Anna about the Helsinki trip 🇫🇮",
    "Book dentist — it's been too long",
    "Look into flights for August...",
  ];
  return (
    <div className="flex flex-col gap-2 select-none">
      <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-1">Quick Notes</p>
      {notes.map((n, i) => (
        <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5">
          <p className={`text-xs leading-relaxed ${i === 0 ? "text-slate-300" : i === 1 ? "text-slate-400" : "text-slate-500"}`}>{n}</p>
        </div>
      ))}
    </div>
  );
}

// ── Widget registry ────────────────────────────────────────────────────────────

interface WidgetDef {
  id:       string;
  label:    string;
  emoji:    string;
  tagline:  string;
  Preview:  React.ComponentType;
}

const WIDGETS: WidgetDef[] = [
  { id: "calendar",     label: "Calendar",    emoji: "📅", tagline: "See your week at a glance",      Preview: CalendarPreview  },
  { id: "habits",       label: "Habits",      emoji: "🔄", tagline: "Build streaks that stick",       Preview: HabitsPreview    },
  { id: "projects",     label: "Projects",    emoji: "📋", tagline: "Track work from idea to done",   Preview: ProjectsPreview  },
  { id: "time-tracker", label: "Focus Timer", emoji: "⏱️",  tagline: "Work in deep, focused blocks",  Preview: TimerPreview     },
  { id: "quick-notes",  label: "Quick Notes", emoji: "📝", tagline: "Capture thoughts instantly",     Preview: NotesPreview     },
];

// ── Synergy rules ──────────────────────────────────────────────────────────────

const SYNERGY: Record<string, { partner: string; message: string }> = {
  habits:          { partner: "time-tracker", message: "🔥 Smart Match: Great for stacking routine building with focused deep-work blocks!" },
  "time-tracker":  { partner: "habits",       message: "🔥 Smart Match: Great for stacking routine building with focused deep-work blocks!" },
  projects:        { partner: "calendar",     message: "📅 Smart Match: Pairs beautifully to align task deadlines with your daily visual calendar view!" },
  calendar:        { partner: "projects",     message: "📅 Smart Match: Pairs beautifully to align task deadlines with your daily visual calendar view!" },
};

// ── Step 1: Identity ───────────────────────────────────────────────────────────

function IdentityStep({ onNext }: { onNext: (name: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="text-5xl mb-4">👋</div>
        <h2 className="text-2xl font-bold text-white tracking-tight">What should we call you?</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
          Just a first name or nickname — whatever feels right.
        </p>
      </div>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && value.trim()) onNext(value.trim()); }}
        placeholder="e.g. Olaf"
        autoFocus
        className="w-full h-12 px-4 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white text-base placeholder:text-slate-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.07] transition-colors text-center"
      />
      <button
        onClick={() => value.trim() && onNext(value.trim())}
        disabled={!value.trim()}
        className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all shadow-[0_0_24px_rgba(139,92,246,0.3)]"
        style={{ background: "linear-gradient(to right, #8B5CF6, #7C3AED)" }}
      >
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Step 2: Marketplace ────────────────────────────────────────────────────────

function MarketplaceStep({
  nickname,
  onFinish,
}: {
  nickname:  string;
  onFinish:  (widgets: string[]) => Promise<void>;
}) {
  const [selected,  setSelected]  = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string>(WIDGETS[0].id);
  const [loading,   setLoading]   = useState(false);

  const active  = WIDGETS.find(w => w.id === previewId)!;
  const Preview = active.Preview;

  // First active synergy message
  const synergyMsg = (() => {
    for (const id of selected) {
      const r = SYNERGY[id];
      if (r && selected.includes(r.partner)) return r.message;
    }
    return null;
  })();

  // Widgets that should glow because their synergy partner is selected
  const glowSet = new Set<string>(
    selected.flatMap(id => (SYNERGY[id] ? [SYNERGY[id].partner] : []))
  );

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setPreviewId(id);
  }

  async function finish() {
    setLoading(true);
    await onFinish(selected);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Hey {nickname} 👋 — build your dashboard
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          Pick the widgets that work for your life. Everything can be changed later.
        </p>
      </div>

      {/* Live preview panel */}
      <div className="bg-[#0F1629] border border-white/[0.07] rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xl">{active.emoji}</span>
          <div>
            <p className="text-sm font-semibold text-white">{active.label}</p>
            <p className="text-[11px] text-slate-500">{active.tagline}</p>
          </div>
        </div>
        <div className="min-h-[150px] flex items-center justify-center">
          <div className="w-full"><Preview /></div>
        </div>
        {/* Preview tab strip */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
          {WIDGETS.map(w => (
            <button
              key={w.id}
              onClick={() => setPreviewId(w.id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                previewId === w.id
                  ? "bg-violet-600/30 text-violet-300 border border-violet-500/40"
                  : "text-slate-500 hover:text-slate-300 border border-transparent hover:border-white/[0.06]"
              }`}
            >
              {w.emoji} {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selection grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {WIDGETS.map(w => {
          const isSel   = selected.includes(w.id);
          const hasGlow = glowSet.has(w.id) && !isSel;
          return (
            <button
              key={w.id}
              onClick={() => toggle(w.id)}
              className={`relative flex flex-col gap-2 p-4 rounded-2xl border text-left transition-all ${
                isSel
                  ? "bg-violet-600/15 border-violet-500/50 shadow-[0_0_16px_rgba(139,92,246,0.25)]"
                  : hasGlow
                    ? "bg-white/[0.04] border-amber-500/40 shadow-[0_0_14px_rgba(251,191,36,0.18)]"
                    : "bg-white/[0.03] border-white/[0.07] hover:border-white/[0.14] hover:bg-white/[0.05]"
              }`}
            >
              {isSel && (
                <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              {hasGlow && (
                <Sparkles className="absolute top-2.5 right-2.5 w-3.5 h-3.5 text-amber-400 animate-pulse" />
              )}
              <span className="text-2xl">{w.emoji}</span>
              <div>
                <p className="text-xs font-semibold text-white">{w.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{w.tagline}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Synergy banner */}
      {synergyMsg && (
        <div className="rounded-xl bg-amber-500/[0.08] border border-amber-500/20 px-4 py-3 text-xs text-amber-300 leading-relaxed">
          {synergyMsg}
        </div>
      )}

      <button
        onClick={finish}
        disabled={loading}
        className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-[0_0_24px_rgba(139,92,246,0.3)]"
        style={{ background: "linear-gradient(to right, #8B5CF6, #7C3AED)" }}
      >
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <>Let&apos;s go <ArrowRight className="w-4 h-4" /></>
        }
      </button>
    </div>
  );
}

// ── Main flow ──────────────────────────────────────────────────────────────────

export default function OnboardingFlow() {
  const { user } = useAuth();
  const [step,     setStep]     = useState<"identity" | "marketplace">("identity");
  const [nickname, setNickname] = useState("");

  async function handleFinish(selectedWidgets: string[]) {
    if (!supabase || !user) return;
    await supabase.auth.updateUser({
      data: {
        is_onboarded:  true,
        display_name:  nickname,
        widget_layout: selectedWidgets,
      },
    });
    // onAuthStateChange fires → AuthContext updates user → AuthGate stops rendering this flow
  }

  const stepIndex = step === "identity" ? 0 : 1;

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/[0.07] blur-[120px]" />
      </div>

      <div className="relative w-full max-w-lg">

        {/* Step dots */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {[0, 1].map(i => (
            <div key={i} className={`rounded-full transition-all duration-300 ${
              i === stepIndex
                ? "w-6 h-2 bg-violet-500"
                : i < stepIndex
                  ? "w-2 h-2 bg-violet-500/40"
                  : "w-2 h-2 bg-white/[0.12]"
            }`} />
          ))}
        </div>

        {step === "identity" ? (
          <IdentityStep onNext={name => { setNickname(name); setStep("marketplace"); }} />
        ) : (
          <MarketplaceStep nickname={nickname} onFinish={handleFinish} />
        )}
      </div>
    </div>
  );
}
