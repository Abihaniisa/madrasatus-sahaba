// src/documents/DauraReport.tsx — Daura programme report card. A4 landscape, ceremonial.
// Assessment-only calculation (no exam). Each subject = mean of its assessments, scaled to 100.
// Programme average = mean of the subject percentages.
// Auto-updates from daura_marks; pending subjects show "—".

import { CONFIG } from "../lib/config";

type DauraParticipant = {
  id: string;
  full_name: string;
  external: boolean;
  nin: string | null;
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
  const subjects = program.subjects;

  const subjectResults = subjects.map(subject => {
    const subjAssessments = assessments.filter(a => a.subject === subject);
    if (subjAssessments.length === 0) {
      return { subject, pct: null as number | null, recorded: 0, total: 0 };
    }
    let sum = 0, recorded = 0;
    for (const a of subjAssessments) {
      const m = marks.find(x => x.assessment_id === a.id && x.participant_id === participant.id);
      if (m?.value != null) {
        sum += m.value / a.max_marks;
        recorded++;
      }
    }
    const pending = recorded < subjAssessments.length;
    const pct = pending ? null : Math.round((sum / subjAssessments.length) * 10000) / 100;
    return { subject, pct, recorded, total: subjAssessments.length };
  });

  const availablePcts = subjectResults.map(r => r.pct).filter((v): v is number => v != null);
  const programmeAvg = availablePcts.length === subjects.length
    ? Math.round((availablePcts.reduce((a, b) => a + b, 0) / availablePcts.length) * 100) / 100
    : null;
  const overall = gradeFor(programmeAvg);

  return (
    <div className="dr-page">
      <style>{STYLES}</style>
      <div className="inner">
        <img className="watermark" src="/logo.svg" alt="" />
        <span className="corner-b cb1" />
        <span className="corner-b cb2" />

        <img className="logo" src="/logo.svg" alt="" />
        <div className="school">{CONFIG.name}</div>
        <div className="rule" />
        <div className="doc">Daura Report Card</div>
        <div className="type">
          {program.weeks}-Week Intensive Programme · Certificate of Completion
        </div>

        <div className="lead">This is to certify that</div>
        <div className="name">{participant.full_name}</div>
        {!participant.external && participant.nin && (
          <div className="reg">NIN ending <b>{participant.nin.slice(-4)}</b> · Student participant</div>
        )}
        {participant.external && (
          <div className="reg">External participant{participant.phone ? ` · ${participant.phone}` : ""}</div>
        )}

        <div className="for">participated in and completed the intensive programme</div>
        <div className="prog">{program.name}</div>
        <div className="dates">
          <b>{fmtDate(program.start_date)}</b> to <b>{fmtDate(program.end_date)}</b>
          &nbsp;·&nbsp;{program.weeks} week{program.weeks === 1 ? "" : "s"}
        </div>

        <div className="results">
          {subjectResults.map(r => {
            const g = gradeFor(r.pct);
            return (
              <div className="card" key={r.subject}>
                <span>{r.subject}</span>
                <strong>{r.pct != null ? r.pct.toFixed(1) : "—"}</strong>
                <em>out of 100</em>
                <br />
                <i>{g.code}</i>
              </div>
            );
          })}
          <div className="avg">
            <small>Programme Average</small>
            <strong>{programmeAvg != null ? programmeAvg.toFixed(1) : "—"}</strong>
            <em>Grade {overall.code} · {overall.remark}</em>
          </div>
        </div>

        <div className="key">
          Grading key: A Distinction (75+) · B Credit (60–74) · C Pass (50–59) · D Fail (below 50).
          Daura performance is assessment-only and independent from the semester and section averages.
        </div>

        <div className="sigs">
          <div className="sig">Programme Coordinator<span>Signature &amp; Date</span></div>
          <div className="sig">Head of School<span>Signature, Stamp &amp; Date</span></div>
        </div>
      </div>
    </div>
  );
}

