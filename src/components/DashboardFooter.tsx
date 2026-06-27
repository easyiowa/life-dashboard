"use client";

import { useDuduDiary } from "@/hooks/useDuduDiary";

export default function DashboardFooter() {
  const entry = useDuduDiary();
  if (!entry) return null;

  return (
    <div className="pt-8 pb-24 flex justify-center px-4">
      <p className="text-xs italic text-slate-400/70 dark:text-slate-500/60 text-center max-w-lg leading-relaxed select-none">
        🦦 &ldquo;{entry.text}&rdquo;
      </p>
    </div>
  );
}
