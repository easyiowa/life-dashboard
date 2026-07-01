"use client";

import { useState, useEffect, useRef } from "react";
import { X, User, Mail, Calendar, Lock, KeyRound, LogOut, Eye, EyeOff, Loader2, LayoutGrid, Crown, Users, Shield, MessageSquare, Sun, Moon, Smartphone, Pencil } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import ActiveWidgetsModal from "@/components/ActiveWidgetsModal";
import { usePWAInstaller } from "@/hooks/usePWAInstaller";
import QuickActionsConfigModal from "@/components/QuickActionsConfigModal";
import FounderDashboard from "@/components/admin/FounderDashboard";
import { syncWidgetActivation } from "@/lib/widgetActivation";
import {
  loadQuickActionsConfig,
  persistQuickActionsConfig,
  type QuickActionConfigItem,
} from "@/lib/quickActions";
import { useModalOverlay } from "@/hooks/useModalOverlay";

// ── Toast ─────────────────────────────────────────────────────────────────────

interface Toast { type: "success" | "error"; message: string }

function ToastBanner({ toast }: { toast: Toast | null }) {
  if (!toast) return null;
  return (
    <div className={`rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
      toast.type === "success"
        ? "bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-300"
        : "bg-red-500/[0.08] border border-red-500/20 text-red-300"
    }`}>
      {toast.message}
    </div>
  );
}

// ── Password field with show/hide toggle ──────────────────────────────────────

function PwdField({
  label, value, onChange, placeholder, autoComplete,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full h-10 px-3.5 pr-10 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-3.5 h-3.5 text-violet-400" />
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
  );
}

// ── Widget management ─────────────────────────────────────────────────────────

const LAYOUT_KEY = "ld_widget_layout";

const ALL_IDS = [
  "calendar","habits","projects","time-tracker","quick-notes",
  "daily-focus","activity-log","progress","recurring","network",
];

// ── Modal ─────────────────────────────────────────────────────────────────────

const PIN_ENABLED_KEY = "ld_pin_enabled";
const PIN_VALUE_KEY   = "ld_pin_value";

interface Props { isOpen: boolean; onClose: () => void; onOpenBlueprint?: () => void }

