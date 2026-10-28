// src/documents/DauraAssessmentReport.tsx — Daura Assessment Report (per-assessment breakdown).
// Per subject: all assessment marks + evaluation + contributions.
// Paginates every 24 assessment columns.

import { CONFIG } from "../lib/config";
import type { DauraAssessment, DauraMark, DauraParticipant, DauraProgram } from "../types";

type Props = {
  participant: DauraParticipant;
  program: DauraProgram;
  assessments: DauraAssessment[];
  marks: DauraMark[];
};

const COLS_PER_PAGE = 24;

export function DauraAssessmentReport({ participant, program, assessments, marks }: Props) {
  const subjects = program.subjects ?? [];
  const isSessional = program.kind === "sessional";

  const perSubject = subjects.map(subject => {
    const regular = assessments
      .filter(a => a.subject === subject && !a.is_evaluation)
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    const evaluation = assessments.find(a => a.subject === subject && a.is_evaluation) ?? null;
    return { subject, regular, evaluation };
  });

  const maxRegular = Math.max(0, ...perSubject.map(p => p.regular.length));
  const colBlocks: number[][] = [];
  for (let i = 0; i < maxRegular; i += COLS_PER_PAGE) {
    colBlocks.push(Array.from({ length: Math.min(COLS_PER_PAGE, maxRegular - i) }, (_, j) => i + j));
  }
  if (colBlocks.length === 0) colBlocks.push([]);

  const headerTitle = isSessional
    ? `${program.session_label ?? ""} Sessional Daura — Assessment Report`
    : `${program.name || "Special Daura"} — Assessment Report`;

  return (
    <>
      {colBlocks.map((block, blockIdx) => (
        <div className="doc-stage" key={blockIdx}>
          <div className="dar-doc">
            <style>{STYLES}</style>

            <header className="dar-head">
              <img src="/logo.svg" alt="" />
              <div className="titles">
                <div className="school">{CONFIG.name}</div>
                <div className="doc">{headerTitle}</div>
                <div className="sess">{participant.full_name} · {participant.external ? "External" : "Student"}</div>
              </div>
              <img src="/logo.svg" alt="" style={{ visibility: "hidden" }} />
            </header>

            <table className="dar-table">
              <colgroup>
                <col style={{ width: "24mm" }} />
                {block.map((_, i) => <col key={i} style={{ width: "6mm" }} />)}
                <col style={{ width: "18mm" }} />
                <col style={{ width: "18mm" }} />
                <col style={{ width: "22mm" }} />
                <col style={{ width: "18mm" }} />
                <col style={{ width: "20mm" }} />
                <col style={{ width: "14mm" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="subject">Subject</th>
                  {block.map(i => <th key={i}>{i + 1}</th>)}
                  <th>Average</th>
                  <th>70%</th>
                  <th>Evaluation</th>
                  <th>30%</th>
                  <th>Final</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {perSubject.map(({ subject, regular, evaluation }) => {
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
                  const gradeCode = final != null ? (final >= 75 ? "A" : final >= 60 ? "B" : final >= 50 ? "C" : "D") : "—";

                  return (
                    <tr key={subject}>
                      <td className="subject">{subject}</td>
                      {block.map(i => {
                        const a = regular[i];
                        if (!a) return <td key={i} className="cell-empty">—</td>;
                        const m = marks.find(x => x.assessment_id === a.id && x.participant_id === participant.id);
                        const v = m?.value ?? null;
                        return <td key={i} className={"cell-mark " + (v == null ? "cell-missing" : "")}>{v != null ? v : "—"}</td>;
                      })}
                      <td className="cell-avg">{avg10 != null ? avg10.toFixed(1) : "—"}</td>
                      <td className="cell-avg">{contrib70 != null ? contrib70.toFixed(1) : "—"}</td>
                      <td className="cell-mark">{evalMark != null ? evalMark : "—"}</td>
                      <td className="cell-avg">{eval30 != null ? eval30.toFixed(1) : "—"}</td>
                      <td className="cell-final">{final != null ? final.toFixed(1) : "—"}</td>
                      <td className="cell-grade">{gradeCode}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <footer className="dar-foot">
              <div>{blockIdx + 1} of {colBlocks.length} · {program.name}{isSessional ? " · " + program.session_label : ""}</div>
              <div>Each subject: Average = mean of assessments (out of 10 → 100). 70% = Average × 0.7. Evaluation out of 100, ×0.3. Final = 70% + 30%.</div>
            </footer>
          </div>
        </div>
      ))}
    </>
  );
}

const STYLES = `
  .dar-doc {
    width: var(--doc-w, 283mm); height: var(--doc-h, 195mm); overflow: hidden; margin: 0 auto;
    background: #fffdf7; border: 1.2mm double #b8923a; padding: 5mm 6mm;
    display: flex; flex-direction: column; gap: 3mm; box-sizing: border-box;
    font-family: Georgia, "Times New Roman", serif; color: #1c2420;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .dar-head { display: flex; align-items: center; justify-content: center; gap: 6mm; border-bottom: 0.5mm solid #1f5a3a; padding-bottom: 2mm; }
  .dar-head img { width: 18mm; height: 18mm; object-fit: contain; flex: none; }
  .dar-head .titles { text-align: center; }
  .dar-head .school { font-size: 16pt; font-weight: bold; color: #143d27; line-height: 1.15; }
  .dar-head .doc { font-size: 11pt; color: #b8923a; letter-spacing: 2pt; text-transform: uppercase; margin-top: 1mm; font-weight: bold; }
  .dar-head .sess { font-size: 9pt; color: #555; margin-top: 0.8mm; }
  .dar-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-family: Arial, sans-serif; flex: 1 1 auto; min-height: 0; }
  .dar-table th, .dar-table td { border: 0.25mm solid #9fb3a5; text-align: center; font-size: 10pt; padding: 2mm 1mm; overflow: hidden; }
  .dar-table thead th { background: #1f5a3a; color: #fff; font-weight: bold; height: 9mm; font-size: 9.5pt; }
  .dar-table thead th.subject { text-align: left; padding-left: 3mm; }
  .dar-table tbody td.subject { text-align: left; padding-left: 3mm; font-family: Georgia, serif; font-weight: bold; font-size: 11pt; background: #f6f9f6; white-space: nowrap; }
  .dar-table tbody tr:nth-child(even) td:not(.subject) { background: #f6f9f6; }
  .dar-table .cell-mark { font-family: "Courier New", monospace; font-weight: 600; font-size: 10.5pt; color: #143d27; }
  .dar-table .cell-missing { color: #b0731d; }
  .dar-table .cell-empty { color: #ccc; }
  .dar-table .cell-avg { background: #fbf3df !important; font-weight: bold; font-size: 10.5pt; color: #143d27; }
  .dar-table .cell-final { background: #fbf3df !important; font-weight: bold; font-size: 11pt; color: #143d27; }
  .dar-table .cell-grade { font-weight: bold; font-size: 11pt; color: #143d27; }
  .dar-foot { padding-top: 2mm; border-top: 0.4mm solid #b8923a; font-family: Arial, sans-serif; font-size: 7.5pt; color: #444; line-height: 1.5; display: flex; justify-content: space-between; gap: 4mm; }
  @page { size: A4 landscape; margin: 6mm; }
  @media print {
    html, body { background: none; }
    .dar-doc { margin: 0; page-break-inside: avoid; break-inside: avoid; }
  }
`;