const STYLES = `
  .dr-page {
    position: relative;
    width: 287mm;
    min-height: 194mm;
    margin: 0 auto;
    background: #fffdf7;
    border: 2mm double #b8923a;
    padding: 4mm;
    box-sizing: border-box;
    font-family: Georgia, "Times New Roman", serif;
    color: #1c2420;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .dr-page .inner {
    position: relative;
    height: 100%;
    border: 0.6mm solid #1f5a3a;
    padding: 4mm 12mm 5mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    box-sizing: border-box;
  }
  .dr-page .inner::before,
  .dr-page .inner::after,
  .dr-page .corner-b {
    content: "";
    position: absolute;
    width: 5mm;
    height: 5mm;
    background: #b8923a;
    transform: rotate(45deg);
  }
  .dr-page .inner::before { top: -3mm; left: -3mm; }
  .dr-page .inner::after { top: -3mm; right: -3mm; }
  .dr-page .corner-b { bottom: -3mm; }
  .dr-page .cb1 { left: -3mm; }
  .dr-page .cb2 { right: -3mm; }
  .dr-page .watermark {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 100mm;
    height: 100mm;
    transform: translate(-50%, -50%);
    opacity: 0.05;
    object-fit: contain;
  }
  .dr-page .inner > *:not(.watermark):not(.corner-b) { position: relative; z-index: 1; }

  .dr-page .logo { width: 22mm; height: 22mm; object-fit: contain; }
  .dr-page .school { font-size: 18pt; font-weight: bold; color: #143d27; margin-top: 1mm; line-height: 1.15; }
  .dr-page .rule {
    width: 110mm;
    height: 0.6mm;
    background: linear-gradient(90deg, transparent, #b8923a, transparent);
    margin: 1.8mm 0;
  }
  .dr-page .doc {
    font-size: 20pt;
    color: #b8923a;
    text-transform: uppercase;
    letter-spacing: 5pt;
    font-weight: bold;
    line-height: 1.1;
  }
  .dr-page .type {
    font-family: Arial, sans-serif;
    font-size: 8pt;
    letter-spacing: 2pt;
    text-transform: uppercase;
    color: #5a6a5f;
    margin-top: 1.2mm;
  }
  .dr-page .lead { font-size: 11pt; font-style: italic; color: #555; margin-top: 3.5mm; }
  .dr-page .name {
    font-size: 30pt;
    font-weight: bold;
    color: #143d27;
    padding: 0 14mm 0.5mm;
    border-bottom: 0.7mm solid #b8923a;
    line-height: 1.2;
    margin-top: 1mm;
  }
  .dr-page .reg {
    font-family: Arial, sans-serif;
    font-size: 10pt;
    margin-top: 1.8mm;
    color: #444;
  }
  .dr-page .reg b { color: #143d27; }
  .dr-page .for { font-size: 11.5pt; margin-top: 3mm; }
  .dr-page .prog { font-size: 19pt; font-weight: bold; color: #1f5a3a; margin-top: 1mm; }
  .dr-page .dates { font-size: 11pt; margin-top: 1mm; }
  .dr-page .dates b { color: #143d27; }

  .dr-page .results {
    display: flex;
    align-items: stretch;
    justify-content: center;
    gap: 3mm;
    margin-top: 4.5mm;
    width: 100%;
    flex-wrap: wrap;
  }
  .dr-page .card {
    width: 34mm;
    border: 0.3mm solid #b9c9bd;
    background: #eef3ee;
    border-top: 1.2mm solid #1f5a3a;
    padding: 2mm 1mm;
    font-family: Arial, sans-serif;
  }
  .dr-page .card span {
    display: block;
    font-family: Georgia, serif;
    font-weight: bold;
    font-size: 11pt;
    color: #143d27;
  }
  .dr-page .card strong { display: block; font-size: 22pt; line-height: 1.25; color: #143d27; }
  .dr-page .card em { font-style: normal; font-size: 7.5pt; color: #555; }
  .dr-page .card i {
    display: inline-block;
    margin-top: 0.8mm;
    background: #1f5a3a;
    color: #fff;
    font-style: normal;
    font-weight: bold;
    font-size: 9pt;
    padding: 0 2.5mm;
    border-radius: 2mm;
  }
  .dr-page .avg {
    width: 44mm;
    background: #143d27;
    color: #fff;
    border: 0.3mm solid #143d27;
    border-top: 1.2mm solid #b8923a;
    padding: 2mm 1mm;
    font-family: Arial, sans-serif;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .dr-page .avg small { font-size: 7.5pt; letter-spacing: 1.2pt; text-transform: uppercase; }
  .dr-page .avg strong { font-size: 28pt; color: #f0d28a; line-height: 1.2; }
  .dr-page .avg em { font-style: normal; font-size: 9pt; font-weight: bold; }
  .dr-page .key {
    font-family: Arial, sans-serif;
    font-size: 7.5pt;
    color: #555;
    margin-top: 3mm;
    line-height: 1.5;
    max-width: 200mm;
  }
  .dr-page .sigs {
    margin-top: auto;
    width: 100%;
    display: flex;
    justify-content: space-around;
    padding-top: 6mm;
  }
  .dr-page .sig {
    width: 75mm;
    border-top: 0.35mm solid #1c2420;
    padding-top: 1.2mm;
    font-size: 10pt;
    font-weight: bold;
  }
  .dr-page .sig span {
    display: block;
    font-weight: normal;
    font-size: 7.5pt;
    color: #666;
    font-family: Arial, sans-serif;
  }

  @page { size: A4 landscape; margin: 8mm; }
  @media print {
    html, body { background: none; }
    .dr-page { margin: 0; page-break-inside: avoid; break-inside: avoid; }
  }
`;
