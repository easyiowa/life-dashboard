"use client";

import { useState, useEffect, useRef, useMemo, type ComponentType, type CSSProperties } from "react";
import {
  CalendarDays, Flame, FolderKanban, Timer, NotebookPen,
  Target, Activity, TrendingUp, RefreshCw, Users,
} from "lucide-react";

// ── Exported config type (consumed by AuthGate) ───────────────────────────────

export interface LoaderConfig {
  selectedWidgets: string[];
  theme:           "light" | "dark";
  seedFn:          () => Promise<void>;
  completeFn:      () => Promise<void>; // sets is_onboarded — called by AuthGate after animation
}

// ── Widget catalogue ──────────────────────────────────────────────────────────

interface WidgetMeta {
  colSpan: 1 | 2 | 3;
  Icon: ComponentType<{ className?: string; style?: CSSProperties }>;
}

const WIDGET_META: Record<string, WidgetMeta> = {
  "calendar":     { colSpan: 3, Icon: CalendarDays },
  "habits":       { colSpan: 3, Icon: Flame        },
  "projects":     { colSpan: 2, Icon: FolderKanban },
  "time-tracker": { colSpan: 1, Icon: Timer        },
  "quick-notes":  { colSpan: 1, Icon: NotebookPen  },
  "daily-focus":  { colSpan: 2, Icon: Target       },
  "activity-log": { colSpan: 1, Icon: Activity     },
  "progress":     { colSpan: 2, Icon: TrendingUp   },
  "recurring":    { colSpan: 3, Icon: RefreshCw    },
  "network":      { colSpan: 3, Icon: Users        },
};

// ── Row packing ───────────────────────────────────────────────────────────────

type WidgetSlot = { type: "widget"; id: string; colSpan: 1 | 2 | 3; colStart: number };
type EmptySlot  = { type: "empty";  cols: number };
type RowSlot    = WidgetSlot | EmptySlot;

function packRows(ids: string[]): RowSlot[][] {
  const rows: RowSlot[][] = [];
  let row: RowSlot[] = [];
  let sum = 0;
  for (const id of ids) {
    const span = (WIDGET_META[id]?.colSpan ?? 1) as 1 | 2 | 3;
    if (sum + span > 3) {
      if (sum < 3) row.push({ type: "empty", cols: 3 - sum });
      rows.push(row); row = []; sum = 0;
    }
    row.push({ type: "widget", id, colSpan: span, colStart: sum });
    sum += span;
  }
  if (row.length > 0) {
    if (sum < 3) row.push({ type: "empty", cols: 3 - sum });
    rows.push(row);
  }
  return rows;
}

function entryDir(slot: WidgetSlot): "left" | "right" | "bottom" {
  if (slot.colSpan === 3) return "bottom";
  if (slot.colStart === 0) return "left";
  return "right";
}

function spanCls(cols: number): string {
  return cols === 1 ? "col-span-1" : cols === 2 ? "col-span-2" : "col-span-3";
}

const ANIM_NAME: Record<"left" | "right" | "bottom", string> = {
  left: "olSlideLeft", right: "olSlideRight", bottom: "olSlideBottom",
};

// ── Text phases (no trailing dots — rendered separately) ──────────────────────

const PHASE_TEXT = [
  "putting the pieces together",
  "arranging them, adding samples",
  "polishing up the look",
  "done! have fun!",
] as const;

// ── Typewriter hook ───────────────────────────────────────────────────────────

function useTypewriter(target: string, charDelay = 22) {
  const [displayed, setDisplayed] = useState("");
  const [done,      setDone]      = useState(false);
  useEffect(() => {
    setDisplayed(""); setDone(false);
    if (!target) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(target.slice(0, i));
      if (i >= target.length) { setDone(true); clearInterval(id); }
    }, charDelay);
    return () => clearInterval(id);
  }, [target, charDelay]);
  return { text: displayed, done };
}

// ── Cycling dots (. → .. → ... → .) ─────────────────────────────────────────

