"use client";

import { useState } from "react";
import { X, Check, CheckCircle2, Flame, Clock, AlertTriangle, Rocket, TrendingUp, Moon, Brain } from "lucide-react";
import { useDashboard, type Task, type TaskArchiveMeta, type MindStateClosure, type NetworkContact, type RecurringTask } from "@/context/DashboardContext";
import { computeCountdown } from "@/components/widgets/RecurringCard";
import AutoExpandingTextarea from "@/components/ui/AutoExpandingTextarea";
import { useModalOverlay } from "@/hooks/useModalOverlay";

// ── Velocity helpers ──────────────────────────────────────────────────────────

function isWin(t: Task): boolean {
  const intent = t.intent ?? "finish";
  if (intent === "finish") return t.done;
  // Include manual minutes so manually-logged time counts toward the goal
  if (intent === "time")   return (t.timeSpentMinutes ?? 0) + (t.manualMinutes ?? 0) >= (t.dailyTargetMinutes ?? 1);
  return false;
}

function fmtDate(ds: string): string {
  const [y, m, d] = ds.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

function fmtMins(m: number): string {
  if (m <= 0) return "—";
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h > 0 && rem > 0) return `${h}h ${rem}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// ── Category section (for standard Task objects) ──────────────────────────────

function Section({
  emoji, title, color, tasks,
}: {
  emoji: string; title: string; color: string; tasks: Task[];
}) {
  if (tasks.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span>{emoji}</span>
        <span className={`text-[10px] font-semibold uppercase tracking-widest ${color}`}>{title}</span>
        <span className="text-[10px] text-slate-600">({tasks.length})</span>
      </div>
      <div className="flex flex-col gap-1">
        {tasks.map((t) => {
            const intent    = t.intent ?? "finish";
            const totalMins = (t.timeSpentMinutes ?? 0) + (t.manualMinutes ?? 0);
            const target    = t.dailyTargetMinutes ?? 0;
            return (
              <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-xs text-slate-300 flex-1 leading-none truncate">{t.title}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {intent === "time" && target > 0 ? (
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {totalMins > 0 ? `${totalMins}m` : "0m"} / {target}m goal
                    </span>
                  ) : (
                    <>
                      {totalMins > 0 && (
                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {fmtMins(totalMins)}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-600">
                        {intent === "maybe" ? "🎲 Maybe" : "🎯 Finish Today"}
                      </span>
                    </>
                  )}
                  {(t.rolloverCount ?? 0) > 0 && (
                    <span className="text-[10px] text-amber-600 tabular-nums">
                      ×{t.rolloverCount}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ── Birthday checklist section ────────────────────────────────────────────────

function BirthdaySection({
  contacts, doneIds, onToggle,
}: {
  contacts: NetworkContact[];
  doneIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (contacts.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span>🎂</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-pink-400">Birthdays Today</span>
        <span className="text-[10px] text-slate-600">({contacts.length})</span>
      </div>
      <div className="flex flex-col gap-1">
        {contacts.map((c) => {
          const done = doneIds.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onToggle(c.id)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-all duration-150 ${
                done
                  ? "bg-emerald-500/[0.06] border-emerald-500/20"
                  : "bg-white/[0.02] border-white/[0.04] hover:border-white/[0.10]"
              }`}
            >
              <span className={`flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                done ? "bg-emerald-500/25 border-emerald-400/60" : "border-slate-600"
              }`}>
                {done && <Check className="w-2 h-2 text-emerald-300" />}
              </span>
              <span className={`text-xs flex-1 leading-none truncate ${done ? "line-through text-emerald-300/60" : "text-slate-300"}`}>
                🎂 {c.name}
              </span>
              <span className="text-[10px] text-slate-600 flex-shrink-0">Birthday</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Recurring checklist section ───────────────────────────────────────────────

