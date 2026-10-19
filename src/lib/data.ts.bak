import { supabase } from "./supabase";
import type { Assessment, Exam, Fee, FeePayment, Mark, Material, Student, SubjectResult } from "./types";
import { CONFIG } from "./config";
import {
  subjectResult, semesterAvg, hasPending,
  buildAllSemesters, cumulativeAvg as calcCumulative,
  cumulativeBySubject, type SemesterGroup,
} from "./calc";

export type SchoolData = {
  students: Student[];
  assessments: Assessment[];
  marks: Mark[];
  exams: Exam[];
  fees: Fee[];
  feePayments: FeePayment[];
};

export async function loadSchool(): Promise<SchoolData> {
  const [students, assessments, marks, exams, fees, feePayments] = await Promise.all([
    supabase.from("students").select("*").order("name"),
    supabase.from("assessments").select("*").order("created_at"),
    supabase.from("marks").select("*"),
    supabase.from("exams").select("*"),
    supabase.from("fees").select("*"),
    supabase.from("fee_payments").select("*").order("paid_on"),
  ]);
  return {
    students: (students.data as Student[]) ?? [],
    assessments: (assessments.data as Assessment[]) ?? [],
    marks: (marks.data as Mark[]) ?? [],
    exams: (exams.data as Exam[]) ?? [],
    fees: (fees.data as Fee[]) ?? [],
    feePayments: (feePayments.data as FeePayment[]) ?? [],
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
  semester = 1
): FullReport {
  const classAssess = assessments.filter(a => a.class_name === student.class_name && a.semester === semester);
  const studentExams = exams.filter(e => e.student_id === student.id && e.semester === semester);
  const results = CONFIG.subjects.map(subject => {
    const marksByAssess: Record<string, number | null> = {};
    for (const a of classAssess.filter(x => x.subject === subject)) {
      const m = marks.find(mk => mk.assessment_id === a.id && mk.student_id === student.id);
      marksByAssess[a.id] = m?.value ?? null;
    }
    const examRow = studentExams.find(e => e.subject === subject);
    return subjectResult(subject, classAssess, marksByAssess, examRow?.value ?? null);
  });
  const semesters = buildAllSemesters(student, assessments, marks, exams);
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
  exams: Exam[]
): number | null {
  const list = students.filter(s => s.class_name === cls);
  const vals: number[] = [];
  for (const s of list) {
    const r = buildReport(s, assessments, marks, exams);
    if (r.avg != null) vals.push(r.avg);
  }
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}
