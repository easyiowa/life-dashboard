"use client";

import { useState, useEffect } from "react";
import { X, Crown, MessageSquare, FileText, Archive, Plus, Users, Shield } from "lucide-react";
import FeedbackTab from "./FeedbackTab";
import UpdatesTab from "./UpdatesTab";
import ArchiveTab from "./ArchiveTab";
import InsightsTab from "./InsightsTab";
import ManageAdminsTab from "./ManageAdminsTab";
import DuduMetricsTab from "./DuduMetricsTab";

type WorkbenchTab = "feedback" | "updates" | "archive";
type Mode         = "workbench" | "insights" | "admins" | "dudu";

interface Props {
  isOpen:  boolean;
  onClose: () => void;
  mode:    Mode;
}

export default function FounderDashboard({ isOpen, onClose, mode }: Props) {
  const [workbenchTab, setWorkbenchTab] = useState<WorkbenchTab>("feedback");

  useEffect(() => {
    if (isOpen && mode === "workbench") setWorkbenchTab("feedback");
  }, [isOpen, mode]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!isOpen) return null;

  const title    = mode === "workbench" ? "Workbench" : mode === "insights" ? "User Insights" : mode === "dudu" ? "Dudu's Help 🦦" : "Manage Admins";
  const HeadIcon = mode === "workbench" ? Crown : mode === "insights" ? Users : mode === "dudu" ? MessageSquare : Shield;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#0B0F1C] border border-purple-500/20 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
              <HeadIcon className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white leading-none">{title}</h2>
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

        {/* Tab strip — workbench mode only; insights/admins modes jump straight to their view */}
        {mode === "workbench" && (
          <>
            <div className="flex gap-1 px-5 pt-3 pb-0 shrink-0">
              {([
                { id: "feedback" as WorkbenchTab, label: "Feedback",      Icon: MessageSquare },
                { id: "updates"  as WorkbenchTab, label: "Draft Updates", Icon: FileText      },
                { id: "archive"  as WorkbenchTab, label: "Archive",       Icon: Archive       },
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => setWorkbenchTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium transition-all border-b-2 ${
                    workbenchTab === t.id
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
          </>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {mode === "insights"
            ? <InsightsTab />
            : mode === "admins"
            ? <ManageAdminsTab />
            : mode === "dudu"
            ? <DuduMetricsTab />
            : workbenchTab === "feedback"
            ? <FeedbackTab />
            : workbenchTab === "archive"
            ? <ArchiveTab />
            : <UpdatesTab />}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.05] shrink-0 flex items-center gap-2">
          <Plus className="w-3 h-3 text-slate-700" />
          <p className="text-[10px] text-slate-700">
            {mode === "insights"
              ? "Snapshot of onboarding intent, industry and widget selections across users."
              : mode === "admins"
              ? "Admins added here gain full access to Workbench and User Insights."
              : mode === "dudu"
              ? "Every Dudu trigger fired and what each user did about it."
              : workbenchTab === "feedback"
              ? "Feedback arrives here from the beacon drawer on every user session."
              : workbenchTab === "archive"
              ? "Text-only log of all resolved feedback · screenshots excluded to save storage."
              : "Only published updates appear in user drawer · drafts visible to founder only."}
          </p>
        </div>
      </div>
    </div>
  );
}
