// src/documents/ReportCard.tsx — Semester Report Card + Certificate Cover as two A4 pages.
// Auto-updates. Optional sessionLabel / semester for historical rendering.
// On screen and print: certificate cover first, then report card data.

import { CONFIG, SECTIONS } from "../lib/config";
import { gradeFor } from "../lib/calc";
import { Certificate } from "./Certificate";
import type { Student, SubjectResult } from "../types";

type Props = {
  student: Student;
  results: (SubjectResult & { pending: boolean })[];
  average: number | null;
  pending: boolean;
  sessionLabel?: string;
  semester?: number;
};

export function ReportCard({ student, results, average, pending, sessionLabel, semester }: Props) {
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const sectionName = SECTIONS.find(s => s.id === student.section)?.name ?? student.section;
  const overallGrade = gradeFor(pending ? null : average);
  const passed = results.filter(r => !r.pending && r.final != null && r.final >= 50).length;
  const total = results.length;
  const sem = semester ?? CONFIG.currentSemester;
  const session = sessionLabel ?? CONFIG.sessionLabel;
  const semesterText = sem === 1 ? "First" : "Second";

  return (
    <>
      <div className="report-card-page-1">
        <Certificate
          student={student}
          results={results}
          average={average}
          pending={pending}
          semester={sem}
          sessionLabel={session}
        />
      </div>
      <div className="report-card-page-2">
        <div className="doc-stage">
        <style>{`
          @page { size: A4 landscape; margin: 6mm; }
          .report-card {
            width: var(--doc-w, 283mm); height: var(--doc-h, 195mm); overflow: hidden; margin: 0 auto; background: #fffdf7;
            border: 1.2mm double #b8923a; padding: 5mm 6mm; box-sizing: border-box;
            font-family: Georgia, "Times New Roman", serif; color: #1c2420;
            display: flex; flex-direction: column; gap: 3mm;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          .report-card header { display: flex; align-items: center; justify-content: center; gap: 6mm; border-bottom: 0.5mm solid #1f5a3a; padding-bottom: 2mm; }
          .report-card header img { width: 22mm; height: 22mm; object-fit: contain; flex: none; }
          .report-card .titles { text-align: center; }
          .report-card .school { font-size: 19pt; font-weight: bold; color: #143d27; letter-spacing: 0.3pt; line-height: 1.15; }
          .report-card .doc { font-size: 12.5pt; color: #b8923a; letter-spacing: 3pt; text-transform: uppercase; margin-top: 1mm; font-weight: bold; }
          .report-card .sess { font-size: 9pt; color: #555; margin-top: 0.8mm; }
          .report-card .info { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.2mm 5mm; background: #eef3ee; border: 0.3mm solid #c9d6c9; padding: 2mm 4mm; }
          .report-card .info div { font-size: 9pt; display: flex; gap: 2mm; align-items: baseline; }
          .report-card .info span { color: #5a6a5f; text-transform: uppercase; font-size: 7pt; letter-spacing: 0.6pt; white-space: nowrap; }
          .report-card .info b { font-size: 10pt; }
          .report-card table { width: 100%; flex: 1 1 auto; min-height: 0; border-collapse: collapse; table-layout: fixed; font-family: Arial, Helvetica, sans-serif; }
          .report-card th, .report-card td { border: 0.25mm solid #9fb3a5; text-align: center; font-size: 11pt; padding: 0; overflow: hidden; }
          .report-card thead th { background: #1f5a3a; color: #fff; height: 9mm; font-weight: bold; line-height: 1.15; }
          .report-card thead th.sub2 { background: #eef3ee; color: #143d27; }
          .report-card thead tr.top th { height: 7mm; font-size: 10pt; letter-spacing: 0.5pt; }
          .report-card thead tr.wk th { height: 7mm; font-size: 9pt; }
          .report-card tbody td { height: min(12mm, calc(78mm / var(--n, 5))); }
          .report-card tbody tr:nth-child(even) td { background: #f6f9f6; }
          .report-card td.subj { text-align: left; padding-left: 4mm; font-weight: bold; font-size: 12.5pt; font-family: Georgia, serif; }
          .report-card td.fin { font-weight: bold; font-size: 13pt; background: #fbf3df; }
          .report-card td.grade { font-weight: bold; font-size: 15pt; color: #143d27; }
          .report-card td.remark { font-size: 10.5pt; }
          .report-card .bottom { display: grid; grid-template-columns: 1.05fr 1fr; gap: 4mm; }
          .report-card .summary { border: 0.4mm solid #1f5a3a; display: grid; grid-template-columns: repeat(3, 1fr); }
          .report-card .summary div { padding: 2mm 3mm; text-align: center; border-right: 0.25mm solid #b9c9bd; display: flex; flex-direction: column; justify-content: center; }
          .report-card .summary div:last-child { border-right: none; }
          .report-card .summary small { font-family: Arial, sans-serif; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.7pt; color: #5a6a5f; }
          .report-card .summary strong { font-size: 19pt; color: #143d27; line-height: 1.25; }
          .report-card .summary em { font-style: normal; font-size: 8.5pt; color: #b8923a; font-weight: bold; }
          .report-card .side { display: flex; flex-direction: column; gap: 2mm; }
          .report-card .key { font-family: Arial, sans-serif; font-size: 7.5pt; border: 0.25mm solid #c9d6c9; padding: 1.8mm 3mm; background: #eef3ee; line-height: 1.5; }
          .report-card .key b { color: #143d27; }
          .report-card .formula { font-family: Arial, sans-serif; font-size: 7.2pt; color: #555; line-height: 1.4; }
          .report-card .sigs { display: flex; justify-content: space-around; align-items: flex-end; margin-top: auto; padding: 0 12mm; height: 15mm; }
          .report-card .sig { width: 75mm; text-align: center; border-top: 0.35mm solid #1c2420; padding-top: 1.2mm; font-size: 9.5pt; font-weight: bold; }
          .report-card .sig span { display: block; font-size: 7pt; font-weight: normal; color: #666; font-family: Arial, sans-serif; }
          @media print {
            .report-card { page-break-inside: avoid; break-inside: avoid; }
            .report-card thead th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .report-card-page-1 { page-break-after: always; break-after: page; }
          }
        `}</style>
        <div className="report-card" style={{ "--n": Math.max(1, results.length) } as React.CSSProperties}>
          <header>
            <img src="/logo.svg" alt="" />
            <div className="titles">
              <div className="school">{CONFIG.name}</div>
              <div className="doc">Semester Report Card</div>
              <div className="sess">{session} · {semesterText} Semester</div>
            </div>
            <img src="/logo.svg" alt="" style={{ visibility: "hidden" }} />
          </header>
          <section className="info">
            <div><span>Student</span><b>{student.name}</b></div>
            <div><span>Reg. No.</span><b>{student.reg_no}</b></div>
            <div><span>Class</span><b>{student.class_name}</b></div>
            <div><span>Section</span><b>{sectionName}</b></div>
            <div><span>Mode</span><b>{student.mode === "online" ? "Online" : "Physical"}</b></div>
            <div><span>Session</span><b>{session}</b></div>
            <div><span>Semester</span><b>{semesterText}</b></div>
            <div><span>Date Issued</span><b>{today}</b></div>
          </section>
          <table>
            <colgroup>
              <col style={{ width: "19%" }} /><col style={{ width: "10.5%" }} /><col style={{ width: "10.5%" }} />
              <col style={{ width: "10.5%" }} /><col style={{ width: "10.5%" }} /><col style={{ width: "11%" }} />
              <col style={{ width: "9%" }} /><col style={{ width: "19%" }} />
            </colgroup>
            <thead>
              <tr className="top">
                <th rowSpan={2}>Subject</th><th colSpan={2}>Assessments</th><th colSpan={2}>Exam</th>
                <th rowSpan={2}>Final<br/>/100</th><th rowSpan={2}>Grade</th><th rowSpan={2}>Remark</th>
              </tr>
              <tr className="wk">
                <th className="sub2">Avg /{CONFIG.assessmentMax}</th>
                <th className="sub2">{CONFIG.assessmentWeight * 100}%</th>
                <th className="sub2">Score /{CONFIG.examMax}</th>
                <th className="sub2">{CONFIG.examWeight * 100}%</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => {
                const assessmentOutOfMax = r.assessmentPct != null ? (r.assessmentPct / 100) * CONFIG.assessmentMax : null;
                const assessmentContribution = r.assessmentPct != null ? r.assessmentPct * CONFIG.assessmentWeight : null;
                const examContribution = r.examPct != null ? r.examPct * CONFIG.examWeight : null;
                const remark = r.pending ? "Pending" : r.grade.label;
                return (
                  <tr key={r.subject}>
                    <td className="subj">{r.subject}</td>
                    <td>{assessmentOutOfMax != null ? assessmentOutOfMax.toFixed(2) : "—"}</td>
                    <td>{assessmentContribution != null ? assessmentContribution.toFixed(2) : "—"}</td>
                    <td>{r.examPct != null ? r.examPct : "—"}</td>
                    <td>{examContribution != null ? examContribution.toFixed(2) : "—"}</td>
                    <td className="fin">{r.final != null ? r.final.toFixed(1) : "—"}</td>
                    <td className="grade">{r.pending ? "—" : r.grade.code}</td>
                    <td className="remark">{remark}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <section className="bottom">
            <div className="summary">
              <div><small>Semester Average</small><strong>{average != null && !pending ? average.toFixed(1) : "—"}</strong><em>out of 100</em></div>
              <div><small>Overall Grade</small><strong>{pending ? "—" : overallGrade.code}</strong><em>{pending ? "Provisional" : overallGrade.label}</em></div>
              <div><small>Subjects Passed</small><strong>{passed} / {total}</strong><em>{pending ? "Pending marks" : passed === total ? "No failures" : `${total - passed} below pass mark`}</em></div>
            </div>
            <div className="side">
              <div className="key"><b>Grading key:</b> A Distinction (75+) · B Credit (60–74) · C Pass (50–59) · D Fail (below 50)</div>
              <div className="formula">Final score = {CONFIG.assessmentWeight * 100}% of the average of all recorded assessments (scaled to 100) + {CONFIG.examWeight * 100}% of the exam. Semester average = mean of the {total} subject finals.</div>
            </div>
          </section>
          <section className="sigs">
            <div className="sig">Class Teacher<span>Signature &amp; Date</span></div>
            <div className="sig">Head of School<span>Signature, Stamp &amp; Date</span></div>
          </section>
        </div>
        </div>
      </div>
    </>
  );
}
