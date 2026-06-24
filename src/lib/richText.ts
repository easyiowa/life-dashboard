// Shared helpers for the rich-HTML notes fields (Quick Notes, Task notes, etc.) that use
// ChecklistEditor for composition and render the saved result via dangerouslySetInnerHTML
// elsewhere. Centralized so every consumer treats "what counts as empty" and "how to toggle
// a saved checklist item" identically.

import type React from "react";

// Saved note/task HTML — every plain-text consumer (search, task-title generation, hover
// previews, emptiness checks) wants the visible words, not markup, so they go through this
// first. Block-level boundaries (<div>/<p>/<br>) are preserved as newlines so "first line"
// logic (e.g. deriving a task title) keeps working unchanged.
export function stripHtml(html: string): string {
  if (typeof window === "undefined") return html.replace(/<[^>]+>/g, " ").trim();
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  tmp.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  tmp.querySelectorAll("div, p").forEach((block) => block.append("\n"));
  return (tmp.textContent ?? "").replace(/\n{2,}/g, "\n").trim();
}

// Click handler for a read-only container rendering saved ChecklistEditor HTML (via
// dangerouslySetInnerHTML). Toggling a checklist circle flips its data-checked attribute
// directly on the DOM — the same in-place mutation ChecklistEditor itself uses while
// live-editing — then hands the container's resulting innerHTML to `onUpdate` so the caller
// can persist it (or just hold it in local state), keeping a saved checklist interactive
// without ever entering edit mode or focusing a contentEditable element.
export function makeChecklistToggleHandler(onUpdate: (html: string) => void) {
  return (e: React.MouseEvent<HTMLDivElement>) => {
    const circle = (e.target as HTMLElement).closest(".qn-check-circle") as HTMLElement | null;
    if (!circle) return;
    e.preventDefault();
    e.stopPropagation();
    const line = circle.closest(".qn-check-line") as HTMLElement | null;
    if (!line) return;
    const next = line.dataset.checked !== "true";
    line.dataset.checked = String(next);
    circle.setAttribute("aria-checked", String(next));
    onUpdate(e.currentTarget.innerHTML);
  };
}
