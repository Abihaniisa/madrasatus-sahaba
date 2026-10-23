// src/documents/AdmissionLetter.tsx — Admission letter. A4 landscape, two-column.
// Auto-updates: pulls joined date + reg_no from student. Status shown live.
// Wrapped in .doc-stage so the global fit-to-screen CSS applies.

import { CONFIG, SECTIONS } from "../lib/config";
import type { Student } from "../types";

type Props = { student: Student };

export function AdmissionLetter({ student }: Props) {
  const sectionName = SECTIONS.find(s => s.id === student.section)?.name ?? student.section;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const admissionDate = student.joined
    ? new Date(student.joined).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "—";
  const statusLabel = student.status.charAt(0).toUpperCase() + student.status.slice(1);
  const modeLabel = student.mode === "online" ? "Online" : "Physical";

  return (
    <div className="doc-stage">
      <div className="al-doc">
        <style>{STYLES}</style>

        <header className="al-head">
          <img src="/logo.svg" alt="" />
          <div>
            <div className="school">{CONFIG.name}</div>
            <div className="doc">Admission Letter</div>
          </div>
          <img src="/logo.svg" alt="" style={{ visibility: "hidden" }} />
        </header>

        <div className="al-main">
          <aside className="record">
            <h2>Admission Record</h2>
            <div className="f name"><span>Student</span><b>{student.name}</b></div>
            <div className="f"><span>Reg. No.</span><b>{student.reg_no}</b></div>
            <div className="f"><span>Class</span><b>{student.class_name}</b></div>
            <div className="f"><span>Section</span><b>{sectionName}</b></div>
            <div className="f"><span>Mode</span><b>{modeLabel}</b></div>
            <div className="f"><span>Admission Date</span><b>{admissionDate}</b></div>
            <div className="f"><span>Status</span><b className="status">{statusLabel.toUpperCase()}</b></div>
          </aside>

          <section className="letter">
            <div className="meta">
              <span>Ref: {student.reg_no}</span>
              <span>Date issued: {today}</span>
            </div>
            <div className="to">To: {student.name}</div>
            <p>
              We are pleased to confirm that <strong>{student.name}</strong> has been admitted to{" "}
              <strong>{CONFIG.name}</strong> with effect from <strong>{admissionDate}</strong>. The student
              is placed in <strong>{student.class_name}</strong> of the <strong>{sectionName}</strong> section
              and will attend in the <strong>{modeLabel}</strong> mode.
            </p>
            <p>
              The student's registration number is <strong>{student.reg_no}</strong>. This number is the
              student's permanent identifier at the school. It does not change on promotion, on repetition
              of a class, or on advancement to a new section, and it should be quoted in all communication
              with the school and on every school record.
            </p>
            <p>
              This letter is issued as a permanent record of admission. It may be reprinted at any time
              from the school's records. The student's admission status is currently{" "}
              <strong>{statusLabel}</strong>.
            </p>
            <p>
              We welcome {student.name} to the school and look forward to their progress in the study of
              the Qur'an and the Islamic sciences.
            </p>
          </section>
        </div>

        <div className="sigs">
          <div className="sig">Registrar<span>Signature &amp; Date</span></div>
          <div className="sig">Head of School<span>Signature, Stamp &amp; Date</span></div>
        </div>
      </div>
    </div>
  );
}

const STYLES = `
  .al-doc {
    width: var(--doc-w, 283mm); height: var(--doc-h, 195mm); margin: 0 auto;
    background: #fffdf7; border: 1.2mm double #b8923a; padding: 5mm 8mm;
    display: flex; flex-direction: column; gap: 4mm; box-sizing: border-box; overflow: hidden;
    font-family: Georgia, "Times New Roman", serif; color: #1c2420;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .al-head { display: flex; align-items: center; justify-content: center; gap: 6mm; border-bottom: 0.5mm solid #1f5a3a; padding-bottom: 2.5mm; }
  .al-head img { width: 22mm; height: 22mm; object-fit: contain; flex: none; }
  .al-head > div { text-align: center; }
  .al-head .school { font-size: 19pt; font-weight: bold; color: #143d27; line-height: 1.15; }
  .al-head .doc { font-size: 13pt; color: #b8923a; letter-spacing: 4pt; text-transform: uppercase; margin-top: 1.2mm; font-weight: bold; }

  .al-main { display: grid; grid-template-columns: 78mm 1fr; gap: 8mm; flex: 1; min-height: 0; }
  .record { background: #eef3ee; border: 0.3mm solid #c9d6c9; border-top: 1.2mm solid #1f5a3a; padding: 4mm 5mm; display: flex; flex-direction: column; gap: 2.6mm; }
  .record h2 { font-size: 9pt; letter-spacing: 2pt; text-transform: uppercase; color: #143d27; border-bottom: 0.3mm solid #b8923a; padding-bottom: 1.5mm; font-family: Arial, sans-serif; }
  .record .f span { display: block; font-family: Arial, sans-serif; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.8pt; color: #5a6a5f; }
  .record .f b { font-size: 11.5pt; color: #1c2420; }
  .record .f.name b { font-size: 14pt; color: #143d27; }
  .record .status { display: inline-block; background: #1f5a3a; color: #fff; padding: 0.5mm 3mm; border-radius: 2mm; font-size: 9pt; font-family: Arial, sans-serif; letter-spacing: 1pt; }

  .letter { display: flex; flex-direction: column; gap: 3.6mm; font-size: 11.5pt; line-height: 1.55; }
  .letter .meta { display: flex; justify-content: space-between; font-size: 10pt; color: #444; }
  .letter .to { font-weight: bold; color: #1c2420; }
  .letter p { text-align: justify; color: #1c2420; }
  .letter strong { color: #143d27; }

  .sigs { display: flex; justify-content: space-around; align-items: flex-end; padding: 0 14mm; height: 17mm; }
  .sig { width: 75mm; text-align: center; border-top: 0.35mm solid #1c2420; padding-top: 1.2mm; font-size: 10pt; font-weight: bold; }
  .sig span { display: block; font-size: 7.5pt; font-weight: normal; color: #666; font-family: Arial, sans-serif; }

  @media print {
    html, body { background: none; }
    .al-doc { margin: 0; page-break-inside: avoid; break-inside: avoid; }
  }
`;
