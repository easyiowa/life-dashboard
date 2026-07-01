"use client";

import { useState, useEffect, useCallback } from "react";
import { Archive, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { WorkbenchFeedbackArchive } from "@/types/workbench";
import { reltime } from "./utils";

export default function ArchiveTab() {
  const [items,   setItems]   = useState<WorkbenchFeedbackArchive[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase not configured.");
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("workbench_feedback_archive")
      .select("*")
      .order("archived_at", { ascending: false });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setItems((data ?? []) as WorkbenchFeedbackArchive[]);
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
      <Archive className="w-6 h-6 opacity-30" />
      <p className="text-xs">No resolved feedback yet. Items appear here once you resolve them from the Feedback tab.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-slate-600">
          {items.length} resolved note{items.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={load}
          className="w-6 h-6 flex items-center justify-center text-slate-700 hover:text-slate-400 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3.5 flex flex-col gap-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[11px] font-semibold text-slate-400 truncate">
                {item.user_nickname ?? "Anonymous"}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {item.original_created_at && (
                  <span className="text-[9px] text-slate-700">
                    sent {reltime(item.original_created_at)}
                  </span>
                )}
                <span className="text-[9px] text-emerald-800">
                  · resolved {reltime(item.archived_at)}
                </span>
              </div>
            </div>
            <span className="shrink-0 mt-0.5 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700">
              resolved
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">{item.message}</p>
        </div>
      ))}
    </div>
  );
}
