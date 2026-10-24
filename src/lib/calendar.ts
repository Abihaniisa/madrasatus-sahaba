// src/lib/calendar.ts — week builder + useLiveStatus (LivePointer hook).

import { useEffect, useState } from "react";
import { CONFIG } from "./config";
import { getSettings, loadSettings, type SchoolSettings } from "./settings";

export type BlockType = "teaching" | "exam" | "holiday" | "daura";
export type Week = {
  num: number; blockType: BlockType; blockLabel: string;
  startDate: Date; endDate: Date; semester?: 1 | 2; teachingWeek?: number;
};

function buildWeeks(sessionStartISO: string): Week[] {
  const start = new Date(sessionStartISO + "T00:00:00Z");
  const weeks: Week[] = [];
  let cursor = 1, teachingCounter = 0;
  let semester: 1 | 2 = 1;

  for (const block of CONFIG.calendar.blocks) {
    for (let i = 0; i < block.weeks; i++) {
      const weekStart = new Date(start);
      weekStart.setUTCDate(start.getUTCDate() + (cursor - 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
      let teachingWeek: number | undefined;
      let weekSemester: 1 | 2 | undefined;
      if (block.type === "teaching") {
        teachingCounter++;
        if (teachingCounter > 18) { teachingCounter = 1; semester = 2; }
        teachingWeek = teachingCounter;
        weekSemester = semester;
      }
      weeks.push({ num: cursor, blockType: block.type, blockLabel: block.label, startDate: weekStart, endDate: weekEnd, semester: weekSemester, teachingWeek });
      cursor++;
    }
  }
  return weeks;
}

let cached: Week[] | null = null;
let cachedStart: string | null = null;
export function allWeeks(): Week[] {
  const s = getSettings().session_start_date;
  if (!cached || cachedStart !== s) { cached = buildWeeks(s); cachedStart = s; }
  return cached;
}
export function totalWeeks(): number { return allWeeks().length; }

export function currentWeekNum(today = new Date()): number | null {
  const start = new Date(getSettings().session_start_date + "T00:00:00Z");
  const diff = Math.floor((today.getTime() - start.getTime()) / 86400000);
  if (diff < 0) return 0;
  const n = Math.floor(diff / 7) + 1;
  return n > totalWeeks() ? null : n;
}

export function formatRange(w: Week): string {
  const d = (x: Date) => x.getUTCDate();
  const m = (x: Date) => x.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  const y = (x: Date) => x.getUTCFullYear();
  if (w.startDate.getUTCMonth() === w.endDate.getUTCMonth()) {
    return `${d(w.startDate)}–${d(w.endDate)} ${m(w.startDate)} ${y(w.startDate)}`;
  }
  return `${d(w.startDate)} ${m(w.startDate)} – ${d(w.endDate)} ${m(w.endDate)} ${y(w.endDate)}`;
}

export function teachingWeeksOfSemester(sem: 1 | 2): Week[] {
  return allWeeks().filter(w => w.blockType === "teaching" && w.semester === sem);
}

export type LiveStatus = {
  mode: "admission" | "session" | "ramadan";
  context: string;
  action: string;
  target: Date;
  dateLabel: string;
};

const MS_DAY = 86400000;
function parseDate(iso: string): Date { return new Date(iso + "T00:00:00Z"); }
function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / MS_DAY);
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function computeLiveStatus(now: Date, settings: SchoolSettings): LiveStatus {
  const sessionStart = parseDate(settings.session_start_date);
  const totalDays = totalWeeks() * 7;
  const sessionEnd = new Date(sessionStart);
  sessionEnd.setUTCDate(sessionEnd.getUTCDate() + totalDays - 1);

  const ramadanStart = settings.ramadan_start_date ? parseDate(settings.ramadan_start_date) : null;
  const ramadanEnd = settings.ramadan_end_date ? parseDate(settings.ramadan_end_date) : null;
  const inRamadan = ramadanStart && ramadanEnd && now >= ramadanStart && now <= ramadanEnd;

  if (now < sessionStart || now > sessionEnd) {
    const target = now < sessionStart ? sessionStart : (() => {
      const next = new Date(sessionStart);
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      return next;
    })();
    return {
      mode: "admission",
      context: "Admission Open",
      action: "Admission closes in",
      target,
      dateLabel: `Session begins on ${fmtDate(target)}`,
    };
  }

  if (inRamadan && ramadanStart && ramadanEnd) {
    return {
      mode: "ramadan",
      context: "Ramadan Break",
      action: "Session resumes in",
      target: ramadanEnd,
      dateLabel: `Session resumes on ${fmtDate(ramadanEnd)}`,
    };
  }

  let effectiveNow = new Date(now);
  if (ramadanStart && ramadanEnd && now > ramadanEnd) {
    const ramadanDays = daysBetween(ramadanStart, ramadanEnd) + 1;
    effectiveNow = new Date(now.getTime() - ramadanDays * MS_DAY);
  }

  const weeks = allWeeks();
  const currentWeek = weeks.find(w => effectiveNow >= w.startDate && effectiveNow <= w.endDate);
  if (!currentWeek) {
    const nextWeek = weeks.find(w => effectiveNow < w.startDate);
    if (nextWeek) {
      return {
        mode: "session",
        context: "Break",
        action: "Next block begins in",
        target: nextWeek.startDate,
        dateLabel: `Resumes on ${fmtDate(nextWeek.startDate)}`,
      };
    }
    const next = new Date(sessionStart);
    next.setUTCFullYear(next.getUTCFullYear() + 1);
    return {
      mode: "admission",
      context: "Session Complete",
      action: "Next session begins in",
      target: next,
      dateLabel: `Begins on ${fmtDate(next)}`,
    };
  }

  if (currentWeek.blockType === "teaching") {
    const semLabel = currentWeek.semester === 2 ? "Second" : "First";
    const blockEnd = weeks.filter(w => w.blockType === "teaching" && w.semester === currentWeek.semester).pop()!;
    return {
      mode: "session",
      context: `${semLabel} Semester · Week ${currentWeek.teachingWeek} of 18`,
      action: "Semester ends in",
      target: blockEnd.endDate,
      dateLabel: `Ends on ${fmtDate(blockEnd.endDate)}`,
    };
  }

  if (currentWeek.blockType === "exam") {
    return {
      mode: "session",
      context: "Exam Week",
      action: "Exams end in",
      target: currentWeek.endDate,
      dateLabel: `Exams end on ${fmtDate(currentWeek.endDate)}`,
    };
  }

  if (currentWeek.blockType === "daura") {
    const dauraStart = weeks.find(w => w.blockType === "daura")!;
    const weekNum = currentWeek.num - dauraStart.num + 1;
    const blockEnd = weeks.filter(w => w.blockType === "daura").pop()!;
    return {
      mode: "session",
      context: `Daura Programme · Week ${weekNum} of 6`,
      action: "Daura ends in",
      target: blockEnd.endDate,
      dateLabel: `Ends on ${fmtDate(blockEnd.endDate)}`,
    };
  }

  if (currentWeek.blockType === "holiday") {
    const nextNonHoliday = weeks.find(w => w.num > currentWeek.num && w.blockType !== "holiday");
    if (nextNonHoliday) {
      return {
        mode: "session",
        context: "Semester Break",
        action: "Next block begins in",
        target: nextNonHoliday.startDate,
        dateLabel: `Resumes on ${fmtDate(nextNonHoliday.startDate)}`,
      };
    }
    const next = new Date(sessionStart);
    next.setUTCFullYear(next.getUTCFullYear() + 1);
    return {
      mode: "session",
      context: "Session Break",
      action: "Next session begins in",
      target: next,
      dateLabel: `Begins on ${fmtDate(next)}`,
    };
  }

  return {
    mode: "session",
    context: "School in session",
    action: "Session ends in",
    target: sessionEnd,
    dateLabel: `Ends on ${fmtDate(sessionEnd)}`,
  };
}

export function useLiveStatus(): LiveStatus {
  const [now, setNow] = useState(new Date());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSettings().then(() => setReady(true));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!ready) {
    return {
      mode: "session",
      context: "Loading…",
      action: "Please wait",
      target: new Date(Date.now() + 60000),
      dateLabel: "",
    };
  }

  return computeLiveStatus(now, getSettings());
}
