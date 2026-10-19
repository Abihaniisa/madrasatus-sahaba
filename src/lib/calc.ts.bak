import type { Assessment, Exam, Grade, Mark, Student, SubjectResult } from "./types";
import { CONFIG } from "./config";

export function gradeFor(p: number | null): Grade {
  if (p == null) return { min: 0, label: "—", tone: "neutral", code: "—" } as Grade & { code: string };
  for (const g of CONFIG.grades) if (p >= g.min) return g;
  return CONFIG.grades[CONFIG.grades.length - 1];
}

/* Subject result. Pending means: an assessment exists for this subject
   but the student has no mark recorded. Pending excludes the subject
   from any calculation and shows "Pending" on the report. */
export function subjectResult(
  subject: string,
  assessments: Assessment[],
  marksByAssess: Record<string, number | null>,
  exam: number | null
): SubjectResult & { pending: boolean } {
  const subjAssessments = assessments.filter(a => a.subject === subject);
  let pending = false;

  if (subjAssessments.length) {
    for (const a of subjAssessments) {
      if (marksByAssess[a.id] == null) { pending = true; break; }
    }
  }

  let assessmentPct: number | null = null;
  if (subjAssessments.length && !pending) {
    let sum = 0;
    for (const a of subjAssessments) {
      const val = marksByAssess[a.id] ?? 0;
      const max = a.max_marks || CONFIG.assessmentMax;
      sum += val / max;
    }
    assessmentPct = Math.round((sum / subjAssessments.length) * 10000) / 100;
  }

  const examPct = exam != null ? exam : null;
  let final: number | null = null;
  if (!pending && assessmentPct != null && examPct != null)
    final = Math.round((assessmentPct * CONFIG.assessmentWeight + examPct * CONFIG.examWeight) * 100) / 100;
  else if (!pending && assessmentPct != null)
    final = Math.round(assessmentPct * 100) / 100;
  else if (!pending && examPct != null)
    final = Math.round(examPct * 100) / 100;

  return {
    subject,
    assessmentPct,
    examPct,
    final,
    grade: gradeFor(final),
    count: subjAssessments.length,
    pending,
  };
}

export function semesterAvg(results: (SubjectResult & { pending: boolean })[]): number | null {
  const vals = results.filter(r => !r.pending && r.final != null).map(r => r.final!);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

export function hasPending(results: (SubjectResult & { pending: boolean })[]): boolean {
  return results.some(r => r.pending);
}

/* ---------- semester grouping ---------- */

export type SemesterGroup = {
  key: string;
  class_name: string;
  session_label: string;
  semester: number;
  results: (SubjectResult & { pending: boolean })[];
  avg: number | null;
};

export function buildAllSemesters(
  student: Student,
  assessments: Assessment[],
  marks: Mark[],
  exams: Exam[]
): SemesterGroup[] {
  const groups = new Map<string, Assessment[]>();
  for (const a of assessments) {
    const key = `${a.class_name}|${a.session_label}|${a.semester}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }
  const out: SemesterGroup[] = [];
  for (const [key, groupAssessments] of groups) {
    const first = groupAssessments[0];
    const studentExams = exams.filter(e =>
      e.student_id === student.id &&
      e.class_name === first.class_name &&
      e.session_label === first.session_label &&
      e.semester === first.semester
    );
    const results = CONFIG.subjects.map(subject => {
      const marksByAssess: Record<string, number | null> = {};
      for (const a of groupAssessments.filter(x => x.subject === subject)) {
        const m = marks.find(mk => mk.assessment_id === a.id && mk.student_id === student.id);
        marksByAssess[a.id] = m?.value ?? null;
      }
      const examRow = studentExams.find(e => e.subject === subject);
      return subjectResult(subject, groupAssessments, marksByAssess, examRow?.value ?? null);
    });
    const hasAny = results.some(r => r.final != null || r.pending);
    if (!hasAny) continue;
    out.push({
      key,
      class_name: first.class_name,
      session_label: first.session_label,
      semester: first.semester,
      results,
      avg: semesterAvg(results),
    });
  }
  return out.sort((a, b) => {
    const s = a.session_label.localeCompare(b.session_label);
    if (s !== 0) return s;
    return a.semester - b.semester;
  });
}

export function cumulativeAvg(groups: SemesterGroup[]): number | null {
  const vals = groups.map(g => g.avg).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

export function cumulativeBySubject(groups: SemesterGroup[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const s of CONFIG.subjects) {
    const vals: number[] = [];
    for (const g of groups) {
      const r = g.results.find(x => x.subject === s);
      if (r && !r.pending && r.final != null) vals.push(r.final);
    }
    out[s] = vals.length
      ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
      : null;
  }
  return out;
}

/* ---------- helpers ---------- */

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function fmtN(n: number): string {
  return "\u20A6" + Number(n).toLocaleString("en-NG");
}

export function waLink(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
