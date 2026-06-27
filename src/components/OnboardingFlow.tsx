"use client";

import { useState, useRef } from "react";
import type { ComponentType } from "react";
import {
  ArrowRight, Check, Flame,
  ChevronLeft, ChevronRight,
  CalendarDays, FolderKanban, Timer, NotebookPen, Target,
  Activity, TrendingUp, RefreshCw, Users,
  Sun, Moon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import {
  startupTemplate, personalLifeTemplate, financeTemplate, mediaTemplate,
  marketingTemplate, educationTemplate, legalTemplate, realEstateTemplate, gastroTemplate, retailTemplate,
  creativeTemplate, eventsTemplate, healthTemplate,
} from "@/config/industry-templates";
import type { IndustryTemplate } from "@/config/industry-templates";
import { seedSelectedTemplates } from "@/services/onboardingSeeder";
import { type LoaderConfig } from "@/components/OnboardingLoader";

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
  id:               string;
  label:            string;
  tagline:          string;
  shortDescription: string;
  bulletPoints:     string[];
  Icon:             ComponentType<{ className?: string }>;
  slides:           ComponentType[];
}

const WIDGETS: WidgetDef[] = [
  {
    id: "calendar", label: "Calendar", tagline: "See your week at a glance",
    shortDescription: "Your time, fully visualized",
    bulletPoints: [
      "Switch between week, month and agenda layouts",
      "Colour-coded event blocks with time-of-day awareness",
      "Recurring tasks appear automatically on due dates",
    ],
    Icon: CalendarDays, slides: [CalendarWeekSlide, CalendarMonthSlide, CalendarAgendaSlide],
  },
  {
    id: "habits", label: "Habits", tagline: "Build streaks that stick",
    shortDescription: "Build routines that actually compound",
    bulletPoints: [
      "One-tap daily check-in with instant streak feedback",
      "Heatmap reveals your consistency patterns over time",
      "Top-streaks leaderboard keeps momentum visible",
    ],
    Icon: Flame, slides: [HabitsCheckSlide, HabitsHeatmapSlide, HabitsStreakSlide],
  },
  {
    id: "projects", label: "Projects", tagline: "Track work from idea to done",
    shortDescription: "From backlog to shipped",
    bulletPoints: [
      "Manage tasks across multiple concurrent projects",
      "Kanban, list and stats views in a single widget",
      "Live progress bar tracks milestone completion",
    ],
    Icon: FolderKanban, slides: [ProjectsListSlide, ProjectsKanbanSlide, ProjectsStatsSlide],
  },
  {
    id: "time-tracker", label: "Focus Timer", tagline: "Work in deep, focused blocks",
    shortDescription: "Protect your deep-work blocks",
    bulletPoints: [
      "Pomodoro-style sessions with a live countdown ring",
      "Session history and total daily focus time logged",
      "Pairs directly with your active task queue",
    ],
    Icon: Timer, slides: [TimerRingSlide, TimerSessionsSlide, TimerStatsSlide],
  },
  {
    id: "quick-notes", label: "Quick Notes", tagline: "Capture thoughts instantly",
    shortDescription: "Capture it before it vanishes",
    bulletPoints: [
      "Drop a thought in seconds — no categories, no friction",
      "Pin key notes to always keep them above the fold",
      "Recent and pinned views adapt to how you work",
    ],
    Icon: NotebookPen, slides: [NotesListSlide, NotesPinnedSlide, NotesRecentSlide],
  },
  {
    id: "daily-focus", label: "Daily Focus", tagline: "Queue your top priorities",
    shortDescription: "Queue your top priorities each morning",
    bulletPoints: [
      "Ranked task list built fresh every day",
      "Intent tags — Finish, Time Goal and Maybe",
      "Evening velocity recap shows what you actually shipped",
    ],
    Icon: Target, slides: [FocusQueueSlide, FocusActiveSlide, FocusDoneSlide],
  },
  {
    id: "activity-log", label: "Activity Log", tagline: "See what you've accomplished",
    shortDescription: "A full record of what you've done",
    bulletPoints: [
      "Auto-logs completions, sessions and habit checks",
      "Visual breakdown by category and time of day",
      "Searchable history across the whole dashboard",
    ],
    Icon: Activity, slides: [ActivityFeedSlide, ActivityCategoriesSlide, ActivitySummarySlide],
  },
  {
    id: "progress", label: "Progress", tagline: "Track your momentum",
    shortDescription: "Watch your goals compound over time",
    bulletPoints: [
      "Goal-percentage bars update in real time",
      "Weekly comparison vs. the period before",
      "Clean single-screen view across all active goals",
    ],
    Icon: TrendingUp, slides: [ProgressGoalsSlide, ProgressChartSlide, ProgressWeekSlide],
  },
  {
    id: "recurring", label: "Recurring", tagline: "Never miss what repeats",
    shortDescription: "Never let a responsibility slip",
    bulletPoints: [
      "Schedule tasks on daily, weekly or monthly cycles",
      "Countdown clock shows exactly when each is due",
      "Completion-rate trend keeps you accountable",
    ],
    Icon: RefreshCw, slides: [RecurringListSlide, RecurringDueSlide, RecurringRatesSlide],
  },
  {
    id: "network", label: "Network", tagline: "Stay close to your people",
    shortDescription: "Stay genuinely close to your people",
    bulletPoints: [
      "Contact log with last-touchpoint tracking",
      "Automatic birthday and follow-up reminders",
      "Interaction history and upcoming events at a glance",
    ],
    Icon: Users, slides: [NetworkContactsSlide, NetworkInteractionsSlide, NetworkUpcomingSlide],
  },
];

