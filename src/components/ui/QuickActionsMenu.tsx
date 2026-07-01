"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus, NotebookPen, LayoutGrid,
  CalendarDays, Flame, FolderKanban, Timer,
  Target, Activity, TrendingUp, RefreshCw, Users,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { useAuth } from "@/context/AuthContext";
import {
  QUICK_ACTION_REGISTRY,
  loadQuickActionsConfig,
  onQuickActionsConfigChanged,
  type QuickActionConfigItem,
} from "@/lib/quickActions";

// ── Dock button icons ─────────────────────────────────────────────────────────

const ICONS: Record<string, React.ElementType> = {
  "add-task":   Plus,
  "add-note":   NotebookPen,
  "widget-nav": LayoutGrid,
};

// Tooltip labels shown on dock button hover — intentionally shorter than the
// registry labels which are used in the config UI.
const TOOLTIP_LABELS: Record<string, string> = {
  "add-note":   "Quick Note",
  "add-task":   "Quick Add",
  "widget-nav": "Navigate to",
};

// ── Widget icon map (mirrors DashboardBlueprintModal for consistency) ─────────

const WIDGET_ICONS: Record<string, React.ElementType> = {
  "quick-notes":  NotebookPen,
  "daily-focus":  Target,
  "time-tracker": Timer,
  "projects":     FolderKanban,
  "activity-log": Activity,
  "progress":     TrendingUp,
  "calendar":     CalendarDays,
  "recurring":    RefreshCw,
  "network":      Users,
  "habits":       Flame,
};

