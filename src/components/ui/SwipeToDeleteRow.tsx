"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { Trash2 } from "lucide-react";

// Swipe reveal geometry — kept as named constants so the JS snap target always matches the
// tray's actual layout (icon button width + gaps + symmetric padding on each side, mirroring
// the Tailwind values used in the tray markup below).
const ACTION_ICON_SIZE = 32; // px — w-8/h-8 icon button
const ACTION_GAP       = 8;  // px — gap-2 between stacked tray buttons
const TRAY_PADDING     = 16; // px — pr-4, mirrored on the icon block's left side too

function revealOffsetFor(actionCount: number): number {
  return TRAY_PADDING * 2 + actionCount * ACTION_ICON_SIZE + Math.max(actionCount - 1, 0) * ACTION_GAP;
}

export interface SwipeAction {
  icon: ReactNode;
  label: string;
  /** Background + icon color classes for the circular tray button, e.g. "bg-amber-500/20 text-amber-400". */
  toneClassName: string;
  onClick: () => void;
}

interface SwipeToDeleteRowProps {
  /** Simple single-delete usage — ignored when `actions` is provided. */
  onDelete?: () => void;
  /** Full multi-button tray. When provided, replaces the single delete circle entirely. */
  actions?: SwipeAction[];
  /** Fired on a clean tap (not a drag-release) — typically opens an inspect/edit modal. */
  onClick?: () => void;
  /** Tailwind rounding class shared by every layer so corners line up with the wrapped content. */
  roundedClassName?: string;
  children: ReactNode;
}

const DEFAULT_DELETE_TONE = "bg-white/[0.06] text-red-500";

// Mobile-only swipe-left gesture, standardized across every dashboard list row. Layering:
// stationary action tray underneath, opaque-backed draggable foreground on top — the opaque
// base prevents the tray from bleeding through translucent card backgrounds at rest.
export default function SwipeToDeleteRow({
  onDelete,
  actions,
  onClick,
  roundedClassName = "rounded-xl",
  children,
}: SwipeToDeleteRowProps) {
  const resolvedActions: SwipeAction[] = actions ?? (onDelete
    ? [{ icon: <Trash2 className="w-3.5 h-3.5" />, label: "Delete", toneClassName: DEFAULT_DELETE_TONE, onClick: onDelete }]
    : []);
  const revealOffset = revealOffsetFor(resolvedActions.length);

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
      // The long-swipe-past-60%-auto-commits shortcut only makes sense when there's exactly
      // one unambiguous action to commit to — with a multi-button tray it's not clear which
      // action a full swipe should mean, so that case always settles on the open anchor instead.
      if (resolvedActions.length === 1 && Math.abs(dragX) >= width * 0.6) {
        resolvedActions[0].onClick();
        setDragX(0);
        setIsOpen(false);
      } else if (Math.abs(dragX) >= revealOffset) {
        // Past the reveal point but short of the delete trigger — magnetically lock onto the
        // pre-calculated symmetric anchor instead of resting wherever the finger happened to lift.
        setDragX(-revealOffset);
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

  if (resolvedActions.length === 0) {
    // No actions configured at all — render plain, no swipe machinery needed.
    return (
      <div onClick={onClick} className={onClick ? "cursor-pointer" : undefined}>
        {children}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${roundedClassName}`}>
      {/* Underlayer — stationary action tray, fully covered by the foreground card at rest */}
      <div className={`md:hidden absolute inset-0 flex items-center justify-end gap-2 pr-4 bg-white/[0.02] ${roundedClassName}`}>
        {resolvedActions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={(e) => { e.stopPropagation(); action.onClick(); closeRow(); }}
            aria-label={action.label}
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${action.toneClassName}`}
          >
            {action.icon}
          </button>
        ))}
      </div>

      {/* Foreground layer — the draggable card; opaque base blocks the tray underneath at rest */}
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
