"use client";

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { ListTodo, List } from "lucide-react";

type MaxHeightVariant = "widget" | "modal" | "full";

const MAX_HEIGHT: Record<MaxHeightVariant, string> = {
  widget: "max-h-[180px] md:max-h-[350px]",
  modal:  "max-h-[250px] md:max-h-[500px]",
  full:   "max-h-[80vh]",
};

export interface ChecklistEditorHandle {
  clear: () => void;
  isEmpty: () => boolean;
  /** Imperatively replaces the editor's content — for reseeding an already-mounted instance (e.g. loading an existing note into the composer for editing), unlike `defaultValue` which only seeds once on mount. */
  setHTML: (html: string) => void;
}

interface ChecklistEditorProps {
  onChange: (html: string) => void;
  /** Fired on Cmd/Ctrl+Enter — the checklist editor owns Enter handling, so the parent can't listen for it directly. */
  onSubmitShortcut?: () => void;
  /** Seeds the editor's initial HTML once on mount — uncontrolled, like a native defaultValue. Pass a `key` from the caller if it needs to reseed on later opens of the same mounted instance. */
  defaultValue?: string;
  /** Focuses the editor (and opens the toolbar) as soon as it mounts — e.g. switching from a read-only view into edit mode. */
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  maxHeightVariant?: MaxHeightVariant;
}

// The enlarged ~44x44px invisible tap target lives in globals.css as a plain ".qn-check-circle"
// rule (not Tailwind utilities baked into this string) — note.text freezes whatever classes
// exist here at save time, so a rule keyed only off this one stable class name is what lets
// already-saved historical notes pick up the bigger hit area too, not just newly typed ones.
const CIRCLE_CLASS =
  "qn-check-circle inline-block w-3.5 h-3.5 rounded-full border-2 border-slate-500 mt-0.5 cursor-pointer flex-shrink-0 transition-colors group-data-[checked=true]:bg-emerald-500 group-data-[checked=true]:border-emerald-500";
const TEXT_CLASS =
  "qn-check-text flex-1 min-w-0 group-data-[checked=true]:line-through group-data-[checked=true]:text-slate-600 group-data-[checked=true]:opacity-70";

// Plain-text-only paste — the only HTML that should ever exist in this editor is the
// checklist-line markup we generate ourselves below. Accepting rich pasted HTML here would
// both corrupt that structure and reopen an XSS surface, since the saved HTML is later
// rendered elsewhere via dangerouslySetInnerHTML.
function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
  e.preventDefault();
  const text = e.clipboardData.getData("text/plain");
  document.execCommand("insertText", false, text);
}

function createCircle(): HTMLSpanElement {
  const circle = document.createElement("span");
  circle.className = CIRCLE_CLASS;
  circle.contentEditable = "false";
  circle.setAttribute("role", "checkbox");
  circle.setAttribute("aria-checked", "false");
  return circle;
}

function createTextSpan(): HTMLSpanElement {
  const textSpan = document.createElement("span");
  textSpan.className = TEXT_CLASS;
  return textSpan;
}

// A brand-new, empty checklist line — used when Enter continues the list onto the next row.
function createChecklistLine(): HTMLDivElement {
  const line = document.createElement("div");
  line.className = "qn-check-line group flex items-start gap-2 py-0.5";
  line.dataset.checked = "false";
  const textSpan = createTextSpan();
  textSpan.appendChild(document.createElement("br")); // gives the empty line a caret target
  line.append(createCircle(), textSpan);
  return line;
}

function placeCursor(node: Node, atStart: boolean) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(atStart);
  sel.removeAllRanges();
  sel.addRange(range);
}

// Markdown-style bullet prefixes ("- ", "* ", "• ") read as redundant once the line gets its
// own checkbox glyph — strip the first one off the line's leading text before wrapping, so the
// result reads "○ buy milk" instead of "○ - buy milk".
const BULLET_PREFIX_RE = /^\s*[-*•]\s*/;

function stripLeadingBulletPrefix(container: HTMLElement) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const firstTextNode = walker.nextNode() as Text | null;
  if (!firstTextNode) return;
  const match = firstTextNode.data.match(BULLET_PREFIX_RE);
  if (match) firstTextNode.data = firstTextNode.data.slice(match[0].length);
}

function closestLine(node: Node | null): HTMLElement | null {
  const el = node instanceof HTMLElement ? node : node?.parentElement ?? null;
  return el?.closest(".qn-check-line") ?? null;
}

// Finds the block that represents "the current line" under the cursor: an existing
// checklist line, an existing line <div> the browser created on a previous Enter, or — if
// the cursor sits directly in the editor root with no wrapper yet (the very first line typed,
// before any Enter) — the editor root itself.
function getLineContainer(editor: HTMLElement, sel: Selection | null): HTMLElement | null {
  if (!sel || sel.rangeCount === 0 || !sel.anchorNode) return null;
  if (!editor.contains(sel.anchorNode)) return null;

  const existing = closestLine(sel.anchorNode);
  if (existing) return existing;

  let el = sel.anchorNode instanceof HTMLElement ? sel.anchorNode : sel.anchorNode.parentElement;
  while (el && el !== editor && el.parentElement !== editor) {
    el = el.parentElement;
  }
  return el; // either a direct child block of the editor, or the editor itself
}

