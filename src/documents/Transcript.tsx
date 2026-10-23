// src/documents/Transcript.tsx — Academic Transcript across ALL sections.
// One document, multiple sections in order: Foundation → Junior Secondary → Senior Secondary → Higher.
// Each section shows only the classes the student has records in.
// Wrapped in .doc-stage so the global fit-to-screen CSS applies.

import { CONFIG, SECTIONS, TRANSCRIPT_GROUPS } from "../lib/config";
import type { Student } from "../types";
import type { SemesterGroup } from "../lib/calc";

type Props = {
  student: Student;
  semesters: SemesterGroup[];
};

const GRADE = (avg: number | null): string => {
  if (avg == null) return "—";
  if (avg >= 75) return "A";
  if (avg >= 60) return "B";
  if (avg >= 50) return "C";
  return "D";
};

const SECTION_ORDER = ["Foundation", "Secondary", "Higher"] as const;

export function Transcript({ student, semesters }: Props) {
  const sectionsToRender = SECTION_ORDER.map(sectionName => {
    const section = SECTIONS.find(s => s.name === sectionName);
    const groupClasses = TRANSCRIPT_GROUPS[sectionName] ?? section?.classes ?? [];
    const rows = groupClasses.map(cls => {
      const classSessions = new Set<string>();
      semesters.filter(g => g.class_name === cls).forEach(g => classSessions.add(g.session_label));
      return Array.from(classSessions).sort().map(session => {
        const sem1 = semesters.find(g => g.class_name === cls && g.session_label === session && g.semester === 1);
        const sem2 = semesters.find(g => g.class_name === cls && g.session_label === session && g.semester === 2);
        const averages = [sem1?.avg, sem2?.avg].filter((v): v is number => v != null);
        const classAvg = averages.length
          ? Math.round((averages.reduce((a, b) => a + b, 0) / averages.length) * 100) / 100
          : null;
        return { cls, session, sem1: sem1?.avg ?? null, sem2: sem2?.avg ?? null, classAvg };
      });
    }).flat();

    const allAverages = semesters
      .filter(g => groupClasses.includes(g.class_name) && g.avg != null)
      .map(g => g.avg as number);
    const cumulative = allAverages.length
      ? Math.round((allAverages.reduce((a, b) => a + b, 0) / allAverages.length) * 100) / 100
      : null;

    return { sectionName, groupClasses, rows, cumulative };
  }).filter(s => s.rows.length > 0);

  if (sectionsToRender.length === 0) {
    return (
      <div className="doc-stage">
        <div className="tr-doc">
          <style>{STYLES}</style>
          <header className="tr-head">
            <img src="/logo.svg" alt="" />
            <div>
              <div className="school">{CONFIG.name}</div>
              <div className="doc">Academic Transcript</div>
              <div className="sess">{student.name} · {student.reg_no}</div>
            </div>
            <img src="/logo.svg" alt="" style={{ visibility: "hidden" }} />
          </header>
          <div className="tr-empty">No academic records yet. As marks are recorded, this transcript will populate automatically.</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {sectionsToRender.map((sec, idx) => (
        <div className="doc-stage" key={sec.sectionName}>
          <div className="tr-doc">
            <style>{STYLES}</style>
            <header className="tr-head">
              <img src="/logo.svg" alt="" />
              <div>
                <div className="school">{CONFIG.name}</div>
                <div className="doc">Academic Transcript — {sec.sectionName}</div>
                <div className="sess">{sec.groupClasses.join(" → ")} · Semester Averages{idx > 0 ? ` · Page ${idx + 1}` : ""}</div>
              </div>
              <img src="/logo.svg" alt="" style={{ visibility: "hidden" }} />
            </header>

            <section className="tr-info">
              <div><span>Student</span><b>{student.name}</b></div>
              <div><span>Reg. No.</span><b>{student.reg_no}</b></div>
              <div><span>Section</span><b>{sec.sectionName}</b></div>
              <div><span>Mode</span><b>{student.mode === "online" ? "Online" : "Physical"}</b></div>
            </section>

            <table className="tr-table">
              <colgroup>
                <col style={{ width: "21%" }} /><col style={{ width: "13%" }} />
                <col style={{ width: "11%" }} /><col style={{ width: "7%" }} />
                <col style={{ width: "11%" }} /><col style={{ width: "7%" }} />
                <col style={{ width: "12%" }} /><col style={{ width: "7%" }} /><col style={{ width: "11%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2}>Class</th><th rowSpan={2}>Session</th>
                  <th colSpan={2}>First Semester</th><th colSpan={2}>Second Semester</th>
                  <th colSpan={3}>Class Average</th>
                </tr>
                <tr>
                  <th className="sub2">Avg /100</th><th className="sub2">Grade</th>
                  <th className="sub2">Avg /100</th><th className="sub2">Grade</th>
                  <th className="sub2">Avg /100</th><th className="sub2">Grade</th><th className="sub2">Remark</th>
                </tr>
              </thead>
              <tbody>
                {sec.rows.map((r, i) => {
                  const grade = GRADE(r.classAvg);
                  return (
                    <tr key={i}>
                      <td className="cls">{r.cls}</td>
                      <td>{r.session}</td>
                      <td>{r.sem1 != null ? r.sem1.toFixed(1) : "—"}</td>
                      <td className="g">{GRADE(r.sem1)}</td>
                      <td>{r.sem2 != null ? r.sem2.toFixed(1) : "—"}</td>
                      <td className="g">{GRADE(r.sem2)}</td>
                      <td className="ann">{r.classAvg != null ? r.classAvg.toFixed(1) : "—"}</td>
                      <td className="g">{grade}</td>
                      <td>{grade === "A" ? "Distinction" : grade === "B" ? "Credit" : grade === "C" ? "Pass" : grade === "D" ? "Fail" : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} style={{ textAlign: "right", paddingRight: "4mm" }}>
                    {sec.sectionName.toUpperCase()} CUMULATIVE AVERAGE (mean of all semesters)
                  </td>
                  <td className="big">{sec.cumulative != null ? sec.cumulative.toFixed(1) : "—"}</td>
                  <td className="big">{GRADE(sec.cumulative)}</td>
                  <td className="big">{sec.cumulative != null ? (sec.cumulative >= 75 ? "Distinction" : sec.cumulative >= 60 ? "Credit" : sec.cumulative >= 50 ? "Pass" : "Fail") : "—"}</td>
                </tr>
              </tfoot>
            </table>

            <section className="tr-foot">
              <div className="key">
                <b>Grading key:</b> <b>A</b> Distinction (75+) · <b>B</b> Credit (60–74) · <b>C</b> Pass (50–59) · <b>D</b> Fail (below 50)
              </div>
              <div className="note">
                Each semester average is the mean of the five subject finals (30% weekly assessments + 70% exam).
                Class average = mean of its two semester averages. Cumulative average = mean of all semesters in this section.
              </div>
            </section>

            <section className="sigs">
              <div className="sig">Class Teacher<span>Signature &amp; Date</span></div>
              <div className="sig">Head of School<span>Signature, Stamp &amp; Date</span></div>
            </section>
          </div>
        </div>
      ))}
    </>
  );
}

const STYLES = `
  .tr-doc {
    width: var(--doc-w, 283mm); height: var(--doc-h, 195mm); margin: 0 auto;
    background: #fffdf7; border: 1.2mm double #b8923a; padding: 4mm 6mm;
    display: flex; flex-direction: column; gap: 3mm; box-sizing: border-box; overflow: hidden;
    font-family: Georgia, "Times New Roman", serif; color: #1c2420;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .tr-head { display: flex; align-items: center; justify-content: center; gap: 6mm; border-bottom: 0.5mm solid #1f5a3a; padding-bottom: 2mm; }
  .tr-head img { width: 22mm; height: 22mm; object-fit: contain; flex: none; }
  .tr-head > div { text-align: center; }
  .tr-head .school { font-size: 19pt; font-weight: bold; color: #143d27; line-height: 1.15; }
  .tr-head .doc { font-size: 12.5pt; color: #b8923a; letter-spacing: 3pt; text-transform: uppercase; margin-top: 1mm; font-weight: bold; }
  .tr-head .sess { font-size: 9pt; color: #555; margin-top: 0.8mm; }
  .tr-info { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.2mm 5mm; background: #eef3ee; border: 0.3mm solid #c9d6c9; padding: 2mm 4mm; }
  .tr-info div { font-size: 9pt; display: flex; gap: 2mm; align-items: baseline; }
  .tr-info span { color: #5a6a5f; text-transform: uppercase; font-size: 7pt; letter-spacing: 0.6pt; white-space: nowrap; }
  .tr-info b { font-size: 10pt; }
  .tr-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-family: Arial, sans-serif; flex: 1; }
  .tr-table th, .tr-table td { border: 0.25mm solid #9fb3a5; text-align: center; font-size: 11pt; padding: 2mm 1mm; }
  .tr-table thead th { background: #1f5a3a; color: #fff; font-weight: bold; height: 8mm; font-size: 10pt; }
  .tr-table thead th.sub2 { background: #143d27; font-size: 9pt; }
  .tr-table tbody td { height: 15mm; }
  .tr-table tbody tr:nth-child(even) td { background: #f6f9f6; }
  .tr-table td.cls { text-align: left; padding-left: 4mm; font-family: Georgia, serif; font-weight: bold; font-size: 12.5pt; }
  .tr-table td.ann { background: #fbf3df !important; font-weight: bold; }
  .tr-table td.g { font-weight: bold; color: #143d27; font-size: 12pt; }
  .tr-table tfoot td { background: #143d27; color: #fff; height: 11mm; font-weight: bold; font-size: 10.5pt; }
  .tr-table tfoot td.big { font-size: 13pt; background: #b8923a; color: #fff; }
  .tr-foot { display: grid; grid-template-columns: 1.2fr 1fr; gap: 4mm; font-family: Arial, sans-serif; }
  .tr-foot .key { font-size: 8pt; border: 0.25mm solid #c9d6c9; padding: 2mm 3mm; background: #eef3ee; line-height: 1.6; }
  .tr-foot .key b { color: #143d27; }
  .tr-foot .note { font-size: 7.5pt; color: #555; line-height: 1.5; }
  .sigs { display: flex; justify-content: space-around; align-items: flex-end; margin-top: auto; padding: 0 12mm; height: 15mm; }
  .sig { width: 75mm; text-align: center; border-top: 0.35mm solid #1c2420; padding-top: 1.2mm; font-size: 9.5pt; font-weight: bold; }
  .sig span { display: block; font-size: 7pt; font-weight: normal; color: #666; font-family: Arial, sans-serif; }
  .tr-empty { padding: 40mm 0; text-align: center; font-size: 12pt; color: #7b827c; font-style: italic; }
  @media print {
    html, body { background: none; }
    .tr-doc { margin: 0; page-break-inside: avoid; break-inside: avoid; }
  }
`;
