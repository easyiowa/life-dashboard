"use client";

import { useRef, useEffect } from "react";
import TextareaAutosize, { type TextareaAutosizeProps } from "react-textarea-autosize";

type MaxHeightVariant = "widget" | "modal" | "full";

const MAX_HEIGHT: Record<MaxHeightVariant, string> = {
  widget: "max-h-[180px] md:max-h-[350px]",
  modal:  "max-h-[250px] md:max-h-[500px]",
  full:   "max-h-[80vh]",
};

export interface AutoExpandingTextareaProps extends TextareaAutosizeProps {
  maxHeightVariant?: MaxHeightVariant;
}

function getLineAt(value: string, cursorPos: number) {
  const start  = value.lastIndexOf("\n", cursorPos - 1) + 1;
  const endRaw = value.indexOf("\n", cursorPos);
  const end    = endRaw === -1 ? value.length : endRaw;
  return { line: value.slice(start, end), start, end };
}

export default function AutoExpandingTextarea({
  maxHeightVariant = "modal",
  className        = "",
  onKeyDown,
  onChange,
  value,
  ...props
}: AutoExpandingTextareaProps) {
  const taRef         = useRef<HTMLTextAreaElement>(null);
  const pendingCursor = useRef<number | null>(null);

  useEffect(() => {
    if (pendingCursor.current !== null && taRef.current) {
      const pos = pendingCursor.current;
      taRef.current.setSelectionRange(pos, pos);
      pendingCursor.current = null;
    }
  });

  function emitChange(newValue: string) {
    onChange?.({ target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    // Only intercept a plain Enter — leave Shift/Ctrl/Cmd alone.
    if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey) return;

    const val = e.currentTarget.value;
    const pos = e.currentTarget.selectionStart;
    const { line, start: lineStart, end: lineEnd } = getLineAt(val, pos);

    if (!/^- /.test(line)) return; // not a bullet line — normal Enter

    e.preventDefault();

    if (line === "- ") {
      // Empty bullet → exit list, leave cursor on the now-blank line.
      pendingCursor.current = lineStart;
      emitChange(val.slice(0, lineStart) + val.slice(lineEnd));
    } else {
      // Non-empty bullet → continue list on the next line.
      const insert = "\n- ";
      pendingCursor.current = pos + insert.length;
      emitChange(val.slice(0, pos) + insert + val.slice(pos));
    }
  }

  return (
    <TextareaAutosize
      ref={taRef}
      value={value}
      onChange={onChange}
      onKeyDown={handleKeyDown}
      className={`resize-none overflow-y-auto ${MAX_HEIGHT[maxHeightVariant]} ${className}`}
      {...props}
    />
  );
}
