"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, CheckCircle2, Loader2, Send, RefreshCw } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { WorkbenchUpdate } from "@/types/workbench";
import { reltime } from "./utils";

function StatusBadge({ status }: { status: "draft" | "published" }) {
  return (
    <span className={`text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
      status === "published"
        ? "bg-emerald-500/20 text-emerald-300"
        : "bg-amber-500/20 text-amber-300"
    }`}>
      {status}
    </span>
  );
}

export default function UpdatesTab() {
  const [items,   setItems]   = useState<WorkbenchUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  // New-update form state
  const [title,   setTitle]   = useState("");
  const [content, setContent] = useState("");
  const [status,  setStatus]  = useState<"draft" | "published">("draft");

  // Edit mode: null = composing new, string = editing existing id
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase not configured — connect env vars to manage updates.");
      return;
    }
    setLoading(true);
    setError(null);
    // Founder reads all statuses (RLS bypassed in future via service-role)
    const { data, error: err } = await supabase
      .from("workbench_updates")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setItems((data ?? []) as WorkbenchUpdate[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function startEdit(item: WorkbenchUpdate) {
    setEditId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setStatus(item.status);
  }

  function cancelEdit() {
    setEditId(null);
    setTitle("");
    setContent("");
    setStatus("draft");
  }

  async function handleSave() {
    if (!title.trim() || !content.trim() || !supabase) return;
    setSaving(true);
    setError(null);

    if (editId) {
      const { error: err } = await supabase
        .from("workbench_updates")
        .update({ title: title.trim(), content: content.trim(), status })
        .eq("id", editId);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase
        .from("workbench_updates")
        .insert({ title: title.trim(), content: content.trim(), status });
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    setSaved(true);
    cancelEdit();
    void load();
    setTimeout(() => setSaved(false), 3000);
  }

  async function toggleStatus(item: WorkbenchUpdate) {
    if (!supabase) return;
    const next: "draft" | "published" = item.status === "published" ? "draft" : "published";
    const { error: err } = await supabase
      .from("workbench_updates")
      .update({ status: next })
      .eq("id", item.id);
    if (!err) {
      setItems(prev => prev.map(u => u.id === item.id ? { ...u, status: next } : u));
    }
  }

  async function deleteUpdate(id: string) {
    if (!supabase) return;
    const { error: err } = await supabase
      .from("workbench_updates")
      .delete()
      .eq("id", id);
    if (err) {
      setError(`Delete failed: ${err.message}`);
      return;
    }
    setItems(prev => prev.filter(u => u.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Composer / editor */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            {editId ? "Editing Update" : "New Update"}
          </span>
          {saved && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> Saved
            </span>
          )}
        </div>

        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Update title..."
          className="h-9 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder:text-slate-600 outline-none focus:border-purple-500/50 transition-colors"
        />

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write your update in founder voice — casual, confident, specific..."
          rows={5}
          className="resize-none rounded-xl bg-white/[0.04] border border-white/[0.07] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-purple-500/50 transition-colors leading-relaxed"
        />

        <div className="flex items-center gap-3">
          {/* Status toggle */}
          <button
            onClick={() => setStatus(s => s === "draft" ? "published" : "draft")}
            className={`h-8 px-3 rounded-xl border text-xs font-semibold transition-all ${
              status === "published"
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : "bg-amber-500/15 border-amber-500/30 text-amber-300"
            }`}
          >
            {status === "published" ? "● Published" : "○ Draft"}
          </button>

          <div className="flex-1" />

          {editId && (
            <button onClick={cancelEdit} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Cancel
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={!title.trim() || !content.trim() || saving || !isSupabaseConfigured}
            className="h-8 px-4 rounded-xl text-xs font-semibold text-white disabled:opacity-40 transition-all flex items-center gap-1.5"
            style={{ background: "linear-gradient(to right, #7C3AED, #6D28D9)" }}
          >
            {saving
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <><Send className="w-3 h-3" />{editId ? "Update" : "Post"}</>
            }
          </button>
        </div>

        {!isSupabaseConfigured && (
          <p className="text-[10px] text-slate-600">Supabase not configured — saving disabled in local mode.</p>
        )}
        {error && <p className="text-[10px] text-red-400">{error}</p>}
      </div>

      {/* Existing updates list */}
      {loading ? (
        <div className="flex items-center justify-center py-6 text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-slate-600 text-center">
          <FileText className="w-5 h-5 opacity-30" />
          <p className="text-xs">No updates yet. Write your first one above.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-600">{items.length} update{items.length !== 1 ? "s" : ""}</span>
            <button onClick={load} className="w-6 h-6 flex items-center justify-center text-slate-700 hover:text-slate-400 transition-colors">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
          {items.map(item => (
            <div key={item.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 flex flex-col gap-1.5">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                  <p className="text-[9px] text-slate-700 mt-0.5">{reltime(item.created_at)}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{item.content}</p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => startEdit(item)}
                  className="text-[10px] text-slate-600 hover:text-slate-300 transition-colors"
                >
                  Edit
                </button>
                <span className="text-slate-800">·</span>
                <button
                  onClick={() => toggleStatus(item)}
                  className={`text-[10px] transition-colors ${
                    item.status === "published"
                      ? "text-amber-600 hover:text-amber-400"
                      : "text-emerald-700 hover:text-emerald-400"
                  }`}
                >
                  {item.status === "published" ? "Unpublish" : "Publish"}
                </button>
                <span className="text-slate-800">·</span>
                <button
                  onClick={async () => {
                    if (!window.confirm("Are you sure you want to permanently delete this update?")) return;
                    await deleteUpdate(item.id);
                  }}
                  className="text-[10px] text-red-500 hover:text-red-400 cursor-pointer transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
