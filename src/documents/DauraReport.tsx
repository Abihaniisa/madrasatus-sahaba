// src/documents/DauraReport.tsx — Daura programme report card.
// A4 landscape ceremonial document. Flat numbered assessment grid (1..N).
// Assessment-only (no exam). Each subject = mean of its assessments scaled to 100.
// Programme average = mean of subject percentages. Matches the certificate family visually.

import { CONFIG } from "../lib/config";

type DauraParticipant = {
  id: string;
  full_name: string;
  external: boolean;
  phone: string | null;
};
type DauraProgram = {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  weeks: number;
  subjects: string[];
};
type DauraAssessment = {
  id: string;
  subject: string;
  label: string;
  max_marks: number;
};
type DauraMark = {
  assessment_id: string;
  participant_id: string;
  value: number | null;
};

type Props = {
  participant: DauraParticipant;
  program: DauraProgram;
  assessments: DauraAssessment[];
  marks: DauraMark[];
};

function gradeFor(pct: number | null): { code: string; remark: string } {
  if (pct == null) return { code: "—", remark: "Pending" };
  if (pct >= 75) return { code: "A", remark: "Distinction" };
  if (pct >= 60) return { code: "B", remark: "Credit" };
  if (pct >= 50) return { code: "C", remark: "Pass" };
  return { code: "D", remark: "Fail" };
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function DauraReport({ participant, program, assessments, marks }: Props) {
  const subjects = program.subjects ?? [];

  // Group assessments by subject — keeps the school's natural subject order
  const perSubject = subjects.map(subject => {
    const list = assessments.filter(a => a.subject === subject);
    return { subject, list };
  });

  // Max number of assessments across all subjects — determines grid width
  const maxAssessments = Math.max(0, ...perSubject.map(p => p.list.length));

  // Per-subject results
  const subjectResults = perSubject.map(({ subject, list }) => {
    if (list.length === 0) return { subject, pct: null as number | null, recorded: 0, total: 0 };
    let sum = 0;
    let recorded = 0;
    for (const a of list) {
      const m = marks.find(x => x.assessment_id === a.id && x.participant_id === participant.id);
      if (m?.value != null) {
        sum += m.value / (a.max_marks || 10);
        recorded++;
      }
    }
    const pending = recorded < list.length;
    const pct = pending ? null : Math.round((sum / list.length) * 10000) / 100;
    return { subject, pct, recorded, total: list.length };
  });

  const availablePcts = subjectResults.map(r => r.pct).filter((v): v is number => v != null);
  const programmeAvg = availablePcts.length === subjects.length && subjects.length > 0
    ? Math.round((availablePcts.reduce((a, b) => a + b, 0) / availablePcts.length) * 100) / 100
    : null;
  const overall = gradeFor(programmeAvg);

  const weeksLabel = `${assessments.length} assessment${assessments.length === 1 ? "" : "s"} recorded`;

  return (
    <div className="doc-stage">
      <div className="dr-doc">
        <style>{STYLES}</style>

        <header className="dr-head">
          <img src="/logo.svg" alt="" />
          <div className="titles">
            <div className="school">{CONFIG.name}</div>
            <div className="doc">Daura Report Card</div>
            <div className="sess">{program.name} · {weeksLabel}</div>
          </div>
          <img src="/logo.svg" alt="" style={{ visibility: "hidden" }} />
        </header>

        <section className="dr-info">
          <div><span>Participant</span><b>{participant.full_name}</b></div>
          <div><span>Mode</span><b>{participant.external ? "External" : "Student"}</b></div>
          <div><span>Duration</span><b>{fmtDate(program.start_date)} – {fmtDate(program.end_date)}</b></div>
        </section>

        <table className="dr-table">
          <colgroup>
            <col style={{ width: "30mm" }} />
            {Array.from({ length: maxAssessments }).map((_, i) => (
              <col key={i} style={{ width: `calc((100% - 30mm - 14mm - 10mm - 24mm) / ${Math.max(1, maxAssessments)})` }} />
            ))}
            <col style={{ width: "14mm" }} />
            <col style={{ width: "14mm" }} />
            <col style={{ width: "24mm" }} />
          </colgroup>
          <thead>
            <tr>
              <th className="subject">Subject</th>
              {Array.from({ length: maxAssessments }).map((_, i) => (
                <th key={i}>{i + 1}</th>
              ))}
              <th>Avg</th>
              <th>Grade</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            {subjectResults.map((row, idx) => {
              const list = perSubject[idx].list;
              const g = gradeFor(row.pct);
              return (
                <tr key={row.subject}>
                  <td className="subject">{row.subject}</td>
                  {Array.from({ length: maxAssessments }).map((_, i) => {
                    const a = list[i];
                    if (!a) return <td key={i} className="cell-empty">—</td>;
                    const m = marks.find(x => x.assessment_id === a.id && x.participant_id === participant.id);
                    const v = m?.value ?? null;
                    return (
                      <td key={i} className={"cell-mark " + (v == null ? "cell-missing" : "")}>
                        {v != null ? v : "—"}
                      </td>
                    );
                  })}
                  <td className="cell-avg">{row.pct != null ? row.pct.toFixed(1) : "—"}</td>
                  <td className="cell-grade">{g.code}</td>
                  <td className="cell-remark">{g.remark}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <section className="dr-summary">
          <div>
            <small>Programme Average</small>
            <strong>{programmeAvg != null ? programmeAvg.toFixed(1) : "—"}</strong>
            <em>out of 100</em>
          </div>
          <div>
            <small>Overall Grade</small>
            <strong>{overall.code}</strong>
            <em>{overall.remark}</em>
          </div>
          <div>
            <small>Subjects</small>
            <strong>{subjects.length}</strong>
            <em>assessed</em>
          </div>
        </section>

        <footer className="dr-foot">
          <div>
            <strong>Grading key:</strong> A Distinction (75+) · B Credit (60–74) · C Pass (50–59) · D Fail (below 50).
            Daura performance is assessment-only and independent of semester and section averages.
          </div>
        </footer>

        <section className="dr-sigs">
          <div className="sig">Programme Coordinator<span>Signature &amp; Date</span></div>
          <div className="sig">Head of School<span>Signature, Stamp &amp; Date</span></div>
        </section>
      </div>
    </div>
  );
}

const STYLES = `
  .dr-doc {
    width: var(--doc-w, 283mm); height: var(--doc-h, 195mm); overflow: hidden; margin: 0 auto;
    background: #fffdf7; border: 1.2mm double #b8923a; padding: 5mm 6mm;
    display: flex; flex-direction: column; gap: 3mm; box-sizing: border-box;
    font-family: Georgia, "Times New Roman", serif; color: #1c2420;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .dr-head { display: flex; align-items: center; justify-content: center; gap: 6mm; border-bottom: 0.5mm solid #1f5a3a; padding-bottom: 2mm; }
  .dr-head img { width: 20mm; height: 20mm; object-fit: contain; flex: none; }
  .dr-head .titles { text-align: center; }
  .dr-head .school { font-size: 18pt; font-weight: bold; color: #143d27; letter-spacing: 0.3pt; line-height: 1.15; }
  .dr-head .doc { font-size: 12pt; color: #b8923a; letter-spacing: 3pt; text-transform: uppercase; margin-top: 1mm; font-weight: bold; }
  .dr-head .sess { font-size: 9pt; color: #555; margin-top: 0.8mm; }

  .dr-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.2mm 5mm; background: #eef3ee; border: 0.3mm solid #c9d6c9; padding: 2mm 4mm; }
  .dr-info div { font-size: 9pt; display: flex; gap: 2mm; align-items: baseline; }
  .dr-info span { color: #5a6a5f; text-transform: uppercase; font-size: 7pt; letter-spacing: 0.6pt; white-space: nowrap; }
  .dr-info b { font-size: 10pt; }

  .dr-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-family: Arial, Helvetica, sans-serif; flex: 1 1 auto; min-height: 0; }
  .dr-table th, .dr-table td { border: 0.25mm solid #9fb3a5; text-align: center; font-size: 10.5pt; padding: 2.5mm 1.5mm; overflow: hidden; }
  .dr-table thead th { background: #1f5a3a; color: #fff; font-weight: bold; height: 9mm; }
  .dr-table thead th.subject { text-align: left; padding-left: 4mm; }
  .dr-table tbody td.subject { text-align: left; padding-left: 4mm; font-family: Georgia, serif; font-weight: bold; font-size: 11pt; background: #f6f9f6; white-space: nowrap; }
  .dr-table tbody tr:nth-child(even) td:not(.subject) { background: #f6f9f6; }
  .dr-table .cell-mark { font-family: "Courier New", monospace; font-weight: 600; font-size: 11pt; color: #143d27; }
  .dr-table .cell-missing { color: #b0731d; }
  .dr-table .cell-empty { color: #ccc; }
  .dr-table .cell-avg { background: #fbf3df !important; font-weight: bold; font-size: 11pt; color: #143d27; }
  .dr-table .cell-grade { font-weight: bold; font-size: 12pt; color: #143d27; }
  .dr-table .cell-remark { font-size: 10pt; }

  .dr-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; border-top: 0.4mm solid #b8923a; padding-top: 3mm; }
  .dr-summary > div { border: 0.35mm solid #1f5a3a; padding: 2.5mm 3mm; text-align: center; background: #eef3ee; }
  .dr-summary small { display: block; font-family: Arial, sans-serif; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.8pt; color: #5a6a5f; }
  .dr-summary strong { display: block; font-size: 18pt; font-weight: bold; color: #143d27; line-height: 1.15; }
  .dr-summary em { font-style: normal; font-size: 8.5pt; color: #b8923a; font-weight: bold; }

  .dr-foot { margin-top: auto; padding-top: 3mm; border-top: 0.4mm solid #b8923a; font-family: Arial, sans-serif; font-size: 8pt; color: #444; line-height: 1.5; }
  .dr-foot strong { color: #143d27; }

  .dr-sigs { display: flex; justify-content: space-around; align-items: flex-end; padding: 0 14mm; height: 15mm; }
  .dr-sigs .sig { width: 75mm; text-align: center; border-top: 0.35mm solid #1c2420; padding-top: 1.2mm; font-size: 10pt; font-weight: bold; }
  .dr-sigs .sig span { display: block; font-size: 7.5pt; font-weight: normal; color: #666; font-family: Arial, sans-serif; }

  @page { size: A4 landscape; margin: 6mm; }
  @media print {
    html, body { background: none; }
    .dr-doc { margin: 0; page-break-inside: avoid; break-inside: avoid; }
  }
`;
