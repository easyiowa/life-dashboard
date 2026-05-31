"use client";

import { useState, useEffect } from "react";
import { Lock, Delete } from "lucide-react";

const PIN = "1234";

export default function PasscodeLock({
  children,
}: {
  children: React.ReactNode;
}) {
  const [digits, setDigits] = useState<string[]>([]);
  const [unlocked, setUnlocked] = useState(false);
  const [shake, setShake] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Declared before any useEffect so closures always capture initialised bindings.
  const handleDigit = (d: string) => {
    if (digits.length >= 4 || shake) return;
    setDigits((prev) => [...prev, d]);
  };

  const handleDelete = () => {
    if (shake) return;
    setDigits((prev) => prev.slice(0, -1));
  };

  useEffect(() => {
    if (digits.length === 4) {
      if (digits.join("") === PIN) {
        setUnlocked(true);
      } else {
        setErrorMsg("Incorrect PIN");
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setDigits([]);
          setErrorMsg("");
        }, 650);
      }
    }
  }, [digits]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleDigit(e.key);
      if (e.key === "Backspace") handleDelete();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits, shake]);

  if (unlocked) return <>{children}</>;

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0F19]">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <div className="relative flex flex-col items-center gap-8">
        {/* Icon + Title */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-5">
            <Lock className="w-6 h-6 text-violet-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Life Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">Enter your PIN to unlock</p>
        </div>

        {/* Dots */}
        <div className={`flex gap-4 ${shake ? "animate-shake" : ""}`}>
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full border transition-all duration-200 ${
                shake
                  ? "bg-red-500 border-red-500 scale-110"
                  : i < digits.length
                    ? "bg-violet-500 border-violet-500 scale-110"
                    : "bg-transparent border-slate-600"
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        <p
          className={`text-red-400 text-xs h-4 transition-opacity duration-200 ${errorMsg ? "opacity-100" : "opacity-0"}`}
        >
          {errorMsg || " "}
        </p>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {keys.map((key, i) => {
            if (key === "") return <div key={i} />;
            return (
              <button
                key={i}
                onClick={() => (key === "del" ? handleDelete() : handleDigit(key))}
                className="w-[72px] h-[72px] rounded-full bg-white/[0.05] hover:bg-white/[0.10] active:bg-violet-600/25 border border-white/[0.08] text-white flex items-center justify-center transition-all duration-150 select-none"
              >
                {key === "del" ? (
                  <Delete className="w-5 h-5 text-slate-400" />
                ) : (
                  <span className="text-lg font-medium">{key}</span>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-slate-600 text-xs">Demo PIN: 1234</p>
      </div>
    </div>
  );
}
