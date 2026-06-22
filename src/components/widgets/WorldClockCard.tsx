"use client";

import { useState, useEffect } from "react";
import { Settings, X, ChevronLeft, ChevronRight, Plus } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ClockEntry {
  city: string;
  code: string;
  tz:   string;
}

// ── Available timezone catalogue ───────────────────────────────────────────────

const ALL_ZONES: ClockEntry[] = [
  { city: "Amsterdam",    code: "AMS", tz: "Europe/Amsterdam"              },
  { city: "Auckland",     code: "AKL", tz: "Pacific/Auckland"              },
  { city: "Bangkok",      code: "BKK", tz: "Asia/Bangkok"                  },
  { city: "Barcelona",    code: "BCN", tz: "Europe/Madrid"                 },
  { city: "Berlin",       code: "BER", tz: "Europe/Berlin"                 },
  { city: "Buenos Aires", code: "EZE", tz: "America/Argentina/Buenos_Aires"},
  { city: "Chicago",      code: "CHI", tz: "America/Chicago"               },
  { city: "Denver",       code: "DEN", tz: "America/Denver"                },
  { city: "Dubai",        code: "DXB", tz: "Asia/Dubai"                    },
  { city: "Helsinki",     code: "HEL", tz: "Europe/Helsinki"               },
  { city: "Hong Kong",    code: "HKG", tz: "Asia/Hong_Kong"                },
  { city: "Honolulu",     code: "HNL", tz: "Pacific/Honolulu"              },
  { city: "Istanbul",     code: "IST", tz: "Europe/Istanbul"               },
  { city: "Johannesburg", code: "JNB", tz: "Africa/Johannesburg"           },
  { city: "Lagos",        code: "LOS", tz: "Africa/Lagos"                  },
  { city: "London",       code: "LON", tz: "Europe/London"                 },
  { city: "Los Angeles",  code: "LAX", tz: "America/Los_Angeles"           },
  { city: "Moscow",       code: "MSK", tz: "Europe/Moscow"                 },
  { city: "Mumbai",       code: "BOM", tz: "Asia/Kolkata"                  },
  { city: "Nairobi",      code: "NBO", tz: "Africa/Nairobi"                },
  { city: "New York",     code: "NYC", tz: "America/New_York"              },
  { city: "Oslo",         code: "OSL", tz: "Europe/Oslo"                   },
  { city: "Paris",        code: "PAR", tz: "Europe/Paris"                  },
  { city: "Reykjavik",    code: "REK", tz: "Atlantic/Reykjavik"            },
  { city: "São Paulo",    code: "GRU", tz: "America/Sao_Paulo"             },
  { city: "Seoul",        code: "SEL", tz: "Asia/Seoul"                    },
  { city: "Singapore",    code: "SIN", tz: "Asia/Singapore"                },
  { city: "Stockholm",    code: "STO", tz: "Europe/Stockholm"              },
  { city: "Sydney",       code: "SYD", tz: "Australia/Sydney"              },
  { city: "Tokyo",        code: "TYO", tz: "Asia/Tokyo"                    },
  { city: "Toronto",      code: "YYZ", tz: "America/Toronto"               },
];

const DEFAULT_CLOCKS: ClockEntry[] = [
  { city: "Helsinki",    code: "HEL", tz: "Europe/Helsinki"     },
  { city: "New York",    code: "NYC", tz: "America/New_York"    },
  { city: "Los Angeles", code: "LAX", tz: "America/Los_Angeles" },
];

const STORAGE_KEY = "ld_world_clocks";

// ── Persistence ────────────────────────────────────────────────────────────────

function loadClocks(): ClockEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ClockEntry[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* SSR / parse error */ }
  return DEFAULT_CLOCKS;
}

function saveClocks(clocks: ClockEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(clocks)); } catch { /* */ }
}

// ── Helper ─────────────────────────────────────────────────────────────────────

