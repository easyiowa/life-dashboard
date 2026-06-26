"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

interface ScrollFadeContainerProps {
  /** Classes for the scrolling viewport itself — sizing/positioning concerns (flex-1, basis, order, etc.) */
  className?: string;
  /** Classes for the inner flex row holding the children — layout concerns (gap, flex-wrap, etc.) */
  innerClassName?: string;
  children: ReactNode;
}

const FADE_PCT = 18; // % of the viewport width the fade ramps across at each edge
const EDGE_PX  = 4;  // scrollLeft tolerance for "resting at the start/end"

/**
 * Wraps a horizontally-scrollable pill/tab row with a self-maintaining edge-fade mask:
 * solid at rest (only a right-edge hint), both edges fade mid-scroll, and only the left
 * edge fades once fully scrolled to the end. The mask disables itself entirely the moment
 * the row stops actually overflowing — e.g. once a `md:flex-wrap` breakpoint kicks in and
 * pills wrap instead of scrolling — so no manual `max-md:` gating is needed by callers.
 *
 * Usage: drop pill buttons in as children. Pass `className` for the outer viewport's own
 * sizing/flex-positioning (e.g. "flex-1 min-w-0", "order-3 md:order-2 basis-full"), and
 * `innerClassName` for anything about the pill row's own layout beyond the defaults below.
 * Scroll/resize observation (including content size changes, e.g. pills being added or
 * removed) is handled internally — nothing else to wire up per call site.
 */
export default function ScrollFadeContainer({
  className = "",
  innerClassName = "",
  children,
}: ScrollFadeContainerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef  = useRef<HTMLDivElement>(null);
  const [mask, setMask] = useState("none");

  const recompute = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;

    if (maxScroll <= 1) {
      setMask("none"); // nothing actually overflows (or it's wrapped via md:flex-wrap) — never mask
      return;
    }

    const atStart = el.scrollLeft <= EDGE_PX;
    const atEnd   = el.scrollLeft >= maxScroll - EDGE_PX;

    if (atStart) {
      setMask(`linear-gradient(to right, white ${100 - FADE_PCT}%, transparent 100%)`);
    } else if (atEnd) {
      setMask(`linear-gradient(to right, transparent 0%, white ${FADE_PCT}%, white 100%)`);
    } else {
      setMask(`linear-gradient(to right, transparent 0%, white ${FADE_PCT}%, white ${100 - FADE_PCT}%, transparent 100%)`);
    }
  }, []);

  useEffect(() => {
    recompute();
    // CSS Grid items (this container's parent in several widgets) can take an extra layout
    // pass to settle their final track width after the initial commit, and a grid item won't
    // necessarily fire ResizeObserver for that settling if its own box doesn't change size —
    // only the *available* width does. One rAF re-check after mount catches that case without
    // waiting on a real resize/content event.
    const raf = requestAnimationFrame(recompute);

    const viewport = viewportRef.current;
    const content  = contentRef.current;
    if (!viewport || !content) return () => cancelAnimationFrame(raf);

    // Observing both catches viewport resizing (orientation change, breakpoint shifts) and
    // content resizing (pills added/removed/relabeled) — either can change whether overflow
    // exists at all, which is exactly what determines if a mask should apply.
    const ro = new ResizeObserver(recompute);
    ro.observe(viewport);
    ro.observe(content);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [recompute]);

  return (
    <div
      ref={viewportRef}
      onScroll={recompute}
      // min-w-0 keeps this viewport free to actually shrink/overflow inside any flex or CSS
      // Grid ancestor — without it, some browsers let the row's intrinsic content width push
      // the ancestor wider instead of triggering real overflow, which both breaks scrolling
      // and leaves nothing for the mask to fade (no overflow == recompute() reports "none").
      className={`min-w-0 overflow-x-auto [&::-webkit-scrollbar]:hidden md:overflow-visible transition-[mask-image] duration-200 ${className}`}
      style={{
        scrollbarWidth: "none",
        maskImage: mask,
        WebkitMaskImage: mask,
        // Promotes this element onto its own compositing layer. WebKit/Blink can otherwise
        // resolve a -webkit-mask-image against a stale or boundary-clipped paint of the
        // element on first layout when it sits inside another positioned/transformed
        // ancestor (e.g. a drag-and-drop grid cell) — forcing the layer up front avoids that.
        transform: "translateZ(0)",
        isolation: "isolate",
      }}
    >
      <div
        ref={contentRef}
        // pr-8 trailing safety margin: even if a mask/compositing edge case ever clips a touch
        // early, there's blank space there to lose, not the last pill's own text.
        className={`flex items-center gap-2 flex-nowrap whitespace-nowrap md:flex-wrap md:whitespace-normal pr-8 md:pr-0 ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