// Shared with FounderDashboard's insights table — same icons/labels, no duplicate registry.
export const WIDGET_ICON_MAP: Record<string, ComponentType<{ className?: string }>> =
  Object.fromEntries(WIDGETS.map(w => [w.id, w.Icon]));
export const WIDGET_LABEL_MAP: Record<string, string> =
  Object.fromEntries(WIDGETS.map(w => [w.id, w.label]));

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

// ── Widget card (per-card carousel + body + CTA) ──────────────────────────────

interface WidgetCardProps {
  widget:     WidgetDef;
  isSelected: boolean;
  isForced:   boolean;
  hasGlow:    boolean;
  isFlashing: boolean;
  onToggle:   () => void;
  onHover:    (id: string | null) => void;
}

function WidgetCard({ widget, isSelected, isForced, hasGlow, isFlashing, onToggle, onHover }: WidgetCardProps) {
  const [slideIdx, setSlideIdx] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const Slide = widget.slides[slideIdx];

  return (
    <div
      id={`widget-card-${widget.id}`}
      onMouseEnter={() => onHover(widget.id)}
      onMouseLeave={() => onHover(null)}
      className={`flex flex-col rounded-2xl border overflow-hidden transition-all duration-200 ${isFlashing ? "animate-card-pulse" : ""} ${
        isSelected
          ? "border-violet-500/50 shadow-[0_0_20px_rgba(139,92,246,0.18)]"
          : hasGlow
            ? "border-amber-500/35 shadow-[0_0_14px_rgba(251,191,36,0.12)]"
            : "border-white/[0.07] hover:border-white/[0.15]"
      }`}
    >
      {/* 16:9 live preview carousel */}
      <div
        className="relative aspect-video overflow-hidden bg-[#080B14] group"
        style={{ touchAction: "pan-y" }}
        onTouchStart={(e) => { touchStartXRef.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStartXRef.current === null || widget.slides.length <= 1) return;
          const delta = e.changedTouches[0].clientX - touchStartXRef.current;
          touchStartXRef.current = null;
          if (Math.abs(delta) < 30) return;
          if (delta < 0) setSlideIdx(i => (i + 1) % widget.slides.length);
          else setSlideIdx(i => (i - 1 + widget.slides.length) % widget.slides.length);
        }}
      >
        <div className="absolute inset-0 p-4 flex items-center justify-center overflow-hidden">
          <div className="w-full"><Slide /></div>
        </div>

        {/* Chevron arrows — left */}
        {widget.slides.length > 1 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setSlideIdx(i => (i - 1 + widget.slides.length) % widget.slides.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-150"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Chevron arrows — right */}
        {widget.slides.length > 1 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setSlideIdx(i => (i + 1) % widget.slides.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-150"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Dot navigation — always visible */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
          {widget.slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); setSlideIdx(i); }}
              data-onboarding-dot={i === slideIdx ? "active" : "inactive"}
              className={`rounded-full transition-all duration-200 ${
                i === slideIdx ? "w-3.5 h-1.5 bg-violet-400/90" : "w-1.5 h-1.5 bg-white/30 hover:bg-white/55"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 bg-[#0D1120] px-4 pt-4 pb-3 gap-3 onboarding-body-divider">
        <div>
          <div className="flex items-center gap-2">
            <widget.Icon className="w-4 h-4 shrink-0 text-slate-400" />
            <h3 className="text-sm font-semibold text-white leading-tight">{widget.label}</h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{widget.shortDescription}</p>
        </div>
        <ul className="flex flex-col gap-1.5">
          {widget.bulletPoints.map((bp, i) => (
            <li key={i} className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-violet-500 mt-[5px] shrink-0" />
              <span className="text-[11px] text-slate-400 leading-snug">{bp}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Selection footer */}
      <div className="bg-[#0D1120] px-4 pb-4">
        <button
          type="button"
          onClick={onToggle}
          className={`w-full h-9 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            isSelected
              ? "bg-violet-600/30 border border-violet-500/50 text-violet-300 hover:bg-violet-600/40"
              : "bg-white/[0.04] border border-white/[0.09] text-slate-400 hover:text-white hover:border-white/[0.22] hover:bg-white/[0.07]"
          }`}
        >
          {isSelected ? <><Check className="w-3 h-3" /> Selected</> : "Choose"}
        </button>
        {isForced && (
          <p className="text-[9px] text-violet-500 mt-1.5 text-center font-medium">required</p>
        )}
        {hasGlow && !isSelected && !isForced && (
          <p className="text-[9px] text-amber-500/70 mt-1.5 text-center font-medium">suggested</p>
        )}
      </div>
    </div>
  );
}

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

// ── Step 2: Intent ─────────────────────────────────────────────────────────────

type Intent = "personal" | "projects";

const INDUSTRIES: { id: string; label: string; emoji: string }[] = [
  { id: "startups",      label: "Startups",     emoji: "🚀" },
  { id: "creative",      label: "Creative",     emoji: "🎨" },
  { id: "events",        label: "Events",       emoji: "📅" },
  { id: "health",        label: "Health",       emoji: "🩺" },
  { id: "finance",       label: "Finance",      emoji: "💰" },
  { id: "media",         label: "Media",        emoji: "📺" },
  { id: "marketing",     label: "Marketing",    emoji: "📈" },
  { id: "education",     label: "Education",    emoji: "🎓" },
  { id: "legal",         label: "Legal",        emoji: "⚖️" },
  { id: "real-estate",   label: "Real Estate",  emoji: "🏢" },
  { id: "gastro",        label: "Gastro",       emoji: "🍳" },
  { id: "retail",        label: "Retail",       emoji: "🛍️" },
];

// Maps an INDUSTRIES chip label straight to its onboarding sample-data template.
// Personal & Family Life has no chip — it's seeded separately via the big
// "My Personal Life" intent card instead (see handleFinish).
const TEMPLATE_BY_INDUSTRY_LABEL: Record<string, IndustryTemplate> = {
  "Startups":     startupTemplate,
  "Creative":     creativeTemplate,
  "Events":       eventsTemplate,
  "Health":       healthTemplate,
  "Finance":      financeTemplate,
  "Media":        mediaTemplate,
  "Marketing":    marketingTemplate,
  "Education":    educationTemplate,
  "Legal":        legalTemplate,
  "Real Estate":  realEstateTemplate,
  "Gastro":       gastroTemplate,
  "Retail":       retailTemplate,
};

function IntentStep({
  nickname,
  onNext,
}: {
  nickname: string;
  onNext: (intents: Intent[], industries: string[], customIndustry: string) => void;
}) {
  const [masters,        setMasters]        = useState<Set<Intent>>(new Set());
  const [industries,     setIndustries]     = useState<Set<string>>(new Set());
  const [customIndustry, setCustomIndustry] = useState("");
  const [customOpen,     setCustomOpen]     = useState(false);
  const [customText,     setCustomText]     = useState("");

  function toggleMaster(intent: Intent) {
    setMasters(prev => {
      const next = new Set(prev);
      if (next.has(intent)) { next.delete(intent); } else { next.add(intent); }
      return next;
    });
  }

  function toggleIndustry(label: string) {
    setIndustries(prev => {
      const next = new Set(prev);
      if (next.has(label)) { next.delete(label); } else { next.add(label); }
      return next;
    });
  }

  function addCustom() {
    const v = customText.trim();
    if (!v) return;
    setCustomIndustry(v);
    setCustomText("");
    setCustomOpen(false);
  }

  const canContinue = masters.size > 0
    && (!masters.has("projects") || industries.size > 0 || customIndustry.trim().length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          What brings you here, {nickname}?
        </h2>
        <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
          This just helps us tailor your starter widgets. Pick as many as apply.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          role="checkbox"
          aria-checked={masters.has("personal")}
          onClick={() => toggleMaster("personal")}
          className={`relative flex flex-col items-center gap-3 rounded-2xl border px-4 py-6 transition-all ${
            masters.has("personal")
              ? "border-violet-500/50 bg-violet-500/[0.08] shadow-[0_0_20px_rgba(139,92,246,0.18)]"
              : "border-white/[0.09] bg-white/[0.03] hover:border-white/[0.18]"
          }`}
        >
          {masters.has("personal") && (
            <Check className="absolute top-2.5 right-2.5 w-3.5 h-3.5 text-violet-300" />
          )}
          <Activity className={`w-7 h-7 ${masters.has("personal") ? "text-violet-300" : "text-slate-400"}`} />
          <span className={`text-sm font-semibold ${masters.has("personal") ? "text-white" : "text-slate-300"}`}>
            My Personal Life
          </span>
        </button>

        <button
          type="button"
          role="checkbox"
          aria-checked={masters.has("projects")}
          onClick={() => toggleMaster("projects")}
          className={`relative flex flex-col items-center gap-3 rounded-2xl border px-4 py-6 transition-all ${
            masters.has("projects")
              ? "border-violet-500/50 bg-violet-500/[0.08] shadow-[0_0_20px_rgba(139,92,246,0.18)]"
              : "border-white/[0.09] bg-white/[0.03] hover:border-white/[0.18]"
          }`}
        >
          {masters.has("projects") && (
            <Check className="absolute top-2.5 right-2.5 w-3.5 h-3.5 text-violet-300" />
          )}
          <FolderKanban className={`w-7 h-7 ${masters.has("projects") ? "text-violet-300" : "text-slate-400"}`} />
          <span className={`text-sm font-semibold ${masters.has("projects") ? "text-white" : "text-slate-300"}`}>
            My Projects
          </span>
        </button>
      </div>

      {masters.has("projects") && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-500">Which industries are closest to your work?</p>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map(ind => {
              const isSel = industries.has(ind.label);
              return (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => toggleIndustry(ind.label)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    isSel
                      ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
                      : "bg-white/[0.03] border-white/[0.09] text-slate-400 hover:border-white/[0.18] hover:text-slate-200"
                  }`}
                >
                  <span>{ind.emoji}</span>{ind.label}
                </button>
              );
            })}

            {customIndustry && (
              <button
                type="button"
                onClick={() => setCustomIndustry("")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-violet-600/20 border-violet-500/40 text-violet-300"
              >
                {customIndustry}
              </button>
            )}

            <button
              type="button"
              onClick={() => setCustomOpen(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                customOpen
                  ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
                  : "bg-white/[0.03] border-white/[0.09] text-slate-400 hover:border-white/[0.18] hover:text-slate-200"
              }`}
            >
              + Custom
            </button>
          </div>

          {customOpen && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addCustom(); }}
                placeholder="Type your field..."
                autoFocus
                className="flex-1 h-9 px-3 rounded-xl bg-white/[0.05] border border-white/[0.09] text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 transition-colors"
              />
              <button
                type="button"
                onClick={addCustom}
                disabled={!customText.trim()}
                className="h-9 px-3 rounded-xl text-xs font-semibold text-violet-300 bg-violet-600/20 border border-violet-500/40 disabled:opacity-40 transition-all"
              >
                Add
              </button>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => onNext([...masters], [...industries], customIndustry)}
        disabled={!canContinue}
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
  onNext,
}: {
  nickname: string;
  onNext: (widgets: string[]) => void;
}) {
  const [userPicked, setUserPicked] = useState<Set<string>>(new Set());
  const [hoveredId,  setHoveredId]  = useState<string | null>(null);
  const [flashedId,  setFlashedId]  = useState<string | null>(null);

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

  const forcedSet = new Set<string>(selected.filter(id => !userPicked.has(id)));

  const glowSet = new Set<string>([
    ...selected.flatMap(id => SYNERGY[id] ? [SYNERGY[id].partner] : []),
    ...selected.flatMap(id => SUGGESTIONS[id]?.partners ?? []),
  ]);


  function scrollToCard(id: string) {
    const el = document.getElementById(`widget-card-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashedId(id);
    setTimeout(() => setFlashedId(null), 1000);
  }

  function toggleWidget(id: string) {
    setUserPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  const allSelected = WIDGETS.every(w => selected.includes(w.id));

  function toggleSelectAll() {
    setUserPicked(allSelected ? new Set() : new Set(WIDGETS.map(w => w.id)));
  }

  return (
    <div className="flex flex-col gap-6">
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

      {/* Expanded widget grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
        {WIDGETS.map(w => {
          const isSel    = selected.includes(w.id);
          const isForced = forcedSet.has(w.id) && isSel;
          const hasGlow  = glowSet.has(w.id) && !isSel;
          return (
            <WidgetCard
              key={w.id}
              widget={w}
              isSelected={isSel}
              isForced={isForced}
              hasGlow={hasGlow}
              isFlashing={flashedId === w.id}
              onToggle={() => toggleWidget(w.id)}
              onHover={setHoveredId}
            />
          );
        })}
      </div>

      {/* Widget index navigation — three tiers */}
      <div className="flex flex-wrap gap-2">
        {WIDGETS.map(w => {
          const isSel  = selected.includes(w.id);
          const isGlow = glowSet.has(w.id) && !isSel;
          const WIcon  = w.Icon;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => scrollToCard(w.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                isSel
                  ? "bg-violet-600/20 border-violet-500/40 text-violet-300 hover:bg-violet-600/30"
                  : isGlow
                    ? "bg-amber-500/[0.10] border-amber-500/35 text-amber-400/80 hover:bg-amber-500/[0.16]"
                    : "bg-white/[0.03] border-white/[0.09] text-slate-500 hover:border-white/[0.18] hover:text-slate-300"
              }`}
            >
              <WIcon className={`w-3 h-3 shrink-0 ${isSel ? "text-violet-400" : isGlow ? "text-amber-400" : "text-slate-500"}`} />
              {w.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={toggleSelectAll}
        className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
      >
        <span className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
          allSelected ? "bg-violet-600 border-violet-600" : "border-white/[0.15]"
        }`}>
          {allSelected && <Check className="w-3 h-3 text-white" />}
        </span>
        {allSelected ? "Deselect All Widgets" : "Select All Widgets"}
      </button>

      <button
        onClick={() => onNext(selected)}
        className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all shadow-[0_0_24px_rgba(139,92,246,0.3)]"
        style={{ background: "linear-gradient(to right, #8B5CF6, #7C3AED)" }}
      >
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Step 3: Appearance ─────────────────────────────────────────────────────────

function AppearanceStep({
  selectedWidgets,
  onFinish,
}: {
  selectedWidgets: string[];
  onFinish: (widgets: string[]) => void;
}) {
  const { mode, setMode } = useTheme();

  function finish() {
    onFinish(selectedWidgets);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <div className="text-4xl mb-4">✨</div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Choose your aesthetic
        </h2>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
          Pick the canvas that suits your style. You can switch anytime from Settings.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* ── Clean Light (left — default) ── */}
        <button
          type="button"
          onClick={() => setMode("light")}
          className={`flex flex-col rounded-2xl border overflow-hidden transition-all duration-200 text-left ${
            mode === "light"
              ? "border-orange-500/60 shadow-[0_0_20px_rgba(243,86,0,0.2)] ring-1 ring-orange-500/20"
              : "border-white/[0.09] hover:border-white/[0.22]"
          }`}
        >
          {/* Mini light preview — inline styles immune to .light overrides */}
          <div className="aspect-video relative overflow-hidden" style={{ background: "#f6f5f1" }}>
            <div className="absolute inset-0 p-3 flex flex-col gap-1.5">
              <div style={{ color: "#7c776e", fontSize: "7px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>
                Today&apos;s Focus
              </div>
              {["Finish Blueprint UI", "Reply to Paul", "Review PR"].map((t, i) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "1.5px solid rgba(28,25,23,0.15)", background: "rgba(28,25,23,0.03)", flexShrink: 0 }} />
                  <span style={{ color: i === 0 ? "#1c1917" : "#a8a29e", fontSize: "8px" }}>{t}</span>
                </div>
              ))}
              <div style={{ marginTop: "4px", height: "1px", background: "rgba(28,25,23,0.08)" }} />
              <div style={{ display: "flex", gap: "4px", marginTop: "3px" }}>
                <div style={{ flex: 1, height: "18px", borderRadius: "5px", background: "rgba(243,86,0,0.12)", border: "1px solid rgba(243,86,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#f35600", fontSize: "7px", fontWeight: 600 }}>Finish</span>
                </div>
                <div style={{ flex: 1, height: "18px", borderRadius: "5px", background: "rgba(28,25,23,0.04)", border: "1px solid rgba(28,25,23,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#7c776e", fontSize: "7px" }}>Maybe</span>
                </div>
              </div>
            </div>
          </div>
          {/* Label row — always light surface */}
          <div style={{ background: "#ffffff", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ color: "#1c1917", fontSize: "13px", fontWeight: 600, margin: 0 }}>Clean Light</p>
              <p style={{ color: "#7c776e", fontSize: "10px", margin: "2px 0 0" }}>Warm paper, crisp ink</p>
            </div>
            <div style={{
              width: "16px", height: "16px", borderRadius: "50%", border: `2px solid ${mode === "light" ? "#f35600" : "rgba(28,25,23,0.2)"}`,
              background: mode === "light" ? "#f35600" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
            }}>
              {mode === "light" && <Check style={{ width: "9px", height: "9px", color: "#fff" }} />}
            </div>
          </div>
        </button>

        {/* ── Dark Classic (right) ── */}
        <button
          type="button"
          onClick={() => setMode("dark")}
          className={`flex flex-col rounded-2xl border overflow-hidden transition-all duration-200 text-left ${
            mode === "dark"
              ? "border-violet-500/60 shadow-[0_0_20px_rgba(139,92,246,0.22)] ring-1 ring-violet-500/25"
              : "border-white/[0.09] hover:border-white/[0.22]"
          }`}
        >
          {/* Mini dark preview — inline styles so light-mode overrides can't touch it */}
          <div className="aspect-video relative overflow-hidden" style={{ background: "#0B0F19" }}>
            <div className="absolute inset-0 p-3 flex flex-col gap-1.5">
              <div style={{ color: "#94a3b8", fontSize: "7px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>
                Today&apos;s Focus
              </div>
              {["Finish Blueprint UI", "Reply to Paul", "Review PR"].map((t, i) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.03)", flexShrink: 0 }} />
                  <span style={{ color: i === 0 ? "#e2e8f0" : "#64748b", fontSize: "8px" }}>{t}</span>
                </div>
              ))}
              <div style={{ marginTop: "4px", height: "1px", background: "rgba(255,255,255,0.06)" }} />
              <div style={{ display: "flex", gap: "4px", marginTop: "3px" }}>
                <div style={{ flex: 1, height: "18px", borderRadius: "5px", background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#a78bfa", fontSize: "7px", fontWeight: 600 }}>Finish</span>
                </div>
                <div style={{ flex: 1, height: "18px", borderRadius: "5px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#64748b", fontSize: "7px" }}>Maybe</span>
                </div>
              </div>
            </div>
          </div>
          {/* Label row — dark surface so it's always readable */}
          <div style={{ background: "#0D1120", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ color: "#f8f9fa", fontSize: "13px", fontWeight: 600, margin: 0 }}>Dark Classic</p>
              <p style={{ color: "#64748b", fontSize: "10px", margin: "2px 0 0" }}>Deep navy, soft glows</p>
            </div>
            <div style={{
              width: "16px", height: "16px", borderRadius: "50%", border: `2px solid ${mode === "dark" ? "#8b5cf6" : "rgba(255,255,255,0.2)"}`,
              background: mode === "dark" ? "#8b5cf6" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
            }}>
              {mode === "dark" && <Check style={{ width: "9px", height: "9px", color: "#fff" }} />}
            </div>
          </div>
        </button>
      </div>

      <button
        onClick={finish}
        className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all shadow-[0_0_24px_rgba(139,92,246,0.3)]"
        style={{ background: "linear-gradient(to right, #8B5CF6, #7C3AED)" }}
      >
        Let&apos;s go! <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Main flow ──────────────────────────────────────────────────────────────────

export default function OnboardingFlow({ onStartLoader }: { onStartLoader: (config: LoaderConfig) => void }) {
  const { user } = useAuth();
  const { mode } = useTheme();
  const [step,            setStep]           = useState<"identity" | "intent" | "marketplace" | "appearance">("identity");
  const [nickname,        setNickname]       = useState("");
  const [intents,         setIntents]        = useState<Intent[]>([]);
  const [industries,      setIndustries]     = useState<string[]>([]);
  const [customIndustry,  setCustomIndustry] = useState("");
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);

  // Seeds areas/tasks and writes user_insights — does NOT flip is_onboarded yet.
  // Stack every selected track into one dashboard: the big "My Personal Life" intent
  // card seeds personalLifeTemplate, and every selected industry chip with a matching
  // entry seeds its own template alongside it. Chips with no template mapping
  // (Creative/Events/Health) are simply absent here — the merge-vs-fallback policy
  // lives in seedSelectedTemplates (src/services/onboardingSeeder.ts), not here.
  async function doSeed(widgets: string[]) {
    if (!supabase || !user) return;

    const templatesToSeed: IndustryTemplate[] = [];
    if (intents.includes("personal")) templatesToSeed.push(personalLifeTemplate);
    for (const label of industries) {
      const template = TEMPLATE_BY_INDUSTRY_LABEL[label];
      if (template) templatesToSeed.push(template);
    }

    await seedSelectedTemplates(templatesToSeed, user.id);

    // Best-effort — onboarding still completes even if this insert fails.
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("user_insights")
      .upsert({
        id:                  user.id,
        display_name:        nickname,
        intents,
        industries,
        custom_industry:     customIndustry || null,
        selected_widgets:    widgets,
        widget_activated_at: Object.fromEntries(widgets.map(id => [id, nowIso])),
      });
    if (error) console.warn("[OnboardingFlow] user_insights upsert failed:", error.message);
  }

  // Called after the loading animation completes. Sets is_onboarded: true →
  // onAuthStateChange fires → AuthContext updates user → AuthGate unmounts this flow.
  async function doComplete(widgets: string[]) {
    if (!supabase || !user) return;
    await supabase.auth.updateUser({
      data: {
        is_onboarded:    true,
        display_name:    nickname,
        intents,
        industries,
        custom_industry: customIndustry || null,
        widget_layout:   widgets,
      },
    });
  }

  function handleFinish(widgets: string[]) {
    onStartLoader({
      selectedWidgets: widgets,
      theme:           mode,
      seedFn:          () => doSeed(widgets),
      completeFn:      () => doComplete(widgets),
    });
  }

  const stepIndex = step === "identity" ? 0 : step === "intent" ? 1 : step === "marketplace" ? 2 : 3;

  function goBack() {
    if (step === "intent")           setStep("identity");
    else if (step === "marketplace") setStep("intent");
    else if (step === "appearance")  setStep("marketplace");
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/[0.07] blur-[120px]" />
      </div>

      <div className={`relative w-full ${step === "marketplace" ? "max-w-7xl" : step === "appearance" ? "max-w-xl" : "max-w-lg"}`}>

        {/* Step dots */}
        <div className="relative flex items-center justify-center min-h-[40px] mb-10">
          {step !== "identity" && (
            <button
              type="button"
              onClick={goBack}
              className="block md:hidden absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`rounded-full transition-all duration-300 ${
                i === stepIndex
                  ? "w-6 h-2 bg-violet-500"
                  : i < stepIndex
                    ? "w-2 h-2 bg-violet-500/40"
                    : "w-2 h-2 bg-white/[0.12]"
              }`} />
            ))}
          </div>
        </div>

        {step === "identity" ? (
          <IdentityStep onNext={name => { setNickname(name); setStep("intent"); }} />
        ) : step === "intent" ? (
          <IntentStep
            nickname={nickname}
            onNext={(selectedIntents, selectedIndustries, selectedCustomIndustry) => {
              setIntents(selectedIntents);
              setIndustries(selectedIndustries);
              setCustomIndustry(selectedCustomIndustry);
              setStep("marketplace");
            }}
          />
        ) : step === "marketplace" ? (
          <MarketplaceStep
            nickname={nickname}
            onNext={widgets => { setSelectedWidgets(widgets); setStep("appearance"); }}
          />
        ) : (
          <AppearanceStep selectedWidgets={selectedWidgets} onFinish={handleFinish} />
        )}
      </div>
    </div>
  );
}
