import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type ActivationMap = Record<string, string>;

// Merges newly-selected widget ids into the user's activation map, preserving
// existing timestamps and stamping only ids that aren't tracked yet. Used
// whenever the active widget set changes after onboarding (e.g. Settings →
// Active Widgets), so the "newly added" indicator in User Insights stays accurate.
export async function syncWidgetActivation(userId: string, widgetIds: string[]) {
  if (!isSupabaseConfigured || !supabase) return;

  const { data: existing, error: readErr } = await supabase
    .from("user_insights")
    .select("widget_activated_at")
    .eq("id", userId)
    .maybeSingle();
  if (readErr) { console.warn("[widgetActivation] read failed:", readErr.message); return; }

  const prevMap = (existing?.widget_activated_at ?? {}) as ActivationMap;
  const now     = new Date().toISOString();
  const nextMap: ActivationMap = {};
  for (const id of widgetIds) nextMap[id] = prevMap[id] ?? now;

  const { error: writeErr } = await supabase
    .from("user_insights")
    .upsert({
      id:                  userId,
      selected_widgets:    widgetIds,
      widget_activated_at: nextMap,
    });
  if (writeErr) console.warn("[widgetActivation] sync failed:", writeErr.message);
}
