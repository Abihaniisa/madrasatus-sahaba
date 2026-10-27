// src/lib/data.ts — all DB queries + report aggregation.
// buildReport and classAverage accept an optional sessionLabel so historical
// reports can be rendered. Existing callers that omit it get current session.

import { supabase } from "./supabase";
import type { Assessment, Enrollment, Exam, Fee, FeePayment, Mark, Material, Student, SubjectResult } from "../types";
import { CONFIG, SECTIONS } from "./config";
import { getSettings } from "./settings";
import { getEffectiveSemester } from "./calendar";
import {
  subjectResult, semesterAvg, hasPending,
  buildAllSemesters, cumulativeAvg as calcCumulative,
  cumulativeBySubject, type SemesterGroup,
} from "./calc";

export type SchoolData = {
  students: Student[]; assessments: Assessment[]; marks: Mark[];
  exams: Exam[]; fees: Fee[]; feePayments: FeePayment[]; enrollments: Enrollment[];
};

export async function loadSchool(): Promise<SchoolData> {
  const [students, assessments, marks, exams, fees, feePayments, enrollments] = await Promise.all([
    supabase.from("students").select("*").order("name"),
    supabase.from("assessments").select("*").order("created_at"),
    supabase.from("marks").select("*"),
    supabase.from("exams").select("*"),
    supabase.from("fees").select("*"),
    supabase.from("fee_payments").select("*").order("paid_on"),
    supabase.from("enrollments").select("*"),
  ]);
  return {
    students: (students.data as Student[]) ?? [],
    assessments: (assessments.data as Assessment[]) ?? [],
    marks: (marks.data as Mark[]) ?? [],
    exams: (exams.data as Exam[]) ?? [],
    fees: (fees.data as Fee[]) ?? [],
    feePayments: (feePayments.data as FeePayment[]) ?? [],
    enrollments: (enrollments.data as Enrollment[]) ?? [],
  };
}

export async function loadMaterials(publishedOnly = true): Promise<Material[]> {
  let q = supabase.from("materials").select("*").order("order_num", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
  if (publishedOnly) q = q.eq("published", true);
  const { data } = await q;
  return (data as Material[]) ?? [];
}

export type FullReport = {
  results: (SubjectResult & { pending: boolean })[];
  avg: number | null;
  cumulative: number | null;
  cumulativeBySubject: Record<string, number | null>;
  semesters: SemesterGroup[];
  pending: boolean;
};

export function buildReport(
  student: Student,
  assessments: Assessment[],
  marks: Mark[],
  exams: Exam[],
  semester = getEffectiveSemester(),
  sessionLabel = getSettings().session_label,
  className?: string,
  enrollments: Enrollment[] = []
): FullReport {
  const targetClass = className ?? student.class_name;
  const classAssess = assessments.filter(a =>
    a.class_name === targetClass && a.semester === semester && a.session_label === sessionLabel
  );
  const studentExams = exams.filter(e =>
    e.student_id === student.id &&
    e.semester === semester &&
    e.session_label === sessionLabel &&
    e.class_name === targetClass
  );
  const results = CONFIG.subjects.map(subject => {
    const marksByAssess: Record<string, number | null> = {};
    for (const a of classAssess.filter(x => x.subject === subject)) {
      const m = marks.find(mk => mk.assessment_id === a.id && mk.student_id === student.id);
      marksByAssess[a.id] = m?.value ?? null;
    }
    const examRow = studentExams.find(e => e.subject === subject);
    return subjectResult(subject, classAssess, marksByAssess, examRow?.value ?? null);
  });
  const semesters = buildAllSemesters(student, assessments, marks, exams, enrollments);
  return {
    results,
    avg: semesterAvg(results),
    cumulative: calcCumulative(semesters),
    cumulativeBySubject: cumulativeBySubject(semesters),
    semesters,
    pending: hasPending(results),
  };
}

export function classAverage(
  cls: string,
  students: Student[],
  assessments: Assessment[],
  marks: Mark[],
  exams: Exam[],
  semester = getEffectiveSemester(),
  sessionLabel = getSettings().session_label
): number | null {
  const list = students.filter(s => s.class_name === cls);
  const vals: number[] = [];
  for (const s of list) {
    const r = buildReport(s, assessments, marks, exams, semester, sessionLabel, cls);
    if (r.avg != null) vals.push(r.avg);
  }
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null;
}

// ─── Graduation / cohort helpers ──────────────
// Section of a class (Foundation / Secondary / Higher)
export function sectionOfClass(className: string): string | null {
  for (const s of SECTIONS) {
    if (s.classes.includes(className)) return s.name;
  }
  return null;
}

// Last completed enrollment for a student (highest session, then highest class index)
export function lastCompletedEnrollment(e: Enrollment[]): Enrollment | null {
  const completed = e.filter(x => x.status === "completed" || x.status === "graduated");
  if (completed.length === 0) return null;
  return completed.sort((a, b) => {
    const s = b.session_label.localeCompare(a.session_label);
    if (s !== 0) return s;
    return 0;
  })[0];
}

// Cohort: students active in a given class in a given session (via enrollments, not students.class_name)
export function cohortFor(data: SchoolData, className: string, sessionLabel: string): Student[] {
  const ids = new Set(
    data.enrollments
      .filter(e => e.class_name === className && e.session_label === sessionLabel
        && (e.status === "active" || e.status === "repeating") && !e.ended)
      .map(e => e.student_id)
  );
  return data.students.filter(s => ids.has(s.id));
}

// All graduated students grouped by section → year → students
export function graduatedBySectionAndYear(data: SchoolData): Record<string, Record<string, Student[]>> {
  const result: Record<string, Record<string, Student[]>> = {};
  for (const s of data.students) {
    if (s.status !== "graduated") continue;
    const lastEnr = lastCompletedEnrollment(data.enrollments.filter(e => e.student_id === s.id));
    if (!lastEnr) continue;
    const section = sectionOfClass(lastEnr.class_name) ?? "Unknown";
    const year = lastEnr.session_label;
    if (!result[section]) result[section] = {};
    if (!result[section][year]) result[section][year] = [];
    result[section][year].push(s);
  }
  return result;
}
