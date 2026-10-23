// src/documents/AssessmentRecord.tsx — Student-facing detailed breakdown of assessments.
// One row per subject, columns A1..AN. Page-breaks every 10 assessments.
// Pending: if a subject has any un-entered mark, that subject's row shows a dash for
// the missing cell, and its avg/final columns show "pending".

import { CONFIG } from "../lib/config";
import type { Assessment, Mark, Student } from "../types";

const PER_PAGE = 10;

type SubjectRow = {
  subject: string;
  assessments: { id: string; label: string; max: number; value: number | null }[];
  recorded: number;
  total: number;
  avg: number | null;
};

type Props = {
  student: Student;
  assessments: Assessment[];
  marks: Mark[];
  sessionLabel?: string;
  semester?: number;
};

export function AssessmentRecord({ student, assessments, marks, sessionLabel, semester }: Props) {
  const session = sessionLabel ?? CONFIG.sessionLabel;
  const sem = semester ?? CONFIG.currentSemester;
  const semesterText = sem === 1 ? "First" : "Second";

  const subjectRows: SubjectRow[] = CONFIG.subjects.map(subject => {
    const list = assessments
      .filter(a => a.subject === subject)
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
      .map(a => {
        const m = marks.find(mk => mk.assessment_id === a.id && mk.student_id === student.id);
        return { id: a.id, label: a.label, max: a.max_marks, value: m?.value ?? null };
      });
    const recorded = list.filter(x => x.value != null).length;
    const avg = recorded === list.length && list.length > 0
      ? Math.round((list.reduce((s, x) => s + (x.value ?? 0) / x.max, 0) / list.length) * 10000) / 100
      : null;
    return { subject, assessments: list, recorded, total: list.length, avg };
  });

  const maxAssessments = Math.max(0, ...subjectRows.map(r => r.assessments.length));
  const pageCount = Math.max(1, Math.ceil(maxAssessments / PER_PAGE));
  const anyAssessments = maxAssessments > 0;

  if (!anyAssessments) {
    return (
      <div className="ar-doc">
        <style>{STYLES}</style>
        <header className="ar-head">
          <img src="/logo.svg" alt="" />
          <div className="titles">
            <div className="school">{CONFIG.name}</div>
            <div className="doc">Assessment Record</div>
            <div className="sess">{session} · {semesterText} Semester</div>
          </div>
          <img src="/logo.svg" alt="" style={{ visibility: "hidden" }} />
        </header>
        <section className="info">
          <div><span>Student</span><b>{student.name}</b></div>
          <div><span>Reg. No.</span><b>{student.reg_no}</b></div>
          <div><span>Class</span><b>{student.class_name}</b></div>
          <div><span>Session</span><b>{session}</b></div>
        </section>
        <div className="empty-note">No assessments recorded for this semester yet.</div>
      </div>
    );
  }

  return (
    <>
      {Array.from({ length: pageCount }).map((_, pageIdx) => {
        const startCol = pageIdx * PER_PAGE;
        const endCol = Math.min(startCol + PER_PAGE, maxAssessments);
        const colsInThisPage = endCol - startCol;

        return (
          <div className="ar-doc" key={pageIdx}>
            <style>{STYLES}</style>
            <header className="ar-head">
              <img src="/logo.svg" alt="" />
              <div className="titles">
                <div className="school">{CONFIG.name}</div>
                <div className="doc">Assessment Record</div>
                <div className="sess">
                  {session} · {semesterText} Semester
                  {pageCount > 1 && <> · Page {pageIdx + 1} of {pageCount}</>}
                </div>
              </div>
              <img src="/logo.svg" alt="" style={{ visibility: "hidden" }} />
            </header>

            <section className="info">
              <div><span>Student</span><b>{student.name}</b></div>
              <div><span>Reg. No.</span><b>{student.reg_no}</b></div>
              <div><span>Class</span><b>{student.class_name}</b></div>
              <div><span>Session</span><b>{session}</b></div>
              <div><span>Semester</span><b>{semesterText}</b></div>
              <div><span>Assessments</span><b>{maxAssessments}</b></div>
              <div><span>Scale</span><b>Avg %</b></div>
              <div><span>Count</span><b>{pageIdx + 1} / {pageCount}</b></div>
            </section>

            <table className="ar-table">
              <colgroup>
                <col style={{ width: "22%" }} />
                {Array.from({ length: colsInThisPage }).map((_, i) => (
                  <col key={i} style={{ width: `${Math.max(4, 60 / Math.max(colsInThisPage, 1))}%` }} />
                ))}
                <col style={{ width: "14%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="subject">Subject</th>
                  {Array.from({ length: colsInThisPage }).map((_, i) => (
                    <th key={i}>A{startCol + i + 1}</th>
                  ))}
                  <th>Avg %</th>
                </tr>
              </thead>
              <tbody>
                {subjectRows.map(row => (
                  <tr key={row.subject}>
                    <td className="subject">{row.subject}</td>
                    {Array.from({ length: colsInThisPage }).map((_, i) => {
                      const colIdx = startCol + i;
                      const a = row.assessments[colIdx];
                      if (!a) return <td key={i} className="cell-empty">—</td>;
                      const filled = a.value != null;
                      return (
                        <td key={i} className={"cell-mark " + (filled ? "" : "cell-missing")}>
                          {filled ? a.value : "—"}
                        </td>
                      );
                    })}
                    <td className="cell-avg">
                      {row.avg != null ? row.avg.toFixed(1) : (row.total === 0 ? "—" : "pending")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <footer className="ar-foot">
              <div>
                <strong>Assessments-only breakdown.</strong> This record shows the raw assessment marks
                that combine (with the exam) into the subject final on the semester report card.
              </div>
              <div>
                Avg % = mean of all recorded assessments for that subject, scaled to 100.
                A subject is <em>pending</em> until every assessment for it is entered.
              </div>
            </footer>
          </div>
        );
      })}
    </>
  );
}

const STYLES = `
  .ar-doc {
    width: 287mm;
    min-height: 194mm;
    margin: 0 auto 8mm;
    background: #fffdf7;
    border: 1.2mm double #b8923a;
    padding: 5mm 6mm;
    display: flex;
    flex-direction: column;
    gap: 3mm;
    box-sizing: border-box;
    font-family: Georgia, "Times New Roman", serif;
    color: #1c2420;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    page-break-after: always;
    break-after: page;
  }
  .ar-doc:last-of-type { page-break-after: auto; break-after: auto; }

  .ar-head {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6mm;
    border-bottom: 0.5mm solid #1f5a3a;
    padding-bottom: 2mm;
  }
  .ar-head img { width: 20mm; height: 20mm; object-fit: contain; flex: none; }
  .ar-head .titles { text-align: center; }
  .ar-head .school { font-size: 18pt; font-weight: bold; color: #143d27; letter-spacing: 0.3pt; line-height: 1.15; }
  .ar-head .doc { font-size: 12pt; color: #b8923a; letter-spacing: 3pt; text-transform: uppercase; margin-top: 1mm; font-weight: bold; }
  .ar-head .sess { font-size: 9pt; color: #555; margin-top: 0.8mm; }

  .ar-doc .info {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.2mm 5mm;
    background: #eef3ee;
    border: 0.3mm solid #c9d6c9;
    padding: 2mm 4mm;
  }
  .ar-doc .info div { font-size: 9pt; display: flex; gap: 2mm; align-items: baseline; }
  .ar-doc .info span { color: #5a6a5f; text-transform: uppercase; font-size: 7pt; letter-spacing: 0.6pt; white-space: nowrap; }
  .ar-doc .info b { font-size: 10pt; }

  .ar-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-family: Arial, Helvetica, sans-serif;
    flex: 1;
  }
  .ar-table th, .ar-table td {
    border: 0.25mm solid #9fb3a5;
    text-align: center;
    font-size: 11pt;
    padding: 2.5mm 1mm;
    overflow: hidden;
  }
  .ar-table thead th { background: #1f5a3a; color: #fff; font-weight: bold; height: 9mm; }
  .ar-table thead th.subject { text-align: left; padding-left: 4mm; }
  .ar-table tbody td.subject {
    text-align: left;
    padding-left: 4mm;
    font-family: Georgia, serif;
    font-weight: bold;
    font-size: 12pt;
    background: #f6f9f6;
  }
  .ar-table tbody tr:nth-child(even) td:not(.subject) { background: #f6f9f6; }
  .ar-table .cell-mark { font-family: "Courier New", monospace; font-weight: 600; font-size: 12pt; color: #143d27; }
  .ar-table .cell-missing { color: #b0731d; }
  .ar-table .cell-empty { color: #ccc; }
  .ar-table .cell-avg { background: #fbf3df !important; font-weight: bold; font-size: 13pt; color: #143d27; }

  .ar-foot {
    margin-top: auto;
    padding-top: 3mm;
    border-top: 0.4mm solid #b8923a;
    font-family: Arial, sans-serif;
    font-size: 8pt;
    color: #444;
    line-height: 1.5;
    display: flex;
    justify-content: space-between;
    gap: 8mm;
  }
  .ar-foot > div { flex: 1; }
  .ar-foot em { font-style: italic; color: #143d27; }

  .ar-doc .empty-note {
    padding: 30mm 0;
    text-align: center;
    font-size: 11pt;
    color: #7b827c;
    font-style: italic;
  }

  @page { size: A4 landscape; margin: 8mm; }
  @media print {
    html, body { background: none; }
    .ar-doc { margin: 0; page-break-inside: avoid; break-inside: avoid; }
  }
`;
