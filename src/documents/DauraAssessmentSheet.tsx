// src/documents/DauraAssessmentSheet.tsx — Daura Assessment Sheet (programme-level).
// One assessment N × all subjects × all participants.

import { CONFIG } from "../lib/config";
import type { DauraAssessment, DauraMark, DauraParticipant, DauraProgram } from "../types";

type Props = {
  program: DauraProgram;
  assessmentLabel: string;
  participants: DauraParticipant[];
  assessments: DauraAssessment[];
  marks: DauraMark[];
};

const PER_PAGE = 20;

export function DauraAssessmentSheet({ program, assessmentLabel, participants, assessments, marks }: Props) {
  const subjects = program.subjects ?? [];
  const isSessional = program.kind === "sessional";
  const sorted = [...participants].sort((a, b) => a.full_name.localeCompare(b.full_name));

  const perSubject = subjects.map(subject => {
    const a = assessments.find(x => x.subject === subject && x.label === assessmentLabel);
    return { subject, assessmentId: a?.id ?? null, max: a?.max_marks ?? 10 };
  });

  function markFor(participantId: string, assessmentId: string | null): number | null {
    if (!assessmentId) return null;
    const m = marks.find(x => x.assessment_id === assessmentId && x.participant_id === participantId);
    return m?.value ?? null;
  }

  const pageCount = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const headerTitle = isSessional
    ? `${program.session_label ?? ""} Sessional Daura — ${assessmentLabel}`
    : `${program.name || "Special Daura"} — ${assessmentLabel}`;

  return (
    <>
      {Array.from({ length: pageCount }).map((_, pageIdx) => {
        const slice = sorted.slice(pageIdx * PER_PAGE, (pageIdx + 1) * PER_PAGE);
        return (
          <div className="doc-stage" key={pageIdx}>
            <div className="das-doc">
              <style>{STYLES}</style>

              <header className="das-head">
                <img src="/logo.svg" alt="" />
                <div>
                  <div className="school">{CONFIG.name}</div>
                  <div className="doc">{headerTitle}</div>
                  <div className="sess">{sorted.length} participants · {perSubject.length} subjects</div>
                </div>
                <img src="/logo.svg" alt="" style={{ visibility: "hidden" }} />
              </header>

              <table className="das-table">
                <colgroup>
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "22%" }} />
                  {perSubject.map((_, i) => (
                    <col key={i} style={{ width: `${70 / Math.max(1, perSubject.length)}%` }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th>#</th>
                    <th className="nm">Participant</th>
                    {perSubject.map(p => <th key={p.subject}>{p.subject}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {slice.map((p, i) => {
                    const idx = pageIdx * PER_PAGE + i + 1;
                    return (
                      <tr key={p.id}>
                        <td className="n">{idx}</td>
                        <td className="nm">{p.full_name}{p.external ? " (External)" : ""}</td>
                        {perSubject.map(ps => {
                          const v = markFor(p.id, ps.assessmentId);
                          return <td key={ps.subject} className={"mk " + (v == null ? "pending" : "")}>{v != null ? v : "—"}</td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <footer className="das-foot">
                <div>{assessmentLabel} · {program.name}</div>
                <div>Each subject out of {perSubject[0]?.max ?? 10}</div>
              </footer>
            </div>
          </div>
        );
      })}
    </>
  );
}

const STYLES = `
  .das-doc {
    width: var(--doc-w, 283mm); height: var(--doc-h, 193mm); margin: 0 auto;
    background: #fffdf7; border: 1.2mm double #b8923a; padding: 6mm 8mm;
    display: flex; flex-direction: column; gap: 3mm; box-sizing: border-box; overflow: hidden;
    font-family: Georgia, "Times New Roman", serif; color: #1c2420;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .das-head { display: flex; align-items: center; gap: 5mm; border-bottom: 0.5mm solid #1f5a3a; padding-bottom: 3mm; }
  .das-head img { width: 18mm; height: 18mm; object-fit: contain; flex: none; }
  .das-head > div { flex: 1; text-align: center; }
  .das-head .school { font-size: 17pt; font-weight: bold; color: #143d27; line-height: 1.15; }
  .das-head .doc { font-size: 13pt; color: #b8923a; letter-spacing: 2.5pt; text-transform: uppercase; margin-top: 1mm; font-weight: bold; }
  .das-head .sess { font-size: 9pt; color: #555; margin-top: 0.8mm; }
  .das-table { width: 100%; border-collapse: collapse; table-layout: auto; font-family: Arial, sans-serif; flex: 1; }
  .das-table th, .das-table td { border: 0.25mm solid #9fb3a5; text-align: center; font-size: 10.5pt; padding: 1.8mm 1mm; }
  .das-table thead th { background: #1f5a3a; color: #fff; font-weight: bold; height: 8mm; font-size: 10pt; }
  .das-table tbody td { height: 8mm; }
  .das-table tbody tr:nth-child(even) td { background: #f6f9f6; }
  .das-table td.nm { text-align: left; padding-left: 4mm; font-family: Georgia, serif; font-weight: bold; font-size: 11pt; white-space: nowrap; }
  .das-table td.n { color: #7b827c; }
  .das-table td.mk { font-family: "Courier New", monospace; font-weight: 600; font-size: 11pt; color: #143d27; }
  .das-table td.mk.pending { color: #b0731d; }
  .das-foot { margin-top: 3mm; padding-top: 2mm; border-top: 0.3mm solid #b8923a; font-family: Arial, sans-serif; font-size: 8pt; color: #555; display: flex; justify-content: space-between; gap: 5mm; }
  @page { size: A4 landscape; margin: 6mm; }
  @media print { html, body { background: none; } .das-doc { margin: 0; padding: 0; } }
`;
