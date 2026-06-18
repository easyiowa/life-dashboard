"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, CheckCircle2, Loader2, RefreshCw, AlertCircle, Trash2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { WorkbenchFeedback } from "@/types/workbench";
import { reltime } from "./utils";

const SCREENSHOT_BUCKET = "feedback-screenshots";

// Extracts the storage object path from a public Supabase storage URL.
function extractStoragePath(url: string): string | null {
  try {
    const marker = `/object/public/${SCREENSHOT_BUCKET}/`;
    const idx = url.indexOf(marker);
    return idx === -1 ? null : url.slice(idx + marker.length);
  } catch {
    return null;
  }
}

export default function FeedbackTab() {
  const [items,    setItems]    = useState<WorkbenchFeedback[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase not configured — connect env vars to see real feedback.");
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("workbench_feedback")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setItems((data ?? []) as WorkbenchFeedback[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Option A: resolve = delete row + delete screenshot from storage
  async function resolveAndDelete(item: WorkbenchFeedback) {
    if (!supabase) return;
    if (!window.confirm("Resolve & permanently delete this feedback entry?")) return;

    setDeleting(item.id);

    // 1. Delete the DB row
    const { error: dbErr } = await supabase
      .from("workbench_feedback")
      .delete()
      .eq("id", item.id);

    if (dbErr) {
      setError(`Failed to delete: ${dbErr.message}`);
      setDeleting(null);
      return;
    }

    // 2. Delete the screenshot from storage (best-effort — non-fatal)
    if (item.screenshot_url) {
      const path = extractStoragePath(item.screenshot_url);
      if (path) {
        const { error: storageErr } = await supabase.storage
          .from(SCREENSHOT_BUCKET)
          .remove([path]);
        if (storageErr) {
          console.warn("[FeedbackTab] Storage cleanup failed:", storageErr.message);
        }
      }
    }

    setItems((prev) => prev.filter((f) => f.id !== item.id));
    setDeleting(null);
  }

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
      <MessageSquare className="w-6 h-6 opacity-30" />
      <p className="text-xs">No feedback yet. The drawer is live — notes will show up here.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-slate-600">{items.length} note{items.length !== 1 ? "s" : ""} total</span>
        <button onClick={load} className="w-6 h-6 flex items-center justify-center text-slate-700 hover:text-slate-400 transition-colors">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
      {items.map(item => (
        <div key={item.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[11px] font-semibold text-slate-300 truncate">
                {item.user_nickname ?? "Anonymous"}
              </span>
              <span className="text-[9px] text-slate-700">{reltime(item.created_at)}</span>
            </div>
            <button
              onClick={() => void resolveAndDelete(item)}
              disabled={deleting === item.id}
              className="shrink-0 mt-0.5 text-slate-700 hover:text-emerald-400 transition-colors disabled:opacity-40"
              title="Resolve & delete"
            >
              {deleting === item.id
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <CheckCircle2 className="w-4 h-4" />
              }
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{item.message}</p>

          {/* Screenshot thumbnail */}
          {item.screenshot_url && (
            <a
              href={item.screenshot_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 group relative w-fit"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.screenshot_url}
                alt="Attached screenshot"
                className="h-20 w-auto max-w-[160px] rounded-lg object-cover border border-white/[0.10] group-hover:border-purple-500/40 transition-colors"
              />
              <span className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-white font-medium transition-opacity">Open ↗</span>
              </span>
            </a>
          )}

          {/* Destructive resolve action */}
          <div className="flex items-center gap-1 pt-0.5">
            <button
              onClick={() => void resolveAndDelete(item)}
              disabled={deleting === item.id}
              className="flex items-center gap-1 text-[10px] text-slate-700 hover:text-rose-400 transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-2.5 h-2.5" />
              Resolve &amp; Delete
            </button>
            {item.screenshot_url && (
              <span className="text-[9px] text-slate-700 ml-1">(+ screenshot)</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
