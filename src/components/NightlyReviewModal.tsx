"use client";

import { X, CheckCircle2, Flame, Clock, AlertTriangle, Rocket, TrendingUp, Moon } from "lucide-react";
import { useDashboard, type Task } from "@/context/DashboardContext";

// ── Velocity helpers ──────────────────────────────────────────────────────────

function isWin(t: Task): boolean {
  const intent = t.intent ?? "finish";
  if (intent === "finish") return t.done;
  if (intent === "time")   return (t.timeSpentMinutes ?? 0) >= (t.dailyTargetMinutes ?? 1);
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

// ── Category section ──────────────────────────────────────────────────────────

function Section({
  emoji, title, color, tasks, emptyText,
}: {
  emoji: string; title: string; color: string; tasks: Task[]; emptyText: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span>{emoji}</span>
        <span className={`text-[10px] font-semibold uppercase tracking-widest ${color}`}>{title}</span>
        <span className="text-[10px] text-slate-600">({tasks.length})</span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-[10px] text-slate-700 px-2">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <span className="text-xs text-slate-300 flex-1 leading-none truncate">{t.title}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                {(t.timeSpentMinutes ?? 0) > 0 && (
                  <span className="text-[10px] font-mono text-slate-500 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {fmtMins(t.timeSpentMinutes!)}
                  </span>
                )}
                {(t.rolloverCount ?? 0) > 0 && (
                  <span className="text-[10px] text-amber-600 tabular-nums">
                    ×{t.rolloverCount}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Velocity gauge ────────────────────────────────────────────────────────────

function VelocityGauge({ score }: { score: number }) {
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
  const { tasks, currentTrackingDate, showNightlyReview, transitionToNextDay, dismissNightlyReview, lockDay } =
    useDashboard();

  if (!showNightlyReview) return null;

  const reviewDate   = currentTrackingDate;
  const reviewTasks  = tasks.filter((t) => (t.queuedDate ?? null) === reviewDate);

  // ── Velocity score ──────────────────────────────────────────────────────────
  const commitments = reviewTasks.filter((t) => (t.intent ?? "finish") !== "maybe");
  const wins        = commitments.filter(isWin);
  const velocity    = commitments.length > 0 ? Math.round((wins.length / commitments.length) * 100) : 100;

  // ── Bonus momentum ──────────────────────────────────────────────────────────
  const bonusTasks = reviewTasks.filter(
    (t) => (t.intent ?? "finish") === "maybe" && (t.done || (t.timeSpentMinutes ?? 0) > 0)
  );

  // ── 4 categories ───────────────────────────────────────────────────────────
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={dismissNightlyReview} />

      <div className="relative bg-[#0B0F1A] border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0B0F1A] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Moon className="w-4 h-4 text-violet-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Nightly Review</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">{fmtDate(reviewDate)}</p>
            </div>
          </div>
          <button
            onClick={dismissNightlyReview}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">

          {/* Velocity + time summary */}
          <div className="flex flex-col gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <VelocityGauge score={velocity} />
            <div className="flex items-center gap-4 text-[10px] text-slate-500 border-t border-white/[0.05] pt-3">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {commitments.length} commitment{commitments.length !== 1 ? "s" : ""}
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

          {/* 4 category sections */}
          <Section
            emoji="✅" title="Accomplished" color="text-emerald-400"
            tasks={accomplished}
            emptyText="No commitments completed today."
          />
          <Section
            emoji="🔥" title="Deep Work Compounded" color="text-violet-400"
            tasks={deepWork}
            emptyText="No time goals met."
          />
          <Section
            emoji="⏳" title="Active Rollovers" color="text-amber-400"
            tasks={activeRollovers}
            emptyText="Nothing carrying forward."
          />
          <Section
            emoji="⚠️" title="Friction Alerts" color="text-rose-400"
            tasks={frictionAlerts}
            emptyText="No stuck items — great!"
          />

          {/* Bonus momentum */}
          {bonusTasks.length > 0 && (
            <Section
              emoji="🚀" title="Bonus Momentum" color="text-indigo-400"
              tasks={bonusTasks}
              emptyText=""
            />
          )}

          {/* CTA */}
          <div className="flex flex-col gap-3 pt-2 border-t border-white/[0.06]">
            <p className="text-[10px] text-slate-500 text-center leading-relaxed">
              Clicking <span className="text-white font-medium">Lock Day & Advance</span> will roll over
              incomplete commitments, reset today&apos;s queue, and advance your tracking date to today.
            </p>
            <div className="flex gap-3">
              <button
                onClick={dismissNightlyReview}
                className="flex-1 h-10 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                Review Later
              </button>
              <button
                onClick={() => {
                  const recap = generateRecap(velocity, wins.length, commitments.length, activeRollovers.length);
                  lockDay(reviewDate, velocity, recap, accomplished.map((t) => t.title), activeRollovers.map((t) => t.title));
                }}
                className="flex-1 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm text-white font-medium transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center justify-center gap-2"
              >
                <Flame className="w-4 h-4" />
                Lock Day &amp; Advance
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