function fmtTime(tz: string, now: Date): string {
  return now.toLocaleTimeString("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function WorldClockCard() {
  const [clocks,    setClocks]    = useState<ClockEntry[]>(DEFAULT_CLOCKS);
  const [isEditing, setIsEditing] = useState(false);
  const [now,       setNow]       = useState(() => new Date());
  const [addTz,     setAddTz]     = useState(ALL_ZONES[0].tz);

  // Hydrate from localStorage after mount
  useEffect(() => {
    const saved = loadClocks();
    setClocks(saved);
    const first = ALL_ZONES.find((z) => !saved.some((c) => c.tz === z.tz));
    if (first) setAddTz(first.tz);
  }, []);

  // Live clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  function persist(next: ClockEntry[]) {
    setClocks(next);
    saveClocks(next);
  }

  function remove(idx: number) {
    if (clocks.length <= 1) return;
    persist(clocks.filter((_, i) => i !== idx));
  }

  function shift(idx: number, dir: -1 | 1) {
    const next   = [...clocks];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    persist(next);
  }

  function addClock() {
    const zone = ALL_ZONES.find((z) => z.tz === addTz);
    if (!zone || clocks.some((c) => c.tz === zone.tz)) return;
    const next    = [...clocks, zone];
    persist(next);
    const unused = ALL_ZONES.find((z) => !next.some((c) => c.tz === z.tz));
    if (unused) setAddTz(unused.tz);
  }

  // Only offer zones not already in the list
  const availableZones = ALL_ZONES.filter((z) => !clocks.some((c) => c.tz === z.tz));
  // Keep the select value valid even when addTz slips out of available list
  const addTzResolved  = availableZones.some((z) => z.tz === addTz)
    ? addTz
    : (availableZones[0]?.tz ?? "");

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          World Clock
        </h2>
        <button
          onClick={() => setIsEditing((v) => !v)}
          title={isEditing ? "Done editing" : "Edit clocks"}
          className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-150 ${
            isEditing
              ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
              : "bg-white/[0.04] border-white/[0.05] text-slate-600 hover:text-violet-300 hover:bg-violet-600/20 hover:border-violet-500/40"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Clock entries */}
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        {clocks.map((clock, idx) => {
          const isHome = idx === 0;
          const time   = fmtTime(clock.tz, now);
          return (
            <div key={clock.tz} className="flex flex-col gap-1.5">

              {/* Clock display */}
              <div className="flex items-center gap-3">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isHome ? "bg-violet-400" : "bg-slate-600"}`} />
                <div>
                  <p className="text-white text-sm font-medium leading-none">{clock.city}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{clock.code}</p>
                </div>
                <span className={`font-mono text-base font-semibold ml-2 tabular-nums ${isHome ? "text-violet-300" : "text-slate-400"}`}>
                  {time}
                </span>
              </div>

              {/* Edit controls */}
              {isEditing && (
                <div className="flex items-center gap-1 pl-4">
                  <button
                    onClick={() => shift(idx, -1)}
                    disabled={idx === 0}
                    title="Move left"
                    className="w-6 h-6 rounded-md flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => shift(idx, 1)}
                    disabled={idx === clocks.length - 1}
                    title="Move right"
                    className="w-6 h-6 rounded-md flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => remove(idx)}
                    disabled={clocks.length <= 1}
                    title="Remove clock"
                    className="w-6 h-6 rounded-md flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Add clock — only shown while editing and zones remain */}
        {isEditing && availableZones.length > 0 && (
          <div className="flex items-center gap-2 self-start mt-0.5">
            <select
              value={addTzResolved}
              onChange={(e) => setAddTz(e.target.value)}
              className="h-8 px-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-xs text-slate-300 outline-none focus:border-violet-500/50 transition-colors appearance-none cursor-pointer"
            >
              {availableZones.map((z) => (
                <option key={z.tz} value={z.tz} className="bg-[#0F1629]">{z.city}</option>
              ))}
            </select>
            <button
              onClick={addClock}
              className="flex items-center gap-1 h-8 px-3 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-medium hover:bg-violet-600/30 hover:border-violet-500/50 transition-all"
            >
              <Plus className="w-3 h-3" /> <span className="hidden md:inline">Add</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
