// ── Dudu diary entries ────────────────────────────────────────────────────────
// week: 1–4 (mod-4 cycle anchored to EPOCH in useDuduDiary.ts)
// day:  JS Date.getDay() convention — 0 = Sunday, 1 = Monday … 6 = Saturday

export interface DiaryEntry {
  week: number;
  day: number;
  text: string;
  character?: string;
}

export const DIARY: DiaryEntry[] = [
  // ── Week 1 ────────────────────────────────────────────────────────────────
  { week: 1, day: 1, text: "sat down to code, but organized my music playlist for three hours instead." },
  { week: 1, day: 2, text: "my brain has 74 open tabs and i can't find where the music is playing from." },
  { week: 1, day: 3, text: "had a genius idea, forgot it, luckily wrote it down here first." },
  { week: 1, day: 4, text: "saved from an awkward dinner because my tracker actually remembered our anniversary." },
  { week: 1, day: 5, text: "logging off because my last two brain cells are running on dial-up internet." },
  { week: 1, day: 6, text: "trying to relax, but my adhd wants to start a new business before lunch." },
  { week: 1, day: 0, text: "filled out my schedule just for the illusion of having my life together." },

  // ── Week 2 ────────────────────────────────────────────────────────────────
  { week: 2, day: 1, text: "staring at my layout wondering why yesterday's genius plan now looks like a riddle." },
  { week: 2, day: 2, text: "logged off at 6pm for dinner, achieving work-life balance for exactly one day." },
  { week: 2, day: 3, text: "running a startup plus music school means my routine is just a calculated panic attack." },
  { week: 2, day: 4, text: "spent my entire day researching vintage synthesizers instead of fixing coding bugs." },
  { week: 2, day: 5, text: "closing my laptop and praying my mental tabs don't try to auto-update." },
  { week: 2, day: 6, text: "officially replied to all the texts i answered in my head three days ago." },
  { week: 2, day: 0, text: "my brain is totally calm right now, which means i definitely forgot a deadline." },

  // ── Week 3 ────────────────────────────────────────────────────────────────
  { week: 3, day: 1, text: "locked in on my morning plan, then spent two hours reorganizing my desk cables." },
  { week: 3, day: 2, text: "task manager says i have 15 priorities today, which means i am doing none of them." },
  { week: 3, day: 3, text: "came up with a sick bassline idea at 3am, wrote it down here, now it makes zero sense." },
  { week: 3, day: 4, text: "almost ghosted my brother on his birthday, but my network tracker saved my life." },
  { week: 3, day: 5, text: "closing the laptop before my fried brain accidentally deletes our entire production database." },
  { week: 3, day: 6, text: "told my wife i'd relax today, currently hyperfocusing on building a smart mirror." },
  { week: 3, day: 0, text: "checked off my weekly chores, mostly to trick myself into feeling accomplished." },

  // ── Week 4 ────────────────────────────────────────────────────────────────
  { week: 4, day: 1, text: "changed my dashboard font because i thought it would magically fix my procrastination." },
  { week: 4, day: 2, text: "spent four hours fixing one tiny layout bug and forgot to eat lunch." },
  { week: 4, day: 3, text: "brain is entirely full of music theories and startup code. dumping it all here." },
  { week: 4, day: 4, text: "my tracker reminded me to call my mom. crisis averted." },
  { week: 4, day: 5, text: "calling it a day early because my mental battery is sitting at exactly one percent." },
  // ⚠️ Week 4 Saturday + Sunday were cut off — replace these two stubs with your text:
  { week: 4, day: 6, text: "" },
  { week: 4, day: 0, text: "" },
];
