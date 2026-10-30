// src/documents/AssessmentRecord.tsx — Student's transparent assessment breakdown.
// Page 1: Subject | A1..A10 (raw marks only)
// Page 2 (or only page if N<=10): Subject | A11..AN | Assessment Avg | 30% | Exam | 70% | Final | Grade | Remark
// If N <= 10, only page 2 renders.

import { CONFIG } from "../lib/config";
import { getSettings } from "../lib/settings";
import { getEffectiveSemester } from "../lib/calendar";
import { gradeFor } from "../lib/calc";
import type { Assessment, Exam, Mark, Student } from "../types";


type Row = {
  subject: string;
  assessments: { id: string; label: string; max: number; value: number | null }[];
  recorded: number;
  total: number;
  assessmentAvg: number | null;
  assessment30: number | null;
  examRaw: number | null;
  exam70: number | null;
  final: number | null;
  grade: { code: string; label: string } | null;
  pending: boolean;
};

type Props = {
  student: Student;
  assessments: Assessment[];
  marks: Mark[];
  exams?: Exam[];
  sessionLabel?: string;
  semester?: number;
  average?: number | null;
  pending?: boolean;
};

export function AssessmentRecord({
  student, assessments, marks, exams = [], sessionLabel, semester, average, pending,
}: Props) {
  const session = sessionLabel ?? getSettings().session_label;
  const sem = semester ?? getEffectiveSemester();
  const semesterText = sem === 1 ? "First" : "Second";

  const rows: Row[] = CONFIG.subjects.map(subject => {
    const list = assessments
      .filter(a =>
        a.subject === subject &&
        a.class_name === student.class_name &&
        a.session_label === session &&
        a.semester === sem
      )
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
      .map(a => {
        const m = marks.find(mk => mk.assessment_id === a.id && mk.student_id === student.id);
        return { id: a.id, label: a.label, max: a.max_marks, value: m?.value ?? null };
      });

    const examRow = exams.find(e =>
      e.student_id === student.id &&
      e.subject === subject &&
      e.class_name === student.class_name &&
      e.session_label === session &&
      e.semester === sem
    );

    const recorded = list.filter(x => x.value != null).length;
    const allAssessPresent = list.length > 0 && recorded === list.length;
    const examPresent = examRow?.value != null;

    const assessmentAvg = allAssessPresent
      ? Math.round((list.reduce((s, x) => s + (x.value ?? 0) / x.max, 0) / list.length) * 10000) / 100
      : null;
    const assessment30 = assessmentAvg != null ? Math.round(assessmentAvg * CONFIG.assessmentWeight * 100) / 100 : null;
    const examRaw = examPresent ? examRow!.value : null;
    const exam70 = examRaw != null ? Math.round(examRaw * CONFIG.examWeight * 100) / 100 : null;
    const final = (assessment30 != null && exam70 != null) ? Math.round((assessment30 + exam70) * 100) / 100 : null;
    const pending = !allAssessPresent || !examPresent;
    const grade = final != null ? gradeFor(final) : null;

    return { subject, assessments: list, recorded, total: list.length, assessmentAvg, assessment30, examRaw, exam70, final, grade, pending };
  });

  const maxAssessments = Math.max(0, ...rows.map(r => r.assessments.length));
  const summaryCols = maxAssessments;
  const startIdx = 0;

  function renderHeader(part: "marks" | "summary" | "only") {
    return (
      <header className="ar-head">
        <img src="/logo.svg" alt="" />
        <div className="titles">
          <div className="school">{CONFIG.name}</div>
          <div className="doc">Assessment Report{part === "marks" ? " — Marks" : part === "summary" ? " — Summary" : ""}</div>
          <div className="sess">{session} · {semesterText} Semester</div>
        </div>
        <img src="/logo.svg" alt="" style={{ visibility: "hidden" }} />
      </header>
    );
  }

  function renderInfo() {
    return (
      <section className="info">
        <div><span>Student</span><b>{student.name}</b></div>
        <div><span>Reg. No.</span><b>{student.reg_no}</b></div>
        <div><span>Class</span><b>{student.class_name}</b></div>
        <div><span>Session</span><b>{session}</b></div>
        <div><span>Semester</span><b>{semesterText}</b></div>
        <div><span>Assessments</span><b>{maxAssessments}</b></div>
        <div><span>Exam weight</span><b>{CONFIG.examWeight * 100}%</b></div>
        <div><span>Assessment weight</span><b>{CONFIG.assessmentWeight * 100}%</b></div>
      </section>
    );
  }

  const styles = (
    <style>{`
      .ar-doc {
        width: var(--doc-w, 283mm); height: var(--doc-h, 195mm); overflow: hidden; margin: 0 auto;
        background: #fffdf7; border: 1.2mm double #b8923a; padding: 5mm 6mm;
        display: flex; flex-direction: column; gap: 3mm; box-sizing: border-box;
        font-family: Georgia, "Times New Roman", serif; color: #1c2420;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .ar-head { display: flex; align-items: center; justify-content: center; gap: 6mm; border-bottom: 0.5mm solid #1f5a3a; padding-bottom: 2mm; }
      .ar-head img { width: 20mm; height: 20mm; object-fit: contain; flex: none; }
      .ar-head .titles { text-align: center; }
      .ar-head .school { font-size: 18pt; font-weight: bold; color: #143d27; letter-spacing: 0.3pt; line-height: 1.15; }
      .ar-head .doc { font-size: 12pt; color: #b8923a; letter-spacing: 3pt; text-transform: uppercase; margin-top: 1mm; font-weight: bold; }
      .ar-head .sess { font-size: 9pt; color: #555; margin-top: 0.8mm; }
      .ar-doc .info { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.2mm 5mm; background: #eef3ee; border: 0.3mm solid #c9d6c9; padding: 2mm 4mm; }
      .ar-doc .info div { font-size: 9pt; display: flex; gap: 2mm; align-items: baseline; }
      .ar-doc .info span { color: #5a6a5f; text-transform: uppercase; font-size: 7pt; letter-spacing: 0.6pt; white-space: nowrap; }
      .ar-doc .info b { font-size: 10pt; }
      .ar-table { width: 100%; border-collapse: collapse; table-layout: auto; font-family: Arial, Helvetica, sans-serif; flex: 1 1 auto; min-height: 0; }
      .ar-table th, .ar-table td { border: 0.25mm solid #9fb3a5; text-align: center; font-size: 10.5pt; padding: 2.5mm 1mm; overflow: hidden; }
      .ar-table thead th { background: #1f5a3a; color: #fff; font-weight: bold; height: 9mm; }
      .ar-table thead th.subject { text-align: left; padding-left: 4mm; }
      .ar-table tbody td.subject { text-align: left; padding-left: 4mm; font-family: Georgia, serif; font-weight: bold; font-size: 11pt; background: #f6f9f6; white-space: nowrap; }
      .ar-table tbody tr:nth-child(even) td:not(.subject) { background: #f6f9f6; }
      .ar-table .cell-mark { font-family: "Courier New", monospace; font-weight: 600; font-size: 11pt; color: #143d27; }
      .ar-table .cell-missing { color: #b0731d; }
      .ar-table .cell-empty { color: #ccc; }
      .ar-table .cell-avg { background: #fbf3df !important; font-weight: bold; font-size: 11pt; color: #143d27; }
      .ar-table .cell-final { background: #fbf3df !important; font-weight: bold; font-size: 12pt; color: #143d27; }
      .ar-table .cell-grade { font-weight: bold; font-size: 12pt; color: #143d27; }
      .ar-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin-top: 3mm; border-top: 0.4mm solid #b8923a; padding-top: 3mm; }
      .ar-summary > div { border: 0.35mm solid #1f5a3a; padding: 2.5mm 3mm; text-align: center; background: #eef3ee; }
      .ar-summary small { display: block; font-family: Arial, sans-serif; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.8pt; color: #5a6a5f; }
      .ar-summary strong { display: block; font-size: 18pt; font-weight: bold; color: #143d27; line-height: 1.15; }
      .ar-summary em { font-style: normal; font-size: 8.5pt; color: #b8923a; font-weight: bold; }
      .ar-foot { margin-top: 2mm; padding-top: 2mm; border-top: 0.4mm solid #b8923a; font-family: Arial, sans-serif; font-size: 8pt; color: #444; line-height: 1.5; }
      .ar-foot > div { flex: 1; }
      .ar-foot em { font-style: italic; color: #143d27; }
      .ar-empty { padding: 30mm 0; text-align: center; font-size: 11pt; color: #7b827c; font-style: italic; }
      @page { size: A4 landscape; margin: 6mm; }
      @media print { html, body { background: none; } .ar-doc { margin: 0; page-break-inside: avoid; break-inside: avoid; } }
    `}</style>
  );

  if (maxAssessments === 0) {
    return (
      <div className="doc-stage"><div className="ar-doc">
        {styles}
        {renderHeader("only")}
        {renderInfo()}
        <div className="ar-empty">No assessments recorded for this semester yet.</div>
      </div></div>
    );
  }

  return (
    <>

      <div className="doc-stage"><div className="ar-doc">
        {styles}
        {renderHeader("only")}
        {renderInfo()}
        <table className="ar-table">
          <colgroup>
            <col style={{ width: "30mm" }} />
            {Array.from({ length: summaryCols }).map((_, i) => (
              <col key={i} style={{ width: "calc((100% - 30mm - 20mm) / " + Math.max(1, summaryCols) + ")" }} />
            ))}
            <col style={{ width: "20mm" }} />
          </colgroup>
          <thead>
            <tr>
              <th className="subject">Subject</th>
              {Array.from({ length: summaryCols }).map((_, i) => <th key={i}>{startIdx + i + 1}</th>)}
              <th>Average</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              return (
                <tr key={row.subject}>
                  <td className="subject">{row.subject}</td>
                  {Array.from({ length: summaryCols }).map((_, i) => {
                    const a = row.assessments[startIdx + i];
                    if (!a) return <td key={i} className="cell-empty">—</td>;
                    return <td key={i} className={"cell-mark " + (a.value != null ? "" : "cell-missing")}>{a.value != null ? a.value : "—"}</td>;
                  })}
                  <td className="cell-avg">{row.assessmentAvg != null ? row.assessmentAvg.toFixed(1) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <footer className="ar-foot">
          <div><strong>Average</strong> = mean of the assessment marks, scaled to 100. Assessment Report lists raw marks only — see the Report Card for final grades.</div>
        </footer>
      </div></div>
    </>
  );
}
