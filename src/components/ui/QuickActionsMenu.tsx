"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, NotebookPen, LayoutGrid } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { useAuth } from "@/context/AuthContext";
import {
  QUICK_ACTION_REGISTRY,
  loadQuickActionsConfig,
  onQuickActionsConfigChanged,
  type QuickActionConfigItem,
} from "@/lib/quickActions";

const ICONS: Record<string, React.ElementType> = {
  "add-task":   Plus,
  "add-note":   NotebookPen,
  "widget-nav": LayoutGrid,
};

// One-shot scroll + flash, reusing the onboarding "draw attention" keyframe
// (see globals.css `animate-card-pulse`) so this feels native to the dashboard.
function scrollToWidget(widgetId: string) {
  const el = document.getElementById(`widget-${widgetId}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("animate-card-pulse");
  setTimeout(() => el.classList.remove("animate-card-pulse"), 1000);
}

interface LoadedWidget { id: string; label: string }

function getLoadedWidgets(): LoadedWidget[] {
  if (typeof document === "undefined") return [];
  return Array.from(document.querySelectorAll<HTMLElement>("[data-widget-id]")).map((el) => ({
    id:    el.dataset.widgetId   ?? "",
    label: el.dataset.widgetLabel ?? el.dataset.widgetId ?? "",
  }));
}

export default function QuickActionsMenu() {
  const { openTaskModal } = useDashboard();
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
      // Desktop bar sits at the left edge — open the popover to its right.
      // Mobile dock sits at the bottom — open the popover above it.
      const isDesktop = rect === desktopRect;
      setNavPos(
        isDesktop
          ? { top: rect.top, left: rect.right + 8 }
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

  if (activeActions.length === 0) return null;

  const barClass = "bg-white/[0.03] backdrop-blur-xl border border-white/[0.07]";

  return (
    <>
      {/* Mobile: floating horizontal pill dock */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex md:hidden items-center gap-1 rounded-full p-1.5 shadow-2xl ${barClass}`}>
        {activeActions.map((a) => {
          const def  = QUICK_ACTION_REGISTRY[a.id];
          const Icon = ICONS[a.id];
          return (
            <button
              key={a.id}
              ref={a.id === "widget-nav" ? navBtnRefMobile : undefined}
              onClick={() => runAction(a.id)}
              title={def.label}
              aria-label={def.label}
              className="w-11 h-11 rounded-full flex items-center justify-center text-slate-300 hover:text-violet-300 hover:bg-white/[0.06] transition-all duration-150"
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      {/* Desktop: vertical bar fixed along the left edge */}
      <div className={`fixed left-6 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-1 rounded-full p-1.5 shadow-2xl ${barClass}`}>
        {activeActions.map((a) => {
          const def  = QUICK_ACTION_REGISTRY[a.id];
          const Icon = ICONS[a.id];
          return (
            <button
              key={a.id}
              ref={a.id === "widget-nav" ? navBtnRefDesktop : undefined}
              onClick={() => runAction(a.id)}
              title={def.label}
              aria-label={def.label}
              className="w-11 h-11 rounded-full flex items-center justify-center text-slate-300 hover:text-violet-300 hover:bg-white/[0.06] transition-all duration-150"
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
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
            {navWidgets.map((w) => (
              <button
                key={w.id}
                onClick={() => { scrollToWidget(w.id); setNavOpen(false); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-left text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-all duration-150"
              >
                {w.label}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
