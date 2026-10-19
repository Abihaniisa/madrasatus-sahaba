import { CONFIG, SECTIONS } from "../lib/config";
import { gradeFor } from "../lib/calc";
import type { Student, SubjectResult } from "../lib/types";

type Props = {
  student: Student;
  results: (SubjectResult & { pending: boolean })[];
  average: number | null;
  pending: boolean;
};

export function SemesterCertificate({ student, results, average, pending }: Props) {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const sectionName = SECTIONS.find(s => s.id === student.section)?.name ?? student.section;
  const overallGrade = gradeFor(pending ? null : average);
  const passed = results.filter(r => !r.pending && r.final != null && r.final >= 50).length;
  const total = results.length;

  return (
    <div className="cert-print-page">
      <style>{`
        .cert-print-page{
          width:281mm; height:194mm; margin:0 auto; background:#fffdf7;
          border:1.2mm double #b8923a; padding:4mm 6mm; display:flex;
          flex-direction:column; gap:2.5mm; overflow:hidden;
          font-family: Georgia, "Times New Roman", serif; color:#1c2420;
          -webkit-print-color-adjust:exact; print-color-adjust:exact;
        }
        .cert-print-page header{ display:flex; align-items:center; justify-content:center; gap:6mm; border-bottom:0.5mm solid #1f5a3a; padding-bottom:2mm; }
        .cert-print-page header img{ width:22mm; height:22mm; object-fit:contain; flex:none; }
        .cert-print-page .titles{ text-align:center; }
        .cert-print-page .school{ font-size:19pt; font-weight:bold; color:#143d27; letter-spacing:0.3pt; line-height:1.15; }
        .cert-print-page .doc{ font-size:12.5pt; color:#b8923a; letter-spacing:3pt; text-transform:uppercase; margin-top:1mm; font-weight:bold; }
        .cert-print-page .sess{ font-size:9pt; color:#555; margin-top:0.8mm; }
        .cert-print-page .info{ display:grid; grid-template-columns:repeat(4,1fr); gap:1.2mm 5mm; background:#eef3ee; border:0.3mm solid #c9d6c9; padding:2mm 4mm; }
        .cert-print-page .info div{ font-size:9pt; display:flex; gap:2mm; align-items:baseline; }
        .cert-print-page .info span{ color:#5a6a5f; text-transform:uppercase; font-size:7pt; letter-spacing:0.6pt; white-space:nowrap; }
        .cert-print-page .info b{ font-size:10pt; }
        .cert-print-page table{ width:100%; border-collapse:collapse; font-family:Arial,Helvetica,sans-serif; }
        .cert-print-page th, .cert-print-page td{ border:0.25mm solid #9fb3a5; text-align:center; font-size:11pt; padding:0; overflow:hidden; }
        .cert-print-page thead th{ background:#1f5a3a; color:#fff; height:9mm; font-weight:bold; line-height:1.15; }
        .cert-print-page thead th.sub2{ background:#143d27; }
        .cert-print-page thead tr.top th{ height:7mm; font-size:10pt; letter-spacing:0.5pt; }
        .cert-print-page thead tr.wk th{ height:7mm; font-size:9pt; }
        .cert-print-page thead tr.top th{ border-bottom: none; }
        .cert-print-page thead tr.wk th{ border-top: none; }
        .cert-print-page thead tr.wk th:empty { border-top: 0.25mm solid #9fb3a5; }
        .cert-print-page tbody td{ height:12mm; }
        .cert-print-page tbody tr:nth-child(even) td{ background:#f6f9f6; }
        .cert-print-page td.subj{ text-align:left; padding-left:4mm; font-weight:bold; font-size:12.5pt; font-family:Georgia,serif; }
        .cert-print-page td.fin{ font-weight:bold; font-size:13pt; background:#fbf3df !important; }
        .cert-print-page td.grade{ font-weight:bold; font-size:15pt; color:#143d27; }
        .cert-print-page td.remark{ font-size:10.5pt; }
        .cert-print-page .bottom{ display:grid; grid-template-columns:1.05fr 1fr; gap:4mm; }
        .cert-print-page .summary{ border:0.4mm solid #1f5a3a; display:grid; grid-template-columns:repeat(3,1fr); }
        .cert-print-page .summary div{ padding:2mm 3mm; text-align:center; border-right:0.25mm solid #b9c9bd; display:flex; flex-direction:column; justify-content:center; }
        .cert-print-page .summary div:last-child{ border-right:none; }
        .cert-print-page .summary small{ font-family:Arial,sans-serif; font-size:7pt; text-transform:uppercase; letter-spacing:0.7pt; color:#5a6a5f; }
        .cert-print-page .summary strong{ font-size:19pt; color:#143d27; line-height:1.25; }
        .cert-print-page .summary em{ font-style:normal; font-size:8.5pt; color:#b8923a; font-weight:bold; }
        .cert-print-page .side{ display:flex; flex-direction:column; gap:2mm; }
        .cert-print-page .key{ font-family:Arial,sans-serif; font-size:7.5pt; border:0.25mm solid #c9d6c9; padding:1.8mm 3mm; background:#eef3ee; line-height:1.5; }
        .cert-print-page .key b{ color:#143d27; }
        .cert-print-page .formula{ font-family:Arial,sans-serif; font-size:7.2pt; color:#555; line-height:1.4; }
        .cert-print-page .sigs{ display:flex; justify-content:space-around; align-items:flex-end; margin-top:auto; padding:0 12mm; height:15mm; }
        .cert-print-page .sig{ width:75mm; text-align:center; border-top:0.35mm solid #1c2420; padding-top:1.2mm; font-size:9.5pt; font-weight:bold; }
        .cert-print-page .sig span{ display:block; font-size:7pt; font-weight:normal; color:#666; font-family:Arial,sans-serif; }

        @media print {
          .cert-print-page {
            overflow: visible !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
          }
          .cert-print-page table { table-layout: auto !important; }
          .cert-print-page thead { display: table-header-group; }
          .cert-print-page tbody { display: table-row-group; }
          .cert-print-page tr { page-break-inside: avoid; }
          .cert-print-page th, .cert-print-page td { overflow: visible !important; }
          .cert-print-page thead th {
            background: transparent !important;
            color: #000 !important;
            border: 0.25mm solid #000 !important;
          }
        }
      `}</style>

      <header>
        <img src="/logo.svg" alt="" />
        <div className="titles">
          <div className="school">{CONFIG.name}</div>
          <div className="doc">Semester Report Card</div>
          <div className="sess">{CONFIG.sessionLabel} · First Semester</div>
        </div>
        <img src="/logo.svg" alt="" style={{ visibility: "hidden" }} />
      </header>

      <section className="info">
        <div><span>Student</span><b>{student.name}</b></div>
        <div><span>Reg. No.</span><b>{student.reg_no}</b></div>
        <div><span>Class</span><b>{student.class_name}</b></div>
        <div><span>Section</span><b>{sectionName}</b></div>
        <div><span>Mode</span><b>{student.mode === "online" ? "Online" : "Physical"}</b></div>
        <div><span>Session</span><b>{CONFIG.sessionLabel}</b></div>
        <div><span>Semester</span><b>First</b></div>
        <div><span>Date Issued</span><b>{today}</b></div>
      </section>

      <table>
        <thead>
          <tr className="top">
            <th style={{ width: "19%" }}>Subject</th>
            <th colSpan={2}>Assessments</th>
            <th colSpan={2}>Exam</th>
            <th style={{ width: "11%" }}>Final<br/>/100</th>
            <th style={{ width: "9%" }}>Grade</th>
            <th style={{ width: "19%" }}>Remark</th>
          </tr>
          <tr className="wk">
            <th></th>
            <th className="sub2" style={{ width: "10.5%" }}>Avg /10</th>
            <th className="sub2" style={{ width: "10.5%" }}>30%</th>
            <th className="sub2" style={{ width: "10.5%" }}>Score /100</th>
            <th className="sub2" style={{ width: "10.5%" }}>70%</th>
            <th></th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {results.map(r => {
            const assessmentOutOf10 = r.assessmentPct != null ? r.assessmentPct / 10 : null;
            const assessment30 = r.assessmentPct != null ? r.assessmentPct * 0.30 : null;
            const exam70 = r.examPct != null ? r.examPct * 0.70 : null;
            const remark = r.pending ? "Pending" : r.grade.label;
            return (
              <tr key={r.subject}>
                <td className="subj">{r.subject}</td>
                <td>{assessmentOutOf10 != null ? assessmentOutOf10.toFixed(2) : "—"}</td>
                <td>{assessment30 != null ? assessment30.toFixed(2) : "—"}</td>
                <td>{r.examPct != null ? r.examPct : "—"}</td>
                <td>{exam70 != null ? exam70.toFixed(2) : "—"}</td>
                <td className="fin">{r.final != null ? r.final.toFixed(1) : "—"}</td>
                <td className="grade">{r.pending ? "—" : r.grade.code}</td>
                <td className="remark">{remark}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <section className="bottom">
        <div className="summary">
          <div>
            <small>Semester Average</small>
            <strong>{average != null && !pending ? average.toFixed(1) : "—"}</strong>
            <em>out of 100</em>
          </div>
          <div>
            <small>Overall Grade</small>
            <strong>{pending ? "—" : overallGrade.code}</strong>
            <em>{pending ? "Provisional" : overallGrade.label}</em>
          </div>
          <div>
            <small>Subjects Passed</small>
            <strong>{passed} / {total}</strong>
            <em>{pending ? "Pending marks" : "No failures"}</em>
          </div>
        </div>
        <div className="side">
          <div className="key">
            <b>Grading key:</b> A Distinction (75+) · B Credit (60–74) · C Pass (50–59) · D Fail (below 50)
          </div>
          <div className="formula">
            Final score = 30% of the average of all recorded assessments (scaled to 100) + 70% of the exam.
            Semester average = mean of the five subject finals.
          </div>
        </div>
      </section>

      <section className="sigs">
        <div className="sig">Class Teacher<span>Signature &amp; Date</span></div>
        <div className="sig">Head of School<span>Signature, Stamp &amp; Date</span></div>
      </section>
    </div>
  );
}
