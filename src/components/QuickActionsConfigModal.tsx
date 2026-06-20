"use client";

import { useEffect, useState } from "react";
import { X, Plus, NotebookPen, LayoutGrid, Trash2, ChevronUp, ChevronDown, RotateCcw } from "lucide-react";
import {
  QUICK_ACTION_REGISTRY,
  DEFAULT_QUICK_ACTIONS_CONFIG,
  MAX_ACTIVE_QUICK_ACTIONS,
  type QuickActionConfigItem,
} from "@/lib/quickActions";

const ICONS: Record<string, React.ElementType> = {
  "add-task":   Plus,
  "add-note":   NotebookPen,
  "widget-nav": LayoutGrid,
};

interface Props {
  isOpen:        boolean;
  onClose:       () => void;
  initialConfig: QuickActionConfigItem[];
  onSave:        (config: QuickActionConfigItem[]) => void;
}

export default function QuickActionsConfigModal({ isOpen, onClose, initialConfig, onSave }: Props) {
  const [items, setItems] = useState<QuickActionConfigItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      const seed = initialConfig.length > 0 ? initialConfig : DEFAULT_QUICK_ACTIONS_CONFIG;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seed-on-open pattern, same as ActiveWidgetsModal/DashboardBlueprintModal
      setItems([...seed].sort((a, b) => a.order - b.order));
    }
  }, [isOpen, initialConfig]);

  if (!isOpen) return null;

  const sorted      = [...items].sort((a, b) => a.order - b.order);
  const activeCount = items.filter((i) => i.enabled).length;

  function toggleEnabled(id: string) {
    setItems((prev) => {
      const count = prev.filter((i) => i.enabled).length;
      return prev.map((i) => {
        if (i.id !== id) return i;
        if (!i.enabled && count >= MAX_ACTIVE_QUICK_ACTIONS) return i;
        return { ...i, enabled: !i.enabled };
      });
    });
  }

  function move(id: string, dir: -1 | 1) {
    setItems((prev) => {
      const order = [...prev].sort((a, b) => a.order - b.order);
      const idx = order.findIndex((i) => i.id === id);
      const swapIdx = idx + dir;
      if (idx === -1 || swapIdx < 0 || swapIdx >= order.length) return prev;
      const a = order[idx];
      const b = order[swapIdx];
      return prev.map((i) => {
        if (i.id === a.id) return { ...i, order: b.order };
        if (i.id === b.id) return { ...i, order: a.order };
        return i;
      });
    });
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id).map((i, idx) => ({ ...i, order: idx })));
  }

  function restoreDefaults() {
    setItems(DEFAULT_QUICK_ACTIONS_CONFIG.map((i) => ({ ...i })));
  }

  function handleSave() {
    onSave(items);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#0B0F19] border border-white/[0.09] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
          <h2 className="text-base font-semibold text-white tracking-tight">Edit Quick Actions</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 leading-relaxed">
                Choose what shows up in your floating Quick Actions bar.
              </p>
              <span className="text-[10px] text-slate-600 shrink-0 ml-2">{activeCount} / {MAX_ACTIVE_QUICK_ACTIONS} active</span>
            </div>

            <div className="flex flex-col gap-2">
              {sorted.map((item, idx) => {
                const def  = QUICK_ACTION_REGISTRY[item.id];
                const Icon = ICONS[item.id];
                if (!def) return null;
                const blockedFromEnabling = !item.enabled && activeCount >= MAX_ACTIVE_QUICK_ACTIONS;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                      item.enabled
                        ? "bg-violet-600/[0.08] border-violet-500/30"
                        : "bg-white/[0.03] border-white/[0.07]"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${item.enabled ? "text-violet-300" : "text-slate-500"}`} />
                    <span className={`text-sm flex-1 ${item.enabled ? "text-white" : "text-slate-500"}`}>{def.label}</span>

                    {/* Reorder */}
                    <div className="flex flex-col">
                      <button
                        onClick={() => move(item.id, -1)}
                        disabled={idx === 0}
                        className="w-5 h-4 flex items-center justify-center text-slate-600 hover:text-slate-300 disabled:opacity-30 disabled:hover:text-slate-600 transition-colors"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => move(item.id, 1)}
                        disabled={idx === sorted.length - 1}
                        className="w-5 h-4 flex items-center justify-center text-slate-600 hover:text-slate-300 disabled:opacity-30 disabled:hover:text-slate-600 transition-colors"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => toggleEnabled(item.id)}
                      disabled={blockedFromEnabling}
                      title={blockedFromEnabling ? `Max ${MAX_ACTIVE_QUICK_ACTIONS} active items` : undefined}
                      className={`w-9 h-5 rounded-full relative shrink-0 transition-colors disabled:opacity-30 ${
                        item.enabled ? "bg-violet-500" : "bg-white/[0.12]"
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        item.enabled ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => remove(item.id)}
                      title="Remove shortcut"
                      className="w-6 h-6 rounded-md flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
              {sorted.length === 0 && (
                <p className="text-xs text-slate-600 text-center py-4">No shortcuts configured.</p>
              )}
            </div>

            <button
              onClick={restoreDefaults}
              className="self-start flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors mt-1"
            >
              <RotateCcw className="w-3 h-3" /> Restore defaults
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-white/[0.08] text-sm font-medium text-slate-400 hover:text-slate-300 hover:bg-white/[0.05] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 h-10 rounded-xl text-sm font-semibold text-white transition-all shadow-[0_0_20px_rgba(139,92,246,0.35)]"
            style={{ background: "linear-gradient(to right, #8B5CF6, #7C3AED)" }}
          >
            Save Quick Actions
          </button>
        </div>

      </div>
    </div>
  );
}
