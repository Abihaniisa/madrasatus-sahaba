// src/pages/admin/Records.tsx — Historical record browser for ONE student.
// Two-step filter: (1) session×class, (2) document type.
// Renders the requested document inline. Print button per document.

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CONFIG, SECTIONS } from "../../lib/config";
import { loadSchool, buildReport, type SchoolData } from "../../lib/data";
import { buildAllSemesters } from "../../lib/calc";
import { useRequireAuth } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { I } from "../../ui/Shell";
import { DelayedSkeleton } from "../../ui/primitives";
import { ReportCard } from "../../documents/ReportCard";
import { AssessmentRecord } from "../../documents/AssessmentRecord";
import { Transcript } from "../../documents/Transcript";
import { AdmissionLetter } from "../../documents/AdmissionLetter";
import { Certificate } from "../../documents/Certificate";

type DocKey = "report" | "assessment" | "transcript" | "admission" | "certificate";

type Period = {
  session: string;
  className: string;
  semester: 1 | 2;
  key: string;
};

export default function Records() {
  const ready = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SchoolData | null>(null);
  const [periodKey, setPeriodKey] = useState<string | null>(null);
  const [doc, setDoc] = useState<DocKey>("report");

  useEffect(() => { loadSchool().then(setData); }, []);

  const student = data?.students.find(s => s.id === id);
  const semesters = useMemo(() => {
    if (!student || !data) return [];
    return buildAllSemesters(student, data.assessments, data.marks, data.exams);
  }, [student, data]);

  const periods: Period[] = useMemo(() => {
    return semesters.map(g => ({
      session: g.session_label,
      className: g.class_name,
      semester: (g.semester === 2 ? 2 : 1) as 1 | 2,
      key: `${g.session_label}|${g.class_name}|${g.semester}`,
    }));
  }, [semesters]);

  const activePeriod = periods.find(p => p.key === periodKey) ?? periods[periods.length - 1] ?? null;

  useEffect(() => {
    if (!periodKey && periods.length > 0) {
      setPeriodKey(periods[periods.length - 1].key);
    }
  }, [periods, periodKey]);

  if (!ready) return <div className="body"><div className="wrap"><DelayedSkeleton ready={ready} rows={5} /></div></div>;
  if (!data) return <div className="body"><div className="wrap"><DelayedSkeleton ready={!!data} rows={5} /></div></div>;
  if (!student) return <div className="body"><div className="wrap"><div className="empty"><div className="t">Student not found</div></div></div></div>;

  const sectionName = SECTIONS.find(s => s.id === student.section)?.name ?? student.section;

  const activeReport = activePeriod
    ? buildReport(student, data.assessments, data.marks, data.exams, activePeriod.semester, activePeriod.session, activePeriod.className)
    : null;

  const activeAssessments = activePeriod
    ? data.assessments.filter(a =>
        a.class_name === activePeriod.className &&
        a.session_label === activePeriod.session &&
        a.semester === activePeriod.semester
      )
    : [];

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap" style={{ maxWidth: 1160 }}>
          <div className="crumb no-print">
            <Link to="/admin">Students</Link><span>/</span>
            <Link to={`/admin/class/${encodeURIComponent(student.class_name)}`}>{student.class_name}</Link><span>/</span>
            <Link to={`/admin/student/${student.id}`}>{student.name}</Link><span>/</span>
            <span className="current">Records</span>
          </div>

          <div className="phead no-print">
            <div>
              <h1>{student.name}</h1>
              <p className="sub">
                {student.reg_no} · {sectionName} · Every record, all sessions
              </p>
            </div>
            <Link to={`/admin/student/${student.id}`} className="btn btn-ghost btn-sm">{I.back} Back to profile</Link>
          </div>

          <div className="no-print" style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>
              Step 1 — pick a period
            </div>
            {periods.length === 0 ? (
              <div className="card pad">
                <p className="sub">No records yet. This student has no assessments or exams in any session.</p>
              </div>
            ) : (
              <div className="chip-line" style={{ marginBottom: 0 }}>
                {periods.map(p => (
                  <button
                    key={p.key}
                    className={"chip-f " + (p.key === activePeriod?.key ? "active" : "")}
                    onClick={() => setPeriodKey(p.key)}
                  >
                    {p.session} · {p.className} · S{p.semester}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activePeriod && (
            <div className="no-print" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>
                Step 2 — pick a document
              </div>
              <div className="chip-line" style={{ marginBottom: 0 }}>
                <button className={"chip-f " + (doc === "report" ? "active" : "")} onClick={() => setDoc("report")}>Report Card</button>
                <button className={"chip-f " + (doc === "assessment" ? "active" : "")} onClick={() => setDoc("assessment")}>Assessment Record</button>
                <button className={"chip-f " + (doc === "transcript" ? "active" : "")} onClick={() => setDoc("transcript")}>Transcript</button>
                <button className={"chip-f " + (doc === "admission" ? "active" : "")} onClick={() => setDoc("admission")}>Admission Letter</button>
                <button className={"chip-f " + (doc === "certificate" ? "active" : "")} onClick={() => setDoc("certificate")}>Certificate</button>
              </div>
            </div>
          )}

          <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
              {I.print} Print this document
            </button>
          </div>

          <div className="print-hint no-print">
            <div>
              <strong>Print setup:</strong> Landscape · A4 · Default margins.
            </div>
          </div>

          <div className="cert-print-wrapper">
            {!activePeriod ? (
              <div className="card pad">
                <div className="empty"><div className="t">No period selected</div></div>
              </div>
            ) : doc === "report" && activeReport ? (
              <ReportCard
                student={student}
                results={activeReport.results}
                average={activeReport.avg}
                pending={activeReport.pending}
                sessionLabel={activePeriod.session}
                semester={activePeriod.semester}
              />
            ) : doc === "assessment" ? (
              <AssessmentRecord
                student={student}
                assessments={activeAssessments}
                marks={data.marks}
                sessionLabel={activePeriod.session}
                semester={activePeriod.semester}
              />
            ) : doc === "transcript" ? (
              <Transcript student={student} semesters={semesters} sectionId={student.section} />
            ) : doc === "admission" ? (
              <AdmissionLetter student={student} />
            ) : doc === "certificate" && activeReport ? (
              <Certificate
                student={student}
                results={activeReport.results}
                average={activeReport.avg}
                pending={activeReport.pending}
                semester={activePeriod.semester}
                sessionLabel={activePeriod.session}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
