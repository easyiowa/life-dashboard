"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Wrench, Send, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { WorkbenchUpdate } from "@/types/workbench";

const FOUNDER_EMAIL = "iowa.olaf@googlemail.com";

const FALLBACK_TITLE   = "Widget Marketplace is live 🛠️";
const FALLBACK_DATE    = "Jun 2026";
const FALLBACK_CONTENT = [
  "Big one today. Just shipped the full marketplace — 10 widgets, each with a 3-slide live preview so you actually know what you're turning on before it hits your grid. Took a while to get the carousel feeling right, but I think it's clean now.",
  "Also dropped Blueprint Mode under the Dashboard section in Settings — drag the blocks around to reorder your grid layout visually. Dashed slots show you where column space is open. Way more intuitive than editing a list.",
  "Oh, and the Security section now hides itself automatically if you signed in with Google. No more showing a password field to people who don't have one. Small thing, but it was bugging me.",
].join("\n\n");

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  isOpen:  boolean;
  onClose: () => void;
}

// ── Drawer ────────────────────────────────────────────────────────────────────

export default function WorkbenchBeacon({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const isFounder = user?.email === FOUNDER_EMAIL;

  const [note,    setNote]    = useState("");
  const [sent,    setSent]    = useState(false);
  const [sending, setSending] = useState(false);

  const [update,        setUpdate]        = useState<WorkbenchUpdate | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateFetched, setUpdateFetched] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchUpdate = useCallback(async () => {
    if (updateFetched || !isSupabaseConfigured || !supabase) return;
    setUpdateLoading(true);
    let query = supabase
      .from("workbench_updates")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);
    if (!isFounder) query = query.eq("status", "published");
    const { data } = await query;
    setUpdateLoading(false);
    setUpdateFetched(true);
    if (data && data.length > 0) setUpdate(data[0] as WorkbenchUpdate);
  }, [isFounder, updateFetched]);

  // Fetch on first open
  useEffect(() => {
    if (isOpen) void fetchUpdate();
  }, [isOpen, fetchUpdate]);

  // Focus textarea when drawer opens
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => textareaRef.current?.focus(), 310);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSend() {
    if (!note.trim()) return;
    setSending(true);
    if (isSupabaseConfigured && supabase) {
      const nickname =
        (user?.user_metadata?.display_name as string | undefined) ?? user?.email ?? null;
      await supabase.from("workbench_feedback").insert({ user_nickname: nickname, message: note.trim() });
    }
    console.log("[WorkbenchBeacon] Feedback submitted:", note.trim());
    setSending(false);
    setSent(true);
    setNote("");
    setTimeout(() => setSent(false), 4000);
  }

  const displayTitle   = update?.title   ?? FALLBACK_TITLE;
  const displayContent = update?.content ?? FALLBACK_CONTENT;
  const displayDate    = update ? formatDate(update.created_at) : FALLBACK_DATE;
  const isDraft        = update?.status === "draft";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Side drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-[#0B0F1C] border-l border-white/[0.07] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Wrench className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white leading-none">Olaf&apos;s Workbench</h2>
              <p className="text-[10px] text-slate-600 mt-0.5">Live builder notes · direct line</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-7">

          {/* The Latest Build */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">The Latest Build</span>
              <ChevronRight className="w-3 h-3 text-slate-700" />
              <span className="text-[10px] text-purple-400 font-medium">{displayDate}</span>
              {isDraft && isFounder && (
                <span className="ml-auto text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  draft preview
                </span>
              )}
            </div>

            {updateLoading ? (
              <div className="flex items-center justify-center py-8 text-slate-700">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : (
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-3">
                <p className="text-xs font-semibold text-white">{displayTitle}</p>
                {displayContent.split("\n\n").map((para, i) => (
                  <p key={i} className="text-xs text-slate-400 leading-relaxed">{para}</p>
                ))}
                <div className="h-px bg-white/[0.05]" />
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Next up: smarter onboarding, notification hooks, and probably a mobile nav pass. Stay tuned.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-slate-600">Building in public · last updated {displayDate}</span>
            </div>
          </section>

          {/* Feedback Forge */}
          <section className="flex flex-col gap-3">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Feedback Forge</span>

            {sent ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05]">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">Note sent straight to Olaf! 🙌</p>
                  <p className="text-xs text-slate-500 mt-1">I read everything. Seriously.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <textarea
                  ref={textareaRef}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleSend(); }}
                  placeholder="Missing something? Want a feature? Drop me a direct note..."
                  rows={5}
                  className="w-full resize-none rounded-xl bg-white/[0.04] border border-white/[0.07] px-3.5 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-purple-500/50 focus:bg-white/[0.06] transition-colors leading-relaxed"
                />
                <p className="text-[10px] text-slate-700 px-0.5">⌘ Return to send · I&apos;ll reply personally if you leave your email</p>
                <button
                  onClick={() => void handleSend()}
                  disabled={!note.trim() || sending}
                  className="h-10 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                  style={{ background: "linear-gradient(to right, #7C3AED, #6D28D9)" }}
                >
                  {sending
                    ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    : <><Send className="w-3.5 h-3.5" /> Send Note</>
                  }
                </button>
              </div>
            )}
          </section>

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] shrink-0">
          <p className="text-[10px] text-slate-700 text-center">Built with love in Helsinki · Olaf @ Life Dashboard</p>
        </div>
      </div>
    </>
  );
}

