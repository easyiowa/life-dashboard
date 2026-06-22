"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDashboard, type CalendarJump, type RecurringTask } from "@/context/DashboardContext";
import { areaColor, type AreaColorSet } from "@/lib/areaColors";
import { computeCountdown } from "@/components/widgets/RecurringCard";

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

const WEEK_EVENTS: Record<number, Event[]> = {};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Chip class builders — area/group color drives both views
function weekChip(ac: AreaColorSet): string {
  return `${ac.bgTint} border-l-2 ${ac.borderAccent} ${ac.text}`;
}
function monthChip(ac: AreaColorSet): string {
  return `${ac.bgTint} border ${ac.border} ${ac.text}`;
}

function getMondayOfWeek(offset: number): Date {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getMonthGrid(monthOffset: number): (Date | null)[] {
  const now      = new Date();
  const year     = now.getFullYear();
  const month    = now.getMonth() + monthOffset;
  const first    = new Date(year, month, 1);
  const last     = new Date(year, month + 1, 0);
  const startDow = (first.getDay() + 6) % 7; // Mon = 0
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// Same grid logic, but anchored to an arbitrary date (used by the mobile month picker)
function getMonthGridFor(base: Date): (Date | null)[] {
  const year     = base.getFullYear();
  const month    = base.getMonth();
  const first    = new Date(year, month, 1);
  const last     = new Date(year, month + 1, 0);
  const startDow = (first.getDay() + 6) % 7; // Mon = 0
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarCard() {
  const [weekOffset,   setWeekOffset]   = useState(0);
  const [monthOffset,  setMonthOffset]  = useState(0);
  const [calendarView, setCalendarView] = useState<"week" | "month">("week");
  const { tasks, networkContacts, spheres, relationshipGroups, recurringTasks, setCalendarJump } = useDashboard();

  // ── Mobile-only state ─────────────────────────────────────────────────────────
  const [mobileActiveDate, setMobileActiveDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [mobileDayCount,   setMobileDayCount]   = useState<1 | 2 | 3>(1);
  const [monthPickerOpen,  setMonthPickerOpen]  = useState(false);
  const [pickerMonthDate,  setPickerMonthDate]  = useState(() => new Date());

  // Dropdown is portaled to <body> so its z-index isn't trapped inside this
  // card's own backdrop-blur stacking context (which would otherwise lose to
  // later sibling widget cards regardless of z-index value).
  const monthBtnRef     = useRef<HTMLButtonElement>(null);
  const [monthPickerPos, setMonthPickerPos] = useState({ top: 0, left: 0 });

  // Mobile 1/2/3-day carousel — swipe replaces the old column-count menu
  const mobileCarouselRef = useRef<HTMLDivElement>(null);
  const mobileCarouselIndex = mobileDayCount - 1;

  useEffect(() => {
    const el = mobileCarouselRef.current;
    if (el) el.scrollLeft = el.clientWidth * mobileCarouselIndex;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleMobileCarouselScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const index = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
    const nextCount = (Math.min(Math.max(index, 0), 2) + 1) as 1 | 2 | 3;
    if (nextCount !== mobileDayCount) setMobileDayCount(nextCount);
  }

  // Color resolution
  const sphereByName = new Map(spheres.map((s) => [s.name, s]));
  const contactById  = new Map(networkContacts.map((c) => [c.id, c]));
  const groupByLabel = new Map(relationshipGroups.map((g) => [g.label, g]));

  function getSphereAc(sphereName: string): AreaColorSet {
    return areaColor(sphereByName.get(sphereName)?.labelColor);
  }
  function getContactAc(contactId: string): AreaColorSet {
    const contact = contactById.get(contactId);
    const group   = contact ? groupByLabel.get(contact.relationshipType) : undefined;
    return areaColor(group?.color);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Shared data maps ──────────────────────────────────────────────────────────

  const deadlineMap = new Map<string, typeof tasks>();
  for (const task of tasks) {
    if (task.deadline && !task.done) {
      deadlineMap.set(task.deadline, [...(deadlineMap.get(task.deadline) ?? []), task]);
    }
  }

  const birthdayMap = new Map<string, { name: string; contactId: string }[]>();
  for (const contact of networkContacts) {
    if (contact.birthday) {
      const mmdd = contact.birthday.slice(5);
      birthdayMap.set(mmdd, [...(birthdayMap.get(mmdd) ?? []), { name: contact.name, contactId: contact.id }]);
    }
  }

  const contactEventMap = new Map<string, { title: string; contactId: string }[]>();
  for (const contact of networkContacts) {
    for (const evt of contact.events) {
      if (evt.date && !evt.completed) {
        const title = evt.title || `${contact.name}'s Event`;
        contactEventMap.set(evt.date, [...(contactEventMap.get(evt.date) ?? []), { title, contactId: contact.id }]);
      }
    }
  }

  const recurringDateMap = new Map<string, RecurringTask[]>();
  for (const rt of recurringTasks) {
    const { daysLeft } = computeCountdown(rt);
    const dueDay = new Date(today);
    dueDay.setDate(today.getDate() + Math.max(daysLeft, 0));
    const key = dueDay.toLocaleDateString("en-CA");
    recurringDateMap.set(key, [...(recurringDateMap.get(key) ?? []), rt]);
  }

  // ── Navigation ────────────────────────────────────────────────────────────────

  function prev()    { calendarView === "week" ? setWeekOffset((o) => o - 1)  : setMonthOffset((o) => o - 1); }
  function next()    { calendarView === "week" ? setWeekOffset((o) => o + 1)  : setMonthOffset((o) => o + 1); }
  function goToday() { setWeekOffset(0); setMonthOffset(0); }

  // ── Week view ─────────────────────────────────────────────────────────────────

  const monday   = getMondayOfWeek(weekOffset);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const weekLabel = `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  // ── Month view ────────────────────────────────────────────────────────────────

  const monthBaseDate = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1);
  const monthLabel    = monthBaseDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const monthCells    = getMonthGrid(monthOffset);

  // ── Display label ─────────────────────────────────────────────────────────────

  const displayLabel = calendarView === "week" ? weekLabel : monthLabel;

  // ── Mobile column view ────────────────────────────────────────────────────────

  function getMobileDays(count: 1 | 2 | 3): Date[] {
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(mobileActiveDate);
      d.setDate(mobileActiveDate.getDate() + i);
      return d;
    });
  }
  const MOBILE_GRID_COLS_CLASS: Record<1 | 2 | 3, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
  };

  function renderDayColumn(day: Date) {
    const dow          = (day.getDay() + 6) % 7; // Mon = 0
    const isToday       = day.getTime() === today.getTime();
    const calEvents     = (weekOffset === 0 ? WEEK_EVENTS[dow] : []) ?? [];
    const yyyy          = day.getFullYear();
    const mm            = String(day.getMonth() + 1).padStart(2, "0");
    const dd            = String(day.getDate()).padStart(2, "0");
    const dayKey        = `${yyyy}-${mm}-${dd}`;
    const deadlines     = deadlineMap.get(dayKey) ?? [];
    const birthdays     = birthdayMap.get(`${mm}-${dd}`) ?? [];
    const contactEvts   = contactEventMap.get(dayKey) ?? [];
    const recurringItems = recurringDateMap.get(dayKey) ?? [];
    const visible        = deadlines.slice(0, 2);
    const overflow        = deadlines.length - visible.length;
    const hasContent      = calEvents.length > 0 || deadlines.length > 0 || birthdays.length > 0 || contactEvts.length > 0 || recurringItems.length > 0;

    return (
      <div
        key={dayKey}
        className={`flex flex-col gap-2 rounded-xl p-2.5 border transition-all duration-200 min-w-0 ${
          isToday
            ? "border-violet-500/40 bg-violet-600/10"
            : hasContent
              ? "border-white/[0.08] bg-white/[0.03]"
              : "border-transparent bg-white/[0.02]"
        }`}
      >
        <div className="text-center">
          <p className={`text-[10px] font-medium uppercase tracking-wider ${isToday ? "text-violet-400" : "text-slate-600"}`}>
            {DAYS[dow]}
          </p>
          <p className={`text-lg font-semibold leading-tight mt-0.5 ${isToday ? "text-white" : "text-slate-400"}`}>
            {day.getDate()}
          </p>
        </div>

        {isToday && (
          <div className="flex justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.8)]" />
          </div>
        )}

        {birthdays.map(({ name, contactId }) => (
          <button
            key={`bday-${contactId}`}
            onClick={() => setCalendarJump({ type: "contact", id: contactId })}
            className={`rounded px-1.5 py-1 text-[9px] font-medium leading-tight text-left w-full cursor-pointer hover:brightness-125 hover:scale-[1.01] transition-all ${weekChip(getContactAc(contactId))}`}
            title={`${name}'s Birthday`}
          >
            <div className="truncate">🎂 {name}&apos;s Birthday</div>
          </button>
        ))}

        {contactEvts.map(({ title, contactId }) => (
          <button
            key={`evt-${contactId}-${title}`}
            onClick={() => setCalendarJump({ type: "contact", id: contactId })}
            className={`rounded px-1.5 py-1 text-[9px] font-medium leading-tight text-left w-full cursor-pointer hover:brightness-125 hover:scale-[1.01] transition-all ${weekChip(getContactAc(contactId))}`}
            title={title}
          >
            <div className="truncate">🎯 {title}</div>
          </button>
        ))}

        {recurringItems.map((rt) => (
          <button
            key={`rt-${rt.id}`}
            className={`rounded px-1.5 py-1 text-[9px] font-medium leading-tight text-left w-full cursor-pointer hover:brightness-125 hover:scale-[1.01] transition-all ${weekChip(getSphereAc(rt.sphere))}`}
            title={rt.title}
          >
            <div className="truncate">♻️ {rt.title}</div>
          </button>
        ))}

        <div className="flex flex-col gap-1">
          {calEvents.map((evt, j) => (
            <button key={j} className={`rounded px-1.5 py-1 text-[9px] font-medium leading-tight text-left w-full cursor-pointer hover:brightness-125 hover:scale-[1.01] transition-all ${EVENT_COLOR[evt.color]}`}>
              <div className="text-slate-400 text-[8px] mb-0.5">{evt.time}</div>
              <div className="truncate">{evt.title}</div>
            </button>
          ))}
          {visible.map((task) => (
            <button
              key={task.id}
              onClick={() => setCalendarJump({ type: "task", id: task.id })}
              className={`rounded px-1.5 py-1 text-[9px] font-medium leading-tight text-left w-full cursor-pointer hover:brightness-125 hover:scale-[1.01] transition-all ${weekChip(getSphereAc(task.sphere))}`}
              title={task.title}
            >
              <div className="truncate">{task.title}</div>
            </button>
          ))}
          {overflow > 0 && <div className="text-[9px] text-slate-600 pl-1">+{overflow} more</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5 flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-violet-400" />
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Calendar</h2>
          <span className="hidden sm:inline text-xs text-slate-600 ml-1">{displayLabel}</span>
        </div>

        {/* Desktop controls */}
        <div className="hidden sm:flex items-center gap-2">

          {/* Segmented control */}
          <div className="flex rounded-lg border border-white/[0.07] overflow-hidden">
            {(["week", "month"] as const).map((v, i) => (
              <button
                key={v}
                onClick={() => setCalendarView(v)}
                className={`px-3 h-7 text-xs font-medium transition-all duration-150 ${
                  i === 0 ? "border-r border-white/[0.07]" : ""
                } ${
                  calendarView === v
                    ? "bg-violet-600/25 text-violet-300"
                    : "bg-white/[0.02] text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]"
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {/* Navigation arrows */}
          <div className="flex items-center gap-1">
            <button
              onClick={prev}
              className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] flex items-center justify-center transition-all duration-150"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={goToday}
              className="px-2.5 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-slate-400 text-xs font-medium transition-all duration-150"
            >
              Today
            </button>
            <button
              onClick={next}
              className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] flex items-center justify-center transition-all duration-150"
            >
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Mobile controls — month selector; day-count is now set by swiping the carousel below */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            ref={monthBtnRef}
            onClick={() => {
              const rect = monthBtnRef.current?.getBoundingClientRect();
              if (rect) setMonthPickerPos({ top: rect.bottom + 8, left: rect.right - 256 });
              setPickerMonthDate(new Date(mobileActiveDate));
              setMonthPickerOpen((o) => !o);
            }}
            className="px-2.5 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-slate-300 text-xs font-medium transition-all duration-150"
          >
            {mobileActiveDate.toLocaleDateString("en-US", { month: "long" })}
          </button>
        </div>
      </div>

      {/* Dropdowns are portaled to <body> — see note above the refs/state for why. */}
      {monthPickerOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setMonthPickerOpen(false)} />
          <div
            className="fixed z-[110] w-64 bg-[#0d1426] border border-white/[0.12] rounded-xl shadow-2xl p-3 flex flex-col gap-2"
            style={{ top: monthPickerPos.top, left: monthPickerPos.left }}
          >
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPickerMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-violet-300 hover:bg-white/[0.06] transition-all duration-150"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-medium text-slate-300">
                {pickerMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <button
                onClick={() => setPickerMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-violet-300 hover:bg-white/[0.06] transition-all duration-150"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-[9px] font-semibold text-slate-600 uppercase">
                  {d[0]}
                </div>
              ))}
              {getMonthGridFor(pickerMonthDate).map((day, idx) => {
                if (!day) return <div key={idx} className="h-7" />;
                const isSel   = day.getTime() === mobileActiveDate.getTime();
                const isToday = day.getTime() === today.getTime();
                return (
                  <button
                    key={idx}
                    onClick={() => { setMobileActiveDate(day); setMonthPickerOpen(false); }}
                    className={`h-7 rounded-md text-[10px] font-medium transition-all duration-150 ${
                      isSel
                        ? "bg-violet-600/30 text-violet-300 border border-violet-500/40"
                        : isToday
                          ? "text-violet-400 border border-violet-500/20"
                          : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ── MOBILE COLUMN VIEW — swipeable 1/2/3-day carousel ───────────────────── */}
      <div className="sm:hidden flex flex-col gap-3">
        <div
          ref={mobileCarouselRef}
          onScroll={handleMobileCarouselScroll}
          className="flex overflow-x-auto snap-x snap-mandatory touch-auto [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {([1, 2, 3] as const).map((n) => (
            <div key={n} className="w-full flex-shrink-0 snap-center">
              <div className={`grid ${MOBILE_GRID_COLS_CLASS[n]} gap-2`}>
                {getMobileDays(n).map((day) => renderDayColumn(day))}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination dots */}
        <div className="flex items-center justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                mobileCarouselIndex === i ? "w-4 bg-violet-400" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── DESKTOP VIEWS ─────────────────────────────────────────────────────────── */}
      <div className="hidden sm:flex sm:flex-col sm:gap-4">

      {/* ── WEEK VIEW ─────────────────────────────────────────────────────────── */}
      {calendarView === "week" && (
        <div className="grid grid-cols-7 gap-2 overflow-x-auto">
          {weekDays.map((day) => renderDayColumn(day))}
        </div>
      )}

      {/* ── MONTH VIEW ────────────────────────────────────────────────────────── */}
      {calendarView === "month" && (
        <div className="flex flex-col gap-1">
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider py-0.5">
                {d}
              </div>
            ))}
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((day, idx) => {
              if (!day) return <div key={idx} className="rounded-lg min-h-[48px]" />;

              const yyyy        = day.getFullYear();
              const mm          = String(day.getMonth() + 1).padStart(2, "0");
              const dd          = String(day.getDate()).padStart(2, "0");
              const dayKey      = `${yyyy}-${mm}-${dd}`;
              const mmdd        = `${mm}-${dd}`;
              const isToday     = day.getTime() === today.getTime();
              const deadlines   = deadlineMap.get(dayKey) ?? [];
              const birthdays   = birthdayMap.get(mmdd) ?? [];
              const contactEvts    = contactEventMap.get(dayKey) ?? [];
              const recurringItems = recurringDateMap.get(dayKey) ?? [];

              type EventBadge = { key: string; label: string; cls: string; jump: CalendarJump | null };
              const badges: EventBadge[] = [
                ...birthdays.map(({ name, contactId }) => ({
                  key: `bday-${contactId}`,
                  label: `🎂 ${name}`,
                  cls: monthChip(getContactAc(contactId)),
                  jump: { type: "contact" as const, id: contactId },
                })),
                ...contactEvts.map(({ title, contactId }) => ({
                  key: `evt-${contactId}-${title}`,
                  label: `🎯 ${title}`,
                  cls: monthChip(getContactAc(contactId)),
                  jump: { type: "contact" as const, id: contactId },
                })),
                ...recurringItems.map((rt) => ({
                  key: `rt-${rt.id}`,
                  label: `♻️ ${rt.title}`,
                  cls: monthChip(getSphereAc(rt.sphere)),
                  jump: null,
                })),
                ...deadlines.map((t) => ({
                  key: `dl-${t.id}`,
                  label: t.title,
                  cls: monthChip(getSphereAc(t.sphere)),
                  jump: { type: "task" as const, id: t.id },
                })),
              ];
              const visibleBadges = badges.slice(0, 3);
              const badgeOverflow = badges.length - visibleBadges.length;
              const hasContent    = badges.length > 0;

              return (
                <div
                  key={idx}
                  className={`rounded-lg p-1.5 border transition-all duration-200 min-h-[100px] flex flex-col items-stretch justify-start overflow-hidden ${
                    isToday
                      ? "border-violet-500/40 bg-violet-600/10"
                      : hasContent
                        ? "border-white/[0.07] bg-white/[0.03]"
                        : "border-transparent bg-white/[0.015]"
                  }`}
                >
                  <span className={`text-[11px] font-semibold leading-none mb-1.5 ${isToday ? "text-violet-300" : "text-slate-500"}`}>
                    {day.getDate()}
                  </span>
                  {visibleBadges.map((b) => (
                    <button
                      key={b.key}
                      onClick={() => b.jump && setCalendarJump(b.jump)}
                      className={`w-full text-[10px] truncate px-1.5 py-0.5 mb-0.5 rounded font-medium text-left border cursor-pointer hover:brightness-125 hover:scale-[1.01] transition-all ${b.cls}`}
                    >
                      {b.label}
                    </button>
                  ))}
                  {badgeOverflow > 0 && (
                    <span className="text-[9px] text-slate-600 pl-0.5 leading-none mt-0.5">+{badgeOverflow} more</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      </div>

    </div>
  );
}
