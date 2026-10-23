// src/documents/ClassSheet.tsx — Teacher's class sheet for ONE subject.
// Portrait A4. One row per student, columns A1..AN + Exam + Avg.
// Designed to be held in hand while marking. Header repeats across pages.

import { CONFIG } from "../lib/config";
import type { Assessment, Exam, Mark, Student } from "../types";

const PER_PAGE = 30;

type Props = {
  className: string;
  subject: string;
  students: Student[];
  assessments: Assessment[];
  marks: Mark[];
  exams: Exam[];
  sessionLabel?: string;
  semester?: number;
};

export function ClassSheet({
  className, subject, students, assessments, marks, exams,
  sessionLabel, semester,
}: Props) {
  const session = sessionLabel ?? CONFIG.sessionLabel;
  const sem = semester ?? CONFIG.currentSemester;
  const semesterText = sem === 1 ? "First" : "Second";

  const sorted = [...students].sort((a, b) => a.name.localeCompare(b.name));
  const subjAssessments = assessments
    .filter(a => a.class_name === className && a.subject === subject && a.session_label === session && a.semester === sem)
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  function markFor(sid: string, aid: string): number | null {
    const m = marks.find(x => x.assessment_id === aid && x.student_id === sid);
    return m?.value ?? null;
  }
  function examFor(sid: string): number | null {
    const e = exams.find(x => x.student_id === sid && x.subject === subject && x.class_name === className && x.session_label === session && x.semester === sem);
    return e?.value ?? null;
  }
  function finalAvg(sid: string): number | null {
    if (subjAssessments.length === 0) return null;
    let sum = 0, count = 0;
    for (const a of subjAssessments) {
      const v = markFor(sid, a.id);
      if (v == null) return null;
      sum += v / a.max_marks;
      count++;
    }
    const exam = examFor(sid);
    if (exam == null) return null;
    const assessmentPct = (sum / count) * 100;
    const final = assessmentPct * CONFIG.assessmentWeight + exam * CONFIG.examWeight;
    return Math.round(final * 10) / 10;
  }

  const pageCount = Math.max(1, Math.ceil(sorted.length / PER_PAGE));

  return (
    <>
      {Array.from({ length: pageCount }).map((_, pageIdx) => {
        const slice = sorted.slice(pageIdx * PER_PAGE, (pageIdx + 1) * PER_PAGE);
        return (
          <div className="cs-doc" key={pageIdx}>
            <style>{STYLES}</style>

            <header className="cs-head">
              <img src="/logo.svg" alt="" />
              <div>
                <div className="school">{CONFIG.name}</div>
                <div className="doc">Class Sheet — {subject}</div>
                <div className="sess">
                  {className} · {session} · {semesterText} Semester
                  {pageCount > 1 && <> · Page {pageIdx + 1} of {pageCount}</>}
                </div>
              </div>
              <img src="/logo.svg" alt="" style={{ visibility: "hidden" }} />
            </header>

            <table className="cs-table">
              <colgroup>
                <col style={{ width: "6%" }} />
                <col style={{ width: "30%" }} />
                {subjAssessments.map((_, i) => <col key={i} style={{ width: `${Math.max(3.5, 38 / Math.max(subjAssessments.length + 2, 1))}%` }} />)}
                <col style={{ width: "7%" }} />
                <col style={{ width: "8%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th className="nm">Student</th>
                  {subjAssessments.map((a, i) => <th key={a.id}>A{i + 1}</th>)}
                  <th>Exam</th>
                  <th>Final</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((s, i) => {
                  const final = finalAvg(s.id);
                  return (
                    <tr key={s.id}>
                      <td className="n">{pageIdx * PER_PAGE + i + 1}</td>
                      <td className="nm">{s.name}</td>
                      {subjAssessments.map(a => {
                        const v = markFor(s.id, a.id);
                        return <td key={a.id} className={"mk " + (v == null ? "pending" : "")}>{v == null ? "—" : v}</td>;
                      })}
                      <td className={"mk " + (examFor(s.id) == null ? "pending" : "")}>{examFor(s.id) ?? "—"}</td>
                      <td className="fin">{final != null ? final.toFixed(1) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <footer className="cs-foot">
              <div>{sorted.length} students · {subjAssessments.length} assessment{subjAssessments.length === 1 ? "" : "s"} · Exam out of {CONFIG.examMax}</div>
              <div>Final = {CONFIG.assessmentWeight * 100}% of assessment average + {CONFIG.examWeight * 100}% of exam</div>
            </footer>
          </div>
        );
      })}
    </>
  );
}

const STYLES = `
  .cs-doc {
    width: 190mm;
    min-height: 277mm;
    margin: 0 auto 8mm;
    background: #fff;
    padding: 8mm;
    box-sizing: border-box;
    font-family: Georgia, "Times New Roman", serif;
    color: #1c2420;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    page-break-after: always;
    break-after: page;
    display: flex;
    flex-direction: column;
  }
  .cs-doc:last-of-type { page-break-after: auto; break-after: auto; }

  .cs-head {
    display: flex;
    align-items: center;
    gap: 5mm;
    border-bottom: 0.5mm solid #1f5a3a;
    padding-bottom: 3mm;
    margin-bottom: 3mm;
  }
  .cs-head img { width: 18mm; height: 18mm; object-fit: contain; flex: none; }
  .cs-head > div { flex: 1; text-align: center; }
  .cs-head .school { font-size: 15pt; font-weight: bold; color: #143d27; line-height: 1.15; }
  .cs-head .doc { font-size: 11pt; color: #b8923a; letter-spacing: 2pt; text-transform: uppercase; margin-top: 1mm; font-weight: bold; }
  .cs-head .sess { font-size: 8.5pt; color: #555; margin-top: 0.6mm; }

  .cs-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-family: Arial, sans-serif;
    flex: 1;
  }
  .cs-table thead { display: table-header-group; }
  .cs-table tr { page-break-inside: avoid; break-inside: avoid; }
  .cs-table th, .cs-table td {
    border: 0.25mm solid #9fb3a5;
    text-align: center;
    font-size: 10.5pt;
    padding: 1.6mm 1mm;
  }
  .cs-table thead th { background: #1f5a3a; color: #fff; font-weight: bold; height: 8mm; }
  .cs-table tbody td { height: 7.5mm; }
  .cs-table tbody tr:nth-child(even) td { background: #f6f9f6; }
  .cs-table td.nm { text-align: left; padding-left: 3mm; font-family: Georgia, serif; font-weight: bold; font-size: 11pt; }
  .cs-table td.n { color: #7b827c; }
  .cs-table td.mk { font-family: "Courier New", monospace; font-weight: 600; color: #143d27; }
  .cs-table td.mk.pending { color: #b0731d; }
  .cs-table td.fin { background: #fbf3df !important; font-weight: bold; font-size: 11pt; color: #143d27; }

  .cs-foot {
    margin-top: 3mm;
    padding-top: 2mm;
    border-top: 0.3mm solid #b8923a;
    font-family: Arial, sans-serif;
    font-size: 8pt;
    color: #555;
    display: flex;
    justify-content: space-between;
    gap: 5mm;
  }

  @page { size: A4 portrait; margin: 8mm; }
  @media print {
    html, body { background: none; }
    .cs-doc { margin: 0; padding: 0; min-height: 0; }
  }
`;
