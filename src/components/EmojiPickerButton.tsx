"use client";

import { useState, useRef, useEffect } from "react";

// ── Comprehensive emoji library ───────────────────────────────────────────────

const EMOJI_GRID: { label: string; items: string[] }[] = [
  {
    label: "Objects",
    items: [
      "📁","📋","📝","📌","📎","🔗","💡","🔑","🔒","📦","🗂️","💻","📱","🔋","⌨️",
      "📷","📸","🔭","🔬","⚗️","🧪","🔧","⚙️","🧲","💰","💳","💎","🏆","🥇",
      "🎯","🎮","🕹️","📺","📻","🎙️","📡","🛠️","🪛","🔩","🪤","🪝","🗓️","📅",
    ],
  },
  {
    label: "Activities",
    items: [
      "🚀","✈️","🚗","🚂","⚽","🏀","🎾","🏋️","🤸","🧘","🏊","🚴","🥊","🏆",
      "🎖️","🥋","🎿","🏂","🪂","🤿","🎣","🏄","🧗","🎸","🎨","🎭","🎬","🖌️",
      "📚","✍️","🎤","🎧","🎪","🎠","🎡","🎢","🃏","🎲","🧩","🎯",
    ],
  },
  {
    label: "People",
    items: [
      "💪","👥","🤝","👋","🙏","✊","👏","🫶","💅","🤳","🧑‍💻","👨‍💼","👩‍💼",
      "🧑‍🎨","👨‍🍳","👩‍🍳","🧑‍🚀","👨‍🔬","👩‍🔬","🧑‍🏫","👨‍🔧","👩‍🔧",
      "👨‍⚕️","👩‍⚕️","👤","🫂",
    ],
  },
  {
    label: "Nature",
    items: [
      "🌱","🌿","🍀","🌾","🌵","🌲","🌳","🌴","🌸","🌺","🌻","🌼","🌷","💐",
      "🍁","🍂","☀️","🌤️","⛅","🌧️","❄️","🌊","💧","🔥","🌋","⚡","🌈",
      "⭐","🌟","✨","💫","🌍","🌏","🌙","🦁","🐯","🦊","🦄","🐕","🦋","🐝",
    ],
  },
  {
    label: "Food",
    items: [
      "🍎","🍊","🍋","🍇","🍓","🫐","🍒","🥑","🍅","🥦","🌽","🧄","🍞","🥗",
      "🍝","🍜","🍔","🍕","🌮","🌯","🍣","🥩","🍗","🥚","🧆","🎂","🍰","🍩",
      "🍪","☕","🫖","🍵","🥤","🍷","🧉","🍺","🥂",
    ],
  },
  {
    label: "Symbols",
    items: [
      "📊","📈","📉","💹","✅","❌","⚠️","❓","❕","🔴","🟠","🟡","🟢","🔵",
      "🟣","⚫","⚪","🔔","📣","📢","🎵","🎶","💬","💭","📡","🔆","🔅","♾️",
      "🔄","🔃","⏱️","⏰","🔺","🔻","💯","🚩","🎌","⚑",
    ],
  },
  {
    label: "Smileys",
    items: [
      "😊","😄","🤣","😎","🤩","🥳","🤔","😤","😴","😍","🥰","🤗","😅","🙄",
      "🥶","🤓","🧐","😈","🤯","🫡","🥸","🤑","😵","🫠","🤫","😇","🫣","😬",
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  emoji:   string;
  locked:  boolean;
  onPick:  (emoji: string) => void; // sets emoji AND signals lock to parent
}

export default function EmojiPickerButton({ emoji, locked, onPick }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside the popover
  useEffect(() => {
    if (!showPicker) return;
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showPicker]);

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        type="button"
        title={locked ? "Custom emoji — click to change" : "Auto-suggested — click to browse"}
        onClick={() => setShowPicker((v) => !v)}
        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border transition-all ${
          locked
            ? "border-violet-500/50 bg-violet-600/15"
            : "border-white/[0.07] bg-white/[0.04] hover:bg-white/[0.07]"
        }`}
      >
        {emoji}
      </button>

      {showPicker && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-slate-900/95 border border-white/[0.08] rounded-xl shadow-2xl backdrop-blur-md z-50 w-72 max-h-64 overflow-y-auto">
          {EMOJI_GRID.map((cat) => (
            <div key={cat.label} className="mb-3 last:mb-0">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                {cat.label}
              </p>
              <div className="flex flex-wrap gap-0.5">
                {cat.items.map((e, i) => (
                  <button
                    key={`${cat.label}-${e}-${i}`}
                    type="button"
                    onClick={() => { onPick(e); setShowPicker(false); }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-colors hover:bg-white/[0.08] ${
                      emoji === e ? "bg-violet-500/20 ring-1 ring-violet-500/40" : ""
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
