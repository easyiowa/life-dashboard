"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import PWAInstallModal from "@/components/PWAInstallModal";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Platform = "ios-safari" | "android" | "unknown";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface PWAInstallerContextValue {
  platform: Platform;
  isStandalone: boolean;
  isPWAInstalled: boolean;
  openInstallModal: () => void;
  incrementInteractions: () => void;
  triggerAndroidInstall: () => Promise<void>;
  pwaPromptReady: boolean;
  clearPwaPrompt: () => void;
  dismissPwaPrompt: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY       = "callitaday_interaction_milestone";
const DISMISSED_KEY     = "callitaday_pwa_dismissed";
const INSTALL_THRESHOLD = 20;

// ── Detectors ─────────────────────────────────────────────────────────────────

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent;
  const isIOS = /iP(hone|ad|od)/i.test(ua);
  // Pure Safari on iOS — no Chromium overlay (CriOS = Chrome, FxiOS = Firefox, Arc)
  if (isIOS && !/CriOS\/|FxiOS\/|Arc\//i.test(ua)) return "ios-safari";
  // Android and all iOS Chromium-based browsers use the same install flow
  if (isIOS || /Android/i.test(ua)) return "android";
  return "unknown";
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// ── Context ───────────────────────────────────────────────────────────────────

export const PWAInstallerContext = createContext<PWAInstallerContextValue | null>(null);

export function usePWAInstallerContext(): PWAInstallerContextValue {
  const ctx = useContext(PWAInstallerContext);
  if (!ctx) throw new Error("usePWAInstaller must be used inside <PWAInstallerProvider>");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function PWAInstallerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [platform, setPlatform]             = useState<Platform>("unknown");
  const [isStandalone, setIsStandalone]     = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [modalOpen, setModalOpen]           = useState(false);
  const [pwaPromptReady, setPwaPromptReady] = useState(false);
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const plat       = detectPlatform();
    const standalone = isStandaloneMode();
    setPlatform(plat);
    setIsStandalone(standalone);

    if (standalone && supabase && user?.id) {
      supabase
        .from("profiles")
        .update({ is_pwa_installed: true })
        .eq("user_id", user.id)
        .then(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Supabase: check existing installed flag ────────────────────────────────

  useEffect(() => {
    if (!supabase || !user?.id) return;
    supabase
      .from("profiles")
      .select("is_pwa_installed")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.is_pwa_installed) setIsPWAInstalled(true);
      });
  }, [user?.id]);

  // ── Native beforeinstallprompt (Android / Chromium) ───────────────────────

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      installPromptRef.current = e as BeforeInstallPromptEvent;
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // ── appinstalled ──────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = () => {
      setIsPWAInstalled(true);
      setModalOpen(false);
      if (supabase && user?.id) {
        supabase
          .from("profiles")
          .update({ is_pwa_installed: true })
          .eq("user_id", user.id)
          .then(() => {});
      }
    };
    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, [user?.id]);

  // ── Interaction counter ───────────────────────────────────────────────────

  // Shared increment logic — called by both the global click listener and any
  // explicit widget-level call. Guards are checked here so callers don't have to.
  const incrementInteractions = useCallback(() => {
    if (typeof window === "undefined") return;
    if (isStandaloneMode()) return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    const raw  = localStorage.getItem(STORAGE_KEY);
    const curr = raw ? parseInt(raw, 10) : 0;
    if (isNaN(curr) || curr >= INSTALL_THRESHOLD) return;
    const next = curr + 1;
    localStorage.setItem(STORAGE_KEY, String(next));
    if (next >= INSTALL_THRESHOLD) setPwaPromptReady(true);
  }, []);

  // On mount: if the threshold was already reached in a previous session and the
  // user hasn't dismissed the prompt, surface Dudu's bubble immediately.
  useEffect(() => {
    if (isStandaloneMode()) return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    const curr = raw ? parseInt(raw, 10) : 0;
    if (!isNaN(curr) && curr >= INSTALL_THRESHOLD) setPwaPromptReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Global mobile click listener — counts every dashboard interaction without
  // requiring each widget to call incrementInteractions individually.
  // Uses capture phase so stopPropagation in child handlers doesn't suppress it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleClick = (e: MouseEvent) => {
      if (!window.matchMedia("(max-width: 767px)").matches) return;
      if (isStandaloneMode()) return;
      if (localStorage.getItem(DISMISSED_KEY)) return;
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea")) return;
      const raw  = localStorage.getItem(STORAGE_KEY);
      const curr = raw ? parseInt(raw, 10) : 0;
      if (isNaN(curr) || curr >= INSTALL_THRESHOLD) return;
      const next = curr + 1;
      localStorage.setItem(STORAGE_KEY, String(next));
      if (next >= INSTALL_THRESHOLD) setPwaPromptReady(true);
    };
    window.addEventListener("click", handleClick, { capture: true });
    return () => window.removeEventListener("click", handleClick, { capture: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public API ────────────────────────────────────────────────────────────

  const clearPwaPrompt   = useCallback(() => setPwaPromptReady(false), []);
  const dismissPwaPrompt = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setPwaPromptReady(false);
  }, []);

  const openInstallModal    = useCallback(() => setModalOpen(true), []);
  const closeModal          = useCallback(() => setModalOpen(false), []);

  const triggerAndroidInstall = useCallback(async () => {
    const prompt = installPromptRef.current;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setIsPWAInstalled(true);
      setModalOpen(false);
    }
    installPromptRef.current = null;
  }, []);

  const value: PWAInstallerContextValue = {
    platform,
    isStandalone,
    isPWAInstalled,
    openInstallModal,
    incrementInteractions,
    triggerAndroidInstall,
    pwaPromptReady,
    clearPwaPrompt,
    dismissPwaPrompt,
  };

  return (
    <PWAInstallerContext.Provider value={value}>
      {children}
      {modalOpen && (
        <PWAInstallModal
          platform={platform}
          onClose={closeModal}
          onAndroidInstall={triggerAndroidInstall}
        />
      )}
    </PWAInstallerContext.Provider>
  );
}
