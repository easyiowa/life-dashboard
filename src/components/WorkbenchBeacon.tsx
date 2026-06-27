"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Lightbulb, Send, CheckCircle2, ChevronRight, Loader2, Paperclip } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";
import { useAuth } from "@/context/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { WorkbenchUpdate } from "@/types/workbench";
import { useModalOverlay } from "@/hooks/useModalOverlay";

const FOUNDER_EMAIL = "iowa.olaf@googlemail.com";
const SCREENSHOT_BUCKET = "feedback-screenshots";

const FALLBACK_TITLE   = "Widget Marketplace is live 🛠️";
const FALLBACK_DATE    = "Jun 2026";
const FALLBACK_CONTENT = [
  "Big one today. Just shipped the full marketplace — 10 widgets, each with a 3-slide live preview so you actually know what you're turning on before it hits your grid. Took a while to get the carousel feeling right, but I think it's clean now.",
  "Also dropped Blueprint Mode under the Dashboard section in Settings — drag the blocks around to reorder your grid layout visually. Dashed slots show you where column space is open. Way more intuitive than editing a list.",
  "Oh, and the Security section now hides itself automatically if you signed in with Google. No more showing a password field to people who don't have one. Small thing, but it was bugging me.",
].join("\n\n");

// ── Image compression ─────────────────────────────────────────────────────────
// Converts any browser-decodable image to JPEG ≤ 200 KB.
// HEIC files that the browser can't decode fall through unchanged.

