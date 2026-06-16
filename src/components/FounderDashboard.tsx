"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X, Crown, MessageSquare, FileText, CheckCircle2,
  Loader2, Plus, Send, RefreshCw, AlertCircle, Trash2,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { WorkbenchFeedback, WorkbenchUpdate } from "@/types/workbench";

// ── Helpers ───────────────────────────────────────────────────────────────────

function reltime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

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

// ── Tab: Feedback ─────────────────────────────────────────────────────────────

function FeedbackTab() {
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
          console.warn("[FounderDashboard] Storage cleanup failed:", storageErr.message);
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

// ── Tab: Draft Updates ────────────────────────────────────────────────────────

function UpdatesTab() {
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

// ── Main modal ────────────────────────────────────────────────────────────────

type Tab = "feedback" | "updates";

interface Props {
  isOpen:  boolean;
  onClose: () => void;
}

export default function FounderDashboard({ isOpen, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("feedback");

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#0B0F1C] border border-purple-500/20 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Crown className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white leading-none">Founder Dashboard</h2>
              <p className="text-[10px] text-slate-600 mt-0.5">private · olaf only</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab strip */}
        <div className="flex gap-1 px-5 pt-3 pb-0 shrink-0">
          {([
            { id: "feedback" as Tab, label: "Feedback", Icon: MessageSquare },
            { id: "updates"  as Tab, label: "Draft Updates", Icon: FileText  },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium transition-all border-b-2 ${
                tab === t.id
                  ? "text-purple-300 border-purple-500 bg-purple-500/[0.08]"
                  : "text-slate-500 border-transparent hover:text-slate-300"
              }`}
            >
              <t.Icon className="w-3 h-3" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="h-px bg-white/[0.06] mx-5 shrink-0" />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {tab === "feedback" ? <FeedbackTab /> : <UpdatesTab />}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.05] shrink-0 flex items-center gap-2">
          <Plus className="w-3 h-3 text-slate-700" />
          <p className="text-[10px] text-slate-700">
            {tab === "feedback"
              ? "Feedback arrives here from the beacon drawer on every user session."
              : "Only published updates appear in user drawer · drafts visible to founder only."}
          </p>
        </div>
      </div>
    </div>
  );
}
