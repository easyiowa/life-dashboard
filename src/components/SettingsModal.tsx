"use client";

import { useState, useEffect, useRef } from "react";
import { X, User, Mail, Calendar, Lock, LogOut, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

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

// ── Modal ─────────────────────────────────────────────────────────────────────

interface Props { isOpen: boolean; onClose: () => void }

export default function SettingsModal({ isOpen, onClose }: Props) {
  const { user, signOut, updateDisplayName, updatePassword, isConfigured } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameToast,   setNameToast]   = useState<Toast | null>(null);

  const [newPwd,     setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdToast,   setPwdToast]   = useState<Toast | null>(null);

  const [signOutLoading, setSignOutLoading] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Seed display name from user metadata when modal opens
  useEffect(() => {
    if (isOpen) {
      setDisplayName(user?.user_metadata?.display_name ?? "");
      setNameToast(null);
      setPwdToast(null);
      setNewPwd("");
      setConfirmPwd("");
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [isOpen, user]);

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

  if (!isOpen) return null;

  const email       = user?.email ?? "—";
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—";

  async function handleSaveName() {
    if (!displayName.trim()) { setNameToast({ type: "error", message: "Display name cannot be empty." }); return; }
    setNameLoading(true);
    const { error } = await updateDisplayName(displayName.trim());
    setNameLoading(false);
    setNameToast(error
      ? { type: "error",   message: error }
      : { type: "success", message: "Display name updated successfully." }
    );
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

          {/* ── Account info (read-only) ──────────────────────────── */}
          <section>
            <SectionHeading icon={Mail} label="Account Info" />
            <div className="flex flex-col gap-2.5">
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

          {/* ── Display name ─────────────────────────────────────── */}
          {isConfigured && (
            <section>
              <SectionHeading icon={User} label="Profile" />
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Display Name</label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSaveName(); }}
                    placeholder="Your name"
                    autoComplete="name"
                    className="h-10 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors"
                  />
                </div>
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
            </section>
          )}

          {isConfigured && <div className="h-px bg-white/[0.06]" />}

          {/* ── Change password ───────────────────────────────────── */}
          {isConfigured && (
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
          )}

          <div className="h-px bg-white/[0.06]" />

          {/* ── Sign out ──────────────────────────────────────────── */}
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
    </div>
  );
}
