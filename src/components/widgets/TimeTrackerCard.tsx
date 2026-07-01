"use client";

import { useState } from "react";
import { Play, Pause, RotateCcw, Timer, Zap, CheckCircle2, Minus, Plus } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function todayCount(sessions: ReturnType<typeof useDashboard>["sessions"]) {
  const today = new Date().toLocaleDateString("en-CA");
  return sessions.filter((s) => s.completedAtDateString === today).length;
}

export default function TimeTrackerCard() {
  const {
    activeTask,
    running,
    elapsed,
    sessions,
    startFree,
    pauseSession,
    resetTimer,
    finishSession,
    setEstimate,
  } = useDashboard();

  const [editingEstimate, setEditingEstimate] = useState(false);
  const [rawEstimate,     setRawEstimate]     = useState("");

  const estimatedMinutes = activeTask?.estimatedMinutes ?? 25;
  const targetSeconds    = estimatedMinutes * 60;
  const progress         = Math.min(elapsed / targetSeconds, 1);
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const pct              = Math.round(progress * 100);
  const sessionCount     = todayCount(sessions);
  const hasElapsed       = elapsed > 0;

  // Progress ring colour: teal when fresh → amber → violet when approaching target
  const strokeGradId = pct >= 90 ? "timerGradWarm" : "timerGrad";

  return (
    <div
      className={`rounded-2xl border backdrop-blur-xl p-5 flex flex-col gap-5 transition-colors duration-300 ${
        running
          ? "border-violet-500/40 bg-violet-600/[0.06]"
          : "border-white/[0.07] bg-white/[0.03]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-violet-400" />
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Focus Timer
          </h2>
          {running && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {sessionCount} session{sessionCount !== 1 ? "s" : ""} today
        </span>
      </div>

      {/* Active task badge + estimate adjuster */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          activeTask ? "max-h-28 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {activeTask && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-violet-600/10 border border-violet-500/20">
              <Zap className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-violet-200 leading-normal pb-0.5 truncate">
                  {activeTask.title}
                </p>
                <p className="text-[10px] text-violet-400/70 mt-0.5 truncate">
                  {activeTask.project}&nbsp;·&nbsp;{activeTask.sphere}
                </p>
              </div>
            </div>

            {/* Estimate adjuster */}
            <div className="flex items-center gap-2 px-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">Estimate</span>
              <div className="flex items-center gap-1 ml-auto">
                <button
                  onClick={() => setEstimate(Math.max(5, estimatedMinutes - 5))}
                  className="w-5 h-5 rounded-md flex items-center justify-center bg-white/[0.05] border border-white/[0.07] text-slate-400 hover:text-white hover:bg-white/[0.10] transition-all"
                  aria-label="Decrease estimate"
                >
                  <Minus className="w-3 h-3" />
                </button>

                {editingEstimate ? (
                  <input
                    autoFocus
                    type="number"
                    min={1}
                    step={5}
                    value={rawEstimate}
                    onChange={(e) => {
                      setRawEstimate(e.target.value);
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n) && n > 0) setEstimate(n);
                    }}
                    onBlur={() => {
                      const n = parseInt(rawEstimate, 10);
                      if (!isNaN(n) && n > 0) setEstimate(Math.max(1, n));
                      setEditingEstimate(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") {
                        const n = parseInt(rawEstimate, 10);
                        if (!isNaN(n) && n > 0) setEstimate(Math.max(1, n));
                        setEditingEstimate(false);
                      }
                    }}
                    className="text-sm font-semibold text-white tabular-nums w-14 text-center bg-white/[0.06] border border-violet-500/50 rounded-md outline-none focus:border-violet-400 px-1 py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                ) : (
                  <span
                    onClick={() => { setRawEstimate(String(estimatedMinutes)); setEditingEstimate(true); }}
                    title="Click to edit"
                    className="text-sm font-semibold text-white tabular-nums w-12 text-center cursor-pointer hover:text-violet-300 transition-colors select-none"
                  >
                    {estimatedMinutes}m
                  </span>
                )}

                <button
                  onClick={() => setEstimate(estimatedMinutes + 5)}
                  className="w-5 h-5 rounded-md flex items-center justify-center bg-white/[0.05] border border-white/[0.07] text-slate-400 hover:text-white hover:bg-white/[0.10] transition-all"
                  aria-label="Increase estimate"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ring */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-44 h-44">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            {/* Track */}
            <circle
              cx="60" cy="60" r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="7"
            />
            {/* Progress arc */}
            <circle
              cx="60" cy="60" r={RADIUS}
              fill="none"
              stroke={`url(#${strokeGradId})`}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
            {/* Glow tip */}
            {hasElapsed && (
              <circle
                cx="60" cy="60" r={RADIUS}
                fill="none"
                stroke="rgba(167,139,250,0.6)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={`4 ${CIRCUMFERENCE - 4}`}
                strokeDashoffset={strokeDashoffset - 2}
              />
            )}
            <defs>
              <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
              <linearGradient id="timerGradWarm" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold text-white font-mono tracking-tight tabular-nums">
              {formatTime(elapsed)}
            </span>
            <span className={`text-xs mt-1 tabular-nums ${pct >= 90 ? "text-amber-400" : "text-slate-500"}`}>
              {pct}% of {estimatedMinutes}m
            </span>
          </div>
        </div>

        <p className="text-slate-400 text-sm text-center min-h-[1.25rem]">
          {running
            ? activeTask ? "Focusing…" : "Free session running…"
            : hasElapsed
              ? activeTask ? "Paused — resume or finish" : "Free session paused"
              : activeTask ? "Ready — hit Start to begin" : "Select a task or start free"}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {/* Abandon / Reset */}
        <button
          onClick={resetTimer}
          title="Abandon session (no log)"
          className="w-10 h-10 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-all duration-150"
        >
          <RotateCcw className="w-4 h-4 text-slate-400" />
        </button>

        {/* Pause / Resume / Start */}
        {running ? (
          <button
            onClick={pauseSession}
            className="flex items-center gap-2 px-5 h-10 rounded-full bg-[#f35600] hover:bg-orange-600 dark:bg-violet-600 dark:hover:bg-violet-500 text-[#ffffff] text-sm font-medium transition-all duration-150 shadow-[0_0_20px_rgba(243,86,0,0.4)] dark:shadow-[0_0_20px_rgba(124,58,237,0.4)]"
          >
            <Pause className="w-4 h-4" />
            Pause
          </button>
        ) : (
          <button
            onClick={startFree}
            className="flex items-center gap-2 px-5 h-10 rounded-full bg-white/[0.06] hover:bg-violet-600/80 border border-white/[0.08] hover:border-violet-500 text-slate-300 hover:text-white text-sm font-medium transition-all duration-200"
          >
            <Play className="w-4 h-4" />
            {hasElapsed ? "Resume" : activeTask ? "Start Focus" : "Start Free"}
          </button>
        )}

        {/* Finish — only when there is elapsed time to log */}
        {hasElapsed && (
          <button
            onClick={finishSession}
            title="Log session and reset"
            className="flex items-center gap-1.5 px-3 h-10 rounded-full bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-sm font-medium hover:bg-emerald-600/30 hover:border-emerald-500/50 transition-all duration-150"
          >
            <CheckCircle2 className="w-4 h-4" />
            Finish
          </button>
        )}
      </div>
    </div>
  );
}
