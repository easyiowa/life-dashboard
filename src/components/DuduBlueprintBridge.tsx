"use client";

import { useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import DuduAssistant from "@/components/DuduAssistant";
import DashboardBlueprintModal from "@/components/DashboardBlueprintModal";
import { useAuth } from "@/context/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { syncWidgetActivation } from "@/lib/widgetActivation";

// Global home for Blueprint Mode — lives here (not inside SettingsModal) so it can
// be opened directly from Dudu without requiring the Settings window to be open at
// all. SettingsModal still has its own "Rearrange Grid Layout" button, but it now
// calls the SAME onOpenBlueprint callback threaded down through DashboardHeader,
// instead of owning a second, separate blueprintOpen state + modal instance.
//
// This is also why this is a standalone client component rather than living inside
// page.tsx directly — page.tsx must stay a server component to keep its
// `export const dynamic = "force-dynamic"` (a deliberate prior fix for AuthGate
// routing) in effect. DuduAssistant is fixed-positioned, so rendering it here
// instead of further down the tree doesn't change where it visually appears.

const LAYOUT_KEY = "ld_widget_layout";
const ALL_IDS = [
  "calendar", "habits", "projects", "time-tracker", "quick-notes",
  "daily-focus", "activity-log", "progress", "recurring", "network",
];

function readSavedLayout(savedFromAuth: string[] | undefined): string[] {
  const fromStorage = (() => {
    try { return JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? "null") as string[] | null; }
    catch { return null; }
  })();
  const initial = savedFromAuth ?? fromStorage ?? ALL_IDS;
  return initial.filter((id) => ALL_IDS.includes(id));
}

export default function DuduBlueprintBridge() {
  const { user } = useAuth();
  const [blueprintOpen, setBlueprintOpen] = useState(false);
  const [blueprintOrder, setBlueprintOrder] = useState<string[]>(ALL_IDS);

  function openBlueprint() {
    setBlueprintOrder(readSavedLayout(user?.user_metadata?.widget_layout as string[] | undefined));
    setBlueprintOpen(true);
  }

  function applyBlueprint(newOrder: string[]) {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(newOrder));
    window.dispatchEvent(new CustomEvent("ld:widget-layout", { detail: newOrder }));
    if (isSupabaseConfigured && supabase && user) {
      supabase.auth.updateUser({ data: { widget_layout: newOrder } }).catch(console.error);
      void syncWidgetActivation(user.id, newOrder);
    }
  }

  return (
    <>
      <DashboardHeader onOpenBlueprint={openBlueprint} />
      <DuduAssistant onOpenBlueprint={openBlueprint} />
      <DashboardBlueprintModal
        isOpen={blueprintOpen}
        onClose={() => setBlueprintOpen(false)}
        initialOrder={blueprintOrder}
        onApply={applyBlueprint}
      />
    </>
  );
}
