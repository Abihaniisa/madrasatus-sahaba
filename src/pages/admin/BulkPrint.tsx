// src/pages/admin/BulkPrint.tsx — class-locked bulk print.
// Class + session + semester always current (derived from date + enrollments).
// Document picker: Reports / Transcripts / Admission Letters (per-student docs)
//                   + Class Sheet / Result Sheet (class-level docs, from ClassPage links).
// URL params: ?class=<class>&doc=<report|transcript|admission>

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CONFIG, ALL_CLASSES } from "../../lib/config";
import { getEffectiveSemester, getSessionLabel } from "../../lib/calendar";
import { loadSchool, buildReport, currentSessionForClass, type SchoolData } from "../../lib/data";
import { buildAllSemesters } from "../../lib/calc";
import { useRequireAuth } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { I } from "../../ui/Shell";
import { DelayedSkeleton } from "../../ui/primitives";
import { ReportCard } from "../../documents/ReportCard";
import { AssessmentRecord } from "../../documents/AssessmentRecord";
import { AdmissionLetter } from "../../documents/AdmissionLetter";
import { Transcript } from "../../documents/Transcript";
import type { Student } from "../../types";

type DocKey = "report" | "transcript" | "admission";

const PER_STUDENT_DOCS: DocKey[] = ["report", "transcript", "admission"];

function isValidDoc(v: string | null): v is DocKey {
  return v === "report" || v === "transcript" || v === "admission";
}

export default function BulkPrint() {
  const ready = useRequireAuth();
  const [data, setData] = useState<SchoolData | null>(null);
  const [searchParams] = useSearchParams();
  const urlClass = searchParams.get("class");
  const urlDoc = searchParams.get("doc");
  const cls = (urlClass && ALL_CLASSES.includes(urlClass)) ? urlClass : (ALL_CLASSES[0] ?? "");
  const [doc, setDoc] = useState<DocKey>(isValidDoc(urlDoc) ? urlDoc : "report");

  useEffect(() => { loadSchool().then(setData); }, []);

  // Current session for this class (from enrollments). Fall back to date-derived label.
  const sessionLabel = useMemo(() => {
    if (!data) return getSessionLabel(new Date());
    return currentSessionForClass(data, cls) ?? getSessionLabel(new Date());
  }, [data, cls]);

  const semester = getEffectiveSemester();

  const studentsInClass = useMemo<Student[]>(() => {
    if (!data) return [];
    // Cohort from enrollments for this class + session
    const ids = new Set(
      data.enrollments
        .filter(e => e.class_name === cls && e.session_label === sessionLabel
          && (e.status === "active" || e.status === "repeating"))
        .map(e => e.student_id)
    );
    return data.students
      .filter(s => ids.has(s.id))
      .sort((a, b) => a.reg_no.localeCompare(b.reg_no));
  }, [data, cls, sessionLabel]);

  if (!ready) return <div className="body"><div className="wrap"><DelayedSkeleton ready={ready} rows={5} /></div></div>;
  if (!data) return <div className="body"><div className="wrap"><DelayedSkeleton ready={!!data} rows={5} /></div></div>;

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap" style={{ maxWidth: 1160 }}>
          <div className="crumb no-print">
            <Link to="/admin">Students</Link><span>/</span>
            <Link to={`/admin/class/${encodeURIComponent(cls)}`}>{cls}</Link><span>/</span>
            <span className="current">Bulk print</span>
          </div>
          <div className="phead no-print">
            <div>
              <h1>{cls} — Bulk print</h1>
              <p className="sub">{studentsInClass.length} students · {sessionLabel} · Semester {semester}</p>
            </div>
            <Link to={`/admin/class/${encodeURIComponent(cls)}`} className="btn btn-ghost btn-sm">{I.back} Back to class</Link>
          </div>

          <div className="no-print" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>
              Document
            </div>
            <div className="chip-line" style={{ marginBottom: 0 }}>
              {PER_STUDENT_DOCS.map(k => (
                <button key={k} className={"chip-f " + (doc === k ? "active" : "")} onClick={() => setDoc(k)}>
                  {k === "report" ? "Reports" : k === "transcript" ? "Transcripts" : "Admission Letters"}
                </button>
              ))}
            </div>
          </div>



          <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
            <button className="btn btn-primary btn-sm" onClick={() => window.print()} disabled={!studentsInClass.length}>
              {I.print} Print {studentsInClass.length} document{studentsInClass.length === 1 ? "" : "s"}
            </button>
          </div>

          <div className="print-hint no-print">
            <div><strong>Print setup:</strong> Landscape · A4 · Default margins.</div>
          </div>

          <div className="cert-print-wrapper">
            {studentsInClass.length === 0 ? (
              <div className="card pad"><div className="empty"><div className="t">No students enrolled in {cls} for {sessionLabel}</div></div></div>
            ) : studentsInClass.map(student => {
              if (doc === "admission") {
                return <div key={student.id} style={{ marginBottom: 8 }}><AdmissionLetter student={student} enrollments={data.enrollments} /></div>;
              }
              if (doc === "transcript") {
                const semGroups = buildAllSemesters(student, data.assessments, data.marks, data.exams, data.enrollments);
                return <div key={student.id} style={{ marginBottom: 8 }}><Transcript student={{ ...student, class_name: cls }} semesters={semGroups} /></div>;
              }
              const report = buildReport(student, data.assessments, data.marks, data.exams, semester, sessionLabel, cls, data.enrollments);
              if (doc === "report") {
                return (
                  <div key={student.id} style={{ marginBottom: 8 }}>
                    <ReportCard student={{ ...student, class_name: cls }} results={report.results} average={report.avg} pending={report.pending} sessionLabel={sessionLabel} semester={semester} assessments={data.assessments} marks={data.marks} exams={data.exams} />
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