function RecurringSection({
  tasks, doneIds, onToggle,
}: {
  tasks: RecurringTask[];
  doneIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span>♻️</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Recurring Due Today</span>
        <span className="text-[10px] text-slate-600">({tasks.length})</span>
      </div>
      <div className="flex flex-col gap-1">
        {tasks.map((rt) => {
          const done = doneIds.has(rt.id);
          return (
            <button
              key={rt.id}
              type="button"
              onClick={() => onToggle(rt.id)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-all duration-150 ${
                done
                  ? "bg-emerald-500/[0.06] border-emerald-500/20"
                  : "bg-white/[0.02] border-white/[0.04] hover:border-white/[0.10]"
              }`}
            >
              <span className={`flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                done ? "bg-emerald-500/25 border-emerald-400/60" : "border-slate-600"
              }`}>
                {done && <Check className="w-2 h-2 text-emerald-300" />}
              </span>
              <span className={`text-xs flex-1 leading-none truncate ${done ? "line-through text-emerald-300/60" : "text-slate-300"}`}>
                ♻️ {rt.title}
              </span>
              <span className="text-[10px] text-slate-600 flex-shrink-0 tabular-nums">{rt.intervalLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Velocity gauge ────────────────────────────────────────────────────────────

function VelocityGauge({ score, hasAnyPlanned }: { score: number; hasAnyPlanned: boolean }) {
  if (!hasAnyPlanned) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between">
          <span className="text-xs text-slate-500">Day Velocity</span>
          <span className="text-xs text-slate-500">Free day — no commitments</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
          <div className="h-full rounded-full bg-slate-700/50" style={{ width: "100%" }} />
        </div>
      </div>
    );
  }

  const color = score >= 80 ? "from-emerald-600 to-emerald-400"
    : score >= 50            ? "from-violet-600 to-violet-400"
    : score >= 25            ? "from-amber-600 to-amber-400"
    :                          "from-rose-700 to-rose-500";

  const label = score >= 80 ? "Outstanding" : score >= 50 ? "Solid" : score >= 25 ? "Partial" : "Tough Day";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between">
        <span className="text-xs text-slate-500">Day Velocity</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-white tabular-nums">{score}%</span>
          <span className="text-xs text-slate-500">{label}</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ── Recap generator ───────────────────────────────────────────────────────────

function generateRecap(velocity: number, wins: number, total: number, rollovers: number): string {
  if (total === 0) return "No tasks queued — free day.";
  const frac = `${wins}/${total}`;
  if (velocity >= 80) {
    return `Nailed it — ${frac} goals finished. ${rollovers === 0 ? "Clean sweep." : `${rollovers} rolled forward.`}`;
  }
  if (velocity >= 50) {
    const tail = rollovers > 0 ? ` ${rollovers} carrying over.` : "";
    return `Solid day — ${frac} goals hit.${tail}`;
  }
  if (velocity >= 25) {
    return `Partial progress — ${frac} done. ${rollovers} still in play.`;
  }
  return `Tough session — ${frac} goals met. ${rollovers > 0 ? `Carrying ${rollovers} forward.` : "Starting fresh."}`;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function NightlyReviewModal() {
  const {
    tasks, recurringTasks, networkContacts,
    currentTrackingDate, showNightlyReview,
    dismissNightlyReview, lockDay, dailyCheckIn,
    activeWidgetIds,
  } = useDashboard();
  const hasDailyFocus = activeWidgetIds.includes("daily-focus");
  // Suppress the modal entirely when Today's Focus isn't in the user's widget set —
  // there's nothing to review and the midnight auto-trigger should be a no-op.
  const shouldShow = showNightlyReview && hasDailyFocus;
  useModalOverlay(shouldShow); // hook before any conditional return

  const [endDelta,      setEndDelta]      = useState<"better" | "same" | "worse" | null>(null);
  const [closureNote,   setClosureNote]   = useState("");
  const [birthdayDone,  setBirthdayDone]  = useState<Set<string>>(new Set());
  const [recurringDone, setRecurringDone] = useState<Set<string>>(new Set());

  if (!shouldShow) return null;

  const reviewDate    = currentTrackingDate;
  const today         = new Date().toLocaleDateString("en-CA");
  const isRetroactive = reviewDate !== today;
  const reviewTasks   = tasks.filter((t) => (t.queuedDate ?? null) === reviewDate);

  // ── Multi-source items ──────────────────────────────────────────────────────
  const mmdd           = reviewDate.slice(5);
  const todayBirthdays = networkContacts.filter((c) => c.birthday?.slice(5) === mmdd);
  const todayRecurring = recurringTasks.filter((rt) => computeCountdown(rt).daysLeft <= 0);

  // ── Velocity score (all sources) ────────────────────────────────────────────
  const commitments      = reviewTasks.filter((t) => (t.intent ?? "finish") !== "maybe");
  const wins             = commitments.filter(isWin);
  const checkedBirthdays = todayBirthdays.filter((c) => birthdayDone.has(c.id));
  const checkedRecurring = todayRecurring.filter((rt) => recurringDone.has(rt.id));

  const totalItems  = commitments.length + todayBirthdays.length + todayRecurring.length;
  const totalWins   = wins.length + checkedBirthdays.length + checkedRecurring.length;
  const velocity    = totalItems > 0 ? Math.round((totalWins / totalItems) * 100) : 0;
  const hasAnyPlanned = totalItems > 0;

  // ── Bonus momentum ──────────────────────────────────────────────────────────
  const bonusTasks = reviewTasks.filter(
    (t) => (t.intent ?? "finish") === "maybe" && (t.done || (t.timeSpentMinutes ?? 0) > 0)
  );

  // ── 4 standard-task categories ──────────────────────────────────────────────
  const accomplished = reviewTasks.filter(
    (t) => t.done && (t.intent ?? "finish") !== "maybe"
  );
  const deepWork = reviewTasks.filter(
    (t) => !t.done && t.intent === "time" &&
      (t.timeSpentMinutes ?? 0) >= (t.dailyTargetMinutes ?? 1)
  );
  const deepWorkIds    = new Set(deepWork.map((t) => t.id));
  const frictionAlerts = reviewTasks.filter(
    (t) => !t.done && (t.rolloverCount ?? 0) >= 3 && !deepWorkIds.has(t.id)
  );
  const frictionIds    = new Set(frictionAlerts.map((t) => t.id));
  const activeRollovers = reviewTasks.filter(
    (t) => !t.done && !deepWorkIds.has(t.id) && !frictionIds.has(t.id) &&
      (t.intent ?? "finish") !== "maybe"
  );

  const totalTimeMinutes = reviewTasks.reduce((s, t) => s + (t.timeSpentMinutes ?? 0), 0);

  function toggleBirthday(id: string) {
    setBirthdayDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleRecurring(id: string) {
    setRecurringDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Shared lock logic used by both the confirm button and the retroactive dismiss/seal paths.
  const handleLockDay = () => {
    const recap = generateRecap(velocity, totalWins, totalItems, activeRollovers.length);

    // Build completed titles — standard tasks + checked birthdays + checked recurring
    const goalsAchieved = [...accomplished, ...deepWork];
    const completedTitles: string[] = [
      ...goalsAchieved.map((t) => t.title),
      ...checkedBirthdays.map((c) => `🎂 ${c.name}`),
      ...checkedRecurring.map((rt) => `♻️ ${rt.title}`),
    ];

    const taskMeta: Record<string, TaskArchiveMeta> = {};
    for (const t of reviewTasks) {
      taskMeta[t.title] = {
        intent:  t.intent ?? "finish",
        target:  t.dailyTargetMinutes ?? null,
        minutes: (t.timeSpentMinutes ?? 0) + (t.manualMinutes ?? 0),
        goalMet: isWin(t),
      };
    }

    const mindStateClosure: MindStateClosure | undefined =
      dailyCheckIn?.date === reviewDate
        ? {
            morningMoodKey: dailyCheckIn.moodKey,
            morningMood:    dailyCheckIn.mood,
            morningTags:    dailyCheckIn.tags,
            morningNote:    dailyCheckIn.note,
            endDelta:       endDelta ?? "same",
            closureNote:    closureNote.trim(),
          }
        : undefined;

    // Birthdays never roll over — only standard task rollovers cascade forward.
    // Recurring tasks have their own independent tracking system; they also don't roll over here.
    lockDay(
      reviewDate, velocity, recap,
      completedTitles,
      activeRollovers.map((t) => t.title),
      taskMeta,
      mindStateClosure,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={isRetroactive ? handleLockDay : dismissNightlyReview} />

      <div className="relative bg-[#0B0F1A] border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0B0F1A] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Moon className="w-4 h-4 text-violet-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Call it a day!</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">{fmtDate(reviewDate)}</p>
            </div>
          </div>
          <button
            onClick={isRetroactive ? handleLockDay : dismissNightlyReview}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">

          {/* Retroactive recovery notice */}
          {isRetroactive && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-amber-500/[0.07] border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-900 dark:text-amber-300/80 leading-relaxed">
                Hey, yesterday&apos;s day wasn&apos;t wrapped up properly, so here is your chance to wrap it up as usual and record your evening state!
              </p>
            </div>
          )}

          {/* Velocity + time summary */}
          <div className="flex flex-col gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <VelocityGauge score={velocity} hasAnyPlanned={hasAnyPlanned} />
            <div className="flex items-center gap-4 text-[10px] text-slate-500 border-t border-white/[0.05] pt-3">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {commitments.length} commitment{commitments.length !== 1 ? "s" : ""}
                {todayBirthdays.length > 0 && ` · ${todayBirthdays.length} birthday${todayBirthdays.length !== 1 ? "s" : ""}`}
                {todayRecurring.length > 0 && ` · ${todayRecurring.length} recurring`}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {fmtMins(totalTimeMinutes)} total focus
              </span>
              {bonusTasks.length > 0 && (
                <span className="flex items-center gap-1 text-violet-400">
                  <Rocket className="w-3 h-3" />
                  +{bonusTasks.length} bonus momentum!
                </span>
              )}
            </div>
          </div>

          {/* Standard task sections — each Section hides itself entirely when empty */}
          <Section
            emoji="✅" title="Accomplished" color="text-emerald-400"
            tasks={accomplished}
          />
          <Section
            emoji="🔥" title="Deep Work Compounded" color="text-violet-400"
            tasks={deepWork}
          />
          <Section
            emoji="⏳" title="Active Rollovers" color="text-amber-400"
            tasks={activeRollovers}
          />
          <Section
            emoji="⚠️" title="Friction Alerts" color="text-rose-400"
            tasks={frictionAlerts}
          />

          {/* Birthday checklist — unchecked items gracefully clear, never roll over */}
          <BirthdaySection
            contacts={todayBirthdays}
            doneIds={birthdayDone}
            onToggle={toggleBirthday}
          />

          {/* Recurring checklist — managed by their own tracking system, no rollover */}
          <RecurringSection
            tasks={todayRecurring}
            doneIds={recurringDone}
            onToggle={toggleRecurring}
          />

          {/* Bonus momentum — Section hides itself when bonusTasks is empty */}
          <Section
            emoji="🚀" title="Bonus Momentum" color="text-indigo-400"
            tasks={bonusTasks}
          />

          {/* Mind State Closure — only when a check-in exists for today */}
          {dailyCheckIn?.date === reviewDate && (
            <div className="flex flex-col gap-3 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  Mind State Closure
                </span>
              </div>

              {/* Morning snapshot recap */}
              <div className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <p className="text-[10px] text-slate-500 mb-1">You started the day as:</p>
                <p className="text-xs text-slate-300">
                  {dailyCheckIn.mood}
                  {dailyCheckIn.tags.length > 0 && (
                    <span className="text-slate-500"> · {dailyCheckIn.tags.join(" ")}</span>
                  )}
                  {dailyCheckIn.note && (
                    <span className="text-slate-400 italic"> — {dailyCheckIn.note}</span>
                  )}
                </p>
              </div>

              {/* Emotional delta */}
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] text-slate-500">How do you feel compared to this morning?</p>
                <div className="flex gap-2">
                  {(["better", "same", "worse"] as const).map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => setEndDelta(delta)}
                      className={`flex-1 h-8 rounded-lg text-xs font-medium border transition-all duration-150 ${
                        endDelta === delta
                          ? delta === "better"
                            ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.35)]"
                            : delta === "same"
                              ? "bg-violet-500 border-violet-500 text-white shadow-[0_0_10px_rgba(139,92,246,0.35)]"
                              : "bg-rose-500 border-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.35)]"
                          : "bg-white/[0.03] border-white/[0.07] text-slate-400 hover:bg-white/[0.07] hover:text-white"
                      }`}
                    >
                      {delta === "better" ? "📈 Better" : delta === "same" ? "⚖️ Same" : "📉 Worse"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Closure note */}
              <AutoExpandingTextarea
                value={closureNote}
                onChange={(e) => setClosureNote(e.target.value)}
                placeholder="Day wrap-up thought…"
                minRows={1}
                maxHeightVariant="modal"
                className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
          )}

          {/* CTA */}
          <div className="flex flex-col gap-3 pt-2 border-t border-white/[0.06]">
            <p className="text-[10px] text-slate-500 text-center leading-relaxed">
              {isRetroactive ? (
                <>Locking yesterday&apos;s day will archive the record, roll over incomplete commitments, and advance your tracking date to today.</>
              ) : (
                <>Clicking <span className="text-white font-medium">Done!</span> will roll over incomplete commitments, reset today&apos;s queue, and advance your tracking date to today.</>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={isRetroactive ? handleLockDay : dismissNightlyReview}
                className="flex-1 h-10 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                {isRetroactive ? "Seal & Close" : "Review Later"}
              </button>
              <button
                onClick={handleLockDay}
                className="flex-1 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm text-white font-medium transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center justify-center gap-2"
              >
                <Flame className="w-4 h-4" />
                Done!
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
