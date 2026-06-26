"use client";

import { useState, useMemo } from "react";
import { X, Brain, ChevronDown, ChevronUp } from "lucide-react";
import { useDashboard, type HistoricalLog } from "@/context/DashboardContext";
import { useModalOverlay } from "@/hooks/useModalOverlay";

// ── Types & helpers ───────────────────────────────────────────────────────────

type Tab = "weeks" | "months" | "years";
type MoodKey = "energized" | "calm" | "tired" | "stressed";

const MOOD_META: Record<MoodKey, { emoji: string; label: string; bar: string; text: string }> = {
  energized: { emoji: "⚡", label: "Energized", bar: "bg-violet-500", text: "text-violet-400" },
  calm:      { emoji: "☕", label: "Calm",      bar: "bg-teal-500",   text: "text-teal-400"   },
  tired:     { emoji: "💤", label: "Tired",     bar: "bg-blue-500",   text: "text-blue-400"   },
  stressed:  { emoji: "🌪️", label: "Stressed",  bar: "bg-amber-500",  text: "text-amber-400"  },
};
const MOOD_KEYS: MoodKey[] = ["energized", "calm", "tired", "stressed"];

function resolveMoodKey(moodKey?: string, mood?: string): MoodKey {
  if (moodKey && (MOOD_KEYS as string[]).includes(moodKey)) return moodKey as MoodKey;
  if (mood?.includes("Energized")) return "energized";
  if (mood?.includes("Calm"))      return "calm";
  if (mood?.includes("Tired"))     return "tired";
  if (mood?.includes("Stressed"))  return "stressed";
  return "energized";
}

