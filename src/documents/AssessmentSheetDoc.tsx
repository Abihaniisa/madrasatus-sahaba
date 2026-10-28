// src/documents/AssessmentSheetDoc.tsx — Assessment Sheet.
// One assessment number × all 5 subjects × all students of a class.
// A4 landscape, premium layout, fit-to-screen.

import { CONFIG, SECTIONS } from "../lib/config";
import type { Assessment, Mark, Student } from "../types";

type Props = {
  className: string;
  assessmentLabel: string;
  students: Student[];
  assessments: Assessment[];
  marks: Mark[];
  sessionLabel: string;
  semester: number;
};

const PER_PAGE = 20;

export function AssessmentSheetDoc({
  className, assessmentLabel, students, assessments, marks, sessionLabel, semester,
}: Props) {
  const semesterText = semester === 1 ? "First" : "Second";
  const sectionName = SECTIONS.find(s => s.classes.includes(className))?.name ?? "";

  // sorted students by reg_no
  const sorted = [...students].sort((a, b) => a.reg_no.localeCompare(b.reg_no));

  // for each subject, find the assessment row for this label
  const perSubject: { subject: string; assessmentId: string | null; max: number }[] =
    CONFIG.subjects.map(subject => {
      const a = assessments.find(x => x.subject === subject && x.label === assessmentLabel);
      return { subject, assessmentId: a?.id ?? null, max: a?.max_marks ?? CONFIG.assessmentMax };
    });

  function markFor(studentId: string, assessmentId: string | null): number | null {
    if (!assessmentId) return null;
    const m = marks.find(x => x.assessment_id === assessmentId && x.student_id === studentId);
    return m?.value ?? null;
  }

  const pageCount = Math.max(1, Math.ceil(sorted.length / PER_PAGE));

  return (
    <>
      {Array.from({ length: pageCount }).map((_, pageIdx) => {
        const slice = sorted.slice(pageIdx * PER_PAGE, (pageIdx + 1) * PER_PAGE);
        return (
          <div className="doc-stage" key={pageIdx}>
            <div className="asheet-doc">
              <style>{STYLES}</style>

              <header className="asheet-head">
                <img src="/logo.svg" alt="" />
                <div>
                  <div className="school">{CONFIG.name}</div>
                  <div className="doc">Assessment Sheet — {assessmentLabel}</div>
                  <div className="sess">
                    {className} · {sectionName} · {sessionLabel} · {semesterText} Semester
                  </div>
                </div>
                <img src="/logo.svg" alt="" style={{ visibility: "hidden" }} />
              </header>

              <table className="asheet-table">
                <colgroup>
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "22%" }} />
                  {CONFIG.subjects.map((_, i) => (
                    <col key={i} style={{ width: `${70 / CONFIG.subjects.length}%` }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th>#</th>
                    <th className="nm">Student</th>
                    {perSubject.map(p => <th key={p.subject}>{p.subject}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {slice.map((s, i) => {
                    const idx = pageIdx * PER_PAGE + i + 1;
                    return (
                      <tr key={s.id}>
                        <td className="n">{idx}</td>
                        <td className="nm">{s.name}</td>
                        {perSubject.map(p => {
                          const v = markFor(s.id, p.assessmentId);
                          return (
                            <td key={p.subject} className={"mk " + (v == null ? "pending" : "")}>
                              {v == null ? "—" : v}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <footer className="asheet-foot">
                <div>{sorted.length} student{sorted.length === 1 ? "" : "s"} · {assessmentLabel} · Each subject marked out of {perSubject[0]?.max ?? CONFIG.assessmentMax}</div>
                <div>Session {sessionLabel} · {semesterText} Semester</div>
              </footer>
            </div>
          </div>
        );
      })}
    </>
  );
}

const STYLES = `
  .asheet-doc {
    width: var(--doc-w, 283mm); height: var(--doc-h, 193mm); margin: 0 auto;
    background: #fffdf7; border: 1.2mm double #b8923a; padding: 6mm 8mm;
    display: flex; flex-direction: column; gap: 3mm; box-sizing: border-box; overflow: hidden;
    font-family: Georgia, "Times New Roman", serif; color: #1c2420;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .asheet-head {
    display: flex; align-items: center; gap: 5mm;
    border-bottom: 0.5mm solid #1f5a3a; padding-bottom: 3mm;
  }
  .asheet-head img { width: 18mm; height: 18mm; object-fit: contain; flex: none; }
  .asheet-head > div { flex: 1; text-align: center; }
  .asheet-head .school { font-size: 17pt; font-weight: bold; color: #143d27; line-height: 1.15; }
  .asheet-head .doc { font-size: 13pt; color: #b8923a; letter-spacing: 2.5pt; text-transform: uppercase; margin-top: 1mm; font-weight: bold; }
  .asheet-head .sess { font-size: 9pt; color: #555; margin-top: 0.8mm; }
  .asheet-table {
    width: 100%; border-collapse: collapse; table-layout: auto; font-family: Arial, sans-serif;
    flex: 1;
  }
  .asheet-table th, .asheet-table td {
    border: 0.25mm solid #9fb3a5; text-align: center; font-size: 10.5pt; padding: 1.8mm 1mm;
  }
  .asheet-table thead th {
    background: #1f5a3a; color: #fff; font-weight: bold; height: 8mm;
    font-size: 10pt; letter-spacing: 0.3pt;
  }
  .asheet-table tbody td { height: 7.5mm; }
  .asheet-table tbody tr:nth-child(even) td { background: #f6f9f6; }
  .asheet-table td.nm { text-align: left; padding-left: 4mm; font-family: Georgia, serif; font-weight: bold; font-size: 11pt; white-space: nowrap; }
  .asheet-table td.n { color: #7b827c; }
  .asheet-table td.mk { font-family: "Courier New", monospace; font-weight: 600; font-size: 11pt; color: #143d27; }
  .asheet-table td.mk.pending { color: #b0731d; }
  .asheet-foot {
    margin-top: 3mm; padding-top: 2mm; border-top: 0.3mm solid #b8923a;
    font-family: Arial, sans-serif; font-size: 8pt; color: #555;
    display: flex; justify-content: space-between; gap: 5mm;
  }
  @page { size: A4 landscape; margin: 6mm; }
  @media print {
    html, body { background: none; }
    .asheet-doc { margin: 0; padding: 0; }
  }
`;