async function compressToJpeg(file: File, maxBytes = 200 * 1024): Promise<File> {
  return new Promise((resolve) => {
    const img = new globalThis.Image();
    const objUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const canvas = document.createElement("canvas");
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const MAX_DIM = 1920;
      if (w > MAX_DIM || h > MAX_DIM) {
        const r = Math.min(MAX_DIM / w, MAX_DIM / h);
        w = Math.round(w * r);
        h = Math.round(h * r);
      }
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);

      const baseName = file.name.replace(/\.[^.]+$/, ".jpg");
      canvas.toBlob((blob1) => {
        if (!blob1) { resolve(file); return; }
        if (blob1.size <= maxBytes) {
          resolve(new File([blob1], baseName, { type: "image/jpeg" }));
          return;
        }
        // Second pass at lower quality
        canvas.toBlob((blob2) => {
          resolve(new File([blob2 ?? blob1], baseName, { type: "image/jpeg" }));
        }, "image/jpeg", 0.45);
      }, "image/jpeg", 0.75);
    };

    // HEIC or any unsupported format — upload as-is without compression
    img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(file); };
    img.src = objUrl;
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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
  useModalOverlay(isOpen);

  const [note,      setNote]      = useState("");
  const [sent,      setSent]      = useState(false);
  const [sending,   setSending]   = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Screenshot attachment state
  const [screenshot,     setScreenshot]     = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  const [updates,       setUpdates]       = useState<WorkbenchUpdate[]>([]);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateFetched, setUpdateFetched] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUpdate = useCallback(async () => {
    if (updateFetched || !isSupabaseConfigured || !supabase) return;
    setUpdateLoading(true);
    let query = supabase
      .from("workbench_updates")
      .select("*")
      .order("created_at", { ascending: false });
    if (!isFounder) query = query.eq("status", "published");
    const { data } = await query;
    setUpdateLoading(false);
    setUpdateFetched(true);
    if (data) setUpdates(data as WorkbenchUpdate[]);
  }, [isFounder, updateFetched]);

  useEffect(() => {
    if (isOpen) void fetchUpdate();
  }, [isOpen, fetchUpdate]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => textareaRef.current?.focus(), 310);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Clean up preview object URL when component unmounts or screenshot changes
  useEffect(() => {
    return () => { if (screenshotPreview) URL.revokeObjectURL(screenshotPreview); };
  }, [screenshotPreview]);

  // ── Screenshot helpers ──────────────────────────────────────────────────────

  async function attachImage(file: File) {
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    const compressed = await compressToJpeg(file);
    setScreenshot(compressed);
    setScreenshotPreview(URL.createObjectURL(compressed));
  }

  function removeScreenshot() {
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void attachImage(file);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData.files);
    const imgFile = files.find(
      (f) => f.type.startsWith("image/") || f.name.toLowerCase().endsWith(".heic")
    );
    if (imgFile) {
      e.preventDefault();
      void attachImage(imgFile);
    }
  }

  // ── Send ────────────────────────────────────────────────────────────────────

  async function handleSend() {
    if (!note.trim()) return;
    setSending(true);

    let screenshotUrl: string | null = null;

    if (screenshot && isSupabaseConfigured && supabase) {
      const nameParts = screenshot.name.split(".");
      const ext = nameParts[nameParts.length - 1] ?? "jpg";
      const path = `${user?.id ?? "anon"}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from(SCREENSHOT_BUCKET)
        .upload(path, screenshot, {
          contentType: screenshot.type || "image/jpeg",
          upsert: false,
        });

      if (!uploadErr) {
        screenshotUrl = supabase.storage
          .from(SCREENSHOT_BUCKET)
          .getPublicUrl(path).data.publicUrl;
      } else {
        console.warn("[WorkbenchBeacon] Screenshot upload failed:", uploadErr.message);
      }
    }

    console.log("=== FEEDBACK DEBUG ===", {
      hasFile: !!screenshot,
      screenshotUrlRaw: screenshotUrl,
      typeOfUrl: typeof screenshotUrl,
    });

    if (isSupabaseConfigured && supabase) {
      const nickname =
        (user?.user_metadata?.display_name as string | undefined) ?? user?.email ?? null;
      const { error: insertErr } = await supabase.from("workbench_feedback").insert({
        user_nickname:  nickname,
        message:        note.trim(),
        screenshot_url: screenshotUrl,
      });
      if (insertErr) {
        console.error("[WorkbenchBeacon] Insert failed:", insertErr.message);
        setSending(false);
        setSendError("Couldn't send — please try again.");
        setTimeout(() => setSendError(null), 5000);
        return;
      }
    }

    console.log("[WorkbenchBeacon] Feedback submitted:", note.trim(), { screenshotUrl });
    setSending(false);
    setSent(true);
    setNote("");
    removeScreenshot();
    setTimeout(() => setSent(false), 4000);
  }

  const hasUpdates = updates.length > 0;
  const latestDate = hasUpdates ? formatDate(updates[0].created_at) : FALLBACK_DATE;

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
              <Lightbulb className="w-3.5 h-3.5 text-purple-400" />
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

        {/* Builder Log — grows to fill all available space with its own scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-5 pb-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Builder Log</span>
            <ChevronRight className="w-3 h-3 text-slate-700" />
            <span className="text-[10px] text-purple-400 font-medium">{latestDate}</span>
          </div>

          {updateLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-700">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {hasUpdates
                ? updates.filter(item => item.status === "published" || isFounder).map((update) => (
                    <div key={update.id} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-white">{update.title}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {update.status === "draft" && isFounder && (
                            <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                              draft
                            </span>
                          )}
                          <span className="text-[10px] text-slate-600 whitespace-nowrap">{formatDate(update.created_at)}</span>
                        </div>
                      </div>
                      {update.content.split("\n\n").map((para, i) => (
                        <p key={i} className="text-xs text-slate-400 leading-relaxed">{para}</p>
                      ))}
                    </div>
                  ))
                : (
                    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-3">
                      <p className="text-xs font-semibold text-white">{FALLBACK_TITLE}</p>
                      {FALLBACK_CONTENT.split("\n\n").map((para, i) => (
                        <p key={i} className="text-xs text-slate-400 leading-relaxed">{para}</p>
                      ))}
                    </div>
                  )
              }
            </div>
          )}
        </div>

        {/* Feedback — pinned above footer, never scrolls away */}
        <div className="shrink-0 border-t border-white/[0.06] px-5 pt-4 pb-4">
          <section className="flex flex-col gap-3">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Feedback</span>

            {sent ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05]">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">Note sent straight to Olaf! 🙌</p>
                  <p className="text-xs text-slate-500 mt-1">I read everything. Seriously.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.heic,image/png,image/jpeg,image/webp,image/heic"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Auto-expanding textarea */}
                <TextareaAutosize
                  ref={textareaRef}
                  value={note}
                  minRows={2}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleSend(); }}
                  onPaste={handlePaste}
                  placeholder="Missing something? Want a feature? Drop me a direct note..."
                  className="w-full resize-none rounded-xl bg-white/[0.04] border border-white/[0.07] px-3.5 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-purple-500/50 focus:bg-white/[0.06] transition-colors leading-relaxed"
                />

                {/* Screenshot preview */}
                {screenshotPreview && (
                  <div className="relative w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={screenshotPreview}
                      alt="Screenshot preview"
                      className="h-16 w-auto max-w-[120px] rounded-lg object-cover border border-white/[0.10]"
                    />
                    <button
                      type="button"
                      onClick={removeScreenshot}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-800 border border-white/[0.15] flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}

                <p className="text-[10px] text-slate-700 px-0.5">
                  Find a problem? Attach a screenshot. I&apos;ll reply personally if you leave your email.
                </p>

                {/* Action row */}
                <div className="flex items-center gap-2">
                  {/* Attach button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach screenshot"
                    className={`h-10 w-10 rounded-xl border flex items-center justify-center flex-shrink-0 transition-all ${
                      screenshot
                        ? "border-purple-500/50 bg-purple-500/15 text-purple-400"
                        : "border-white/[0.07] bg-white/[0.03] text-slate-500 hover:text-slate-300 hover:border-white/[0.15]"
                    }`}
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Send button */}
                  <button
                    onClick={() => void handleSend()}
                    disabled={!note.trim() || sending}
                    className="flex-1 h-10 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                    style={{ background: "linear-gradient(to right, #7C3AED, #6D28D9)" }}
                  >
                    {sending
                      ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      : <><Send className="w-3.5 h-3.5" /> Send Note</>
                    }
                  </button>
                </div>
                {sendError && (
                  <p className="text-[11px] text-rose-400 text-center mt-1">{sendError}</p>
                )}
              </div>
            )}
          </section>

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] shrink-0">
          <p className="text-[10px] text-slate-700 text-center">Built with love in Tallinn · Olaf @ Life Dashboard</p>
        </div>
      </div>
    </>
  );
}
