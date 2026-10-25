// src/documents/ClassResultSheet.tsx — Result Sheet. Ranked by overall average, portrait A4.
// Premium A4 layout matching Family-2 documents. Fit-to-screen on mobile.

import { CONFIG } from "../lib/config";
import { buildReport } from "../lib/data";
import type { Assessment, Exam, Mark, Student } from "../types";

const PER_PAGE = 30;

type Props = {
  className: string;
  students: Student[];
  assessments: Assessment[];
  marks: Mark[];
  exams: Exam[];
  sessionLabel?: string;
  semester?: number;
};

type Row = {
  student: Student;
  subjectScores: Record<string, number | null>;
  overall: number | null;
  pending: boolean;
};

export function ClassResultSheet({
  className, students, assessments, marks, exams,
  sessionLabel, semester,
}: Props) {
  const session = sessionLabel ?? CONFIG.sessionLabel;
  const sem = semester ?? CONFIG.currentSemester;
  const semesterText = sem === 1 ? "First" : "Second";

  const rows: Row[] = students.map(student => {
    const report = buildReport(student, assessments, marks, exams, sem, session, className);
    const subjectScores: Record<string, number | null> = {};
    for (const r of report.results) {
      subjectScores[r.subject] = r.pending ? null : r.final;
    }
    return { student, subjectScores, overall: report.pending ? null : report.avg, pending: report.pending };
  });

  const ranked = [...rows].sort((a, b) => {
    if (a.pending && b.pending) return a.student.name.localeCompare(b.student.name);
    if (a.pending) return 1;
    if (b.pending) return -1;
    return (b.overall ?? 0) - (a.overall ?? 0);
  });

  const subjects = CONFIG.subjects;
  const pageCount = Math.max(1, Math.ceil(ranked.length / PER_PAGE));

  const rankOf = (idx: number): number => {
    const row = ranked[idx];
    if (row.pending || row.overall == null) return 0;
    const firstAbove = ranked.findIndex(r => !r.pending && r.overall === row.overall);
    return firstAbove === -1 ? idx + 1 : firstAbove + 1;
  };

  function gradeFor(overall: number | null): { code: string; remark: string } {
    if (overall == null) return { code: "—", remark: "Pending" };
    if (overall >= 75) return { code: "A", remark: "Distinction" };
    if (overall >= 60) return { code: "B", remark: "Credit" };
    if (overall >= 50) return { code: "C", remark: "Pass" };
    return { code: "D", remark: "Fail" };
  }

  return (
    <>
      {Array.from({ length: pageCount }).map((_, pageIdx) => {
        const start = pageIdx * PER_PAGE;
        const slice = ranked.slice(start, start + PER_PAGE);
        return (
          <div className="doc-stage" key={pageIdx}>
            <div className="crs-doc">
              <style>{STYLES}</style>

              <header className="crs-head">
                <img src="/logo.svg" alt="" />
                <div>
                  <div className="school">{CONFIG.name}</div>
                  <div className="doc">Result Sheet</div>
                  <div className="sess">
                    {className} · {session} · {semesterText} Semester
                  </div>
                </div>
                <img src="/logo.svg" alt="" style={{ visibility: "hidden" }} />
              </header>

              <table className="crs-table">
                <colgroup>
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "24%" }} />
                  {subjects.map((_, i) => <col key={i} style={{ width: "8%" }} />)}
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "13%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Pos.</th>
                    <th className="nm">Student</th>
                    {subjects.map(s => <th key={s}>{s}</th>)}
                    <th>Overall</th>
                    <th>Grade</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {slice.map((r, i) => {
                    const idx = start + i;
                    const pos = rankOf(idx);
                    const grade = gradeFor(r.overall);
                    return (
                      <tr key={r.student.id}>
                        <td className="pos">{pos === 0 ? "—" : pos}</td>
                        <td className="nm">{r.student.name}</td>
                        {subjects.map(s => (
                          <td key={s} className="subj">
                            {r.subjectScores[s] != null ? r.subjectScores[s]!.toFixed(1) : "—"}
                          </td>
                        ))}
                        <td className="ov">{r.overall != null ? r.overall.toFixed(1) : "—"}</td>
                        <td className="gr">{grade.code}</td>
                        <td className="rm">{grade.remark}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <footer className="crs-foot">
                <div>
                  <b>Ranking:</b> Position by overall average (highest first). Pending students sorted to the end.
                </div>
                <div>
                  <b>Grading:</b> A Distinction (75+) · B Credit (60–74) · C Pass (50–59) · D Fail (below 50)
                </div>
              </footer>
            </div>
          </div>
        );
      })}
    </>
  );
}

const STYLES = `
  .crs-doc {
    width: var(--doc-w, 283mm); height: var(--doc-h, 193mm); margin: 0 auto;
    background: #fffdf7; border: 1.2mm double #b8923a; padding: 6mm 8mm;
    display: flex; flex-direction: column; gap: 3mm; box-sizing: border-box; overflow: hidden;
    font-family: Georgia, "Times New Roman", serif; color: #1c2420;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .crs-head {
    display: flex; align-items: center; gap: 5mm;
    border-bottom: 0.5mm solid #1f5a3a; padding-bottom: 3mm;
  }
  .crs-head img { width: 18mm; height: 18mm; object-fit: contain; flex: none; }
  .crs-head > div { flex: 1; text-align: center; }
  .crs-head .school { font-size: 17pt; font-weight: bold; color: #143d27; line-height: 1.15; }
  .crs-head .doc { font-size: 13pt; color: #b8923a; letter-spacing: 2.5pt; text-transform: uppercase; margin-top: 1mm; font-weight: bold; }
  .crs-head .sess { font-size: 9pt; color: #555; margin-top: 0.8mm; }
  .crs-table {
    width: 100%; border-collapse: collapse; table-layout: fixed; font-family: Arial, sans-serif;
    flex: 1;
  }
  .crs-table th, .crs-table td {
    border: 0.25mm solid #9fb3a5; text-align: center; font-size: 10pt; padding: 1.6mm 1mm;
  }
  .crs-table thead th {
    background: #1f5a3a; color: #fff; font-weight: bold; height: 9mm;
    font-size: 9.5pt; letter-spacing: 0.3pt; line-height: 1.2;
  }
  .crs-table thead th.nm { text-align: left; padding-left: 3mm; }
  .crs-table tbody td { height: 8mm; }
  .crs-table tbody tr:nth-child(even) td { background: #f6f9f6; }
  .crs-table td.pos { font-weight: bold; color: #143d27; font-size: 11pt; }
  .crs-table td.nm { text-align: left; padding-left: 3mm; font-family: Georgia, serif; font-weight: bold; font-size: 10.5pt; }
  .crs-table td.subj { font-family: "Courier New", monospace; font-size: 9.5pt; }
  .crs-table td.ov { background: #fbf3df !important; font-weight: bold; font-size: 10.5pt; color: #143d27; }
  .crs-table td.gr { font-weight: bold; color: #143d27; font-size: 11pt; }
  .crs-table td.rm { font-size: 8.5pt; }
  .crs-foot {
    margin-top: 3mm; padding-top: 2mm; border-top: 0.3mm solid #b8923a;
    font-family: Arial, sans-serif; font-size: 8pt; color: #444;
    display: flex; flex-direction: column; gap: 1.5mm; line-height: 1.5;
  }
  .crs-foot b { color: #143d27; }
  @page { size: A4 portrait; margin: 8mm; }
  @media print {
    html, body { background: none; }
    .crs-doc { margin: 0; padding: 0; }
  }
`;
