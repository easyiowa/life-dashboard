"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Image from "next/image";
import type { Platform } from "@/context/PWAInstallerContext";

// ── Step component ─────────────────────────────────────────────────────────

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 dark:bg-violet-500/20 dark:border-violet-500/40 dark:text-violet-300 text-[10px] font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <p className="text-sm text-slate-300 leading-relaxed">{children}</p>
    </div>
  );
}

// ── Mockup image container ─────────────────────────────────────────────────

function BrowserMockup({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="w-full aspect-[16/9] rounded-xl overflow-hidden border border-white/[0.10] bg-[#0b0f1a] relative">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover object-top"
        priority
      />
    </div>
  );
}

// ── Platform guides ────────────────────────────────────────────────────────

function SafariGuide() {
  return (
    <div className="flex flex-col gap-3">
      <BrowserMockup src="/images/pwa/safari.png" alt="Safari share button location" />
      <Step n={1}>
        Tap the <strong className="text-white font-semibold">Share button</strong> in the bottom toolbar
      </Step>
      <Step n={2}>
        Scroll down and tap <strong className="text-white font-semibold">Add to Home Screen</strong>
      </Step>
      <Step n={3}>
        <strong className="text-white font-semibold">Tap Add</strong> — done!
      </Step>
    </div>
  );
}

function ChromiumGuide({ onInstall }: { onInstall: () => Promise<void> }) {
  return (
    <div className="flex flex-col gap-3">
      <BrowserMockup src="/images/pwa/chrome.png" alt="Chrome share button location" />
      <Step n={1}>
        Tap the <strong className="text-white font-semibold">Share button</strong> in the address bar
      </Step>
      <Step n={2}>
        Scroll down and tap <strong className="text-white font-semibold">Add to Home Screen</strong>
      </Step>
      <Step n={3}>
        <strong className="text-white font-semibold">Tap Add</strong> — done!
      </Step>
      <button
        onClick={onInstall}
        className="w-full h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 hover:bg-orange-500/25 text-orange-300 dark:bg-violet-500/15 dark:border-violet-500/30 dark:hover:bg-violet-500/25 dark:text-violet-300 active:scale-[0.98] text-sm font-semibold transition-all"
      >
        Or install instantly ↗
      </button>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────

interface PWAInstallModalProps {
  platform: Platform;
  onClose: () => void;
  onAndroidInstall: () => Promise<void>;
}

export default function PWAInstallModal({ platform, onClose, onAndroidInstall }: PWAInstallModalProps) {
  if (typeof document === "undefined") return null;

  const guide = platform === "ios-safari"
    ? <SafariGuide />
    : <ChromiumGuide onInstall={onAndroidInstall} />;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9000] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet — slides up from bottom on mobile, centered on desktop */}
      <div className="fixed z-[9001] bottom-0 left-0 right-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4 pointer-events-none">
        <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border border-white/[0.12] bg-[#0d1426] p-6 flex flex-col gap-5 pointer-events-auto animate-dudu-fade-slide-in">

          {/* Header row — Dudu + title + close */}
          <div className="flex items-start gap-3">
            <span className="text-4xl leading-none select-none" aria-hidden="true">🦦</span>
            <div className="flex-1 min-w-0">
              <h2
                className="text-base font-bold uppercase tracking-widest leading-none text-white"
                style={{ fontFamily: "var(--font-taybea)" }}
              >
                Add to Home screen
              </h2>
              <p className="text-[11px] text-slate-500 mt-1">Dudu got a trick for you</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Pitch copy */}
          <p className="text-sm text-slate-300 leading-relaxed">
            Get easy access to <strong className="text-white font-semibold">&ldquo;Call it a Day&rdquo;</strong> without any downloads!
          </p>

          {/* Divider */}
          <div className="h-px bg-white/[0.06]" />

          {/* Platform guide */}
          {guide}

          {/* Safe area spacer on mobile */}
          <div className="h-0 sm:hidden pb-safe" />
        </div>
      </div>
    </>,
    document.body
  );
}