function fmtDate(ds: string): string {
  const [y, m, d] = ds.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function avg(arr: number[]): number {
  return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
}

function mode<T>(arr: T[]): T | undefined {
  if (!arr.length) return undefined;
  const counts = new Map<T, number>();
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DeltaChip({ delta }: { delta: "better" | "same" | "worse" }) {
  const cls = delta === "better" ? "text-emerald-400"
            : delta === "worse"  ? "text-rose-400"
            :                      "text-slate-400";
  const label = delta === "better" ? "📈 Better" : delta === "worse" ? "📉 Worse" : "⚖️ Same";
  return <span className={`text-[10px] font-medium ${cls}`}>{label}</span>;
}

// ── Correlation Summary panel ─────────────────────────────────────────────────

function CorrelationPanel({ logs }: { logs: HistoricalLog[] }) {
  const closureLogs = logs.filter((l) => l.mindStateClosure);
  const total = closureLogs.length;

  const stats = useMemo(() => {
    const moodCount: Record<MoodKey, number> = { energized: 0, calm: 0, tired: 0, stressed: 0 };
    const moodVel:   Record<MoodKey, number[]> = { energized: [], calm: [], tired: [], stressed: [] };
    const deltaCounts = { better: 0, same: 0, worse: 0 };

    for (const log of closureLogs) {
      const ms = log.mindStateClosure!;
      const key = resolveMoodKey(ms.morningMoodKey, ms.morningMood);
      moodCount[key]++;
      moodVel[key].push(log.dayVelocity);
      deltaCounts[ms.endDelta]++;
    }

    const overallAvg = avg(closureLogs.map((l) => l.dayVelocity));
    const moodAvgs = Object.fromEntries(
      MOOD_KEYS.map((k) => [k, avg(moodVel[k])])
    ) as Record<MoodKey, number>;

    // Build insights
    const insights: string[] = [];
    if (total >= 2) {
      const sorted = [...MOOD_KEYS]
        .filter((k) => moodCount[k] > 0)
        .sort((a, b) => moodAvgs[b] - moodAvgs[a]);
      const best  = sorted[0];
      const worst = sorted[sorted.length - 1];

      if (best && moodAvgs[best] > overallAvg) {
        const m = MOOD_META[best];
        insights.push(`${m.emoji} ${m.label} days average ${moodAvgs[best]}% velocity — your strongest state.`);
      }
      if (worst && worst !== best && moodAvgs[worst] < overallAvg) {
        const m = MOOD_META[worst];
        const drop = overallAvg - moodAvgs[worst];
        insights.push(`${m.emoji} ${m.label} days show ${drop}% below average velocity (${moodAvgs[worst]}%).`);
      }
      const betterPct = total > 0 ? Math.round((deltaCounts.better / total) * 100) : 0;
      if (betterPct >= 50) {
        insights.push(`You end the day feeling better than you started ${betterPct}% of the time.`);
      } else if (deltaCounts.worse > deltaCounts.better) {
        insights.push(`Evening energy tends to dip — ${Math.round((deltaCounts.worse / total) * 100)}% of days end lower than they started.`);
      }
    }

    return { moodCount, moodAvgs, overallAvg, deltaCounts, insights };
  }, [closureLogs, total]);

  if (total === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 flex flex-col items-center gap-2">
        <Brain className="w-5 h-5 text-slate-600" />
        <p className="text-xs text-slate-600 text-center">No check-ins logged yet. Start your morning check-in to unlock insights.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Emotional Balance</span>
        <span className="text-[10px] text-slate-600 tabular-nums">{total} days tracked</span>
      </div>

      {/* Distribution bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
          {MOOD_KEYS.map((key) => {
            const pct = total > 0 ? (stats.moodCount[key] / total) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={key}
                className={`${MOOD_META[key].bar} transition-all duration-700`}
                style={{ width: `${pct}%` }}
                title={`${MOOD_META[key].emoji} ${MOOD_META[key].label}: ${Math.round(pct)}%`}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {MOOD_KEYS.filter((k) => stats.moodCount[k] > 0).map((key) => {
            const pct = Math.round((stats.moodCount[key] / total) * 100);
            const m = MOOD_META[key];
            return (
              <div key={key} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${m.bar}`} />
                <span className={`text-[10px] ${m.text}`}>{m.emoji} {pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Avg velocity per mood */}
      <div className="grid grid-cols-4 gap-2">
        {MOOD_KEYS.filter((k) => stats.moodCount[k] > 0).map((key) => {
          const m = MOOD_META[key];
          return (
            <div key={key} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <span className="text-base leading-none">{m.emoji}</span>
              <span className={`text-sm font-semibold tabular-nums ${m.text}`}>{stats.moodAvgs[key]}%</span>
              <span className="text-[9px] text-slate-600">velocity</span>
            </div>
          );
        })}
      </div>

      {/* Insights */}
      {stats.insights.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {stats.insights.map((insight, i) => (
            <p key={i} className="text-[11px] text-slate-400 leading-relaxed border-l-2 border-violet-500/30 pl-2">
              {insight}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Weekly (daily entries) tab ─────────────────────────────────────────────────

function WeeksGrid({ logs }: { logs: HistoricalLog[] }) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const entries = logs.filter((l) => l.mindStateClosure);

  if (entries.length === 0) {
    return <p className="text-xs text-slate-600 text-center py-6">No check-in data available.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Header row */}
      <div className="grid grid-cols-[140px_1fr_110px_1fr] gap-2 px-3 pb-1">
        {["Date", "Morning State", "Evening", "Reflection"].map((h) => (
          <span key={h} className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest">{h}</span>
        ))}
      </div>

      {entries.map((log) => {
        const ms  = log.mindStateClosure!;
        const key = resolveMoodKey(ms.morningMoodKey, ms.morningMood);
        const m   = MOOD_META[key];
        const isExpanded = expandedDate === log.date;
        const hasNotes = ms.morningNote || ms.closureNote;

        return (
          <div
            key={log.date}
            onClick={() => hasNotes && setExpandedDate(isExpanded ? null : log.date)}
            className={`grid grid-cols-[140px_1fr_110px_1fr] gap-2 px-3 py-2 rounded-lg transition-colors ${
              hasNotes ? "cursor-pointer hover:bg-white/[0.03]" : ""
            } ${isExpanded ? "bg-white/[0.03]" : ""}`}
          >
            {/* Date */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 tabular-nums">{fmtDate(log.date)}</span>
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                log.dayVelocity >= 80 ? "bg-emerald-500/15 text-emerald-400"
                : log.dayVelocity >= 50 ? "bg-violet-500/15 text-violet-400"
                : log.dayVelocity >= 25 ? "bg-amber-500/15 text-amber-400"
                : "bg-rose-500/15 text-rose-400"
              }`}>{log.dayVelocity}%</span>
            </div>

            {/* Morning state */}
            <div className="flex items-center gap-1 flex-wrap min-w-0">
              <span className={`text-[10px] font-medium ${m.text}`}>{m.emoji} {m.label}</span>
              {ms.morningTags.length > 0 && (
                <span className="text-[10px] text-slate-600 truncate">{ms.morningTags.join(" ")}</span>
              )}
            </div>

            {/* Evening delta */}
            <div className="flex items-center">
              <DeltaChip delta={ms.endDelta} />
            </div>

            {/* Reflection (truncated / expanded) */}
            <div className="flex items-start gap-1 min-w-0">
              {hasNotes ? (
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  {isExpanded ? (
                    <>
                      {ms.morningNote && <p className="text-[10px] text-slate-400">AM: &ldquo;{ms.morningNote}&rdquo;</p>}
                      {ms.closureNote && <p className="text-[10px] text-slate-400">PM: &ldquo;{ms.closureNote}&rdquo;</p>}
                    </>
                  ) : (
                    <p className="text-[10px] text-slate-500 truncate">
                      {ms.morningNote || ms.closureNote}
                    </p>
                  )}
                </div>
              ) : (
                <span className="text-[10px] text-slate-700">—</span>
              )}
              {hasNotes && (
                isExpanded
                  ? <ChevronUp className="w-3 h-3 text-slate-600 flex-shrink-0 mt-0.5" />
                  : <ChevronDown className="w-3 h-3 text-slate-600 flex-shrink-0 mt-0.5" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Monthly aggregates tab ────────────────────────────────────────────────────

function MonthsGrid({ logs }: { logs: HistoricalLog[] }) {
  const months = useMemo(() => {
    const map = new Map<string, HistoricalLog[]>();
    for (const log of logs.filter((l) => l.mindStateClosure)) {
      const ym = log.date.slice(0, 7);
      if (!map.has(ym)) map.set(ym, []);
      map.get(ym)!.push(log);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [logs]);

  if (months.length === 0) {
    return <p className="text-xs text-slate-600 text-center py-6">No check-in data available.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[160px_1fr_80px_120px] gap-2 px-3 pb-1">
        {["Month", "Dominant Mood", "Avg Vel.", "Delta Split"].map((h) => (
          <span key={h} className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest">{h}</span>
        ))}
      </div>
      {months.map(([ym, dayLogs]) => {
        const moodKeys = dayLogs.map((l) => resolveMoodKey(l.mindStateClosure!.morningMoodKey, l.mindStateClosure!.morningMood));
        const dominant = mode(moodKeys) ?? "energized";
        const m        = MOOD_META[dominant];
        const avgVel   = avg(dayLogs.map((l) => l.dayVelocity));
        const better   = dayLogs.filter((l) => l.mindStateClosure!.endDelta === "better").length;
        const worse    = dayLogs.filter((l) => l.mindStateClosure!.endDelta === "worse").length;
        const same     = dayLogs.length - better - worse;

        return (
          <div key={ym} className="grid grid-cols-[160px_1fr_80px_120px] gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors">
            <span className="text-[10px] text-slate-400">{fmtMonth(ym)}</span>
            <span className={`text-[10px] font-medium ${m.text}`}>{m.emoji} {m.label}</span>
            <span className={`text-[10px] font-semibold tabular-nums ${
              avgVel >= 75 ? "text-emerald-400" : avgVel >= 50 ? "text-violet-400" : "text-amber-400"
            }`}>{avgVel}%</span>
            <div className="flex items-center gap-1.5">
              {better > 0 && <span className="text-[9px] text-emerald-400">📈{better}</span>}
              {same   > 0 && <span className="text-[9px] text-slate-500">⚖️{same}</span>}
              {worse  > 0 && <span className="text-[9px] text-rose-400">📉{worse}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Yearly aggregates tab ─────────────────────────────────────────────────────

function YearsGrid({ logs }: { logs: HistoricalLog[] }) {
  const years = useMemo(() => {
    const map = new Map<string, HistoricalLog[]>();
    for (const log of logs.filter((l) => l.mindStateClosure)) {
      const y = log.date.slice(0, 4);
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(log);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [logs]);

  if (years.length === 0) {
    return <p className="text-xs text-slate-600 text-center py-6">No check-in data available.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[80px_1fr_80px_80px_120px] gap-2 px-3 pb-1">
        {["Year", "Top Mood", "Avg Vel.", "Days", "Delta Split"].map((h) => (
          <span key={h} className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest">{h}</span>
        ))}
      </div>
      {years.map(([y, dayLogs]) => {
        const moodKeys = dayLogs.map((l) => resolveMoodKey(l.mindStateClosure!.morningMoodKey, l.mindStateClosure!.morningMood));
        const dominant = mode(moodKeys) ?? "energized";
        const m        = MOOD_META[dominant];
        const avgVel   = avg(dayLogs.map((l) => l.dayVelocity));
        const better   = dayLogs.filter((l) => l.mindStateClosure!.endDelta === "better").length;
        const worse    = dayLogs.filter((l) => l.mindStateClosure!.endDelta === "worse").length;
        const same     = dayLogs.length - better - worse;

        return (
          <div key={y} className="grid grid-cols-[80px_1fr_80px_80px_120px] gap-2 px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors">
            <span className="text-sm font-semibold text-white">{y}</span>
            <span className={`text-[10px] font-medium ${m.text}`}>{m.emoji} {m.label}</span>
            <span className={`text-[10px] font-semibold tabular-nums ${
              avgVel >= 75 ? "text-emerald-400" : avgVel >= 50 ? "text-violet-400" : "text-amber-400"
            }`}>{avgVel}%</span>
            <span className="text-[10px] text-slate-500 tabular-nums">{dayLogs.length}d</span>
            <div className="flex items-center gap-1.5">
              {better > 0 && <span className="text-[9px] text-emerald-400">📈{better}</span>}
              {same   > 0 && <span className="text-[9px] text-slate-500">⚖️{same}</span>}
              {worse  > 0 && <span className="text-[9px] text-rose-400">📉{worse}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function MindsetTrendsModal({ onClose }: { onClose: () => void }) {
  const { historicalLogs } = useDashboard();
  useModalOverlay(); // always mounted by parent only when open
  const [tab, setTab] = useState<Tab>("weeks");

  const tabs: { key: Tab; label: string }[] = [
    { key: "weeks",  label: "Weeks"  },
    { key: "months", label: "Months" },
    { key: "years",  label: "Years"  },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-[#090D1A] border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Brain className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Mindset Journal</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Correlation Summary */}
          <CorrelationPanel logs={historicalLogs} />

          {/* Tab bar */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] flex-shrink-0">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 h-7 rounded-lg text-xs font-medium transition-all duration-150 ${
                  tab === key
                    ? "bg-violet-600 text-white shadow-[0_0_10px_rgba(139,92,246,0.35)]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Data grid */}
          <div className="flex flex-col gap-0.5">
            {tab === "weeks"  && <WeeksGrid  logs={historicalLogs} />}
            {tab === "months" && <MonthsGrid logs={historicalLogs} />}
            {tab === "years"  && <YearsGrid  logs={historicalLogs} />}
          </div>

        </div>
      </div>
    </div>
  );
}
