"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";

interface Event {
  time: string;
  title: string;
  color: string;
}

const EVENT_COLOR: Record<string, string> = {
  violet:  "bg-violet-500/20 border-l-2 border-violet-500 text-violet-300",
  blue:    "bg-blue-500/20 border-l-2 border-blue-500 text-blue-300",
  emerald: "bg-emerald-500/20 border-l-2 border-emerald-500 text-emerald-300",
  orange:  "bg-orange-500/20 border-l-2 border-orange-500 text-orange-300",
  pink:    "bg-pink-500/20 border-l-2 border-pink-500 text-pink-300",
};

const WEEK_EVENTS: Record<number, Event[]> = {
  0: [{ time: "09:00", title: "Team Standup",    color: "violet"  }],
  1: [{ time: "14:00", title: "Client Call",     color: "blue"    }],
  2: [],
  3: [
    { time: "10:00", title: "Deep Work Block",   color: "emerald" },
    { time: "15:30", title: "1:1 w/ Manager",    color: "orange"  },
  ],
  4: [{ time: "13:00", title: "Lunch w/ Sarah",  color: "pink"    }],
  5: [],
  6: [],
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DEADLINE_PRIORITY_COLOR: Record<string, string> = {
  High:  "bg-red-500/20 border-l-2 border-red-500 text-red-300",
  Med:   "bg-amber-500/20 border-l-2 border-amber-500 text-amber-300",
  Low:   "bg-blue-500/20 border-l-2 border-blue-500 text-blue-300",
};

function getMondayOfWeek(offset: number): Date {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function CalendarCard() {
  const [weekOffset, setWeekOffset] = useState(0);
  const { tasks, networkContacts } = useDashboard();

  const monday = getMondayOfWeek(weekOffset);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const weekLabel = `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  // Build deadline map: "YYYY-MM-DD" → tasks
  const deadlineMap = new Map<string, typeof tasks>();
  for (const task of tasks) {
    if (task.deadline && !task.done) {
      const existing = deadlineMap.get(task.deadline) ?? [];
      deadlineMap.set(task.deadline, [...existing, task]);
    }
  }

  // Build birthday map: "MM-DD" → contact names (year-agnostic, recurs annually)
  const birthdayMap = new Map<string, string[]>();
  for (const contact of networkContacts) {
    if (contact.birthday) {
      const mmdd = contact.birthday.slice(5); // "MM-DD"
      birthdayMap.set(mmdd, [...(birthdayMap.get(mmdd) ?? []), contact.name]);
    }
  }

  // Build contact-event map: "YYYY-MM-DD" → event titles (all uncompleted events)
  const contactEventMap = new Map<string, string[]>();
  for (const contact of networkContacts) {
    for (const evt of contact.events) {
      if (evt.date && !evt.completed) {
        const title = evt.title || `${contact.name}'s Event`;
        contactEventMap.set(evt.date, [...(contactEventMap.get(evt.date) ?? []), title]);
      }
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-violet-400" />
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Calendar
          </h2>
          <span className="text-xs text-slate-600 ml-1">{weekLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] flex items-center justify-center transition-all duration-150"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-2.5 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-slate-400 text-xs font-medium transition-all duration-150"
          >
            Today
          </button>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] flex items-center justify-center transition-all duration-150"
          >
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Week strip */}
      <div className="grid grid-cols-7 gap-2 overflow-x-auto">
        {weekDays.map((day, i) => {
          const isToday = day.getTime() === today.getTime();
          const calEvents = (weekOffset === 0 ? WEEK_EVENTS[i] : []) ?? [];

          // Format as YYYY-MM-DD for deadline lookup
          const yyyy = day.getFullYear();
          const mm   = String(day.getMonth() + 1).padStart(2, "0");
          const dd   = String(day.getDate()).padStart(2, "0");
          const dayKey       = `${yyyy}-${mm}-${dd}`;
          const deadlineTasks    = deadlineMap.get(dayKey) ?? [];
          const birthdayNames    = birthdayMap.get(`${mm}-${dd}`) ?? [];
          const contactEvents    = contactEventMap.get(dayKey) ?? [];
          // Show at most 2 deadline chips; +N overflow otherwise
          const visibleDeadlines = deadlineTasks.slice(0, 2);
          const overflow         = deadlineTasks.length - visibleDeadlines.length;

          const hasContent = calEvents.length > 0 || deadlineTasks.length > 0 || birthdayNames.length > 0 || contactEvents.length > 0;

          return (
            <div
              key={i}
              className={`flex flex-col gap-2 rounded-xl p-2.5 border transition-all duration-200 min-w-0 ${
                isToday
                  ? "border-violet-500/40 bg-violet-600/10"
                  : hasContent
                    ? "border-white/[0.08] bg-white/[0.03]"
                    : "border-transparent bg-white/[0.02]"
              }`}
            >
              {/* Day label */}
              <div className="text-center">
                <p className={`text-[10px] font-medium uppercase tracking-wider ${isToday ? "text-violet-400" : "text-slate-600"}`}>
                  {DAYS[i]}
                </p>
                <p className={`text-lg font-semibold leading-tight mt-0.5 ${isToday ? "text-white" : "text-slate-400"}`}>
                  {day.getDate()}
                </p>
              </div>

              {/* Today dot */}
              {isToday && (
                <div className="flex justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.8)]" />
                </div>
              )}

              {/* Birthday chips */}
              {birthdayNames.map((name) => (
                <div
                  key={`bday-${name}`}
                  className="rounded px-1.5 py-1 text-[9px] font-medium leading-tight bg-pink-500/15 border-l-2 border-pink-400 text-pink-300"
                  title={`${name}'s Birthday`}
                >
                  <div className="truncate">🎂 {name}&apos;s Birthday</div>
                </div>
              ))}

              {/* Contact custom events */}
              {contactEvents.map((title) => (
                <div
                  key={`evt-${title}`}
                  className="rounded px-1.5 py-1 text-[9px] font-medium leading-tight bg-violet-500/15 border-l-2 border-violet-400 text-violet-300"
                  title={title}
                >
                  <div className="truncate">🎯 {title}</div>
                </div>
              ))}

              {/* Calendar events */}
              <div className="flex flex-col gap-1">
                {calEvents.map((evt, j) => (
                  <div
                    key={j}
                    className={`rounded px-1.5 py-1 text-[9px] font-medium leading-tight ${EVENT_COLOR[evt.color]}`}
                  >
                    <div className="text-slate-400 text-[8px] mb-0.5">{evt.time}</div>
                    <div className="truncate">{evt.title}</div>
                  </div>
                ))}

                {/* Task deadlines */}
                {visibleDeadlines.map((task) => (
                  <div
                    key={task.id}
                    className={`rounded px-1.5 py-1 text-[9px] font-medium leading-tight ${DEADLINE_PRIORITY_COLOR[task.priority]}`}
                    title={task.title}
                  >
                    <div className="text-[8px] mb-0.5 opacity-60">deadline</div>
                    <div className="truncate">{task.title}</div>
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="text-[9px] text-slate-600 pl-1">+{overflow} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
