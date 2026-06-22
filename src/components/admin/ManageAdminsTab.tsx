"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// Display-only label — the owner row is never removable. Actual access
// control lives in the `admins` table + RLS, not this constant.
const OWNER_EMAIL = "iowa.olaf@googlemail.com";

interface AdminRow { email: string }

export default function ManageAdminsTab() {
  const [items,   setItems]   = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [adding,  setAdding]  = useState(false);
  const [email,   setEmail]   = useState("");

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase not configured — connect env vars to manage admins.");
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("admins")
      .select("email")
      .order("email", { ascending: true });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setItems((data ?? []) as AdminRow[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function addAdmin() {
    const v = email.trim().toLowerCase();
    if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || !supabase) return;
    setAdding(true);
    setError(null);
    const { error: err } = await supabase.from("admins").insert({ email: v });
    setAdding(false);
    if (err) { setError(err.message); return; }
    setEmail("");
    void load();
  }

  if (loading) return (
    <div className="flex items-center justify-center py-12 text-slate-600">
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {items.map(row => (
          <div key={row.email} className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5">
            <span className="text-xs text-slate-300 truncate">{row.email}</span>
            {row.email === OWNER_EMAIL ? (
              <span className="text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 shrink-0">
                Owner
              </span>
            ) : (
              <span className="text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 shrink-0">
                Admin
              </span>
            )}
          </div>
        ))}
        {items.length === 0 && !error && (
          <p className="text-xs text-slate-600 text-center py-4">No admins on record yet.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5 pt-1 border-t border-white/[0.06]">
        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest pt-3">
          Co-founder email address
        </label>
        <div className="flex items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void addAdmin(); }}
            placeholder="name@example.com"
            className="flex-1 h-9 px-3 rounded-xl bg-white/[0.05] border border-white/[0.09] text-sm text-white placeholder:text-slate-600 outline-none focus:border-purple-500/50 transition-colors"
          />
          <button
            onClick={() => void addAdmin()}
            disabled={adding || !email.trim()}
            className="h-9 px-3 rounded-xl text-xs font-semibold text-purple-300 bg-purple-600/20 border border-purple-500/40 disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0"
          >
            {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3" /> <span className="hidden md:inline">Add</span></>}
          </button>
        </div>
        {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
      </div>
    </div>
  );
}
