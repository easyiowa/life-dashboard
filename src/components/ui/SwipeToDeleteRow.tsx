"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { Trash2 } from "lucide-react";

// Swipe-to-delete reveal geometry — kept as named constants so the JS snap target
// always matches the tray's actual layout (icon button width + symmetric padding
// on each side, mirroring the pr-4/w-8 values used in the tray markup below).
const DELETE_ICON_SIZE     = 32; // px — w-8/h-8 icon button
const DELETE_TRAY_PADDING  = 16; // px — pr-4, mirrored on the icon's left side too
const DELETE_REVEAL_OFFSET = DELETE_ICON_SIZE + DELETE_TRAY_PADDING * 2; // 64px

interface SwipeToDeleteRowProps {
  /** Called when the user long-swipes past 60% of the row's width, or taps the revealed trash icon. */
  onDelete: () => void;
  /** Fired on a clean tap (not a drag-release) — typically opens an inspect/edit modal. */
  onClick?: () => void;
  /** Tailwind rounding class shared by every layer so corners line up with the wrapped content. */
  roundedClassName?: string;
  children: ReactNode;
}

// Mobile-only swipe-left-to-delete gesture, standardized across every dashboard list row.
// Layering: stationary red-icon tray underneath, opaque-backed draggable foreground on top —
// the opaque base prevents the tray from bleeding through translucent card backgrounds at rest.
export default function SwipeToDeleteRow({
  onDelete,
  onClick,
  roundedClassName = "rounded-xl",
  children,
}: SwipeToDeleteRowProps) {
  const containerRef = useRef<HTMLDivElement>(null); // wraps tray + foreground — used to detect outside taps
  const rowRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef<{ startX: number; startY: number; axis: "x" | "y" | null }>({ startX: 0, startY: 0, axis: null });
  const suppressClickRef = useRef(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // locked at the symmetric anchor, awaiting a follow-up tap

  function closeRow() {
    setDragX(0);
    setIsOpen(false);
  }

  // While the row is pinned open, any vertical page scroll or any tap/touch outside this
  // row's own bounds should snap it closed again. Listeners are only live while open, and
  // are torn down immediately on close so idle rows never pay for this.
  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideInteraction(e: Event) {
      const target = e.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        closeRow();
      }
    }

    function handleScroll() {
      closeRow();
    }

    document.addEventListener("pointerdown", handleOutsideInteraction, true);
    document.addEventListener("touchstart", handleOutsideInteraction, true);
    document.addEventListener("click", handleOutsideInteraction, true);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideInteraction, true);
      document.removeEventListener("touchstart", handleOutsideInteraction, true);
      document.removeEventListener("click", handleOutsideInteraction, true);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen]);

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchRef.current = { startX: t.clientX, startY: t.clientY, axis: null };
  }

  function handleTouchMove(e: React.TouchEvent) {
    const t = e.touches[0];
    const deltaX = t.clientX - touchRef.current.startX;
    const deltaY = t.clientY - touchRef.current.startY;

    if (touchRef.current.axis === null) {
      // Vertical intent wins immediately — let the native page scroll take over.
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        touchRef.current.axis = "y";
        return;
      }
      // Require a clear horizontal intent before locking the gesture.
      if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
        touchRef.current.axis = "x";
        setIsDragging(true);
      } else {
        return;
      }
    }

    if (touchRef.current.axis !== "x") return;

    const width = rowRef.current?.offsetWidth ?? 1;
    setDragX(Math.min(0, Math.max(deltaX, -width)));
  }

  function handleTouchEnd() {
    if (touchRef.current.axis === "x") {
      const width = rowRef.current?.offsetWidth ?? 1;
      if (Math.abs(dragX) >= width * 0.6) {
        // Long-swipe past 60% — commit the delete immediately, no need to settle on the anchor first.
        onDelete();
        setDragX(0);
        setIsOpen(false);
      } else if (Math.abs(dragX) >= DELETE_REVEAL_OFFSET) {
        // Past the reveal point but short of the delete trigger — magnetically lock onto the
        // pre-calculated symmetric anchor instead of resting wherever the finger happened to lift.
        setDragX(-DELETE_REVEAL_OFFSET);
        setIsOpen(true);
      } else {
        // Short swipe — snap fully back closed.
        setDragX(0);
        setIsOpen(false);
      }
      suppressClickRef.current = true;
    } else {
      setDragX(0);
      setIsOpen(false);
    }
    setIsDragging(false);
    touchRef.current.axis = null;
  }

  function handleRowClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onClick?.();
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${roundedClassName}`}>
      {/* Underlayer — stationary delete tray, fully covered by the foreground card at rest */}
      <div className={`md:hidden absolute inset-0 flex items-center justify-end pr-4 bg-white/[0.02] ${roundedClassName}`}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); closeRow(); }}
          aria-label="Delete"
          className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] text-red-500"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Foreground layer — the draggable card; opaque base blocks the red tray underneath at rest */}
      <div
        ref={rowRef}
        onClick={handleRowClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(${dragX}px)`, transition: isDragging ? "none" : "transform 0.2s ease-out" }}
        className={`relative overflow-hidden touch-pan-y ${onClick ? "cursor-pointer" : ""} ${roundedClassName}`}
      >
        <div className={`absolute inset-0 bg-[#0F1629] ${roundedClassName}`} />
        <div className="relative">
          {children}
        </div>
      </div>
    </div>
  );
}
