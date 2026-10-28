// src/documents/DauraReport.tsx — Daura Report Card (summary only).
// Per subject: Target · Average/10 · 70% · Evaluation/100 · 30% · Final · Grade · Remark.
// No per-assessment columns — those live in DauraAssessmentReport.

import { CONFIG } from "../lib/config";
import { gradeFor } from "../lib/calc";
import type { DauraAssessment, DauraMark, DauraParticipant, DauraProgram } from "../types";

type Props = {
  participant: DauraParticipant;
  program: DauraProgram;
  assessments: DauraAssessment[];
  marks: DauraMark[];
};

export function DauraReport({ participant, program, assessments, marks }: Props) {
  const subjects = program.subjects ?? [];
  const isSessional = program.kind === "sessional";
  const targets = program.targets ?? {};

  const subjectResults = subjects.map(subject => {
    const regular = assessments.filter(a => a.subject === subject && !a.is_evaluation);
    const evaluation = assessments.find(a => a.subject === subject && a.is_evaluation) ?? null;

    let sum = 0, recorded = 0;
    for (const a of regular) {
      const m = marks.find(x => x.assessment_id === a.id && x.participant_id === participant.id);
      if (m?.value != null) { sum += m.value / (a.max_marks || 10); recorded++; }
    }
    const allPresent = regular.length > 0 && recorded === regular.length;
    const avg10 = allPresent ? Math.round((sum / regular.length) * 10000) / 100 : null;
    const pct = avg10 != null ? Math.round(avg10 * 10 * 100) / 100 : null;
    const contrib70 = pct != null ? Math.round(pct * 0.7 * 100) / 100 : null;

    const evalMark = evaluation ? (marks.find(x => x.assessment_id === evaluation.id && x.participant_id === participant.id)?.value ?? null) : null;
    const eval30 = evalMark != null ? Math.round(evalMark * 0.3 * 100) / 100 : null;

    const final = (contrib70 != null && eval30 != null) ? Math.round((contrib70 + eval30) * 100) / 100 : null;
    const grade = final != null ? gradeFor(final) : null;
    const pending = !allPresent || evalMark == null;

    return { subject, avg10, contrib70, evalMark, eval30, final, grade, pending, target: targets[subject] ?? "" };
  });

  const finals = subjectResults.map(r => r.final).filter((v): v is number => v != null);
  const programmeAvg = finals.length === subjects.length && subjects.length > 0
    ? Math.round((finals.reduce((a, b) => a + b, 0) / finals.length) * 100) / 100
    : null;
  const overall = gradeFor(programmeAvg);

  const headerTitle = isSessional ? `${program.session_label ?? ""} Sessional Daura` : (program.name || "Special Daura");
  const headerSubtitle = isSessional ? "6-Week Intensive · Report Card" : "Report Card";

  return (
    <div className="doc-stage">
      <div className="dr-doc">
        <style>{STYLES}</style>

        <header className="dr-head">
          <img src="/logo.svg" alt="" />
          <div className="titles">
            <div className="school">{CONFIG.name}</div>
            <div className="doc">{headerTitle}</div>
            <div className="sess">{headerSubtitle}</div>
          </div>
          <img src="/logo.svg" alt="" style={{ visibility: "hidden" }} />
        </header>

        <section className="dr-info">
          <div><span>Participant</span><b>{participant.full_name}</b></div>
          <div><span>Mode</span><b>{participant.external ? "External" : "Student"}</b></div>
          <div><span>Subjects</span><b>{subjects.join(" · ")}</b></div>
          <div><span>Grade</span><b>{overall.code} · {overall.label}</b></div>
        </section>

        <table className="dr-table">
          <colgroup>
            <col style={{ width: "26mm" }} />
            <col style={{ width: "auto" }} />
            <col style={{ width: "18mm" }} />
            <col style={{ width: "18mm" }} />
            <col style={{ width: "22mm" }} />
            <col style={{ width: "18mm" }} />
            <col style={{ width: "20mm" }} />
            <col style={{ width: "14mm" }} />
            <col style={{ width: "24mm" }} />
          </colgroup>
          <thead>
            <tr>
              <th className="subject">Subject</th>
              <th className="target">Target</th>
              <th>Average</th>
              <th>70%</th>
              <th>Evaluation</th>
              <th>30%</th>
              <th>Final</th>
              <th>Grade</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            {subjectResults.map(row => (
              <tr key={row.subject}>
                <td className="subject">{row.subject}</td>
                <td className="target">{row.target || "—"}</td>
                <td className="cell-avg">{row.avg10 != null ? row.avg10.toFixed(1) : "—"}</td>
                <td className="cell-avg">{row.contrib70 != null ? row.contrib70.toFixed(1) : "—"}</td>
                <td className="cell-mark">{row.evalMark != null ? row.evalMark : "—"}</td>
                <td className="cell-avg">{row.eval30 != null ? row.eval30.toFixed(1) : "—"}</td>
                <td className="cell-final">{row.final != null ? row.final.toFixed(1) : "—"}</td>
                <td className="cell-grade">{row.grade?.code ?? "—"}</td>
                <td>{row.pending ? "Pending" : (row.grade?.label ?? "—")}</td>
              </tr>
            ))}
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
            <em>{overall.label}</em>
          </div>
          <div>
            <small>Subjects</small>
            <strong>{subjects.length}</strong>
            <em>assessed</em>
          </div>
        </section>

        <footer className="dr-foot">
          <div>
            <strong>Formula:</strong> Average = mean of assessments (out of 10, scaled to 100). 70% = Average × 0.7. Evaluation = mark out of 100. 30% = Evaluation × 0.3. Final = 70% + 30%.
            <strong> Grade:</strong> A Distinction (75+) · B Credit (60–74) · C Pass (50–59) · D Fail (below 50).
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
  .dr-head .school { font-size: 18pt; font-weight: bold; color: #143d27; line-height: 1.15; }
  .dr-head .doc { font-size: 13pt; color: #b8923a; letter-spacing: 3pt; text-transform: uppercase; margin-top: 1mm; font-weight: bold; }
  .dr-head .sess { font-size: 9pt; color: #555; margin-top: 0.8mm; }
  .dr-info { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.2mm 5mm; background: #eef3ee; border: 0.3mm solid #c9d6c9; padding: 2mm 4mm; }
  .dr-info div { font-size: 9pt; display: flex; gap: 2mm; align-items: baseline; min-width: 0; }
  .dr-info span { color: #5a6a5f; text-transform: uppercase; font-size: 7pt; letter-spacing: 0.6pt; white-space: nowrap; }
  .dr-info b { font-size: 10pt; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dr-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-family: Arial, Helvetica, sans-serif; flex: 1 1 auto; min-height: 0; }
  .dr-table th, .dr-table td { border: 0.25mm solid #9fb3a5; text-align: center; font-size: 10.5pt; padding: 2.5mm 1.5mm; overflow: hidden; }
  .dr-table thead th { background: #1f5a3a; color: #fff; font-weight: bold; height: 10mm; font-size: 10pt; letter-spacing: 0.2pt; }
  .dr-table thead th.subject { text-align: left; padding-left: 3mm; }
  .dr-table thead th.target { background: #b8923a; text-align: left; padding-left: 3mm; }
  .dr-table tbody td.subject { text-align: left; padding-left: 3mm; font-family: Georgia, serif; font-weight: bold; font-size: 11.5pt; background: #f6f9f6; white-space: nowrap; }
  .dr-table tbody td.target { text-align: left; padding-left: 3mm; font-size: 10pt; color: #143d27; background: #fbf3df; font-style: italic; line-height: 1.35; }
  .dr-table tbody tr:nth-child(even) td:not(.subject):not(.target) { background: #f6f9f6; }
  .dr-table .cell-mark { font-family: "Courier New", monospace; font-weight: 600; font-size: 11pt; color: #143d27; }
  .dr-table .cell-missing { color: #b0731d; }
  .dr-table .cell-avg { background: #fbf3df !important; font-weight: bold; font-size: 11pt; color: #143d27; }
  .dr-table .cell-final { background: #fbf3df !important; font-weight: bold; font-size: 12pt; color: #143d27; }
  .dr-table .cell-grade { font-weight: bold; font-size: 12pt; color: #143d27; }
  .dr-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; border-top: 0.4mm solid #b8923a; padding-top: 3mm; margin-top: auto; }
  .dr-summary > div { border: 0.35mm solid #1f5a3a; padding: 2.5mm 3mm; text-align: center; background: #eef3ee; }
  .dr-summary small { display: block; font-family: Arial, sans-serif; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.8pt; color: #5a6a5f; }
  .dr-summary strong { display: block; font-size: 18pt; font-weight: bold; color: #143d27; line-height: 1.15; }
  .dr-summary em { font-style: normal; font-size: 8.5pt; color: #b8923a; font-weight: bold; }
  .dr-foot { padding-top: 2mm; border-top: 0.4mm solid #b8923a; font-family: Arial, sans-serif; font-size: 7.5pt; color: #444; line-height: 1.5; }
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
