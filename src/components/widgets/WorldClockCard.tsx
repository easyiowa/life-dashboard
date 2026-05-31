"use client";

const CLOCKS = [
  { city: "Helsinki", code: "HEL", tz: "Europe/Helsinki", active: true },
  { city: "New York", code: "NYC", tz: "America/New_York", active: false },
  { city: "Los Angeles", code: "LAX", tz: "America/Los_Angeles", active: false },
];

export default function WorldClockCard() {
  const now = new Date();

  const clocks = CLOCKS.map(({ city, code, tz, active }) => ({
    city,
    code,
    active,
    time: now.toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  }));

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5">
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
  );
}
