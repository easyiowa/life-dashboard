"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import {
  ArrowRight, Check, Loader2, Sparkles, ChevronLeft, ChevronRight, Flame,
  CalendarDays, FolderKanban, Timer, NotebookPen, Target,
  Activity, TrendingUp, RefreshCw, Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

// ── Calendar slides ────────────────────────────────────────────────────────────

function CalendarWeekSlide() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const ev: Record<number, [string, string]> = {
    1: ["Standup",    "border-violet-500 bg-violet-500/20 text-violet-300"],
    3: ["Client call","border-blue-500 bg-blue-500/20 text-blue-300"],
    4: ["Deep work",  "border-emerald-500 bg-emerald-500/20 text-emerald-300"],
    6: ["Gym",        "border-orange-500 bg-orange-500/20 text-orange-300"],
  };
  return (
    <div className="select-none">
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {days.map(d => <div key={d} className="text-center text-[9px] text-slate-600 font-medium">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((_, i) => (
          <div key={i} className="h-11 rounded-md bg-white/[0.03] border border-white/[0.05] p-0.5 relative overflow-hidden">
            <span className="text-[8px] text-slate-600 pl-0.5">{i + 14}</span>
            {ev[i] && (
              <div className={`absolute bottom-0.5 left-0.5 right-0.5 rounded border-l-2 px-0.5 py-0.5 text-[7px] leading-none truncate ${ev[i][1]}`}>
                {ev[i][0]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarMonthSlide() {
  const hi = new Set([3, 7, 14, 21, 22]);
  return (
    <div className="select-none">
      <p className="text-[9px] text-slate-500 font-medium mb-2">June 2026</p>
      <div className="grid grid-cols-7 gap-0.5">
        {["M","T","W","T","F","S","S"].map((d, i) => (
          <div key={i} className="text-center text-[8px] text-slate-700 pb-0.5">{d}</div>
        ))}
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i} className={`h-5 rounded flex items-center justify-center text-[9px] ${
            i + 1 === 14 ? "bg-violet-500 text-white" : hi.has(i + 1) ? "bg-violet-500/20 text-violet-300" : "text-slate-600"
          }`}>{i + 1}</div>
        ))}
      </div>
    </div>
  );
}

function CalendarAgendaSlide() {
  const slots = [
    { time: "09:00", label: "Team standup",  cls: "border-violet-500 bg-violet-500/20 text-violet-300" },
    { time: "11:00", label: "Deep work",     cls: "border-emerald-500 bg-emerald-500/20 text-emerald-300" },
    { time: "14:00", label: "Client review", cls: "border-blue-500 bg-blue-500/20 text-blue-300" },
    { time: "17:30", label: "Gym session",   cls: "border-orange-500 bg-orange-500/20 text-orange-300" },
  ];
  return (
    <div className="flex flex-col gap-1.5 select-none">
      <p className="text-[9px] text-slate-600 font-medium mb-1">Today · Fri 14 Jun</p>
      {slots.map(s => (
        <div key={s.time} className="flex items-center gap-2">
          <span className="text-[9px] text-slate-700 w-9 shrink-0 font-mono">{s.time}</span>
          <div className={`flex-1 rounded-md border-l-2 px-2 py-1 text-[10px] ${s.cls}`}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Habits slides ──────────────────────────────────────────────────────────────

function HabitsCheckSlide() {
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
          <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
            <Flame className="w-3 h-3" />{h.streak}
          </span>
        </div>
      ))}
    </div>
  );
}

function HabitsHeatmapSlide() {
  const cols = 7; const rows = 4;
  const intensities = Array.from({ length: cols * rows }, (_, i) => (i * 37 + 13) % 100 / 100);
  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] text-slate-600 font-medium">Last 4 weeks</p>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-white/[0.08]" />
          <div className="w-2 h-2 rounded-sm bg-emerald-500/40" />
          <div className="w-2 h-2 rounded-sm bg-emerald-500" />
          <span className="text-[8px] text-slate-700 ml-0.5">done</span>
        </div>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {["M","T","W","T","F","S","S"].map((d, i) => (
          <div key={i} className="text-center text-[8px] text-slate-700 pb-0.5">{d}</div>
        ))}
        {intensities.map((v, i) => (
          <div key={i} className={`h-5 rounded-sm ${
            v > 0.7 ? "bg-emerald-500" : v > 0.4 ? "bg-emerald-500/45" : v > 0.1 ? "bg-white/[0.07]" : "bg-white/[0.03]"
          }`} />
        ))}
      </div>
    </div>
  );
}

function HabitsStreakSlide() {
  const top = [
    { name: "Cold shower",   streak: 21 },
    { name: "Morning run",   streak: 12 },
    { name: "Read 30 min",   streak: 7  },
  ];
  return (
    <div className="flex flex-col gap-3 select-none">
      <p className="text-[9px] text-slate-600 font-medium">Top streaks</p>
      {top.map((h, i) => (
        <div key={h.name} className="flex items-center gap-3">
          <span className="text-[10px] text-slate-700 w-3">{i + 1}.</span>
          <span className="text-xs text-slate-300 flex-1">{h.name}</span>
          <span className="flex items-center gap-1 text-sm font-bold text-amber-400">
            <Flame className="w-3.5 h-3.5" />{h.streak}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Projects slides ────────────────────────────────────────────────────────────

function ProjectsListSlide() {
  const tasks = [
    { title: "Design onboarding flow",   done: true  },
    { title: "Build widget marketplace", done: false },
    { title: "Deploy to production",     done: false },
    { title: "Invite first users",       done: false },
  ];
  return (
    <div className="select-none">
      <div className="flex items-center gap-2 mb-2.5">
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

function ProjectsKanbanSlide() {
  const cols = [
    { label: "To do",  cls: "text-slate-500",   cards: ["Write docs", "Set up CI"] },
    { label: "Doing",  cls: "text-blue-400",    cards: ["Build widget"] },
    { label: "Done",   cls: "text-emerald-400", cards: ["Auth flow"] },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 select-none">
      {cols.map(c => (
        <div key={c.label} className="flex flex-col gap-1.5">
          <p className={`text-[9px] font-semibold uppercase tracking-wide ${c.cls}`}>{c.label}</p>
          {c.cards.map(card => (
            <div key={card} className="bg-white/[0.04] border border-white/[0.07] rounded-lg px-2 py-1.5">
              <p className="text-[10px] text-slate-300 leading-tight">{card}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ProjectsStatsSlide() {
  return (
    <div className="flex flex-col gap-3 select-none">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-violet-500" />
        <span className="text-xs font-medium text-white">Life Dashboard</span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px] mb-0.5">
          <span className="text-slate-500">Progress</span>
          <span className="text-slate-400">25%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.07]">
          <div className="h-full w-1/4 rounded-full bg-violet-500" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[["4","Tasks"],["1","Done"],["3","Open"]].map(([n, l]) => (
          <div key={l} className="bg-white/[0.03] rounded-xl py-2">
            <p className="text-sm font-bold text-white">{n}</p>
            <p className="text-[9px] text-slate-600">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Timer slides ───────────────────────────────────────────────────────────────

function TimerRingSlide() {
  const R = 36; const C = 2 * Math.PI * R; const pct = 0.62;
  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={R} strokeWidth="5" stroke="rgba(255,255,255,0.05)" fill="none" />
          <circle cx="44" cy="44" r={R} strokeWidth="5" fill="none" stroke="#8B5CF6"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct)} strokeLinecap="round" />
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

function TimerSessionsSlide() {
  const sessions = [
    { label: "Session 1", dur: "25:00", done: true,  isBreak: false },
    { label: "Break",     dur: "05:00", done: true,  isBreak: true  },
    { label: "Session 2", dur: "15:32", done: false, isBreak: false },
    { label: "Break",     dur: "05:00", done: false, isBreak: true  },
  ];
  return (
    <div className="flex flex-col gap-2 select-none">
      <p className="text-[9px] text-slate-600 font-medium mb-1">Today&apos;s sessions</p>
      {sessions.map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded shrink-0 border flex items-center justify-center ${
            s.done ? "bg-violet-500/20 border-violet-500/40" : "border-white/[0.10] bg-white/[0.02]"
          }`}>
            {s.done && <Check className="w-2.5 h-2.5 text-violet-400" />}
          </div>
          <span className={`text-xs flex-1 ${s.isBreak ? "text-slate-600" : s.done ? "text-slate-400" : "text-white"}`}>{s.label}</span>
          <span className="text-[10px] font-mono text-slate-600">{s.dur}</span>
        </div>
      ))}
    </div>
  );
}

function TimerStatsSlide() {
  return (
    <div className="flex flex-col gap-3 select-none">
      <p className="text-[9px] text-slate-600 font-medium">Today&apos;s focus</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[["75 min","Total"],["3","Sessions"],["5","Streak"]].map(([n, l]) => (
          <div key={l} className="bg-white/[0.03] rounded-xl py-2.5">
            <p className="text-sm font-bold text-violet-300">{n}</p>
            <p className="text-[9px] text-slate-600">{l}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-slate-600">Daily goal</span>
          <span className="text-slate-400">75 / 120 min</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.07]">
          <div className="h-full rounded-full bg-violet-500" style={{ width: "62%" }} />
        </div>
      </div>
    </div>
  );
}

// ── Quick Notes slides ─────────────────────────────────────────────────────────

function NotesListSlide() {
  const notes = [
    "Call Anna about the Helsinki trip",
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

function NotesPinnedSlide() {
  const pinned = [
    { text: "Weekly review template",  tag: "work",     tagCls: "bg-blue-500/20 text-blue-300"      },
    { text: "Gift ideas for birthday", tag: "personal", tagCls: "bg-pink-500/20 text-pink-300"      },
    { text: "API docs reference",      tag: "dev",      tagCls: "bg-emerald-500/20 text-emerald-300" },
  ];
  return (
    <div className="flex flex-col gap-2 select-none">
      <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-1">Pinned</p>
      {pinned.map(n => (
        <div key={n.text} className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
          <span className="text-xs text-slate-300 flex-1 truncate">{n.text}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${n.tagCls}`}>{n.tag}</span>
        </div>
      ))}
    </div>
  );
}

function NotesRecentSlide() {
  const notes = [
    { text: "Remember to call the bank",    time: "2m ago"    },
    { text: "Pasta recipe — 400g pasta…",   time: "1h ago"    },
    { text: "Read: The Almanack of…",       time: "3h ago"    },
    { text: "Potential new dashboard name", time: "Yesterday" },
  ];
  return (
    <div className="flex flex-col gap-1.5 select-none">
      <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-1">Recent</p>
      {notes.map(n => (
        <div key={n.text} className="flex items-center gap-2">
          <span className="text-xs text-slate-300 flex-1 truncate">{n.text}</span>
          <span className="text-[9px] text-slate-700 shrink-0">{n.time}</span>
        </div>
      ))}
    </div>
  );
}

// ── Daily Focus slides ─────────────────────────────────────────────────────────

function FocusQueueSlide() {
  const tasks = [
    { label: "Finish Blueprint Mode UI", pri: "high"   },
    { label: "Reply to Paul's email",    pri: "medium" },
    { label: "Review analytics PR",      pri: "low"    },
  ];
  const priCls: Record<string, string> = {
    high:   "bg-red-500/20 text-red-300",
    medium: "bg-amber-500/20 text-amber-300",
    low:    "bg-slate-500/20 text-slate-400",
  };
  return (
    <div className="flex flex-col gap-2.5 select-none">
      <p className="text-[9px] text-slate-600 font-medium mb-1">Today&apos;s focus queue</p>
      {tasks.map((t, i) => (
        <div key={t.label} className="flex items-center gap-3">
          <span className="text-[10px] text-slate-700 w-3.5 shrink-0 font-mono">{i + 1}.</span>
          <span className="text-xs text-slate-300 flex-1">{t.label}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${priCls[t.pri]}`}>{t.pri}</span>
        </div>
      ))}
    </div>
  );
}

function FocusActiveSlide() {
  const R = 30; const C = 2 * Math.PI * R;
  return (
    <div className="flex items-center gap-4 select-none">
      <div className="relative w-16 h-16 shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 68 68">
          <circle cx="34" cy="34" r={R} strokeWidth="4" stroke="rgba(255,255,255,0.05)" fill="none" />
          <circle cx="34" cy="34" r={R} strokeWidth="4" fill="none" stroke="#8B5CF6"
            strokeDasharray={C} strokeDashoffset={C * 0.35} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white font-mono">65%</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-[10px] text-slate-600 uppercase tracking-wide">In focus</p>
        <p className="text-sm font-semibold text-white leading-snug">Finish Blueprint Mode UI</p>
        <p className="text-[10px] text-slate-500">Est. 45 min remaining</p>
      </div>
    </div>
  );
}

function FocusDoneSlide() {
  const done = [
    "Set up Supabase auth flow",
    "Write onboarding copy",
    "Push production build",
  ];
  return (
    <div className="flex flex-col gap-2 select-none">
      <p className="text-[9px] text-emerald-600 font-semibold uppercase tracking-wide mb-1">Done today</p>
      {done.map(t => (
        <div key={t} className="flex items-center gap-2.5">
          <div className="w-4 h-4 rounded-full shrink-0 bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-emerald-400" />
          </div>
          <span className="text-xs text-slate-500 line-through">{t}</span>
        </div>
      ))}
    </div>
  );
}

// ── Activity Log slides ────────────────────────────────────────────────────────

function ActivityFeedSlide() {
  const items = [
    { Icon: Check,        text: "Completed 3 tasks",    time: "2m", cls: "text-emerald-400" },
    { Icon: Timer,        text: "25-min focus session", time: "1h", cls: "text-violet-400"  },
    { Icon: RefreshCw,    text: "Habit streak updated", time: "3h", cls: "text-amber-400"   },
    { Icon: FolderKanban, text: "Task moved to Done",   time: "5h", cls: "text-blue-400"    },
  ];
  return (
    <div className="flex flex-col gap-2 select-none">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className={`w-5 h-5 rounded-full shrink-0 bg-white/[0.05] border border-white/[0.08] flex items-center justify-center ${item.cls}`}>
            <item.Icon className="w-2.5 h-2.5" />
          </div>
          <span className="text-xs text-slate-300 flex-1">{item.text}</span>
          <span className="text-[9px] text-slate-700">{item.time}</span>
        </div>
      ))}
    </div>
  );
}

function ActivityCategoriesSlide() {
  const cats = [
    { label: "Tasks",    pct: 42, cls: "bg-emerald-500" },
    { label: "Focus",    pct: 30, cls: "bg-violet-500"  },
    { label: "Habits",   pct: 18, cls: "bg-amber-500"   },
    { label: "Projects", pct: 10, cls: "bg-blue-500"    },
  ];
  return (
    <div className="flex flex-col gap-2 select-none">
      <p className="text-[9px] text-slate-600 font-medium mb-1">Activity breakdown</p>
      {cats.map(c => (
        <div key={c.label} className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-14 shrink-0">{c.label}</span>
          <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full">
            <div className={`h-full rounded-full ${c.cls}`} style={{ width: `${c.pct}%` }} />
          </div>
          <span className="text-[9px] text-slate-600 w-6 text-right">{c.pct}%</span>
        </div>
      ))}
    </div>
  );
}

function ActivitySummarySlide() {
  return (
    <div className="flex flex-col gap-3 select-none">
      <p className="text-[9px] text-slate-600 font-medium">Today at a glance</p>
      <div className="grid grid-cols-2 gap-2">
        {[["12","Actions"],["3","Focus hrs"],["5","Completed"],["2","Streaks"]].map(([n, l]) => (
          <div key={l} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5 text-center">
            <p className="text-sm font-bold text-white">{n}</p>
            <p className="text-[9px] text-slate-600">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Progress slides ────────────────────────────────────────────────────────────

function ProgressGoalsSlide() {
  const goals = [
    { label: "Ship MVP",      pct: 65, cls: "bg-violet-500"  },
    { label: "Read 12 books", pct: 42, cls: "bg-emerald-500" },
    { label: "Run 100 km",    pct: 78, cls: "bg-orange-500"  },
  ];
  return (
    <div className="flex flex-col gap-3 select-none">
      {goals.map(g => (
        <div key={g.label} className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">{g.label}</span>
            <span className="text-slate-500">{g.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06]">
            <div className={`h-full rounded-full ${g.cls}`} style={{ width: `${g.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressChartSlide() {
  const bars = [
    { d: "Mon", h: 60 }, { d: "Tue", h: 85 }, { d: "Wed", h: 45 },
    { d: "Thu", h: 90 }, { d: "Fri", h: 70 }, { d: "Sat", h: 30 }, { d: "Sun", h: 55 },
  ];
  return (
    <div className="select-none">
      <p className="text-[9px] text-slate-600 font-medium mb-3">This week</p>
      <div className="flex items-end gap-1.5 h-16">
        {bars.map(b => (
          <div key={b.d} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t-sm bg-violet-500/70" style={{ height: `${b.h}%` }} />
            <span className="text-[8px] text-slate-700">{b.d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressWeekSlide() {
  return (
    <div className="flex flex-col gap-3 select-none">
      <div className="flex items-center justify-between">
        <p className="text-[9px] text-slate-600 font-medium">This week vs last</p>
        <span className="text-[9px] text-emerald-400">+18%</span>
      </div>
      {[["Tasks done","14","11"],["Focus time","6h 20m","5h 10m"],["Habits","5 / 5","4 / 5"]].map(([l, curr, prev]) => (
        <div key={l} className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 flex-1">{l}</span>
          <span className="text-xs font-semibold text-white">{curr}</span>
          <span className="text-[9px] text-slate-700">vs {prev}</span>
        </div>
      ))}
    </div>
  );
}

// ── Recurring slides ───────────────────────────────────────────────────────────

function RecurringListSlide() {
  const items = [
    { name: "Weekly review", freq: "weekly",  done: true  },
    { name: "Pay bills",     freq: "monthly", done: false },
    { name: "Gym session",   freq: "daily",   done: true  },
    { name: "Team 1-on-1",   freq: "weekly",  done: false },
  ];
  const freqCls: Record<string, string> = {
    daily:   "bg-emerald-500/20 text-emerald-300",
    weekly:  "bg-blue-500/20 text-blue-300",
    monthly: "bg-violet-500/20 text-violet-300",
  };
  return (
    <div className="flex flex-col gap-2 select-none">
      {items.map(item => (
        <div key={item.name} className="flex items-center gap-2.5">
          <div className={`w-4 h-4 rounded shrink-0 border flex items-center justify-center ${
            item.done ? "bg-emerald-500/20 border-emerald-500/40" : "border-white/[0.10] bg-white/[0.02]"
          }`}>
            {item.done && <Check className="w-2.5 h-2.5 text-emerald-400" />}
          </div>
          <span className={`text-xs flex-1 ${item.done ? "text-slate-500" : "text-slate-300"}`}>{item.name}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${freqCls[item.freq]}`}>{item.freq}</span>
        </div>
      ))}
    </div>
  );
}

function RecurringDueSlide() {
  const due = [
    { name: "Gym session",   time: "Today",     urgent: true  },
    { name: "Weekly review", time: "Tomorrow",  urgent: false },
    { name: "Pay bills",     time: "In 3 days", urgent: false },
  ];
  return (
    <div className="flex flex-col gap-2.5 select-none">
      <p className="text-[9px] text-slate-600 font-medium mb-1">Up next</p>
      {due.map(d => (
        <div key={d.name} className="flex items-center gap-3">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.urgent ? "bg-red-400" : "bg-slate-600"}`} />
          <span className="text-xs text-slate-300 flex-1">{d.name}</span>
          <span className={`text-[10px] ${d.urgent ? "text-red-400 font-medium" : "text-slate-600"}`}>{d.time}</span>
        </div>
      ))}
    </div>
  );
}

function RecurringRatesSlide() {
  const rates = [
    { name: "Gym session",   pct: 86,  cls: "bg-emerald-500" },
    { name: "Weekly review", pct: 100, cls: "bg-violet-500"  },
    { name: "Pay bills",     pct: 100, cls: "bg-violet-500"  },
    { name: "Team 1-on-1",   pct: 75,  cls: "bg-amber-500"   },
  ];
  return (
    <div className="flex flex-col gap-2 select-none">
      <p className="text-[9px] text-slate-600 font-medium mb-1">Completion rate</p>
      {rates.map(r => (
        <div key={r.name} className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-24 shrink-0 truncate">{r.name}</span>
          <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full">
            <div className={`h-full rounded-full ${r.cls}`} style={{ width: `${r.pct}%` }} />
          </div>
          <span className="text-[9px] text-slate-600 w-7 text-right">{r.pct}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Network slides ─────────────────────────────────────────────────────────────

function NetworkContactsSlide() {
  const contacts = [
    { name: "Anna",  note: "Helsinki trip", dot: "bg-emerald-500" },
    { name: "Paul",  note: "Reply pending", dot: "bg-amber-500"   },
    { name: "Mika",  note: "Coffee soon?",  dot: "bg-blue-500"    },
    { name: "Sarah", note: "Last seen 2w",  dot: "bg-slate-600"   },
  ];
  return (
    <div className="flex flex-col gap-2 select-none">
      {contacts.map(c => (
        <div key={c.name} className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white bg-white/[0.08] border border-white/[0.10]">
            {c.name[0]}
          </div>
          <span className="text-xs text-slate-300 flex-1">{c.name}</span>
          <span className="text-[10px] text-slate-600">{c.note}</span>
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
        </div>
      ))}
    </div>
  );
}

function NetworkInteractionsSlide() {
  const items = [
    { name: "Anna", action: "Sent message",   time: "1h" },
    { name: "Paul", action: "Email received", time: "3h" },
    { name: "Mika", action: "Coffee planned", time: "2d" },
  ];
  return (
    <div className="flex flex-col gap-2.5 select-none">
      <p className="text-[9px] text-slate-600 font-medium mb-1">Recent interactions</p>
      {items.map(i => (
        <div key={i.name} className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-full shrink-0 bg-white/[0.07] border border-white/[0.09] flex items-center justify-center text-[9px] font-bold text-slate-400">
            {i.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs text-slate-300">{i.name} </span>
            <span className="text-[10px] text-slate-600">{i.action}</span>
          </div>
          <span className="text-[9px] text-slate-700 shrink-0">{i.time}</span>
        </div>
      ))}
    </div>
  );
}

function NetworkUpcomingSlide() {
  const upcoming = [
    { name: "Mika",  event: "Birthday",      date: "Jun 18", cls: "text-pink-400"  },
    { name: "Sarah", event: "Follow-up due", date: "Jun 20", cls: "text-amber-400" },
    { name: "Paul",  event: "Coffee meet",   date: "Jun 25", cls: "text-blue-400"  },
  ];
  return (
    <div className="flex flex-col gap-2.5 select-none">
      <p className="text-[9px] text-slate-600 font-medium mb-1">Coming up</p>
      {upcoming.map(u => (
        <div key={u.name} className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-full shrink-0 bg-white/[0.07] border border-white/[0.09] flex items-center justify-center text-[9px] font-bold text-slate-400">
            {u.name[0]}
          </div>
          <span className="text-xs text-slate-300 flex-1">{u.name} — {u.event}</span>
          <span className={`text-[9px] font-medium ${u.cls}`}>{u.date}</span>
        </div>
      ))}
    </div>
  );
}

// ── Widget registry ────────────────────────────────────────────────────────────

interface WidgetDef {
  id:      string;
  label:   string;
  tagline: string;
  Icon:    ComponentType<{ className?: string }>;
  slides:  ComponentType[];
}

const WIDGETS: WidgetDef[] = [
  { id: "calendar",     label: "Calendar",     tagline: "See your week at a glance",    Icon: CalendarDays, slides: [CalendarWeekSlide,    CalendarMonthSlide,      CalendarAgendaSlide]        },
  { id: "habits",       label: "Habits",       tagline: "Build streaks that stick",     Icon: Flame,        slides: [HabitsCheckSlide,     HabitsHeatmapSlide,      HabitsStreakSlide]           },
  { id: "projects",     label: "Projects",     tagline: "Track work from idea to done", Icon: FolderKanban, slides: [ProjectsListSlide,    ProjectsKanbanSlide,     ProjectsStatsSlide]          },
  { id: "time-tracker", label: "Focus Timer",  tagline: "Work in deep, focused blocks", Icon: Timer,        slides: [TimerRingSlide,       TimerSessionsSlide,      TimerStatsSlide]             },
  { id: "quick-notes",  label: "Quick Notes",  tagline: "Capture thoughts instantly",   Icon: NotebookPen,  slides: [NotesListSlide,       NotesPinnedSlide,        NotesRecentSlide]            },
  { id: "daily-focus",  label: "Daily Focus",  tagline: "Queue your top priorities",    Icon: Target,       slides: [FocusQueueSlide,      FocusActiveSlide,        FocusDoneSlide]              },
  { id: "activity-log", label: "Activity Log", tagline: "See what you've accomplished", Icon: Activity,     slides: [ActivityFeedSlide,    ActivityCategoriesSlide, ActivitySummarySlide]        },
  { id: "progress",     label: "Progress",     tagline: "Track your momentum",          Icon: TrendingUp,   slides: [ProgressGoalsSlide,   ProgressChartSlide,      ProgressWeekSlide]           },
  { id: "recurring",    label: "Recurring",    tagline: "Never miss what repeats",      Icon: RefreshCw,    slides: [RecurringListSlide,   RecurringDueSlide,       RecurringRatesSlide]         },
  { id: "network",      label: "Network",      tagline: "Stay close to your people",    Icon: Users,        slides: [NetworkContactsSlide, NetworkInteractionsSlide,NetworkUpcomingSlide]        },
];

// ── Combination rules ──────────────────────────────────────────────────────────

const SYNERGY: Record<string, { partner: string; message: string }> = {
  "projects":    { partner: "calendar",     message: "Aligns task deadlines seamlessly with your daily visual calendar view." },
  "calendar":    { partner: "projects",     message: "Aligns task deadlines seamlessly with your daily visual calendar view." },
  "daily-focus": { partner: "time-tracker", message: "Combine your priority queue with timed sessions for maximum daily flow." },
};

const FORCED_DEPS: Record<string, string[]> = {
  "time-tracker": ["activity-log"],
  "activity-log": ["time-tracker"],
  "daily-focus":  ["projects"],
  "projects":     ["progress"],
  "progress":     ["projects"],
};

const SUGGESTIONS: Record<string, { partners: string[]; message: string }> = {
  "time-tracker": {
    partners: ["projects"],
    message:  "✨ Smart Combo: Highly suggest adding Projects to connect deep-work focus blocks directly to your active initiatives.",
  },
  "projects": {
    partners: ["time-tracker", "daily-focus"],
    message:  "✨ Smart Combo: Highly suggest adding Daily Focus and Focus Timer to seamlessly schedule and execute your milestone tasks day by day.",
  },
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
  nickname: string;
  onFinish: (widgets: string[]) => Promise<void>;
}) {
  const [userPicked, setUserPicked] = useState<Set<string>>(new Set());
  const [previewId,  setPreviewId]  = useState(WIDGETS[0].id);
  const [slideIdx,   setSlideIdx]   = useState(0);
  const [hoveredId,  setHoveredId]  = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);

  // Expand userPicked transitively — daily-focus → projects → progress resolves in one pass.
  const selected: string[] = (() => {
    const result = new Set(userPicked);
    const queue  = [...userPicked];
    while (queue.length > 0) {
      const id = queue.pop()!;
      for (const dep of FORCED_DEPS[id] ?? []) {
        if (!result.has(dep)) { result.add(dep); queue.push(dep); }
      }
    }
    return [...result];
  })();

  const activeWidget = WIDGETS.find(w => w.id === previewId) ?? WIDGETS[0];
  const slides       = activeWidget.slides;
  const Slide        = slides[slideIdx];
  const ActiveIcon   = activeWidget.Icon;

  const forcedSet = new Set<string>(selected.filter(id => !userPicked.has(id)));

  const glowSet = new Set<string>([
    ...selected.flatMap(id => SYNERGY[id] ? [SYNERGY[id].partner] : []),
    ...selected.flatMap(id => SUGGESTIONS[id]?.partners ?? []),
  ]);

  const synergyMsg = (() => {
    for (const id of selected) {
      const r = SYNERGY[id];
      if (r && selected.includes(r.partner)) return r.message;
    }
    return null;
  })();

  const suggestionMsg = (() => {
    if (hoveredId && SUGGESTIONS[hoveredId]) return SUGGESTIONS[hoveredId].message;
    for (const id of selected) {
      if (SUGGESTIONS[id]) return SUGGESTIONS[id].message;
    }
    return null;
  })();

  function setPreview(id: string) {
    setPreviewId(id);
    setSlideIdx(0);
  }

  function toggleWidget(id: string) {
    setUserPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
    setPreviewId(id);
    setSlideIdx(0);
  }

  async function finish() {
    setLoading(true);
    await onFinish(selected);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Hey {nickname} — build your dashboard
        </h2>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          Pick the widgets that work for your life. Everything can be changed later.
        </p>
      </div>

      {/* Pro-tip */}
      <div className="bg-purple-950/20 border border-purple-500/15 rounded-lg px-3 py-2.5">
        <p className="text-xs leading-relaxed text-purple-300/75">
          💡 <span className="font-medium">Pro-tip:</span> Turn them all on first — it&apos;s easier to remove what you don&apos;t need once you&apos;ve seen everything in action.
        </p>
      </div>

      {/* Live preview panel */}
      <div className="bg-[#0F1629] border border-white/[0.07] rounded-2xl p-5">

        {/* Widget name + tagline */}
        <div className="flex items-center gap-3 mb-4">
          <ActiveIcon className="w-5 h-5 text-violet-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white leading-none">{activeWidget.label}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{activeWidget.tagline}</p>
          </div>
        </div>

        {/* Preview slide */}
        <div className="min-h-[150px] flex items-center justify-center">
          <div className="w-full"><Slide /></div>
        </div>

        {/* Carousel controls */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setSlideIdx(i => (i - 1 + slides.length) % slides.length)}
            className="w-6 h-6 rounded-md bg-white/[0.05] hover:bg-white/[0.09] flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex gap-1.5 items-center">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlideIdx(i)}
                className={`rounded-full transition-all duration-200 ${
                  i === slideIdx ? "w-4 h-1.5 bg-violet-400" : "w-1.5 h-1.5 bg-white/[0.18] hover:bg-white/[0.30]"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setSlideIdx(i => (i + 1) % slides.length)}
            className="w-6 h-6 rounded-md bg-white/[0.05] hover:bg-white/[0.09] flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab strip */}
        <div className="flex gap-1.5 mt-4 overflow-x-auto pb-1 scrollbar-none">
          {WIDGETS.map(w => {
            const WIcon = w.Icon;
            return (
              <button
                key={w.id}
                onClick={() => setPreview(w.id)}
                className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  previewId === w.id
                    ? "bg-violet-600/30 text-violet-300 border border-violet-500/40"
                    : "text-slate-500 hover:text-slate-300 border border-transparent hover:border-white/[0.06]"
                }`}
              >
                <WIcon className="w-3 h-3 shrink-0" />
                {w.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selection grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {WIDGETS.map(w => {
          const isSel    = selected.includes(w.id);
          const hasGlow  = glowSet.has(w.id) && !isSel;
          const isLocked = forcedSet.has(w.id) && isSel;
          const WIcon    = w.Icon;
          return (
            <button
              key={w.id}
              onClick={() => toggleWidget(w.id)}
              onMouseEnter={() => setHoveredId(w.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`relative flex flex-col gap-2 p-4 rounded-2xl border text-left transition-all ${
                isSel
                  ? "bg-violet-600/15 border-violet-500/50 shadow-[0_0_16px_rgba(139,92,246,0.25)]"
                  : hasGlow
                    ? "bg-white/[0.04] border-amber-500/40 shadow-[0_0_14px_rgba(251,191,36,0.18)]"
                    : "bg-white/[0.03] border-white/[0.07] hover:border-white/[0.14] hover:bg-white/[0.05]"
              }`}
            >
              {isLocked ? (
                <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-violet-800/60 flex items-center justify-center" title="Required by another widget">
                  <Check className="w-2.5 h-2.5 text-violet-300" />
                </div>
              ) : isSel ? (
                <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              ) : hasGlow ? (
                <Sparkles className="absolute top-2.5 right-2.5 w-3.5 h-3.5 text-amber-400 animate-pulse" />
              ) : null}

              <WIcon className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs font-semibold text-white">{w.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{w.tagline}</p>
                {isLocked && (
                  <p className="text-[9px] text-violet-500 mt-1 font-medium">required</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Synergy banner */}
      {synergyMsg && (
        <div className="rounded-xl bg-amber-500/[0.08] border border-amber-500/20 px-4 py-3 text-xs text-amber-300 leading-relaxed flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
          <span><span className="font-semibold">Smart Match —</span> {synergyMsg}</span>
        </div>
      )}

      {/* Suggestion banner */}
      {suggestionMsg && (
        <div className="rounded-xl bg-violet-500/[0.07] border border-violet-500/20 px-4 py-3 text-xs text-violet-300 leading-relaxed flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-violet-400" />
          <span>{suggestionMsg}</span>
        </div>
      )}

      <button
        onClick={() => void finish()}
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
