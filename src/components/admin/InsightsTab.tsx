"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, AlertCircle, Users } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { WIDGET_ICON_MAP, WIDGET_LABEL_MAP } from "@/components/OnboardingFlow";
import WidgetIconTooltip from "./WidgetIconTooltip";

interface UserInsightRow {
  id:                   string;
  display_name:         string | null;
  intents:              string[];
  industries:           string[];
  custom_industry:      string | null;
  selected_widgets:     string[];
  created_at:           string;
  widget_activated_at:  Record<string, string>;
}

const INTENT_LABELS: Record<string, string> = {
  personal: "Personal Life",
  projects: "Projects",
};

export default function InsightsTab() {
  const [items,   setItems]   = useState<UserInsightRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase not configured — connect env vars to see live insights.");
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("user_insights")
      .select("*")
      .order("updated_at", { ascending: false });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setItems((data ?? []) as UserInsightRow[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center py-12 text-slate-600">
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
      <AlertCircle className="w-6 h-6 text-amber-500" />
      <p className="text-xs text-slate-500 leading-relaxed">{error}</p>
    </div>
  );

  if (items.length === 0) return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-600">
      <Users className="w-6 h-6 opacity-30" />
      <p className="text-xs">No onboarding records yet.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-slate-600">{items.length} user{items.length !== 1 ? "s" : ""} total</span>
        <button onClick={load} className="w-6 h-6 flex items-center justify-center text-slate-700 hover:text-slate-400 transition-colors">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
      {items.map(row => (
        <div key={row.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300">{row.display_name ?? "Anonymous"}</span>
            <div className="flex items-center gap-1">
              {row.intents.map(intent => (
                <span key={intent} className={`text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                  intent === "projects"
                    ? "bg-violet-500/20 text-violet-300"
                    : "bg-blue-500/20 text-blue-300"
                }`}>
                  {INTENT_LABELS[intent] ?? intent}
                </span>
              ))}
            </div>
          </div>

          {(row.industries.length > 0 || row.custom_industry) && (
            <div className="flex flex-wrap gap-1.5">
              {row.industries.map(ind => (
                <span key={ind} className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-500">
                  {ind}
                </span>
              ))}
              {row.custom_industry && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-500">
                  {row.custom_industry}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            {row.selected_widgets.map(id => {
              const Icon = WIDGET_ICON_MAP[id];
              if (!Icon) return null;

              // Activation defaults to the profile's created_at when a widget
              // predates per-widget tracking — never flags pre-existing widgets as new.
              const activatedAt = row.widget_activated_at?.[id] ?? row.created_at;
              const isNew = new Date(activatedAt).getTime() > new Date(row.created_at).getTime();

              return (
                <WidgetIconTooltip
                  key={id}
                  id={id}
                  Icon={Icon}
                  label={WIDGET_LABEL_MAP[id] ?? id}
                  activatedAt={activatedAt}
                  isNew={isNew}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