export default function SettingsModal({ isOpen, onClose, onOpenBlueprint }: Props) {
  const { user, signOut, updateDisplayName, updatePassword, isConfigured } = useAuth();
  const { mode, setMode } = useTheme();
  const { openInstallModal } = usePWAInstaller();
  useModalOverlay(isOpen);

  const [displayName,   setDisplayName]   = useState("");
  const [savedName,     setSavedName]     = useState("");
  const [nameEditing,   setNameEditing]   = useState(false);
  const [nameLoading,   setNameLoading]   = useState(false);
  const [nameToast,     setNameToast]     = useState<Toast | null>(null);

  const [newPwd,     setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdToast,   setPwdToast]   = useState<Toast | null>(null);

  const [signOutLoading, setSignOutLoading] = useState(false);

  const [pinEnabled,      setPinEnabled]      = useState(false);
  const [savedPinEnabled, setSavedPinEnabled] = useState(false);
  const [pinValue,        setPinValue]        = useState("");
  const [savedPinValue,   setSavedPinValue]   = useState("");
  const [pinToast,        setPinToast]        = useState<Toast | null>(null);

  const [widgetMarketplaceOpen, setWidgetMarketplaceOpen] = useState(false);
  const [pendingWidgets,        setPendingWidgets]        = useState<string[]>(ALL_IDS);
  const [quickActionsOpen,      setQuickActionsOpen]      = useState(false);
  const [quickActionsConfig,    setQuickActionsConfig]    = useState<QuickActionConfigItem[]>([]);
  const [founderOpen,           setFounderOpen]           = useState(false);
  const [founderMode,           setFounderMode]           = useState<"workbench" | "insights" | "admins" | "dudu">("workbench");
  const [isAdmin,                setIsAdmin]               = useState(false);

  // Membership check against the real admins whitelist — replaces the old
  // hardcoded single-email gate so newly added co-founders see the Admin section too.
  useEffect(() => {
    if (!isOpen || !isSupabaseConfigured || !supabase || !user?.email) { setIsAdmin(false); return; }
    let active = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("admins")
          .select("email")
          .eq("email", user.email)
          .maybeSingle();
        if (active) setIsAdmin(!!data);
      } catch {
        if (active) setIsAdmin(false);
      }
    })();
    return () => { active = false; };
  }, [isOpen, user?.email]);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Seed state from user metadata + localStorage when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialName = user?.user_metadata?.display_name ?? "";
      setDisplayName(initialName);
      setSavedName(initialName);
      setNameEditing(false);
      setNameToast(null);
      setPwdToast(null);
      setPinToast(null);
      setNewPwd("");
      setConfirmPwd("");
      const storedPinEnabled = localStorage.getItem(PIN_ENABLED_KEY) === "true";
      const storedPinValue   = localStorage.getItem(PIN_VALUE_KEY) ?? "";
      setPinEnabled(storedPinEnabled);
      setSavedPinEnabled(storedPinEnabled);
      setPinValue(storedPinValue);
      setSavedPinValue(storedPinValue);
      setWidgetMarketplaceOpen(false);

      // Seed widget selection from saved layout
      const savedLayout = user?.user_metadata?.widget_layout as string[] | undefined;
      const fromStorage = (() => {
        try { return JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? "null") as string[] | null; }
        catch { return null; }
      })();
      const initial = savedLayout ?? fromStorage ?? ALL_IDS;
      setPendingWidgets(initial.filter(id => ALL_IDS.includes(id)));

      setQuickActionsConfig(loadQuickActionsConfig(user));
      setQuickActionsOpen(false);
    }
  }, [isOpen, user]);

  // Blueprint Mode now lives outside this modal (DuduBlueprintBridge), so picking up
  // its changes here means listening for the same broadcast DashboardGrid already
  // listens to, instead of owning the apply handler directly.
  useEffect(() => {
    function onLayoutChanged(e: Event) {
      const detail = (e as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) setPendingWidgets(detail.filter(id => ALL_IDS.includes(id)));
    }
    window.addEventListener("ld:widget-layout", onLayoutChanged);
    return () => window.removeEventListener("ld:widget-layout", onLayoutChanged);
  }, []);

  // Auto-dismiss toasts
  useEffect(() => {
    if (!nameToast) return;
    const t = setTimeout(() => setNameToast(null), 4000);
    return () => clearTimeout(t);
  }, [nameToast]);

  useEffect(() => {
    if (!pwdToast) return;
    const t = setTimeout(() => setPwdToast(null), 4000);
    return () => clearTimeout(t);
  }, [pwdToast]);

  useEffect(() => {
    if (!pinToast) return;
    const t = setTimeout(() => setPinToast(null), 4000);
    return () => clearTimeout(t);
  }, [pinToast]);

  if (!isOpen) return null;

  // Save button appears only when the PIN toggle has drifted from the persisted state,
  // or when the PIN value itself has changed (while already enabled).
  const pinDirty =
    pinEnabled !== savedPinEnabled ||
    (pinEnabled && pinValue !== savedPinValue);

  const email       = user?.email ?? "—";
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—";

  // True for Google OAuth accounts — these users cannot change their password
  const isOAuthUser =
    user?.app_metadata?.provider === "google" ||
    (user?.identities as { provider: string }[] | undefined)?.some(id => id.provider === "google") === true;

  const isFounder = isAdmin;

  async function handleSaveName() {
    if (!displayName.trim()) { setNameToast({ type: "error", message: "Display name cannot be empty." }); return; }
    setNameLoading(true);
    const { error } = await updateDisplayName(displayName.trim());
    setNameLoading(false);
    if (error) {
      setNameToast({ type: "error", message: error });
    } else {
      setNameToast({ type: "success", message: "Display name updated." });
      setSavedName(displayName.trim());
      setNameEditing(false);
    }
  }

  async function handleChangePassword() {
    if (newPwd.length < 8) { setPwdToast({ type: "error", message: "Password must be at least 8 characters." }); return; }
    if (newPwd !== confirmPwd) { setPwdToast({ type: "error", message: "Passwords do not match." }); return; }
    setPwdLoading(true);
    const { error } = await updatePassword(newPwd);
    setPwdLoading(false);
    if (error) {
      setPwdToast({ type: "error", message: error });
    } else {
      setPwdToast({ type: "success", message: "Password updated. You may need to log in again on other devices." });
      setNewPwd("");
      setConfirmPwd("");
    }
  }

  function handleSavePin() {
    if (pinEnabled && pinValue.length !== 4) {
      setPinToast({ type: "error", message: "PIN must be exactly 4 digits." });
      return;
    }
    localStorage.setItem(PIN_ENABLED_KEY, String(pinEnabled));
    if (pinEnabled) localStorage.setItem(PIN_VALUE_KEY, pinValue);
    setSavedPinEnabled(pinEnabled);
    setSavedPinValue(pinEnabled ? pinValue : "");
    setPinToast({ type: "success", message: pinEnabled ? "Lock screen PIN saved." : "Lock screen PIN disabled." });
  }

  function persistWidgets(layout: string[]) {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    window.dispatchEvent(new CustomEvent("ld:widget-layout", { detail: layout }));
    if (isSupabaseConfigured && supabase && user) {
      supabase.auth.updateUser({ data: { widget_layout: layout } }).catch(console.error);
      void syncWidgetActivation(user.id, layout);
    }
  }

  function handleMarketplaceSave(selected: string[]) {
    setPendingWidgets(selected);
    persistWidgets(selected);
  }

  function handleQuickActionsSave(config: QuickActionConfigItem[]) {
    setQuickActionsConfig(config);
    persistQuickActionsConfig(config, user);
  }

  async function handleSignOut() {
    setSignOutLoading(true);
    await signOut();
    // AuthGate will redirect to LoginPage after session clears
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-[#0F1629] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
          <h2 className="text-base font-semibold text-white tracking-tight">Account Settings</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-6">


          {/* ── Security (email accounts only) ───────────────────── */}
          {isConfigured && !isOAuthUser && (
            <>
              <section>
                <SectionHeading icon={Lock} label="Security" />
                <div className="flex flex-col gap-3">
                  <PwdField
                    label="New Password"
                    value={newPwd}
                    onChange={setNewPwd}
                    placeholder="Min 8 characters"
                    autoComplete="new-password"
                  />
                  <PwdField
                    label="Confirm New Password"
                    value={confirmPwd}
                    onChange={setConfirmPwd}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                  />
                  <ToastBanner toast={pwdToast} />
                  <button
                    onClick={handleChangePassword}
                    disabled={pwdLoading || !newPwd}
                    className="h-9 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                    style={{ background: "linear-gradient(to right, #8B5CF6, #7C3AED)" }}
                  >
                    {pwdLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                  </button>
                </div>
              </section>
            </>
          )}

          <div className="h-px bg-white/[0.06]" />

          {/* ── 2. Dashboard ──────────────────────────────────────── */}
          <section>
            <SectionHeading icon={LayoutGrid} label="Dashboard" />
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setWidgetMarketplaceOpen(true)}
                className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-sm font-medium text-slate-300 hover:text-white transition-all flex items-center gap-2.5 px-4"
              >
                <LayoutGrid className="w-4 h-4 text-violet-400 shrink-0" />
                <span>Manage Widgets</span>
                <span className="ml-auto text-[10px] text-slate-600">{pendingWidgets.length} active</span>
              </button>
              <button
                onClick={() => onOpenBlueprint?.()}
                className="w-full h-10 rounded-xl border border-violet-500/25 bg-violet-500/[0.06] hover:bg-violet-500/[0.12] text-sm font-medium text-violet-300 hover:text-violet-200 transition-all flex items-center gap-2.5 px-4"
              >
                <span className="text-base leading-none shrink-0">🧩</span>
                <span>Rearrange Widgets</span>
                <span className="ml-auto text-[10px] text-violet-600">Blueprint Mode</span>
              </button>
              <button
                onClick={() => setQuickActionsOpen(true)}
                className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-sm font-medium text-slate-300 hover:text-white transition-all flex items-center gap-2.5 px-4"
              >
                <LayoutGrid className="w-4 h-4 text-violet-400 shrink-0" />
                <span>Edit Menu</span>
                <span className="ml-auto text-[10px] text-slate-600">
                  {quickActionsConfig.filter(c => c.enabled).length} active
                </span>
              </button>
            </div>
          </section>

          <div className="h-px bg-white/[0.06]" />

          {/* ── Appearance ───────────────────────────────────────── */}
          <section>
            <SectionHeading icon={Sun} label="Appearance" />
            <div className="flex rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.04] dark:bg-white/[0.02] p-1 gap-1">
              <button
                onClick={() => setMode("light")}
                className={`flex-1 h-8 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all ${
                  mode === "light"
                    ? "bg-white shadow-sm text-slate-800 dark:bg-white/[0.12] dark:text-white"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                Light
              </button>
              <button
                onClick={() => setMode("dark")}
                className={`flex-1 h-8 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all ${
                  mode === "dark"
                    ? "bg-white shadow-sm text-slate-800 dark:bg-white/[0.12] dark:text-white"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                Dark
              </button>
            </div>
          </section>

          {/* ── App Setup — mobile only (PWA install is irrelevant on desktop) ── */}
          <div className="md:hidden flex flex-col gap-6">
            <div className="h-px bg-white/[0.06]" />
            <section>
              <SectionHeading icon={Smartphone} label="App Setup" />
              <button
                onClick={() => { openInstallModal(); onClose(); }}
                className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-sm font-medium text-slate-300 hover:text-white transition-all flex items-center gap-2.5 px-4"
              >
                <span className="text-base leading-none" aria-hidden="true">📱</span>
                <span className="flex-1 text-left">Install App</span>
                <span className="text-[11px] text-slate-600">Dudu helps</span>
              </button>
            </section>
          </div>

          {/* ── 3. Admin (founder only — bundled divider) ─────────── */}
          {isFounder && (
            <>
              <div className="h-px bg-white/[0.06]" />
              <section>
                <SectionHeading icon={Crown} label="Admin" />
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { setFounderMode("workbench"); setFounderOpen(true); }}
                    className="w-full h-10 rounded-xl border border-purple-500/30 bg-purple-500/[0.07] hover:bg-purple-500/[0.14] text-sm font-semibold text-purple-300 hover:text-purple-200 transition-all flex items-center gap-2.5 px-4"
                  >
                    <Crown className="w-4 h-4 shrink-0" />
                    <span>Workbench</span>
                    <span className="ml-auto text-[10px] text-purple-700">private</span>
                  </button>
                  <button
                    onClick={() => { setFounderMode("insights"); setFounderOpen(true); }}
                    className="w-full h-10 rounded-xl border border-purple-500/20 bg-purple-500/[0.04] hover:bg-purple-500/[0.10] text-sm font-medium text-purple-300/90 hover:text-purple-200 transition-all flex items-center gap-2.5 px-4"
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span>User Insights</span>
                    <span className="ml-auto text-[10px] text-purple-700">private</span>
                  </button>
                  <button
                    onClick={() => { setFounderMode("admins"); setFounderOpen(true); }}
                    className="w-full h-10 rounded-xl border border-purple-500/20 bg-purple-500/[0.04] hover:bg-purple-500/[0.10] text-sm font-medium text-purple-300/90 hover:text-purple-200 transition-all flex items-center gap-2.5 px-4"
                  >
                    <Shield className="w-4 h-4 shrink-0" />
                    <span>Manage Admins</span>
                    <span className="ml-auto text-[10px] text-purple-700">private</span>
                  </button>
                  <button
                    onClick={() => { setFounderMode("dudu"); setFounderOpen(true); }}
                    className="w-full h-10 rounded-xl border border-purple-500/20 bg-purple-500/[0.04] hover:bg-purple-500/[0.10] text-sm font-medium text-purple-300/90 hover:text-purple-200 transition-all flex items-center gap-2.5 px-4"
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span>Dudu&apos;s help</span>
                    <span className="ml-auto text-[10px] text-purple-700">private</span>
                  </button>
                </div>
              </section>
            </>
          )}

          <div className="h-px bg-white/[0.06]" />

          {/* ── 4. Local Screen Lock ──────────────────────────────── */}
          <section>
            <SectionHeading icon={KeyRound} label="Local Screen Lock" />
            <div className="flex flex-col gap-3">
              <label className="flex items-center justify-between cursor-pointer select-none">
                <span className="text-sm text-slate-300">Enable lock screen PIN</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={pinEnabled}
                  onClick={() => setPinEnabled(v => !v)}
                  className={`relative w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                    pinEnabled ? "bg-violet-600" : "bg-white/[0.1]"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                      pinEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </label>
              {pinEnabled && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">4-digit PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinValue}
                    onChange={e => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="••••"
                    className="h-10 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors tracking-[0.5em]"
                  />
                </div>
              )}
              <ToastBanner toast={pinToast} />
              {/* Save button slides in only when the toggle/PIN has drifted from the saved state */}
              <div
                className={`overflow-hidden transition-all duration-200 ease-out ${
                  pinDirty ? "max-h-12 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
                }`}
              >
                <button
                  onClick={handleSavePin}
                  className="w-full h-9 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                  style={{ background: "linear-gradient(to right, #8B5CF6, #7C3AED)" }}
                >
                  Save Lock Settings
                </button>
              </div>
            </div>
          </section>

          <div className="h-px bg-white/[0.06]" />

          {/* ── 5. Account Info ───────────────────────────────────── */}
          <section>
            <SectionHeading icon={Mail} label="Account Info" />
            <div className="flex flex-col gap-2.5">

              {/* Display Name — editable; Save button appears only when the user has made a change */}
              {isConfigured && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Display Name</label>
                  <div className="relative">
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={displayName}
                      onChange={e => { setDisplayName(e.target.value); setNameEditing(true); }}
                      onClick={() => setNameEditing(true)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") { setDisplayName(savedName); setNameEditing(false); nameInputRef.current?.blur(); }
                      }}
                      placeholder="Your name"
                      autoComplete="name"
                      className="w-full h-10 px-3.5 pr-9 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors"
                    />
                    {/* Pencil icon — signals the field is editable; hidden once editing is active */}
                    <button
                      type="button"
                      onClick={() => { setNameEditing(true); nameInputRef.current?.focus(); }}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-all duration-150 ${
                        nameEditing ? "opacity-0 pointer-events-none" : "opacity-50 hover:opacity-100"
                      }`}
                      tabIndex={-1}
                      aria-label="Edit display name"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Save Name button + toast — slides in only when editing is active */}
                  <div
                    className={`overflow-hidden transition-all duration-200 ease-out ${
                      nameEditing ? "max-h-24 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="flex flex-col gap-2 pt-0.5">
                      <ToastBanner toast={nameToast} />
                      <button
                        onClick={handleSaveName}
                        disabled={nameLoading}
                        className="h-9 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                        style={{ background: "linear-gradient(to right, #8B5CF6, #7C3AED)" }}
                      >
                        {nameLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Name"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Email</span>
                <span className="text-sm text-slate-300 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5">{email}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Member Since</span>
                <div className="flex items-center gap-2 text-sm text-slate-400 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-600" />
                  {memberSince}
                </div>
              </div>
            </div>
          </section>

          <div className="h-px bg-white/[0.06]" />

          {/* ── 6. Session ────────────────────────────────────────── */}
          <section>
            <SectionHeading icon={LogOut} label="Session" />
            <button
              onClick={handleSignOut}
              disabled={signOutLoading}
              className="w-full h-10 rounded-xl border border-red-500/30 bg-red-500/[0.07] hover:bg-red-500/[0.14] text-sm font-semibold text-red-400 hover:text-red-300 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {signOutLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><LogOut className="w-4 h-4" /> Log Out</>
              }
            </button>
          </section>

        </div>
      </div>

      {/* Founder Dashboard — z-[70] highest layer */}
      <FounderDashboard
        isOpen={founderOpen}
        onClose={() => setFounderOpen(false)}
        mode={founderMode}
      />

      {/* Widget Marketplace — z-[60] overlays on top of this modal (z-50) */}
      <ActiveWidgetsModal
        isOpen={widgetMarketplaceOpen}
        onClose={() => setWidgetMarketplaceOpen(false)}
        initialSelected={pendingWidgets}
        onSave={handleMarketplaceSave}
      />

      {/* Edit Quick Actions — z-[60] overlays on top of this modal (z-50) */}
      <QuickActionsConfigModal
        isOpen={quickActionsOpen}
        onClose={() => setQuickActionsOpen(false)}
        initialConfig={quickActionsConfig}
        onSave={handleQuickActionsSave}
      />
    </div>
  );
}