// ── Scroll helper ─────────────────────────────────────────────────────────────
// One-shot scroll + micro-bounce — see globals.css `animate-card-nav-jump`.
// Uses transform + border-color rather than box-shadow so it renders in
// both dark and light mode (the global shadow reset zeros box-shadow in light).
function scrollToWidget(widgetId: string) {
  const el = document.getElementById(`widget-${widgetId}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("animate-card-nav-jump");
  setTimeout(() => el.classList.remove("animate-card-nav-jump"), 1050);
}

interface LoadedWidget { id: string; label: string }

function getLoadedWidgets(): LoadedWidget[] {
  if (typeof document === "undefined") return [];
  return Array.from(document.querySelectorAll<HTMLElement>("[data-widget-id]")).map((el) => ({
    id:    el.dataset.widgetId   ?? "",
    label: el.dataset.widgetLabel ?? el.dataset.widgetId ?? "",
  }));
}

// ── Tooltip-aware dock button ─────────────────────────────────────────────────
// tooltipSide controls which direction the tooltip opens:
//   "right" — desktop vertical bar (bar is anchored left, tooltip opens right)
//   "top"   — mobile horizontal pill (bar is at bottom, tooltip opens above)

interface DockButtonProps {
  actionId:    string;
  btnRef?:     React.Ref<HTMLButtonElement>;
  onClick:     () => void;
  tooltipSide: "right" | "top";
}

function DockButton({ actionId, btnRef, onClick, tooltipSide }: DockButtonProps) {
  const Icon    = ICONS[actionId];
  const tooltip = TOOLTIP_LABELS[actionId] ?? QUICK_ACTION_REGISTRY[actionId]?.label;

  const tooltipCls =
    tooltipSide === "right"
      ? "left-full ml-2.5 top-1/2 -translate-y-1/2"
      : "bottom-full mb-2 left-1/2 -translate-x-1/2";

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      aria-label={tooltip}
      className="relative group w-11 h-11 rounded-full flex items-center justify-center text-slate-300 hover:text-violet-300 hover:bg-white/[0.06] transition-all duration-150"
    >
      <Icon className="w-4 h-4" />

      {/* Hover tooltip */}
      <span
        className={[
          "pointer-events-none absolute z-[120] px-2 py-1",
          "rounded-md shadow-md",
          // Light mode: white card, dark text, slate border
          "bg-white border border-slate-200 text-slate-800",
          // Dark mode: deep navy card, white text, subtle border
          "dark:bg-slate-900 dark:border-white/[0.08] dark:text-white dark:shadow-none",
          "text-[11px] font-medium whitespace-nowrap",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
          tooltipCls,
        ].join(" ")}
      >
        {tooltip}
      </span>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function QuickActionsMenu() {
  const { openTaskModal, anyOverlayOpen } = useDashboard();
  const { user } = useAuth();

  const [config, setConfig] = useState<QuickActionConfigItem[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  const [navWidgets, setNavWidgets] = useState<LoadedWidget[]>([]);
  const [navPos, setNavPos] = useState<{ top?: number; bottom?: number; left: number }>({ top: 0, left: 0 });
  // Two physical buttons exist (mobile dock + desktop bar) but only one is
  // visible at a time via CSS — track both refs and use whichever has a real layout.
  const navBtnRefMobile  = useRef<HTMLButtonElement>(null);
  const navBtnRefDesktop = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from user metadata once auth resolves, same pattern as DashboardGrid's widget_layout load
    setConfig(loadQuickActionsConfig(user));
    return onQuickActionsConfigChanged(setConfig);
  }, [user]);

  const activeActions = config
    .filter((c) => c.enabled && c.id in QUICK_ACTION_REGISTRY)
    .sort((a, b) => a.order - b.order);

  function openWidgetNav() {
    const mobileRect  = navBtnRefMobile.current?.getBoundingClientRect();
    const desktopRect = navBtnRefDesktop.current?.getBoundingClientRect();
    const rect = mobileRect && mobileRect.width > 0 ? mobileRect : desktopRect;
    if (rect) {
      // Both bars now sit at the bottom of the viewport — open the popover above
      // whichever one was clicked. Desktop is left-anchored so the popover aligns
      // with its left edge; mobile is center-anchored so it's offset to stay centered.
      const isDesktop = rect === desktopRect;
      setNavPos(
        isDesktop
          ? { bottom: window.innerHeight - rect.top + 8, left: rect.left }
          : { bottom: window.innerHeight - rect.top + 8, left: Math.max(8, rect.left - 112) }
      );
    }
    setNavWidgets(getLoadedWidgets());
    setNavOpen((o) => !o);
  }

  function runAction(id: string) {
    if (id === "add-task") { openTaskModal(); return; }
    if (id === "add-note") { scrollToWidget("quick-notes"); return; }
    if (id === "widget-nav") { openWidgetNav(); return; }
  }

  if (activeActions.length === 0 || anyOverlayOpen) return null;

  const barClass = "bg-white/[0.03] backdrop-blur-xl border border-white/[0.07]";

  return (
    <>
      {/* Mobile: floating horizontal pill dock (tooltips open above) */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex md:hidden items-center gap-1 rounded-full p-1.5 shadow-2xl ${barClass}`}>
        {activeActions.map((a) => (
          <DockButton
            key={a.id}
            actionId={a.id}
            btnRef={a.id === "widget-nav" ? navBtnRefMobile : undefined}
            onClick={() => runAction(a.id)}
            tooltipSide="top"
          />
        ))}
      </div>

      {/* Desktop: vertical bar anchored to the bottom-left corner (tooltips open right) */}
      <div className={`fixed bottom-6 left-6 z-50 hidden md:flex flex-col items-center gap-1 rounded-full p-1.5 shadow-2xl ${barClass}`}>
        {activeActions.map((a) => (
          <DockButton
            key={a.id}
            actionId={a.id}
            btnRef={a.id === "widget-nav" ? navBtnRefDesktop : undefined}
            onClick={() => runAction(a.id)}
            tooltipSide="right"
          />
        ))}
      </div>

      {/* Widget navigation popover — portaled to <body> to avoid being trapped
          inside this bar's own backdrop-blur stacking context. */}
      {navOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setNavOpen(false)} />
          <div
            className="fixed z-[110] w-56 max-h-[70vh] overflow-y-auto bg-[#0d1426] border border-white/[0.12] rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5"
            style={{ top: navPos.top, bottom: navPos.bottom, left: navPos.left }}
          >
            {navWidgets.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-600">No widgets loaded.</p>
            )}
            {navWidgets.map((w) => {
              const WIcon = WIDGET_ICONS[w.id];
              return (
                <button
                  key={w.id}
                  onClick={() => { scrollToWidget(w.id); setNavOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-all duration-150"
                >
                  {WIcon && <WIcon className="w-3.5 h-3.5 shrink-0 text-slate-600" />}
                  <span>{w.label}</span>
                </button>
              );
            })}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
