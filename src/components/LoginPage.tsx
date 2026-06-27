"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// ── Google G logo ──────────────────────────────────────────────────────────────

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ── Email / password field ─────────────────────────────────────────────────────

function Field({
  label, type, value, onChange, placeholder, error, autoComplete,
}: {
  label: string; type: string; value: string; onChange: (v: string) => void;
  placeholder?: string; error?: string; autoComplete?: string;
}) {
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = type === "password";
  const inputType  = isPassword && showPwd ? "text" : type;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{label}</label>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full h-11 px-3.5 rounded-xl bg-white/[0.04] border text-sm text-white placeholder:text-slate-600 outline-none focus:bg-white/[0.06] transition-colors ${
            isPassword ? "pr-10" : "pr-3.5"
          } ${error ? "border-red-500/60 focus:border-red-500/60" : "border-white/[0.07] focus:border-violet-500/60"}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPwd(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
          >
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}

// ── Founder's Note ─────────────────────────────────────────────────────────────

function FoundersNote() {
  const [imgErr, setImgErr] = useState(false);

  return (
    <div className="bg-[#0F1629] border border-white/[0.07] rounded-2xl p-6 flex flex-col gap-5">

      {/* Avatar + badge */}
      <div className="flex items-start gap-3.5">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center">
          {imgErr ? (
            <User className="w-8 h-8 text-zinc-500" />
          ) : (
            <img
              src="/avatar.jpg"
              alt="Olaf"
              className="w-full h-full object-cover"
              onError={() => setImgErr(true)}
            />
          )}
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <span className="self-start text-xs text-zinc-400 bg-white/[0.04] border border-white/[0.06] rounded-full px-2.5 py-1 leading-none">
            👋 A note from the founder
          </span>
          <p className="text-2xl font-bold text-white leading-none">Olaf</p>
        </div>
      </div>

      {/* Narrative */}
      <div className="flex flex-col gap-3.5 text-sm text-zinc-300 leading-relaxed">
        <p>
          If you know me, you know I&apos;m the organized German dude. I love structure, and for years I tried absolutely everything to optimize my life: habit trackers, apps, more apps, even more apps, and then Notion. Yet, everything still felt completely scattered across seven different tabs, apps, and endless monthly subscriptions. You still couldn&apos;t find things, and maintaining the apps felt like a job in itself.
        </p>
        <p>
          Well, additionally, my girlfriend (now fianc&eacute;e), with her terrifying ability to know me better than I know myself, looked at the chaos one day and said: <span className="italic text-zinc-400">&ldquo;You have ADHD!&rdquo;</span> She was, as always, completely right.
        </p>
        <p>
          What you see here, is the very first version of &ldquo;Call it a day!&rdquo; Dashboard, Life Manager or whatever you want to call it for now. It&rsquo;s a single, clean space designed to put everything into one fast overview and free up massive headspace.
        </p>
        <p>
          You are the early adopters. Take it for a spin, build your layout, and tell me: what would you like or not, what would be cool to add as new widget etc.
        </p>
        <p>
          Make it your own with custom widgets and skins, while a smart "brain" handles all the organizing for you and we all spend time enjoying life even more! ^^
        </p>
        <p className="text-zinc-600 text-xs border-t border-white/[0.05] pt-3.5">
          — Olaf
        </p>
      </div>

    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const [mode,        setMode]        = useState<"signin" | "signup">("signin");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [emailErr,    setEmailErr]    = useState("");
  const [passwordErr, setPasswordErr] = useState("");
  const [globalErr,   setGlobalErr]   = useState("");
  const [loading,     setLoading]     = useState(false);
  const [googleLoad,  setGoogleLoad]  = useState(false);
  const [successMsg,  setSuccessMsg]  = useState("");

  function validate(): boolean {
    let ok = true;
    setEmailErr(""); setPasswordErr(""); setGlobalErr("");
    if (!email.trim())                                      { setEmailErr("Email is required.");       ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))   { setEmailErr("Enter a valid email.");     ok = false; }
    if (!password)                                          { setPasswordErr("Password is required."); ok = false; }
    else if (mode === "signup" && password.length < 8)     { setPasswordErr("Min 8 characters.");    ok = false; }
    return ok;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || loading) return;
    setLoading(true);
    const { error } = await (mode === "signin" ? signInWithEmail : signUpWithEmail)(email, password);
    setLoading(false);
    if (error) {
      setGlobalErr(error);
    } else if (mode === "signup") {
      setSuccessMsg("Account created! Check your email to confirm, then sign in.");
      setMode("signin");
      setPassword("");
    }
  }

  async function handleGoogle() {
    setGoogleLoad(true);
    await signInWithGoogle();
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 md:p-8 relative overflow-hidden">

      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/[0.06] blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-indigo-600/[0.05] blur-[80px]" />
      </div>

      <div className="relative w-full max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">

          {/* ── Left: auth panel ──────────────────────────────────── */}
          <div className="w-full max-w-sm mx-auto lg:mx-0">

            {/* Brand mark */}
            <div className="flex flex-col items-center gap-3 mb-8">
              <div className="w-14 h-14 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/ciad.jpg" alt="Call it a day! Logo" className="w-full h-full object-contain rounded-2xl" />
              </div>
              <div className="text-center">
                <h1 className="text-xl font-semibold text-white tracking-tight">Call it a Day</h1>
                <p className="text-xs text-slate-500 mt-1">Forget less, enjoy more.</p>
              </div>
            </div>

            {/* Auth card */}
            <div className="bg-[#0F1629] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">

              {/* Tab bar */}
              <div className="flex border-b border-white/[0.06]">
                {(["signin", "signup"] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setGlobalErr(""); setSuccessMsg(""); }}
                    className={`flex-1 py-3.5 text-xs font-semibold uppercase tracking-widest transition-colors ${
                      mode === m
                        ? "text-violet-300 border-b-2 border-violet-500"
                        : "text-slate-600 hover:text-slate-400"
                    }`}
                  >
                    {m === "signin" ? "Sign In" : "Create Account"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">

                {successMsg && (
                  <div className="rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 px-4 py-3 text-xs text-emerald-300 leading-relaxed">
                    {successMsg}
                  </div>
                )}

                <Field label="Email"    type="email"    value={email}    onChange={setEmail}    placeholder="you@example.com"                             error={emailErr}    autoComplete="email" />
                <Field label="Password" type="password" value={password} onChange={setPassword} placeholder={mode === "signup" ? "Min 8 characters" : "Your password"} error={passwordErr} autoComplete={mode === "signin" ? "current-password" : "new-password"} />

                {globalErr && (
                  <p className="text-[11px] text-red-400 text-center -mt-1">{globalErr}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-1 shadow-[0_0_24px_rgba(139,92,246,0.4)]"
                  style={{ background: "linear-gradient(to right, #8B5CF6, #7C3AED)" }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "signin" ? "Sign In" : "Create Account"}
                </button>

                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[10px] text-slate-600 uppercase tracking-widest">or</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={googleLoad}
                  className="w-full h-11 rounded-xl border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.08] text-sm font-medium text-slate-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2.5"
                >
                  {googleLoad
                    ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    : <><GoogleIcon className="w-4 h-4 flex-shrink-0" />Continue with Google</>
                  }
                </button>

              </form>
            </div>

            {/* Footer */}
            <p className="text-center text-[10px] text-slate-700 mt-6">
              Secured by <span className="text-slate-600">Supabase Auth</span> · End-to-end encrypted
            </p>
          </div>

          {/* ── Right: Founder's Note ──────────────────────────────── */}
          <div>
            <FoundersNote />
          </div>

        </div>
      </div>
    </div>
  );
}
