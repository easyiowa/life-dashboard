import type { User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// ── Quick Actions config ──────────────────────────────────────────────────────
// Mirrors the widget_layout pattern in DashboardGrid.tsx / SettingsModal.tsx:
// Supabase user metadata (cross-device) takes priority, falling back to
// localStorage, with a CustomEvent broadcast so open tabs stay in sync.

export interface QuickActionConfigItem {
  id:      string;
  enabled: boolean;
  order:   number;
}

export interface QuickActionDef {
  id:    string;
  label: string;
}

export const QUICK_ACTION_REGISTRY: Record<string, QuickActionDef> = {
  "add-task":   { id: "add-task",   label: "Add New Task" },
  "add-note":   { id: "add-note",   label: "Add a Quick Note" },
  "widget-nav": { id: "widget-nav", label: "Widget Navigation" },
};

export const MAX_ACTIVE_QUICK_ACTIONS = 5;

export const DEFAULT_QUICK_ACTIONS_CONFIG: QuickActionConfigItem[] = [
  { id: "add-task",   enabled: true, order: 0 },
  { id: "add-note",   enabled: true, order: 1 },
  { id: "widget-nav", enabled: true, order: 2 },
];

const STORAGE_KEY = "ld_quick_actions_config";
const EVENT_NAME  = "ld:quick-actions-config";

function sanitize(raw: unknown): QuickActionConfigItem[] {
  if (!Array.isArray(raw)) return DEFAULT_QUICK_ACTIONS_CONFIG;
  const valid = raw.filter(
    (item): item is QuickActionConfigItem =>
      !!item && typeof item === "object" &&
      typeof (item as QuickActionConfigItem).id === "string" &&
      (item as QuickActionConfigItem).id in QUICK_ACTION_REGISTRY &&
      typeof (item as QuickActionConfigItem).enabled === "boolean" &&
      typeof (item as QuickActionConfigItem).order === "number"
  );
  return valid.length > 0 ? valid.sort((a, b) => a.order - b.order) : DEFAULT_QUICK_ACTIONS_CONFIG;
}

export function loadQuickActionsConfig(user?: User | null): QuickActionConfigItem[] {
  const fromMeta = user?.user_metadata?.quick_actions_config as unknown;
  const fromStorage = (() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null"); }
    catch { return null; }
  })();
  return sanitize(fromMeta ?? fromStorage);
}

export function persistQuickActionsConfig(config: QuickActionConfigItem[], user?: User | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent<QuickActionConfigItem[]>(EVENT_NAME, { detail: config }));
  if (isSupabaseConfigured && supabase && user) {
    supabase.auth.updateUser({ data: { quick_actions_config: config } }).catch(console.error);
  }
}

export function onQuickActionsConfigChanged(handler: (config: QuickActionConfigItem[]) => void) {
  function listener(e: Event) {
    const detail = (e as CustomEvent<QuickActionConfigItem[]>).detail;
    if (Array.isArray(detail)) handler(detail);
  }
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