// True when the caret sits collapsed at the very start of a checklist line's text span —
// i.e. immediately to the right of the circle, with nothing to its left to delete first.
function isCaretAtLineTextStart(sel: Selection | null, textSpan: Element): boolean {
  if (!sel || !sel.isCollapsed || sel.anchorOffset !== 0) return false;
  return sel.anchorNode === textSpan || sel.anchorNode === textSpan.firstChild;
}

const ChecklistEditor = forwardRef<ChecklistEditorHandle, ChecklistEditorProps>(function ChecklistEditor(
  { onChange, onSubmitShortcut, defaultValue, autoFocus, placeholder = "", className = "", maxHeightVariant = "modal" },
  ref
) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Uncontrolled seeding — runs once on mount only, same semantics as a native defaultValue.
  // Callers that need to reseed a still-mounted instance (e.g. re-opening the same modal with
  // different content) should remount via a `key` change rather than relying on this re-firing.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (defaultValue) el.innerHTML = defaultValue;
    if (autoFocus) {
      el.focus();
      // A bare .focus() on a non-empty contentEditable lands the caret at the *start* of the
      // content on most engines, not the end. Sweeping a collapsed selection range across the
      // whole element explicitly locks the caret after the last character instead, so loading
      // existing text into edit mode lets the user keep typing immediately without a manual tap.
      placeCursor(el, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    clear() {
      if (editorRef.current) editorRef.current.innerHTML = "";
      onChange("");
    },
    setHTML(html: string) {
      if (editorRef.current) editorRef.current.innerHTML = html;
      onChange(html);
    },
    isEmpty() {
      return !(editorRef.current?.textContent ?? "").trim();
    },
  }));

  function emitChange() {
    const el = editorRef.current;
    if (!el) return;
    // Fully collapse a cleared-out editor so the :empty placeholder selector still matches —
    // contentEditable often leaves a stray <br> behind after the last character is deleted.
    if (!el.textContent?.trim() && el.querySelectorAll(".qn-check-line").length === 0) {
      el.innerHTML = "";
    }
    onChange(el.innerHTML);
  }

  // Wraps the *entire active line* in a checklist row, with the circle ahead of the line's
  // existing words — never injected mid-sentence at the caret and never appended at the end.
  function insertChecklistItem() {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const sel = window.getSelection();
    const container = getLineContainer(editor, sel);
    if (!container || container.classList?.contains("qn-check-line")) return; // already a checklist line

    stripLeadingBulletPrefix(container);

    const line = document.createElement("div");
    line.className = "qn-check-line group flex items-start gap-2 py-0.5";
    line.dataset.checked = "false";
    const textSpan = createTextSpan();

    // Move every existing node of the line (text + any <br>s) into the new text span, so the
    // pre-existing words land to the right of the circle instead of being replaced.
    while (container.firstChild) textSpan.appendChild(container.firstChild);
    if (!textSpan.hasChildNodes()) textSpan.appendChild(document.createElement("br"));

    line.append(createCircle(), textSpan);

    if (container === editor) {
      editor.appendChild(line); // first/only line — was never wrapped in its own block
    } else {
      container.replaceWith(line);
    }

    placeCursor(textSpan, false);
    emitChange();
  }

  // Markdown-style "- " / "* " armed at the very start of an otherwise-empty line — the
  // trigger for the bullet auto-transform. The user always types a literal space via the
  // spacebar, so this stays a plain " " even though the *output* bullet uses a non-breaking
  // one (see BULLET_GLYPH below).
  const BULLET_MARKER_RE = /^[-*] $/;
  const BULLET_LINE_RE    = /^•\s/;

  // A plain trailing space after "•" gets collapsed by normal HTML whitespace rules — easy to
  // lose visually, and on some engines collapses caret positioning along with it. A non-breaking
  // space renders reliably and is still matched by \s in both our regexes above and below.
  const BULLET_GLYPH = "• ";

  // Prepends "• " to the front of the current line's existing text (stripping any
  // "-"/"*" markdown already typed there first), mirroring insertChecklistItem's "wrap the
  // whole line" behavior but without a checkbox structure — bullets are plain text.
  function insertBulletPrefix() {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const sel = window.getSelection();
    const container = getLineContainer(editor, sel);
    if (!container || container.classList?.contains("qn-check-line")) return;
    if (BULLET_LINE_RE.test(container.textContent ?? "")) return; // already a bullet line

    stripLeadingBulletPrefix(container);

    const bulletNode = document.createTextNode(BULLET_GLYPH);
    if (container.firstChild) container.insertBefore(bulletNode, container.firstChild);
    else container.appendChild(bulletNode);

    placeCursor(container, false);
    emitChange();
  }

  // Live auto-transform: once the user types any character right after an armed "- "/"* "
  // marker, swap the marker for "• " in place. Even though this is a same-length swap,
  // mutating a Text node's .data while it anchors the live Selection isn't guaranteed to keep
  // the caret put on every engine — it can snap back to the start of the line. So the caret
  // is explicitly re-anchored to the end of this text node via the Range API afterward, never
  // left to chance.
  function maybeAutoTransformBulletMarker() {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return;

    const container = getLineContainer(editor, sel);
    if (!container || container.classList?.contains("qn-check-line")) return;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const firstTextNode = walker.nextNode() as Text | null;
    if (!firstTextNode) return;

    const match = firstTextNode.data.match(/^([-*]) (\S.*)$/);
    if (!match) return;

    firstTextNode.data = `${BULLET_GLYPH}${match[2]}`;
    placeCursor(firstTextNode, false); // lock the caret to the end — never the start of the line
  }

  function handleInput() {
    maybeAutoTransformBulletMarker();
    emitChange();
  }

  // Strips the checkbox and restores a plain line in a single keypress, instead of the
  // browser's default "first press selects the atomic checkbox, second press deletes it".
  function unwrapChecklistLine(line: HTMLElement, textSpan: Element) {
    const plainLine = document.createElement("div");
    while (textSpan.firstChild) plainLine.appendChild(textSpan.firstChild);
    if (!plainLine.hasChildNodes()) plainLine.appendChild(document.createElement("br"));
    line.replaceWith(plainLine);
    placeCursor(plainLine, true);
    emitChange();
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const circle = (e.target as HTMLElement).closest(".qn-check-circle") as HTMLElement | null;
    if (!circle) return;
    e.preventDefault();
    const line = circle.closest(".qn-check-line") as HTMLElement | null;
    if (!line) return;
    const next = line.dataset.checked !== "true";
    line.dataset.checked = String(next);
    circle.setAttribute("aria-checked", String(next));
    emitChange();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmitShortcut?.();
      return;
    }

    const sel = window.getSelection();

    if (e.key === "Backspace") {
      const line = sel && sel.rangeCount > 0 ? closestLine(sel.anchorNode) : null;
      const textSpan = line?.querySelector(".qn-check-text");
      if (line && textSpan && isCaretAtLineTextStart(sel, textSpan)) {
        e.preventDefault();
        unwrapChecklistLine(line, textSpan);
        return;
      }
    }

    if (e.key !== "Enter" || e.shiftKey) return;

    const editor = editorRef.current;

    const currentLine = sel && sel.rangeCount > 0 ? closestLine(sel.anchorNode) : null;
    if (currentLine) {
      e.preventDefault();
      const newLine = createChecklistLine();
      currentLine.after(newLine);
      placeCursor(newLine.querySelector(".qn-check-text")!, false);
      emitChange();
      return;
    }

    // Bullet lines: an armed "- "/"* " marker (still empty otherwise) transforms in place;
    // an already-established "• " line continues the list onto a fresh bulleted row.
    if (!editor) return;
    const container = getLineContainer(editor, sel);
    if (!container) return;
    const lineText = container.textContent ?? "";

    if (BULLET_MARKER_RE.test(lineText)) {
      e.preventDefault();
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      const firstTextNode = walker.nextNode() as Text | null;
      if (firstTextNode) {
        firstTextNode.data = BULLET_GLYPH;
        placeCursor(firstTextNode, false); // explicitly anchored — never left to drift to line start
      }
      emitChange();
      return;
    }

    if (BULLET_LINE_RE.test(lineText)) {
      e.preventDefault();
      const newLine = document.createElement("div");
      const newBulletText = document.createTextNode(BULLET_GLYPH);
      newLine.appendChild(newBulletText);
      if (container === editor) editor.appendChild(newLine);
      else container.after(newLine);
      placeCursor(newBulletText, false); // caret right after the trailing space, ready to type
      emitChange();
    }
  }

  return (
    // className (rounded/border/bg/focus styles) lives on this outer box so the toolbar
    // below reads as part of the same input, not a detached strip underneath it.
    <div className={`flex flex-col focus-within:border-purple-500/50 focus-within:bg-white/[0.06] ${className}`}>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`px-3 py-2 overflow-y-auto outline-none text-sm text-white empty:before:content-[attr(data-placeholder)] empty:before:text-slate-600 empty:before:pointer-events-none ${MAX_HEIGHT[maxHeightVariant]}`}
      />

      {/* Formatting toolbar — only while the editor is actively focused */}
      {isFocused && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-t border-white/[0.06]">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()} // keep focus (and the cursor position) inside the editor
            onClick={insertChecklistItem}
            title="To-Do list"
            className="flex items-center gap-1.5 px-2 h-6 rounded-md text-[10px] font-medium text-slate-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors"
          >
            <ListTodo className="w-3.5 h-3.5" />
            To-Do
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()} // keep focus (and the cursor position) inside the editor
            onClick={insertBulletPrefix}
            title="Bullet list"
            className="flex items-center gap-1.5 px-2 h-6 rounded-md text-[10px] font-medium text-slate-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors"
          >
            <List className="w-3.5 h-3.5" />
            Bullet
          </button>
        </div>
      )}
    </div>
  );
});

export default ChecklistEditor;
