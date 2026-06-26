"use client";

import { useState, useEffect, useRef } from "react";
import { Users, Plus, X, Trash2, Pencil, FileText, Settings, MoreVertical, Check, ChevronDown, CheckCircle2 } from "lucide-react";
import AutoExpandingTextarea from "@/components/ui/AutoExpandingTextarea";
import DatePickerInput from "@/components/ui/DatePickerInput";
import SwipeToDeleteRow from "@/components/ui/SwipeToDeleteRow";
import ScrollFadeContainer from "@/components/ui/ScrollFadeContainer";
import {
  useDashboard,
  type NetworkContact,
  type ContactEvent,
  type RelationshipGroup,
  type GroupColor,
} from "@/context/DashboardContext";
import ManageGroupsModal from "@/components/modals/ManageGroupsModal";

// ── Color palette ─────────────────────────────────────────────────────────────

const COLOR_CLASSES: Record<GroupColor, {
  pill: string; pillActive: string; dot: string; bar: string;
}> = {
  rose:    { pill: "bg-rose-500/10 border-rose-500/20 text-rose-400",    pillActive: "bg-rose-500/25 border-rose-500/50 text-rose-300 md:shadow-[0_0_10px_rgba(244,63,94,0.2)]",    dot: "bg-rose-400",    bar: "from-rose-600 to-rose-400"    },
  sky:     { pill: "bg-sky-500/10 border-sky-500/20 text-sky-400",       pillActive: "bg-sky-500/25 border-sky-500/50 text-sky-300 md:shadow-[0_0_10px_rgba(14,165,233,0.2)]",       dot: "bg-sky-400",     bar: "from-sky-600 to-sky-400"       },
  amber:   { pill: "bg-amber-500/10 border-amber-500/20 text-amber-400", pillActive: "bg-amber-500/25 border-amber-500/50 text-amber-300 md:shadow-[0_0_10px_rgba(245,158,11,0.2)]", dot: "bg-amber-400",   bar: "from-amber-500 to-amber-400"   },
  emerald: { pill: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", pillActive: "bg-emerald-500/25 border-emerald-500/50 text-emerald-300 md:shadow-[0_0_10px_rgba(16,185,129,0.2)]", dot: "bg-emerald-400", bar: "from-emerald-600 to-emerald-400" },
  violet:  { pill: "bg-violet-500/10 border-violet-500/20 text-violet-400", pillActive: "bg-violet-500/25 border-violet-500/50 text-violet-300 md:shadow-[0_0_10px_rgba(139,92,246,0.2)]", dot: "bg-violet-400",  bar: "from-violet-600 to-violet-400"  },
  teal:    { pill: "bg-teal-500/10 border-teal-500/20 text-teal-400",    pillActive: "bg-teal-500/25 border-teal-500/50 text-teal-300 md:shadow-[0_0_10px_rgba(20,184,166,0.2)]",    dot: "bg-teal-400",    bar: "from-teal-600 to-teal-400"    },
  orange:  { pill: "bg-orange-500/10 border-orange-500/20 text-orange-400", pillActive: "bg-orange-500/25 border-orange-500/50 text-orange-300 md:shadow-[0_0_10px_rgba(249,115,22,0.2)]", dot: "bg-orange-400",  bar: "from-orange-600 to-orange-400"  },
  pink:    { pill: "bg-pink-500/10 border-pink-500/20 text-pink-400",    pillActive: "bg-pink-500/25 border-pink-500/50 text-pink-300 md:shadow-[0_0_10px_rgba(236,72,153,0.2)]",    dot: "bg-pink-400",    bar: "from-pink-600 to-pink-400"    },
};

const URGENCY_BAR: Record<string, string> = {
  fresh:   "from-teal-600 to-teal-400",
  mid:     "from-amber-600 to-amber-400",
  due:     "from-orange-600 to-orange-400",
  overdue: "from-red-600 to-red-400",
};
const URGENCY_TEXT: Record<string, string> = {
  fresh:   "text-teal-400",
  mid:     "text-amber-400",
  due:     "text-orange-400",
  overdue: "text-red-400",
};
const URGENCY_BADGE: Record<string, string> = {
  fresh:   "bg-teal-500/10 border-teal-500/20 text-teal-400",
  mid:     "bg-amber-500/10 border-amber-500/20 text-amber-400",
  due:     "bg-orange-500/10 border-orange-500/20 text-orange-400",
  overdue: "bg-red-500/10 border-red-500/20 text-red-400",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(ds: string | null): string | null {
  if (!ds) return null;
  const [y, mo, dd] = ds.split("-").map(Number);
  return new Date(y, mo - 1, dd).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type ProgressResult = {
  daysLeft: number; progress: number; label: string;
  urgency: "fresh" | "mid" | "due" | "overdue";
  icon: string; milestoneLabel: string;
  type: "birthday" | "event"; eventId?: string;
};

function computeProgress(contact: NetworkContact): ProgressResult | null {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  type Candidate = { date: Date; icon: string; label: string; type: "birthday" | "event"; eventId?: string };
  const candidates: Candidate[] = [];

  // Birthday — skip if already marked completed for this cycle
  if (contact.birthday && !contact.cycleCompleted) {
    const [, mo, dd] = contact.birthday.split("-");
    let d = new Date(today.getFullYear(), Number(mo) - 1, Number(dd));
    if (d < today) d = new Date(today.getFullYear() + 1, Number(mo) - 1, Number(dd));
    candidates.push({ date: d, icon: "🎂", label: "Birthday", type: "birthday" });
  }

  // Uncompleted events with upcoming dates
  for (const evt of contact.events) {
    if (!evt.completed && evt.date) {
      const d = new Date(evt.date); d.setHours(0, 0, 0, 0);
      if (d >= today) candidates.push({ date: d, icon: "🎯", label: evt.title || "Event", type: "event", eventId: evt.id });
    }
  }

  if (!candidates.length) return null;

  const nearest   = candidates.reduce((a, b) => a.date <= b.date ? a : b);
  const daysLeft  = Math.ceil((nearest.date.getTime() - today.getTime()) / 86_400_000);
  const progress  = Math.min(Math.max((365 - daysLeft) / 365, 0), 1);
  const urgency   = daysLeft <= 0 ? "overdue" : daysLeft <= 7 ? "due" : daysLeft <= 30 ? "mid" : "fresh";
  const label     = daysLeft === 0 ? "Today!" : daysLeft === 1 ? "1d" : daysLeft < 7 ? `${daysLeft}d` : daysLeft < 60 ? `${Math.ceil(daysLeft / 7)}w` : `${Math.ceil(daysLeft / 30)}mo`;

  return { daysLeft, progress, label, urgency, icon: nearest.icon, milestoneLabel: nearest.label, type: nearest.type, eventId: nearest.eventId };
}

const NOW_FILTER = "__now__";

// Birthday falling on today's month/day — checked independently of computeProgress (which
// skips the birthday candidate entirely once cycleCompleted is set, so a same-day birthday
// could otherwise go undetected by the "Now" logic below) but still honors cycleCompleted
// itself, so checking the contact off as done actually clears its own urgency.
function isBirthdayToday(contact: NetworkContact): boolean {
  if (!contact.birthday || contact.cycleCompleted) return false;
  const today    = new Date();
  const todayMmdd = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return contact.birthday.slice(5) === todayMmdd;
}

// Single source of truth for "how urgent is this contact right now" — combines the nearest
// follow-up/event date from computeProgress with a same-day-birthday override, so the Now
// pill's visibility, the active filter's array, and the sort order can never drift apart.
function effectiveDaysLeft(contact: NetworkContact): number | null {
  const prog       = computeProgress(contact);
  const progDays   = prog ? prog.daysLeft : null;
  const birthdayDays = isBirthdayToday(contact) ? 0 : null;
  if (progDays === null) return birthdayDays;
  if (birthdayDays === null) return progDays;
  return Math.min(progDays, birthdayDays);
}

// Today, overdue, due within the next 48 hours, or a same-day birthday — mirrors RecurringCard's "Now" quick filter.
function isUrgentNow(contact: NetworkContact): boolean {
  const d = effectiveDaysLeft(contact);
  return d !== null && d <= 2;
}

// Strict ascending sort by effective urgency — most overdue/imminent (including same-day
// birthdays) first, undated/no-signal contacts sink to the bottom.
function sortByUrgency(contacts: NetworkContact[]): NetworkContact[] {
  return [...contacts].sort((a, b) => {
    const da = effectiveDaysLeft(a);
    const db = effectiveDaysLeft(b);
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });
}

// ── Add / Edit contact modal ──────────────────────────────────────────────────

type ContactForm = Omit<NetworkContact, "id">;

function blankForm(groups: RelationshipGroup[]): ContactForm {
  return {
    name: "",
    relationshipType: groups[0]?.label ?? "",
    birthday: null,
    notes: "",
    lastTouchpoint: null,
    events: [],
    cycleCompleted: false,
  };
}

function ContactModal({
  groups,
  initial,
  onSave,
  onClose,
}: {
  groups: RelationshipGroup[];
  initial?: NetworkContact;
  onSave: (f: ContactForm) => void;
  onClose: () => void;
}) {
  const [form,      setForm]      = useState<ContactForm>(initial ? { ...initial } : blankForm(groups));
  const [nameError, setNameError] = useState(false);

  // Event factory state
  const [events,   setEvents]   = useState<ContactEvent[]>(initial?.events ?? []);
  const [evtTitle, setEvtTitle] = useState("");
  const [evtDate,  setEvtDate]  = useState("");
  const [evtNotes, setEvtNotes] = useState("");

  // Inline editor state
  const [editingEventId,   setEditingEventId]   = useState<string | null>(null);
  const [editDraft,        setEditDraft]        = useState<{ title: string; date: string; notes: string }>({ title: "", date: "", notes: "" });
  const [isEventsExpanded, setIsEventsExpanded] = useState(false);

  function pushEvent() {
    const title = evtTitle.trim();
    if (!title && !evtDate) return;
    const newEvt: ContactEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title, date: evtDate || null, notes: evtNotes.trim(), completed: false,
    };
    setEvents((prev) => [...prev, newEvt]);
    setEvtTitle(""); setEvtDate(""); setEvtNotes("");
  }

  function removeEvt(id: string) {
    if (editingEventId === id) setEditingEventId(null);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }
  function toggleEvtDone(id: string) { setEvents((prev) => prev.map((e) => e.id === id ? { ...e, completed: !e.completed } : e)); }

  function startEdit(evt: ContactEvent) {
    setEditingEventId(evt.id);
    setEditDraft({ title: evt.title, date: evt.date ?? "", notes: evt.notes });
  }

  function saveEdit(id: string) {
    setEvents((prev) => prev.map((e) =>
      e.id === id ? { ...e, title: editDraft.title.trim(), date: editDraft.date || null, notes: editDraft.notes.trim() } : e
    ));
    setEditingEventId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setNameError(true); return; }
    onSave({ ...form, name: form.name.trim(), events });
  }

  const activeGroup = groups.find((g) => g.label === form.relationshipType);
  const canPush = !!(evtTitle.trim() || evtDate);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0F1629] border border-white/[0.08] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">

        <div className="sticky top-0 z-10 bg-[#0F1629] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">{initial ? "Edit Contact" : "Add Connection"}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Name *</label>
            <input
              autoFocus
              type="text"
              value={form.name}
              onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setNameError(false); }}
              placeholder="Full name"
              className={`w-full h-10 px-3 rounded-xl bg-white/[0.04] border text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 transition-colors ${nameError ? "border-red-500/60" : "border-white/[0.07]"}`}
            />
            {nameError && <p className="text-[10px] text-red-400">Name is required.</p>}
          </div>

          {/* Group */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Group</label>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => {
                const cc = COLOR_CLASSES[g.color];
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, relationshipType: g.label }))}
                    className={`px-3 h-8 rounded-xl text-[11px] font-medium border transition-all duration-150 ${
                      form.relationshipType === g.label ? cc.pillActive : "border-white/[0.07] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                    }`}
                  >
                    {g.emoji} {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Birthday + Last Touchpoint */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Birthday</label>
              <DatePickerInput
                value={form.birthday ?? null}
                onChange={(v) => setForm((f) => ({ ...f, birthday: v }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Last Touchpoint</label>
              <DatePickerInput
                value={form.lastTouchpoint ?? null}
                onChange={(v) => setForm((f) => ({ ...f, lastTouchpoint: v }))}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Notes</label>
            <AutoExpandingTextarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="How you know them, shared context, follow-ups…"
              minRows={3}
              maxHeightVariant="modal"
              className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-500/60 transition-colors"
            />
          </div>

          {/* Event factory */}
          <div className="flex flex-col gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">

            {/* Collapsible header toggle */}
            <button
              type="button"
              onClick={() => setIsEventsExpanded((v) => !v)}
              className="flex items-center justify-between w-full cursor-pointer select-none"
            >
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Events <span className="normal-case text-slate-700 font-normal tracking-normal">— optional</span>
              </p>
              <div className="flex items-center gap-2">
                {events.length > 0 && (
                  <span className="text-[10px] text-slate-600 tabular-nums">{events.length} added</span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-600 transition-transform duration-200 ${isEventsExpanded ? "rotate-180" : ""}`}
                />
              </div>
            </button>

            {/* Collapsible form — entry fields + save buttons */}
            {isEventsExpanded && (
              <div className="flex flex-col gap-3">
                {/* Entry fields — stacked so nothing clips */}
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={evtTitle}
                    onChange={(e) => setEvtTitle(e.target.value)}
                    placeholder="Event title…"
                    className="w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.07] text-xs text-white placeholder:text-slate-700 outline-none focus:border-violet-500/50 transition-colors"
                  />
                  <DatePickerInput
                    value={evtDate || null}
                    onChange={(v) => setEvtDate(v ?? "")}
                  />
                  <AutoExpandingTextarea
                    value={evtNotes}
                    onChange={(e) => setEvtNotes(e.target.value)}
                    placeholder="Event notes…"
                    minRows={2}
                    maxHeightVariant="modal"
                    className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-xs text-white placeholder:text-slate-700 outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={pushEvent}
                    disabled={!canPush}
                    className="flex-1 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 text-[11px] font-medium hover:bg-violet-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Save Event
                  </button>
                  <button
                    type="button"
                    onClick={pushEvent}
                    disabled={!canPush}
                    className="flex-1 h-8 rounded-lg bg-white/[0.03] border border-white/[0.07] text-slate-400 text-[11px] font-medium hover:bg-white/[0.06] hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Add Another
                  </button>
                </div>
              </div>
            )}

            {/* History list */}
            {events.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-3 border-t border-white/[0.05]">
                {events.map((evt) => {
                  const isEditing = editingEventId === evt.id;

                  if (isEditing) {
                    return (
                      <div key={evt.id} className="flex flex-col gap-2 p-3 rounded-lg bg-white/[0.03] border border-violet-500/20">
                        <input
                          autoFocus
                          type="text"
                          value={editDraft.title}
                          onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                          placeholder="Event title…"
                          className="w-full h-8 px-2.5 rounded-md bg-white/[0.05] border border-white/[0.10] text-xs text-white placeholder:text-slate-700 outline-none focus:border-violet-500/50 transition-colors"
                        />
                        <DatePickerInput
                          value={editDraft.date || null}
                          onChange={(v) => setEditDraft((d) => ({ ...d, date: v ?? "" }))}
                        />
                        <AutoExpandingTextarea
                          value={editDraft.notes}
                          onChange={(e) => setEditDraft((d) => ({ ...d, notes: e.target.value }))}
                          placeholder="Event notes…"
                          minRows={2}
                          maxHeightVariant="modal"
                          className="px-2.5 py-2 rounded-md bg-white/[0.05] border border-white/[0.10] text-xs text-white placeholder:text-slate-700 outline-none focus:border-violet-500/50 transition-colors"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(evt.id)}
                            className="flex-1 h-7 rounded-md bg-violet-600/20 border border-violet-500/30 text-violet-300 text-[11px] font-medium hover:bg-violet-600/35 transition-all"
                          >
                            Save Updates
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingEventId(null)}
                            className="h-7 px-3 rounded-md border border-white/[0.07] text-slate-500 text-[11px] hover:text-slate-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={evt.id} className="group/evt flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all">
                      <button
                        type="button"
                        onClick={() => toggleEvtDone(evt.id)}
                        className="flex-shrink-0 w-4 h-4 rounded-full border border-white/[0.15] hover:border-emerald-500/50 flex items-center justify-center transition-colors"
                      >
                        {evt.completed && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(evt)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <span className={`text-xs leading-none block truncate ${evt.completed ? "line-through text-slate-600" : "text-slate-300"}`}>
                          {evt.title || <span className="text-slate-600 italic">Untitled</span>}
                        </span>
                        {evt.date && (
                          <span className="text-[10px] text-slate-600">{fmtDate(evt.date)}</span>
                        )}
                      </button>
                      <Pencil
                        className="w-3 h-3 text-slate-700 opacity-0 group-hover/evt:opacity-100 transition-opacity flex-shrink-0 pointer-events-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeEvt(evt.id)}
                        className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-slate-700 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm text-white font-medium transition-all shadow-[0_0_20px_rgba(124,58,237,0.35)]"
            >
              {initial ? "Save Changes" : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Contact row ───────────────────────────────────────────────────────────────

function ContactRow({
  contact,
  group,
  onEdit,
  onDelete,
  onToggleCycle,
}: {
  contact: NetworkContact;
  group?: RelationshipGroup;
  onEdit: () => void;
  onDelete: () => void;
  onToggleCycle: () => void;
}) {
  const prog    = computeProgress(contact);
  const bdayFmt = fmtDate(contact.birthday);
  const pct     = prog ? Math.round(prog.progress * 100) : 0;

  const hasNotes = !!(contact.notes || contact.events.length > 0);

  return (
    <SwipeToDeleteRow onDelete={onDelete} onClick={onEdit}>
    <div
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-150 cursor-pointer"
    >

      {/* Checkmark circle — left-aligned, matches RecurringCard style */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleCycle(); }}
        title={prog === null ? "Reset cycle" : "Mark milestone complete"}
        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 ${
          prog === null
            ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
            : "bg-white/[0.04] border border-white/[0.07] text-slate-500 hover:bg-teal-500/20 hover:border-teal-500/30 hover:text-teal-400"
        }`}
      >
        <CheckCircle2 className="w-3 h-3" />
      </button>

      {/* Name */}
      <span className="flex-1 text-sm font-medium text-slate-200 leading-snug pb-0.5 truncate min-w-0">
        {contact.name}
      </span>

      {/* Fixed-width right cluster: milestone label · badge · bar · pct */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {prog ? (
          <>
            {/* Milestone label */}
            <span className="text-[10px] text-slate-600 hidden sm:block flex-shrink-0 max-w-[72px] truncate">
              {prog.milestoneLabel}
            </span>
            {/* Countdown badge + checkmark icon */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0 ${URGENCY_BADGE[prog.urgency]}`}>
              {prog.icon} {prog.label}
              <Check className="w-2 h-2 opacity-50" />
            </span>
            {/* Bar + percentage — matches RecurringCard w-16 pattern */}
            <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
              <div className="w-16 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${URGENCY_BAR[prog.urgency]} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`text-[10px] font-medium tabular-nums w-7 text-right ${URGENCY_TEXT[prog.urgency]}`}>
                {pct}%
              </span>
            </div>
          </>
        ) : (
          bdayFmt && (
            <span className="text-[10px] text-slate-700">🎂 {bdayFmt}</span>
          )
        )}
      </div>

      {/* Note icon with hover tooltip — desktop only, hover-dependent */}
      <div className="hidden md:block relative flex-shrink-0">
        <div className="group/tip">
          <button
            className={`p-1 rounded-md transition-all ${hasNotes ? "text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]" : "text-slate-800 cursor-default"}`}
            title={hasNotes ? "View notes" : "No notes"}
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {hasNotes && (
            <div className="absolute right-0 bottom-full mb-2 w-60 z-[100] pointer-events-none opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150">
              <div className="bg-[#0c1120] border border-white/[0.10] rounded-xl shadow-2xl p-3 flex flex-col gap-2.5">
                {contact.notes && (
                  <div className="flex flex-col gap-1">
                    <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest">Notes</p>
                    <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">{contact.notes}</p>
                  </div>
                )}
                {contact.events.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
                    <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest">Events</p>
                    {contact.events.map((evt) => (
                      <div key={evt.id} className={evt.completed ? "opacity-40" : ""}>
                        <p className="text-[11px] text-violet-300 font-medium leading-snug">
                          🎯 {evt.title || <span className="italic text-slate-500">Untitled</span>}
                          {evt.completed && <span className="ml-1 text-[9px] text-emerald-500">✓</span>}
                        </p>
                        {evt.date && <p className="text-[10px] text-slate-500">{fmtDate(evt.date)}</p>}
                        {evt.notes && <p className="text-[11px] text-slate-400 leading-relaxed">{evt.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {bdayFmt && (
                  <div className="pt-1 border-t border-white/[0.06]">
                    <p className="text-[10px] text-pink-300">🎂 Birthday: {bdayFmt}</p>
                  </div>
                )}
              </div>
              {/* Arrow */}
              <div className="absolute right-2.5 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white/[0.10]" />
            </div>
          )}
        </div>
      </div>

      {/* Delete (hover-revealed) — desktop only, hover-dependent */}
      <div className="hidden md:flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
    </SwipeToDeleteRow>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export default function NetworkCard() {
  const {
    networkContacts, addNetworkContact, updateNetworkContact, deleteNetworkContact,
    relationshipGroups, addRelationshipGroup, updateRelationshipGroup, deleteRelationshipGroup,
    calendarJump, setCalendarJump,
  } = useDashboard();

  // Lands on "Now" when something's actually urgent, otherwise the first category —
  // never on an unselected/empty filter. Re-evaluated below once data has loaded,
  // since networkContacts/relationshipGroups are frequently still empty at mount
  // (Supabase hasn't resolved yet) when this initializer first runs.
  const [activeFilter, setActiveFilter] = useState<string>(() => {
    if (networkContacts.some(isUrgentNow)) return NOW_FILTER;
    return relationshipGroups[0]?.label ?? "";
  });
  const [showModal,        setShowModal]         = useState(false);
  const [editing,          setEditing]           = useState<NetworkContact | null>(null);
  const [isGroupsModalOpen,setIsGroupsModalOpen] = useState(false);

  // Tracks whether the user has explicitly picked a pill, so the effect below only ever
  // adjusts the *default* selection and never overrides a deliberate choice.
  const hasUserChosenFilter = useRef(false);

  useEffect(() => {
    if (!calendarJump || calendarJump.type !== "contact") return;
    const contact = networkContacts.find((c) => c.id === calendarJump.id);
    if (contact) { setEditing(contact); setCalendarJump(null); }
  }, [calendarJump]); // eslint-disable-line react-hooks/exhaustive-deps

  const nowCount     = networkContacts.filter(isUrgentNow).length;
  const isKnownGroup = relationshipGroups.some((g) => g.label === activeFilter);

  // Same race-condition fix as the lazy initializer above, but re-checked on every data
  // change: once contacts/groups actually arrive, move off the stale default — but only
  // if the user hasn't already made their own selection.
  useEffect(() => {
    if (hasUserChosenFilter.current) return;
    if (nowCount > 0) {
      if (activeFilter !== NOW_FILTER) setActiveFilter(NOW_FILTER);
    } else if (!isKnownGroup && activeFilter !== NOW_FILTER) {
      // The filter points at a category that no longer exists (or hasn't loaded yet).
      if (relationshipGroups[0]?.label) setActiveFilter(relationshipGroups[0].label);
    }
  }, [nowCount, relationshipGroups]); // eslint-disable-line react-hooks/exhaustive-deps

  // If the "Now" tab the user is actively viewing empties out — e.g. they just checked off
  // the last urgent contact — hop to the first category instead of leaving them stranded on
  // a vanished pill. Unlike the effect above, this always runs regardless of whether the
  // selection was user-chosen, since it's reacting to a live state change, not overriding
  // a fresh deliberate pick.
  useEffect(() => {
    if (activeFilter === NOW_FILTER && nowCount === 0 && relationshipGroups[0]?.label) {
      setActiveFilter(relationshipGroups[0].label);
    }
  }, [activeFilter, nowCount, relationshipGroups]);

  const isNowFilter = activeFilter === NOW_FILTER;
  const visible      = sortByUrgency(
    isNowFilter
      ? networkContacts.filter(isUrgentNow)
      // Fallback for any stale/legacy filter value (e.g. a deleted category) — show
      // everyone rather than silently rendering a blank "No contacts" screen.
      : isKnownGroup
        ? networkContacts.filter((c) => c.relationshipType === activeFilter)
        : networkContacts
  );

  function handleSave(form: Omit<NetworkContact, "id">) {
    if (editing) { updateNetworkContact(editing.id, form); setEditing(null); }
    else         { addNetworkContact(form); setShowModal(false); }
  }

  function handleToggleCycle(contact: NetworkContact) {
    const prog = computeProgress(contact);
    if (!prog || prog.type === "birthday") {
      // Toggle birthday completion (or reset if already all done)
      updateNetworkContact(contact.id, { cycleCompleted: !contact.cycleCompleted });
    } else if (prog.type === "event" && prog.eventId) {
      // Mark the currently shown event as completed — next iteration of computeProgress picks the next one
      updateNetworkContact(contact.id, {
        events: contact.events.map((e) => e.id === prog.eventId ? { ...e, completed: true } : e),
      });
    }
  }

  return (
    <>
      <ManageGroupsModal
        isOpen={isGroupsModalOpen}
        onClose={() => setIsGroupsModalOpen(false)}
      />
      {(showModal || editing) && (
        <ContactModal
          groups={relationshipGroups}
          initial={editing ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl p-5 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Network & Relationships</h2>
            <span className="hidden md:inline text-[10px] text-slate-700 tabular-nums">{networkContacts.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1 px-2.5 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 text-[11px] font-medium hover:bg-violet-600/30 hover:border-violet-500/50 transition-all"
            >
              <Plus className="w-3 h-3" /> <span className="hidden md:inline">Add</span>
            </button>
            {/* Settings trigger — mobile only here (naked, no backing shape); desktop keeps
                the circular gear button anchored to the filter-pill row below instead. */}
            <button
              type="button"
              onClick={() => setIsGroupsModalOpen(true)}
              title="Manage groups"
              className="md:hidden flex-shrink-0 p-1 text-slate-500 hover:text-violet-300 active:opacity-70 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter pills + group manager toggle */}
        <div className="flex items-center gap-2 -mt-1">
          {/* Pills — swipeable single row on mobile, wraps on desktop */}
          <ScrollFadeContainer className="flex-1 min-w-0">
            {/* Global overdue/due-soon quick filter — mirrors RecurringCard's "Now" pill */}
            {nowCount > 0 && (
              <button
                type="button"
                onClick={() => { hasUserChosenFilter.current = true; setActiveFilter(NOW_FILTER); }}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-medium border transition-all duration-150 ${
                  isNowFilter
                    ? "bg-red-500/20 border-red-500/50 text-red-300 md:shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                    : "bg-red-500/8 border-red-500/20 text-red-400/80 hover:bg-red-500/15 hover:border-red-500/35"
                }`}
              >
                Now
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 flex-shrink-0 animate-pulse" />
              </button>
            )}

            {relationshipGroups.map((g) => {
              const cc    = COLOR_CLASSES[g.color];
              const count = networkContacts.filter((c) => c.relationshipType === g.label).length;
              const active = activeFilter === g.label;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => { hasUserChosenFilter.current = true; setActiveFilter(g.label); }}
                  className={`flex-shrink-0 px-3 h-7 rounded-full text-[11px] font-medium border transition-all duration-150 ${active ? cc.pillActive : cc.pill}`}
                >
                  {g.emoji} {g.label}
                  {count > 0 && <span className="ml-1 opacity-60 text-[10px]">({count})</span>}
                </button>
              );
            })}
          </ScrollFadeContainer>

          {/* Manage groups — desktop only; anchored to the right of the swipe track so it
              never scrolls off-screen. Mobile moves this trigger up into the header instead. */}
          <button
            type="button"
            onClick={() => setIsGroupsModalOpen(true)}
            title="Manage groups"
            className="hidden md:flex flex-shrink-0 w-7 h-7 rounded-full items-center justify-center border bg-white/[0.04] border-white/[0.05] text-slate-600 hover:text-violet-300 hover:bg-violet-600/20 hover:border-violet-500/40 transition-all duration-150"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Contact list */}
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="text-2xl">🤝</span>
            <p className="text-xs text-slate-600">
              {isNowFilter
                ? "All clear — nothing due right now."
                : networkContacts.length === 0
                  ? "No contacts yet — add your first connection."
                  : `No ${activeFilter} contacts yet.`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {visible.map((contact) => {
              const group = relationshipGroups.find((g) => g.label === contact.relationshipType);
              return (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  group={group}
                  onEdit={() => setEditing(contact)}
                  onDelete={() => deleteNetworkContact(contact.id)}
                  onToggleCycle={() => handleToggleCycle(contact)}
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
