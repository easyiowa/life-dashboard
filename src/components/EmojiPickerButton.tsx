"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";

interface Props {
  emoji:  string;
  locked: boolean;
  onPick: (emoji: string) => void;
}

export default function EmojiPickerButton({ emoji, locked, onPick }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPos, setPickerPos]   = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !pickerRef.current?.contains(t)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showPicker]);

  function openPicker() {
    if (!buttonRef.current) { setShowPicker((v) => !v); return; }
    const rect = buttonRef.current.getBoundingClientRect();
    const left = Math.min(rect.left, window.innerWidth - 356);
    setPickerPos({ top: rect.bottom + 8, left: Math.max(0, left) });
    setShowPicker((v) => !v);
  }

  function handleEmojiClick(emojiData: EmojiClickData) {
    onPick(emojiData.emoji);
    setShowPicker(false);
  }

  return (
    <div className="flex-shrink-0">
      <button
        ref={buttonRef}
        type="button"
        title={locked ? "Custom emoji — click to change" : "Auto-suggested — click to browse"}
        onClick={openPicker}
        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border transition-all ${
          locked
            ? "border-violet-500/50 bg-violet-600/15"
            : "border-white/[0.07] bg-white/[0.04] hover:bg-white/[0.07]"
        }`}
      >
        {emoji}
      </button>

      {showPicker && pickerPos && createPortal(
        <div
          ref={pickerRef}
          style={{ position: "fixed", top: pickerPos.top, left: pickerPos.left, zIndex: 9999 }}
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.DARK}
            width={340}
            height={450}
            searchDisabled={false}
            skinTonesDisabled
            lazyLoadEmojis
            previewConfig={{ showPreview: false }}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
