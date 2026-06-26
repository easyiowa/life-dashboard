"use client";

import { useContext } from "react";
import { PWAInstallerContext, type PWAInstallerContextValue } from "@/context/PWAInstallerContext";

export type { PWAInstallerContextValue };

export function usePWAInstaller(): PWAInstallerContextValue {
  const ctx = useContext(PWAInstallerContext);
  if (!ctx) throw new Error("usePWAInstaller must be used inside <PWAInstallerProvider>");
  return ctx;
}
