"use client";

import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useTheme } from "@/context/ThemeContext";

export interface DatePickerInputProps {
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
  minDate?: Date;
  className?: string;
}

function isoToDate(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function dateToIso(d: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleDateString("en-CA"); // → YYYY-MM-DD
}

export default function DatePickerInput({
  value,
  onChange,
  placeholder = "Select date…",
  minDate,
  className = "",
}: DatePickerInputProps) {
  const { mode } = useTheme();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <DatePicker
      selected={isoToDate(value)}
      onChange={(d: Date | null) => onChange(dateToIso(d))}
      dateFormat="MMM d, yyyy"
      placeholderText={placeholder}
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      minDate={minDate}
      withPortal={isMobile}
      popperProps={isMobile ? undefined : { strategy: "fixed" }}
      calendarClassName={mode === "light" ? "light-theme-picker" : "dark-theme-picker"}
      popperClassName="ldp-popper"
      wrapperClassName="w-full"
      className={`h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-colors cursor-pointer w-full ${className}`}
    />
  );
}
