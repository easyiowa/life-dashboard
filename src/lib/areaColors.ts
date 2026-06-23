export interface AreaColorSet {
  text:         string;  // text-{color}-400         — muted colored text
  bgTint:       string;  // bg-{color}-500/10         — light background tint
  border:       string;  // border-{color}-500/25     — subtle border
  borderAccent: string;  // border-{color}-500        — solid accent border (left-bar etc.)
  borderLMuted: string;  // border-l-{color}-500/50   — semi-transparent left border for cards
  pillActive:   string;  // full active pill class string
  pillInactive: string;  // full inactive pill class string
}

export const AREA_COLORS: Record<string, AreaColorSet> = {
  emerald: {
    text:         "text-emerald-400",
    bgTint:       "bg-emerald-500/10",
    border:       "border-emerald-500/25",
    borderAccent: "border-emerald-500",
    borderLMuted: "border-l-emerald-500/50",
    pillActive:   "bg-emerald-500 border-emerald-500 text-white md:shadow-[0_0_12px_rgba(16,185,129,0.4)]",
    pillInactive: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20",
  },
  violet: {
    text:         "text-violet-400",
    bgTint:       "bg-violet-500/10",
    border:       "border-violet-500/25",
    borderAccent: "border-violet-500",
    borderLMuted: "border-l-violet-500/50",
    pillActive:   "bg-violet-500 border-violet-500 text-white md:shadow-[0_0_12px_rgba(139,92,246,0.4)]",
    pillInactive: "bg-violet-500/10 border-violet-500/25 text-violet-400 hover:bg-violet-500/20",
  },
  sky: {
    text:         "text-sky-400",
    bgTint:       "bg-sky-500/10",
    border:       "border-sky-500/25",
    borderAccent: "border-sky-500",
    borderLMuted: "border-l-sky-500/50",
    pillActive:   "bg-sky-500 border-sky-500 text-white md:shadow-[0_0_12px_rgba(14,165,233,0.4)]",
    pillInactive: "bg-sky-500/10 border-sky-500/25 text-sky-400 hover:bg-sky-500/20",
  },
  amber: {
    text:         "text-amber-400",
    bgTint:       "bg-amber-500/10",
    border:       "border-amber-500/25",
    borderAccent: "border-amber-500",
    borderLMuted: "border-l-amber-500/50",
    pillActive:   "bg-amber-500 border-amber-500 text-white md:shadow-[0_0_12px_rgba(245,158,11,0.4)]",
    pillInactive: "bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/20",
  },
  pink: {
    text:         "text-pink-400",
    bgTint:       "bg-pink-500/10",
    border:       "border-pink-500/25",
    borderAccent: "border-pink-500",
    borderLMuted: "border-l-pink-500/50",
    pillActive:   "bg-pink-500 border-pink-500 text-white md:shadow-[0_0_12px_rgba(236,72,153,0.4)]",
    pillInactive: "bg-pink-500/10 border-pink-500/25 text-pink-400 hover:bg-pink-500/20",
  },
  teal: {
    text:         "text-teal-400",
    bgTint:       "bg-teal-500/10",
    border:       "border-teal-500/25",
    borderAccent: "border-teal-500",
    borderLMuted: "border-l-teal-500/50",
    pillActive:   "bg-teal-500 border-teal-500 text-white md:shadow-[0_0_12px_rgba(20,184,166,0.4)]",
    pillInactive: "bg-teal-500/10 border-teal-500/25 text-teal-400 hover:bg-teal-500/20",
  },
  blue: {
    text:         "text-blue-400",
    bgTint:       "bg-blue-500/10",
    border:       "border-blue-500/25",
    borderAccent: "border-blue-500",
    borderLMuted: "border-l-blue-500/50",
    pillActive:   "bg-blue-500 border-blue-500 text-white md:shadow-[0_0_12px_rgba(59,130,246,0.4)]",
    pillInactive: "bg-blue-500/10 border-blue-500/25 text-blue-400 hover:bg-blue-500/20",
  },
  rose: {
    text:         "text-rose-400",
    bgTint:       "bg-rose-500/10",
    border:       "border-rose-500/25",
    borderAccent: "border-rose-500",
    borderLMuted: "border-l-rose-500/50",
    pillActive:   "bg-rose-500 border-rose-500 text-white md:shadow-[0_0_12px_rgba(244,63,94,0.4)]",
    pillInactive: "bg-rose-500/10 border-rose-500/25 text-rose-400 hover:bg-rose-500/20",
  },
  orange: {
    text:         "text-orange-400",
    bgTint:       "bg-orange-500/10",
    border:       "border-orange-500/25",
    borderAccent: "border-orange-500",
    borderLMuted: "border-l-orange-500/50",
    pillActive:   "bg-orange-500 border-orange-500 text-white md:shadow-[0_0_12px_rgba(249,115,22,0.4)]",
    pillInactive: "bg-orange-500/10 border-orange-500/25 text-orange-400 hover:bg-orange-500/20",
  },
  indigo: {
    text:         "text-indigo-400",
    bgTint:       "bg-indigo-500/10",
    border:       "border-indigo-500/25",
    borderAccent: "border-indigo-500",
    borderLMuted: "border-l-indigo-500/50",
    pillActive:   "bg-indigo-500 border-indigo-500 text-white md:shadow-[0_0_12px_rgba(99,102,241,0.4)]",
    pillInactive: "bg-indigo-500/10 border-indigo-500/25 text-indigo-400 hover:bg-indigo-500/20",
  },
};

export function areaColor(labelColor?: string): AreaColorSet {
  return AREA_COLORS[labelColor ?? ""] ?? AREA_COLORS.violet!;
}
