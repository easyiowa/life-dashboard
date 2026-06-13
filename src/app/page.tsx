import TimeTrackerCard from "@/components/widgets/TimeTrackerCard";
import DailyFocusQueueCard from "@/components/widgets/DailyFocusQueueCard";
import ProgressCard from "@/components/widgets/ProgressCard";
import CalendarCard from "@/components/widgets/CalendarCard";
import ProjectsCard from "@/components/widgets/ProjectsCard";
import ActivityLogCard from "@/components/widgets/ActivityLogCard";
import RecurringCard from "@/components/widgets/RecurringCard";
import NetworkCard from "@/components/widgets/NetworkCard";
import HabitTrackerCard from "@/components/widgets/HabitTrackerCard";
import QuickNotesCard from "@/components/widgets/QuickNotesCard";
import NightlyReviewModal from "@/components/NightlyReviewModal";
import MorningRecapBanner from "@/components/MorningRecapBanner";
import MindfulCheckIn from "@/components/MindfulCheckIn";
import DashboardHeader from "@/components/DashboardHeader";
import { DashboardProvider } from "@/context/DashboardContext";

export default function DashboardPage() {
  const now = new Date();
  const helsinkiTime = now.toLocaleTimeString("en-US", { timeZone: "Europe/Helsinki", hour: "2-digit", minute: "2-digit", hour12: false });
  const nyTime       = now.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false });
  const laTime       = now.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit", hour12: false });

  const clocks = [
    { city: "Helsinki",    code: "HEL", time: helsinkiTime, active: true  },
    { city: "New York",    code: "NYC", time: nyTime,       active: false },
    { city: "Los Angeles", code: "LAX", time: laTime,       active: false },
  ];

  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8">
      <DashboardProvider>
      <div className="max-w-7xl mx-auto">

        <MorningRecapBanner />

        {/* ── Header (client component — owns settings modal + dynamic greeting) */}
        <DashboardHeader />

        <MindfulCheckIn />

        {/* ── Quick Notes (1/3) + Daily Focus Queue (2/3) ─────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full mb-4">
          <div className="lg:col-span-1 w-full flex">
            <QuickNotesCard />
          </div>
          <div className="lg:col-span-2 w-full">
            <DailyFocusQueueCard />
          </div>
        </div>

        {/* ── Primary grid: 3 cols ────────────────────────────────
            Col 1:   Focus column — TimeTracker + ActivityLog (spans 2 rows)
            Col 2–3: Projects & Tasks (row 1) + Progress (row 2)
        ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Left: focus column — stacked, spans 2 rows */}
          <div className="flex flex-col gap-4 md:row-span-2">
            <TimeTrackerCard />
            <ActivityLogCard />
          </div>

          {/* Projects & Tasks — 2 cols wide */}
          <div className="md:col-span-2">
            <ProjectsCard />
          </div>

          {/* Progress — 2 cols wide */}
          <div className="md:col-span-2">
            <ProgressCard />
          </div>
        </div>

        {/* ── Calendar ────────────────────────────────────────────── */}
        <div className="mt-4">
          <CalendarCard />
        </div>

        {/* ── Habit Tracker ───────────────────────────────────────── */}
        <div className="mt-4">
          <HabitTrackerCard />
        </div>

        {/* ── Recurring Responsibilities ───────────────────────────── */}
        <div className="mt-4">
          <RecurringCard />
        </div>

        {/* ── Network & Relationships ──────────────────────────────── */}
        <div className="mt-4">
          <NetworkCard />
        </div>

        {/* ── World Clock ─────────────────────────────────────────── */}
        <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest w-full">
              World Clock
            </h2>
            {clocks.map(({ city, code, time, active }) => (
              <div key={city} className="flex items-center gap-3">
                <div className={`w-1.5 h-1.5 rounded-full ${active ? "bg-violet-400" : "bg-slate-600"}`} />
                <div>
                  <p className="text-white text-sm font-medium leading-none">{city}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{code}</p>
                </div>
                <span className={`font-mono text-base font-semibold ml-2 tabular-nums ${active ? "text-violet-300" : "text-slate-400"}`}>
                  {time}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Nightly review modal — self-contained, reads showNightlyReview from context */}
      <NightlyReviewModal />
      </DashboardProvider>
    </main>
  );
}
