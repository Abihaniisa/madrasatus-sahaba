// src/lib/calendar.ts — week builder + useLiveStatus hook.

import { useEffect, useState } from "react";
import { CONFIG, SETTINGS } from "./config";

export type BlockType = "teaching" | "exam" | "holiday" | "daura" | "ramadan";
export type Week = {
  num: number; blockType: BlockType; blockLabel: string;
  startDate: Date; endDate: Date; semester?: 1 | 2; teachingWeek?: number;
};

function buildWeeks(): Week[] {
  const start = new Date(CONFIG.calendar.sessionStart + "T00:00:00Z");
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
export function allWeeks(): Week[] { if (!cached) cached = buildWeeks(); return cached; }
export function totalWeeks(): number { return allWeeks().length; }

export function currentWeekNum(today = new Date()): number | null {
  const start = new Date(CONFIG.calendar.sessionStart + "T00:00:00Z");
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

export type LiveStatus =
  | { mode: "admission"; context: string; action: string; target: Date }
  | { mode: "session"; context: string; action: string; target: Date };

export function useLiveStatus(): LiveStatus {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const start = new Date(SETTINGS.session_start_date + "T00:00:00Z");
  const end = new Date(SETTINGS.session_end_date + "T23:59:59Z");
  const isRamadan = SETTINGS.ramadan_start_date && SETTINGS.ramadan_end_date
    ? now >= new Date(SETTINGS.ramadan_start_date + "T00:00:00Z") && now <= new Date(SETTINGS.ramadan_end_date + "T23:59:59Z")
    : false;

  if (now < start || now > end) {
    let target = new Date(start);
    if (now > end) target.setUTCFullYear(target.getUTCFullYear() + 1);
    return { mode: "admission", context: isRamadan ? "Admission Open · Ramadan" : "Admission Open", action: "Closes in", target };
  }

  const weeks = allWeeks();
  const currentWeekObj = weeks.find(w => now >= w.startDate && now <= w.endDate);
  if (!currentWeekObj) return { mode: "admission", context: "Admission Open", action: "Closes in", target: start };
  if (isRamadan) return { mode: "session", context: "Ramadan Break", action: "Resumes in", target: new Date(SETTINGS.ramadan_end_date! + "T23:59:59Z") };

  const blockEndWeek = weeks.filter(w => w.blockType === currentWeekObj.blockType).pop()!;
  const target = new Date(blockEndWeek.endDate);
  let context = "", action = "";
  switch (currentWeekObj.blockType) {
    case "teaching": {
      const semNum = currentWeekObj.blockLabel.includes("Second") ? "2nd" : "1st";
      context = `${semNum} Sem · Week ${currentWeekObj.teachingWeek} of 18`; action = "Ends in"; break;
    }
    case "exam": context = `Exam Week`; action = "Ends in"; break;
    case "holiday": {
      context = `Break`;
      const nextBlock = weeks.find(w => w.num > blockEndWeek.num);
      action = nextBlock ? `Next begins in` : "Session ends in"; break;
    }
    case "daura": {
      const dauraStart = weeks.find(w => w.blockType === "daura");
      const offset = currentWeekObj.num - (dauraStart?.num ?? currentWeekObj.num) + 1;
      context = `Daura · Week ${offset} of 6`; action = "Ends in"; break;
    }
    case "ramadan": context = "Ramadan Break"; action = "Resumes in"; break;
  }
  return { mode: "session", context, action, target };
}