function AnimatedDots() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setCount(n => n >= 3 ? 1 : n + 1), 370);
    return () => clearInterval(id);
  }, []);
  return <span aria-hidden>{" " + ".".repeat(count)}</span>;
}

// ── Component ─────────────────────────────────────────────────────────────────
// Fade / dismiss is managed entirely by AuthGate; this component only
// signals completion via onDone() and never manipulates its own opacity.

interface Props {
  selectedWidgets: string[];
  theme:   "light" | "dark";
  seedFn:  () => Promise<void>;
  onDone:  () => void;
}

export default function OnboardingLoader({ selectedWidgets, theme, seedFn, onDone }: Props) {
  const [phase,   setPhase]   = useState(0);
  const [pulsing, setPulsing] = useState(false);

  // Theme is stable from the very first frame — no dark-default transition.
  const isLight = theme === "light";

  const validIds = useMemo(() => selectedWidgets.filter(id => id in WIDGET_META), [selectedWidgets]);
  const rows     = useMemo(() => packRows(validIds), [validIds]);

  // Spread entrance delays evenly across the full 4.5 s runtime.
  const delays = useMemo<Record<string, number>>(() => {
    const ids: string[] = [];
    for (const row of rows) for (const slot of row) {
      if (slot.type === "widget") ids.push(slot.id);
    }
    const n = ids.length;
    const map: Record<string, number> = {};
    ids.forEach((id, i) => {
      map[id] = n > 1 ? Math.round(300 + (i / (n - 1)) * 3600) : 300;
    });
    return map;
  }, [rows]);

  // useRef persists across StrictMode's simulated unmount/remount, so seedFn()
  // is only ever called once even though this effect runs twice in development.
  const seedPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let active = true;
    if (!seedPromiseRef.current) {
      seedPromiseRef.current = seedFn();
    }
    const t1 = setTimeout(() => { if (active) setPhase(1); }, 1500);
    const t2 = setTimeout(() => { if (active) setPhase(2); }, 3000);
    Promise.all([seedPromiseRef.current, new Promise<void>(r => setTimeout(r, 4500))]).then(() => {
      if (!active) return;
      setPhase(3);
      setPulsing(true);
      setTimeout(() => { if (active) onDone(); }, 900);
    });
    return () => {
      active = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { text: typeText, done: typeDone } = useTypewriter(PHASE_TEXT[phase]);

  // ── Color tokens (theme-pinned, never transition) ─────────────────────────
  const accentBg     = isLight ? "rgba(243,86,0,0.09)"   : "rgba(139,92,246,0.12)";
  const accentBorder = isLight ? "rgba(243,86,0,0.24)"   : "rgba(139,92,246,0.24)";
  const accentIcon   = isLight ? "#f35600"                : "rgb(167,139,250)";
  const accentLine   = isLight ? "rgba(243,86,0,0.20)"   : "rgba(139,92,246,0.30)";
  const accentGlow   = isLight
    ? "radial-gradient(ellipse 90% 65% at 50% 50%, rgba(243,86,0,0.11) 0%, transparent 68%)"
    : "radial-gradient(ellipse 90% 65% at 50% 50%, rgba(139,92,246,0.15) 0%, transparent 68%)";
  const cardBg      = isLight ? "rgba(255,255,255,0.92)" : accentBg;
  const neutralLine = isLight ? "rgba(28,25,23,0.09)"    : "rgba(255,255,255,0.06)";
  const frameBorder = isLight ? "rgba(243,86,0,0.28)"    : "rgba(139,92,246,0.28)";
  const emptyBorder = isLight ? "rgba(28,25,23,0.07)"    : "rgba(255,255,255,0.04)";
  const textColor   = isLight ? "rgba(90,70,50,0.75)"    : "rgba(148,163,184,0.70)";
  const pulseAnim   = isLight ? "olPulseOrange"          : "olPulseViolet";

  return (
    <>
      <style>{`
        @keyframes olSlideLeft {
          0%   { opacity:0; transform:translateX(-80px) scale(0.94); }
          65%  { opacity:1; transform:translateX(5px)  scale(1.006); }
          100% { opacity:1; transform:none; }
        }
        @keyframes olSlideRight {
          0%   { opacity:0; transform:translateX(80px)  scale(0.94); }
          65%  { opacity:1; transform:translateX(-5px)  scale(1.006); }
          100% { opacity:1; transform:none; }
        }
        @keyframes olSlideBottom {
          0%   { opacity:0; transform:translateY(56px) scale(0.94); }
          65%  { opacity:1; transform:translateY(-4px) scale(1.006); }
          100% { opacity:1; transform:none; }
        }
        @keyframes olBlink {
          0%,100% { opacity:1; }
          50%     { opacity:0; }
        }
        @keyframes olPulseOrange {
          0%   { box-shadow:0 0 0    0   rgba(243,86,0,0); }
          45%  { box-shadow:0 0 52px 18px rgba(243,86,0,0.30); }
          100% { box-shadow:0 0 0    0   rgba(243,86,0,0); }
        }
        @keyframes olPulseViolet {
          0%   { box-shadow:0 0 0    0   rgba(139,92,246,0); }
          45%  { box-shadow:0 0 52px 18px rgba(139,92,246,0.34); }
          100% { box-shadow:0 0 0    0   rgba(139,92,246,0); }
        }
      `}</style>

      <div
        className="fixed inset-0 flex flex-col items-center justify-center px-4"
        style={{ background: isLight ? "#f6f5f1" : "#0B0F19" }}
      >
        {/* Widget puzzle grid */}
        <div className="relative w-full max-w-md">
          {/* Ambient glow */}
          <div className="absolute pointer-events-none" style={{
            inset: "-60px", background: accentGlow, filter: "blur(36px)",
          }} />

          {/* Pulsing frame wrapper */}
          <div
            className="relative rounded-2xl"
            style={pulsing ? { animation: `${pulseAnim} 850ms ease-out forwards` } : undefined}
          >
            <div className="p-4 rounded-2xl border border-dashed" style={{ borderColor: frameBorder }}>
              <div className="grid grid-cols-3 gap-2">
                {rows.map((row, ri) =>
                  row.map((slot, si) => {
                    const key = `${ri}-${si}`;
                    if (slot.type === "empty") {
                      return (
                        <div
                          key={key}
                          className={`${spanCls(slot.cols)} h-14 rounded-xl border border-dashed`}
                          style={{ borderColor: emptyBorder }}
                        />
                      );
                    }
                    const { Icon } = WIDGET_META[slot.id]!;
                    const delay    = delays[slot.id] ?? 0;
                    return (
                      <div
                        key={slot.id}
                        className={`${spanCls(slot.colSpan)} h-14 rounded-xl border flex items-center gap-3 px-3`}
                        style={{
                          background:     cardBg,
                          borderColor:    accentBorder,
                          animation:      `${ANIM_NAME[entryDir(slot)]} 620ms cubic-bezier(0.22,1,0.36,1) both`,
                          animationDelay: `${delay}ms`,
                        }}
                      >
                        <div
                          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: accentIcon }} />
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <div className="h-2 rounded-full" style={{
                            background: accentLine,
                            width: slot.colSpan === 1 ? "72%" : "55%",
                          }} />
                          <div className="h-1.5 rounded-full" style={{
                            background: neutralLine,
                            width: slot.colSpan === 1 ? "50%" : "38%",
                          }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Typewriter status text */}
        <div className="mt-10 flex items-center justify-center" style={{ minHeight: "52px", maxWidth: "340px", width: "100%" }}>
          <p className="text-sm font-medium text-center leading-relaxed" style={{ color: textColor }}>
            {typeText}
            {/* Blinking cursor while typing */}
            {!typeDone && (
              <span aria-hidden style={{ animation: "olBlink 0.65s step-end infinite", marginLeft: "1px", fontWeight: 300 }}>|</span>
            )}
            {/* Cycling dots for the first three phases once typing completes */}
            {typeDone && phase < 3 && <AnimatedDots />}
          </p>
        </div>
      </div>
    </>
  );
}
