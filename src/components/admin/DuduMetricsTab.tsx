"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface MetricRow {
  id:           string;
  user_id:      string | null;
  trigger_key:  string;
  action_taken: string;
  created_at:   string;
}

interface UserGroup {
  userId:  string;
  name:    string;
  metrics: MetricRow[];
}

function fmtTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

const ACTION_TONE: Record<string, string> = {
  clicked_delete_all:        "bg-violet-500/20 text-violet-300",
  clicked_rearrange:         "bg-emerald-500/20 text-emerald-300",
  dismissed_welcome:         "bg-white/[0.06] text-slate-400",
  dismissed_rearrange:       "bg-white/[0.06] text-slate-400",
  dismissed_sample_cleanup:  "bg-white/[0.06] text-slate-400",
};

export default function DuduMetricsTab() {
  const [groups,  setGroups]  = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase not configured — connect env vars to see live metrics.");
      return;
    }
    setLoading(true);
    setError(null);

    const [metricsRes, namesRes] = await Promise.all([
      supabase.from("assistant_metrics").select("*").order("created_at", { ascending: false }),
      supabase.from("user_insights").select("id, display_name"),
    ]);
    setLoading(false);
    if (metricsRes.error) { setError(metricsRes.error.message); return; }

    const nameById = new Map<string, string>();
    for (const row of namesRes.data ?? []) {
      if (row.display_name) nameById.set(row.id as string, row.display_name as string);
    }

    const byUser = new Map<string, MetricRow[]>();
    for (const row of (metricsRes.data ?? []) as MetricRow[]) {
      const key = row.user_id ?? "unknown";
      if (!byUser.has(key)) byUser.set(key, []);
      byUser.get(key)!.push(row);
    }

    const built: UserGroup[] = Array.from(byUser.entries()).map(([userId, metrics]) => ({
      userId,
      name: nameById.get(userId) ?? `User ${userId.slice(0, 8)}`,
      metrics,
    }));
    // Most recently active user first
    built.sort((a, b) => new Date(b.metrics[0].created_at).getTime() - new Date(a.metrics[0].created_at).getTime());
    setGroups(built);
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

  const totalEvents = groups.reduce((sum, g) => sum + g.metrics.length, 0);

  if (groups.length === 0) return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-600">
      <span className="text-2xl">🦦</span>
      <p className="text-xs">No Dudu interactions logged yet.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-slate-600">
          {totalEvents} event{totalEvents !== 1 ? "s" : ""} · {groups.length} user{groups.length !== 1 ? "s" : ""}
        </span>
        <button onClick={load} className="w-6 h-6 flex items-center justify-center text-slate-700 hover:text-slate-400 transition-colors">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {groups.map((group) => (
        <div key={group.userId} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300">{group.name}</span>
            <span className="text-[9px] text-slate-600">{group.metrics.length} event{group.metrics.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex flex-col gap-1">
            {group.metrics.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-white/[0.02]">
                <span className="text-[10px] text-slate-500 truncate">{m.trigger_key}</span>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${ACTION_TONE[m.action_taken] ?? "bg-white/[0.06] text-slate-400"}`}>
                  {m.action_taken}
                </span>
                <span className="text-[9px] text-slate-700 tabular-nums shrink-0">{fmtTimestamp(m.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
