// src/lib/calc.ts — grades, averages, semester aggregation, fee math.
// All numeric logic lives here. Do not duplicate arithmetic elsewhere.

import type { Assessment, Enrollment, Exam, Fee, FeePayment, Grade, Mark, Student, SubjectResult } from "../types";
import { CONFIG } from "./config";
import { currentFeeYear } from "./settings";

export function gradeFor(p: number | null): Grade {
  if (p == null) return { min: 0, label: "—", tone: "neutral", code: "—" } as Grade;
  for (const g of CONFIG.grades) if (p >= g.min) return g;
  return CONFIG.grades[CONFIG.grades.length - 1];
}

export function subjectResult(
  subject: string, assessments: Assessment[],
  marksByAssess: Record<string, number | null>, exam: number | null
): SubjectResult & { pending: boolean } {
  const subjAssessments = assessments.filter(a => a.subject === subject);
  let pending = false;

  if (subjAssessments.length) {
    for (const a of subjAssessments) {
      if (marksByAssess[a.id] == null) { pending = true; break; }
    }
  } else pending = true;

  let assessmentPct: number | null = null;
  if (subjAssessments.length && !pending) {
    let sum = 0;
    for (const a of subjAssessments) {
      const val = marksByAssess[a.id] ?? 0;
      sum += val / (a.max_marks || CONFIG.assessmentMax);
    }
    assessmentPct = Math.round((sum / subjAssessments.length) * 10000) / 100;
  }

  const examPct = exam != null ? exam : null;
  if (examPct == null) pending = true;

  let final: number | null = null;
  if (!pending && assessmentPct != null && examPct != null) {
    final = Math.round((assessmentPct * CONFIG.assessmentWeight + examPct * CONFIG.examWeight) * 100) / 100;
  }

  return {
    subject, assessmentPct, examPct, final,
    grade: gradeFor(final), count: subjAssessments.length, pending,
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

export type SemesterGroup = {
  key: string; class_name: string; session_label: string; semester: number;
  results: (SubjectResult & { pending: boolean })[]; avg: number | null;
};

export function buildAllSemesters(student: Student, assessments: Assessment[], marks: Mark[], exams: Exam[], enrollments: Enrollment[] = []): SemesterGroup[] {
  const enrolledCombos = new Set(
    enrollments
      .filter(e => e.student_id === student.id)
      .map(e => `${e.class_name}|${e.session_label}`)
  );
  const groups = new Map<string, Assessment[]>();
  for (const a of assessments) {
    if (enrollments.length > 0 && !enrolledCombos.has(`${a.class_name}|${a.session_label}`)) continue;
    const key = `${a.class_name}|${a.session_label}|${a.semester}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }
  const out: SemesterGroup[] = [];
  for (const [key, groupAssessments] of groups) {
    const first = groupAssessments[0];
    const studentExams = exams.filter(e =>
      e.student_id === student.id && e.class_name === first.class_name &&
      e.session_label === first.session_label && e.semester === first.semester
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
    if (!results.some(r => r.final != null || r.pending)) continue;
    out.push({ key, class_name: first.class_name, session_label: first.session_label, semester: first.semester, results, avg: semesterAvg(results) });
  }
  return out.sort((a, b) => {
    const s = a.session_label.localeCompare(b.session_label);
    return s !== 0 ? s : a.semester - b.semester;
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
    out[s] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null;
  }
  return out;
}

export function fmtNGN(n: number): string {
  return "\u20A6" + Number(n).toLocaleString("en-NG");
}

export type FeeStatus = "unpaid" | "partial" | "paid" | "scholarship";

export function feeFor(student_id: string, fees: Fee[]): Fee | undefined {
  return fees.find(f => f.student_id === student_id && f.year === currentFeeYear());
}
export function paymentsFor(student_id: string, payments: FeePayment[]): FeePayment[] {
  return payments.filter(p => p.student_id === student_id && p.year === currentFeeYear())
    .sort((a, b) => a.paid_on.localeCompare(b.paid_on));
}
export function computeFee(student_id: string, fees: Fee[], payments: FeePayment[]) {
  const fee = feeFor(student_id, fees);
  const amount = fee?.amount ?? CONFIG.registrationFee;
  if ((fee?.status ?? "unpaid") === "scholarship") {
    return { amount, paid: 0, balance: 0, status: "scholarship" as FeeStatus, payments: [] as FeePayment[] };
  }
  const list = paymentsFor(student_id, payments);
  const paid = list.reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, amount - paid);
  const status: FeeStatus = paid === 0 ? "unpaid" : paid >= amount ? "paid" : "partial";
  return { amount, paid, balance, status, payments: list };
}
export function methodLabel(m: FeePayment["method"]): string {
  return m === "cash" ? "Cash" : m === "transfer" ? "Bank transfer" : m === "pos" ? "POS" : "Other";
}
