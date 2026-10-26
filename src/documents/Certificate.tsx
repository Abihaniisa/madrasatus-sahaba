// src/documents/Certificate.tsx — Certificate page (A4 landscape).
// Renders only for A (Distinction) and B (Merit). Returns null for C, D, or pending.
// Caller is responsible for skipping the page-break wrapper when this returns null.

import { CONFIG, SECTIONS } from "../lib/config";
import { getSettings } from "../lib/settings";
import { getEffectiveSemester } from "../lib/calendar";
import { gradeFor } from "../lib/calc";
import type { Student, SubjectResult } from "../types";

type Props = {
  student: Student;
  results: (SubjectResult & { pending: boolean })[];
  average: number | null;
  pending: boolean;
  semester?: number;
  sessionLabel?: string;
};

const TITLES: Record<string, string> = {
  A: "Certificate of Distinction",
  B: "Certificate of Merit",
};

export function Certificate({ student, average, pending, semester, sessionLabel }: Props) {
  const sem = semester ?? getEffectiveSemester();
  const session = sessionLabel ?? getSettings().session_label;
  const sectionName = SECTIONS.find(s => s.id === student.section)?.name ?? student.section;
  const overall = gradeFor(pending ? null : average);
  const semesterText = sem === 1 ? "First" : "Second";
  const title = TITLES[overall.code];
  if (!title) return null;

  return (
    <div className="doc-stage">
      <div className="cert-page">
        <style>{`
          .cert-page {
            position: relative;
            width: var(--doc-w, 283mm);
            height: var(--doc-h, 195mm);
            margin: 0 auto;
            background: #fffdf7;
            border: 2mm double #b8923a;
            padding: 5mm;
            overflow: hidden;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .cert-page .inner {
            position: relative;
            height: 100%;
            border: 0.6mm solid #1f5a3a;
            padding: 6mm 14mm 7mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            box-sizing: border-box;
          }
          .cert-page .inner::before,
          .cert-page .inner::after {
            content: "";
            position: absolute;
            width: 5mm;
            height: 5mm;
            background: #b8923a;
            transform: rotate(45deg);
            top: -3mm;
          }
          .cert-page .inner::before { left: -3mm; }
          .cert-page .inner::after { right: -3mm; }
          .cert-page .corner-b { position: absolute; width: 5mm; height: 5mm; background: #b8923a; transform: rotate(45deg); bottom: -3mm; }
          .cert-page .cb1 { left: -3mm; }
          .cert-page .cb2 { right: -3mm; }
          .cert-page .watermark { position: absolute; left: 50%; top: 52%; width: 105mm; height: 105mm; transform: translate(-50%, -50%); opacity: 0.06; object-fit: contain; z-index: 0; }
          .cert-page .inner > *:not(.watermark):not(.corner-b) { position: relative; z-index: 1; }
          .cert-page .logo { width: 28mm; height: 28mm; object-fit: contain; }
          .cert-page .school { font-family: Georgia, serif; font-size: 21pt; font-weight: bold; color: #143d27; margin-top: 2mm; line-height: 1.15; }
          .cert-page .rule { width: 120mm; height: 0.6mm; background: linear-gradient(90deg, transparent, #b8923a, transparent); margin: 2.5mm 0; }
          .cert-page .award { font-family: Georgia, serif; font-size: 30pt; color: #b8923a; text-transform: uppercase; letter-spacing: 6pt; font-weight: bold; line-height: 1.1; }
          .cert-page .lead { font-family: Georgia, serif; font-size: 12pt; font-style: italic; color: #555; margin-top: 5mm; }
          .cert-page .name { font-family: Georgia, serif; font-size: 34pt; font-weight: bold; color: #143d27; margin-top: 2mm; padding: 0 15mm 1mm; border-bottom: 0.7mm solid #b8923a; line-height: 1.2; }
          .cert-page .for { font-family: Georgia, serif; font-size: 12.5pt; margin-top: 5mm; color: #1c2420; }
          .cert-page .period { font-family: Georgia, serif; font-size: 17pt; font-weight: bold; color: #1f5a3a; margin-top: 1.5mm; }
          .cert-page .class { font-family: Georgia, serif; font-size: 13pt; margin-top: 1mm; color: #1c2420; }
          .cert-page .score { font-family: Georgia, serif; font-size: 14pt; margin-top: 4mm; color: #1c2420; }
          .cert-page .score b { font-size: 22pt; color: #143d27; }
          .cert-page .sigs { margin-top: auto; width: 100%; display: flex; justify-content: space-around; padding-top: 8mm; }
          .cert-page .sig { width: 75mm; border-top: 0.35mm solid #1c2420; padding-top: 1.2mm; font-family: Georgia, serif; font-size: 10.5pt; font-weight: bold; color: #1c2420; }
          .cert-page .sig span { display: block; font-weight: normal; font-size: 8pt; color: #666; font-family: Arial, sans-serif; }
          @page { size: A4 landscape; margin: 6mm; }
          @media print {
            html, body { background: none; }
            .cert-page { margin: 0; page-break-inside: avoid; break-inside: avoid; }
          }
        `}</style>

        <div className="inner">
          <img className="watermark" src="/logo.svg" alt="" />
          <span className="corner-b cb1"></span>
          <span className="corner-b cb2"></span>

          <img className="logo" src="/logo.svg" alt="" />
          <div className="school">{CONFIG.name}</div>
          <div className="rule"></div>
          <div className="award">{title}</div>

          <div className="lead">This is to certify that</div>
          <div className="name">{student.name}</div>

          <div className="for">completed the</div>
          <div className="period">{semesterText} Semester · {session} Academic Session</div>
          <div className="class">{student.class_name} &nbsp;({sectionName})</div>

          <div className="score">
            with an average score of &nbsp;<b>{average!.toFixed(1)}%</b>&nbsp; — Grade {overall.code} ({overall.label})
          </div>

          <div className="sigs">
            <div className="sig">Class Teacher<span>Signature &amp; Date</span></div>
            <div className="sig">Head of School<span>Signature, Stamp &amp; Date</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
