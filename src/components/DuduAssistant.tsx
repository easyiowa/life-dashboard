"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { usePWAInstaller } from "@/hooks/usePWAInstaller";
import { supabase } from "@/lib/supabase";

// ── Dudu the otter — ambient onboarding assistant ───────────────────────────
//
// Three independent triggers, each fires at most once per account (persisted
// via user_dashboard_state.dismissed_assistant_triggers) except the sample-cleanup
// catch, which is event-driven off DashboardContext's sampleDeleteCount.
//
// IMPORTANT: the typed message body must stay strictly alphanumeric — no raw
// emoji characters inside TYPEWRITER_MESSAGES. The 🦦 lives only on the floating
// trigger button itself.

const TYPE_SPEED_MS = 25;

interface DuduButton {
  label: string;
  onClick: () => void;
}

interface DuduMessage {
  triggerKey: string;
  text: string;
  buttons: DuduButton[];
}

interface Props {
  /** Launches Blueprint Mode directly — wired from page.tsx down through DashboardHeader/SettingsModal. */
  onOpenBlueprint?: () => void;
}

const BUBBLE_CLOSE_MS = 200; // matches dudu-fade-slide-out's duration in globals.css

export default function DuduAssistant({ onOpenBlueprint }: Props) {
  const { user } = useAuth();
  const { sampleDeleteCount, deleteAllSampleData, hasDraggedOnce } = useDashboard();
  const { pwaPromptReady, clearPwaPrompt, dismissPwaPrompt, openInstallModal } = usePWAInstaller();

  const userId = user?.id;
  const displayName = (user?.user_metadata?.display_name as string | undefined)?.trim() || "there";

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [dismissedLoaded, setDismissedLoaded] = useState(false);
  const [message, setMessage] = useState<DuduMessage | null>(null);
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [bubbleClosing, setBubbleClosing] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const sampleTriggerFiredRef = useRef(false);
  const rearrangeTipShownRef = useRef(false);

  const [windowClickCount, setWindowClickCount] = useState(0);

  // ── Load dismissed-trigger history once, on mount ──────────────────────────
  useEffect(() => {
    if (!supabase || !userId) { setDismissedLoaded(true); return; }
    supabase
      .from("user_dashboard_state")
      .select("dismissed_assistant_triggers")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setDismissed(new Set((data?.dismissed_assistant_triggers as string[] | null) ?? []));
        setDismissedLoaded(true);
      });
  }, [userId]);

  const logMetric = useCallback((triggerKey: string, actionTaken: string) => {
    if (!supabase || !userId) return;
    supabase
      .from("assistant_metrics")
      .insert({ user_id: userId, trigger_key: triggerKey, action_taken: actionTaken })
      .then(() => {});
  }, [userId]);

  const persistDismissal = useCallback((triggerKey: string) => {
    setDismissed((prev) => {
      if (prev.has(triggerKey)) return prev;
      const next = new Set(prev);
      next.add(triggerKey);
      if (supabase && userId) {
        supabase
          .from("user_dashboard_state")
          .update({ dismissed_assistant_triggers: [...next] })
          .eq("user_id", userId)
          .then(() => {});
      }
      return next;
    });
  }, [userId]);

  function showMessage(msg: DuduMessage) {
    setMessage(msg);
    setBubbleOpen(true);
    setBubbleClosing(false);
  }

  // Plays the slide-out animation before actually unmounting the bubble, instead
  // of just yanking it off-screen instantly.
  function closeBubble() {
    setBubbleClosing(true);
    setTimeout(() => {
      setBubbleOpen(false);
      setBubbleClosing(false);
    }, BUBBLE_CLOSE_MS);
  }

  // Closes the bubble and records why — `actionTaken` is the metric written to
  // assistant_metrics (e.g. "dismissed_welcome", "clicked_rearrange").
  function resolveTrigger(triggerKey: string, actionTaken: string) {
    logMetric(triggerKey, actionTaken);
    persistDismissal(triggerKey);
    closeBubble();
  }

  // ── Typewriter effect — plain character-array reveal, no emoji ever enters this path ──
  useEffect(() => {
    if (!message) return;
    setTypedText("");
    setIsTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTypedText(message.text.slice(0, i));
      if (i >= message.text.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, TYPE_SPEED_MS);
    return () => clearInterval(interval);
  }, [message]);

  // ── Trigger 1: Welcome — fires on the user's very first click anywhere ───────
  useEffect(() => {
    if (!dismissedLoaded || dismissed.has("welcome_msg")) return;
    const handler = () => {
      showMessage({
        triggerKey: "welcome_msg",
        text: `Hi ${displayName}, I'm Dudu, your otter friend! I’ll pop up with helpful tips from time to time. Look around!`,
        buttons: [
          { label: "Nice to meet you!", onClick: () => resolveTrigger("welcome_msg", "dismissed_welcome") },
        ],
      });
    };
    // { once: true } auto-removes the listener after the first invocation
    window.addEventListener("click", handler, { once: true });
    return () => window.removeEventListener("click", handler);
  }, [dismissedLoaded, dismissed, displayName]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Trigger 2: Rearrange tip ──────────────────────────────────────────────────
  // Two independent paths converge on the same message, guarded so it only ever
  // shows once: a 45s idle backup timer, and immediate interception the instant
  // the user starts their first widget drag (DashboardGrid -> notifyDragStart).
  const showRearrangeTip = useCallback(() => {
    if (rearrangeTipShownRef.current || dismissed.has("rearrange_tip")) return;
    rearrangeTipShownRef.current = true;
    showMessage({
      triggerKey: "rearrange_tip",
      text: "Here's my first tip! You can reposition widgets any way you like.",
      buttons: [
        {
          label: "Rearrange Widgets",
          onClick: () => {
            resolveTrigger("rearrange_tip", "clicked_rearrange");
            onOpenBlueprint?.();
          },
        },
        { label: "Thx, later", onClick: () => resolveTrigger("rearrange_tip", "dismissed_rearrange") },
      ],
    });
  }, [dismissed]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2a — click-counter path: accumulate every window click, fire at exactly 3
  useEffect(() => {
    if (!dismissedLoaded || dismissed.has("rearrange_tip")) return;
    const handler = () => setWindowClickCount(c => c + 1);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [dismissedLoaded, dismissed]);

  useEffect(() => {
    if (windowClickCount !== 3) return;
    showRearrangeTip();
  }, [windowClickCount, showRearrangeTip]);

  // 2b — drag path: fires the instant the first widget drag is detected
  useEffect(() => {
    if (!dismissedLoaded || !hasDraggedOnce) return;
    showRearrangeTip();
  }, [dismissedLoaded, hasDraggedOnce, showRearrangeTip]);

  // ── Trigger 3: Sample cleanup catch — fires on any deletion (count > 0) ────
  useEffect(() => {
    if (sampleDeleteCount === 0 || sampleTriggerFiredRef.current) return;
    sampleTriggerFiredRef.current = true;
    showMessage({
      triggerKey: "sample_cleanup",
      text: "I noticed you’re clearing things out. Want me to delete all samples in one click?",
      buttons: [
        {
          label: "Delete all samples",
          onClick: () => {
            logMetric("sample_cleanup", "clicked_delete_all");
            closeBubble();
            void deleteAllSampleData();
          },
        },
        { label: "No, thx!", onClick: () => { logMetric("sample_cleanup", "dismissed_sample_cleanup"); closeBubble(); } },
      ],
    });
  }, [sampleDeleteCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Trigger 4: PWA install nudge — fires when the interaction milestone is reached ──
  // Dismissed via localStorage only (not Supabase) — no persistDismissal call.
  useEffect(() => {
    if (!pwaPromptReady || bubbleOpen) return;
    showMessage({
      triggerKey: "pwa_install",
      text: "Btw, you don't have to keep using your browser. Here is a faster way.",
      buttons: [
        {
          label: "Add to Home Screen",
          onClick: () => {
            logMetric("pwa_install", "clicked_install");
            clearPwaPrompt();
            closeBubble();
            openInstallModal();
          },
        },
        {
          label: "Maybe later",
          onClick: () => {
            logMetric("pwa_install", "dismissed_pwa");
            dismissPwaPrompt();
            closeBubble();
          },
        },
      ],
    });
  }, [pwaPromptReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Collapse the entire component (avatar + bubble) once every one-shot
  // trigger has been dismissed and no bubble is currently active.
  // welcome_msg / rearrange_tip both call persistDismissal so they enter
  // `dismissed`; sample_cleanup does not, but its bubble keeps bubbleOpen
  // true while it's on screen, so the guard is never evaluated mid-display.
  const hasAnythingToShow =
    bubbleOpen ||
    bubbleClosing ||
    !dismissedLoaded ||
    !dismissed.has("welcome_msg") ||
    !dismissed.has("rearrange_tip") ||
    pwaPromptReady;

  if (!hasAnythingToShow) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-2">
      {bubbleOpen && message && (
        <div className={`w-72 max-w-[calc(100vw-3rem)] rounded-2xl border border-white/[0.10] bg-[#0d1426]/90 backdrop-blur-xl shadow-2xl p-4 flex flex-col gap-3 ${
          bubbleClosing ? "animate-dudu-fade-slide-out" : "animate-dudu-fade-slide-in"
        }`}>
          <p className="text-sm text-slate-200 leading-relaxed min-h-[2.5rem]">
            {typedText}
            {isTyping && <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-violet-400 animate-pulse align-middle" />}
          </p>
          {!isTyping && message.buttons.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {message.buttons.map((b, i) => (
                <button
                  key={b.label}
                  onClick={b.onClick}
                  className={`h-9 rounded-lg text-xs font-medium transition-all ${
                    i === 0
                      ? "bg-violet-600 hover:bg-violet-500 text-white"
                      : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.07]"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => (bubbleOpen ? closeBubble() : setBubbleOpen(true))}
        title="Dudu"
        aria-label="Dudu, your assistant"
        className="w-11 h-11 rounded-full bg-[#0d1426]/90 backdrop-blur-xl border border-white/[0.10] shadow-2xl flex items-center justify-center text-2xl leading-none transition-transform duration-200 hover:scale-110"
      >
        🦦
      </button>
    </div>
  );
}
