"use client";

import { useMemo } from "react";
import { DIARY, type DiaryEntry } from "@/data/duduQuotes";

export type { DiaryEntry };

// Cycle anchored to a known Monday so week boundaries are stable across all clients.
const EPOCH = new Date("2024-01-01");
const TOTAL_WEEKS = 4;

export function useDuduDiary(): DiaryEntry | null {
  return useMemo(() => {
    const now = new Date();
    const daysSinceEpoch = Math.floor((now.getTime() - EPOCH.getTime()) / (1000 * 60 * 60 * 24));
    const currentWeek = (Math.floor(daysSinceEpoch / 7) % TOTAL_WEEKS) + 1; // 1–4
    const currentDay  = now.getDay();                                          // 0–6
    const entry = DIARY.find(e => e.week === currentWeek && e.day === currentDay);
    // Skip stub entries that haven't been filled in yet.
    return entry?.text ? entry : null;
  }, []);
}
