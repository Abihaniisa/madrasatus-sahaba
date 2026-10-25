// src/pages/admin/Records.tsx — Historical record browser for ONE student.
// Class chips = attended classes only. Document chips = Report Card / Assessment Record / Transcript / Admission Letter.
// Report Card renders cover + data per semester. Transcript renders all sections. Admission is one document.

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SECTIONS } from "../../lib/config";
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

type DocKey = "report" | "assessment" | "transcript" | "admission";
type ClassPeriod = { className: string; semesters: { session: string; semester: 1 | 2 }[] };

export default function Records() {
  const ready = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SchoolData | null>(null);
  const [activeClass, setActiveClass] = useState<string | null>(null);
  const [doc, setDoc] = useState<DocKey>("report");

  useEffect(() => { loadSchool().then(setData); }, []);

  const student = data?.students.find(s => s.id === id);

  const classPeriods: ClassPeriod[] = useMemo(() => {
    if (!student || !data) return [];
    const semesters = buildAllSemesters(student, data.assessments, data.marks, data.exams);
    const byClass = new Map<string, { session: string; semester: 1 | 2 }[]>();
    for (const g of semesters) {
      if (!byClass.has(g.class_name)) byClass.set(g.class_name, []);
      byClass.get(g.class_name)!.push({ session: g.session_label, semester: (g.semester === 2 ? 2 : 1) as 1 | 2 });
    }
    for (const arr of byClass.values()) {
      arr.sort((a, b) => {
        const s = a.session.localeCompare(b.session);
        return s !== 0 ? s : a.semester - b.semester;
      });
    }
    return Array.from(byClass.entries()).map(([className, semesters]) => ({ className, semesters }));
  }, [student, data]);

  useEffect(() => {
    if (!activeClass && classPeriods.length > 0) setActiveClass(classPeriods[classPeriods.length - 1].className);
  }, [classPeriods, activeClass]);

  if (!ready) return <div className="body"><div className="wrap"><DelayedSkeleton ready={ready} rows={5} /></div></div>;
  if (!data) return <div className="body"><div className="wrap"><DelayedSkeleton ready={!!data} rows={5} /></div></div>;
  if (!student) return <div className="body"><div className="wrap"><div className="empty"><div className="t">Student not found</div></div></div></div>;

  const sectionName = SECTIONS.find(s => s.id === student.section)?.name ?? student.section;
  const activePeriod = classPeriods.find(p => p.className === activeClass) ?? null;
  const semesters = buildAllSemesters(student, data.assessments, data.marks, data.exams);
  const isSectionLevelDoc = doc === "transcript" || doc === "admission";

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
              <p className="sub">{student.reg_no} · {sectionName} · Every record, all classes</p>
            </div>
            <Link to={`/admin/student/${student.id}`} className="btn btn-ghost btn-sm">{I.back} Back to profile</Link>
          </div>

          <div className="no-print" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>
              Document type
            </div>
            <div className="chip-line" style={{ marginBottom: 0 }}>
              <button className={"chip-f " + (doc === "report" ? "active" : "")} onClick={() => setDoc("report")}>Report Card</button>
              <button className={"chip-f " + (doc === "assessment" ? "active" : "")} onClick={() => setDoc("assessment")}>Assessment Record</button>
              <button className={"chip-f " + (doc === "transcript" ? "active" : "")} onClick={() => setDoc("transcript")}>Transcript</button>
              <button className={"chip-f " + (doc === "admission" ? "active" : "")} onClick={() => setDoc("admission")}>Admission Letter</button>
            </div>
          </div>

          {!isSectionLevelDoc && (
            <div className="no-print" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>
                Class
              </div>
              {classPeriods.length === 0 ? (
                <div className="card pad"><p className="sub">No records yet. This student has no assessments or exams in any session.</p></div>
              ) : (
                <div className="chip-line" style={{ marginBottom: 0 }}>
                  {classPeriods.map(p => (
                    <button key={p.className} className={"chip-f " + (p.className === activePeriod?.className ? "active" : "")} onClick={() => setActiveClass(p.className)}>
                      {p.className}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>{I.print} Print this document set</button>
          </div>

          <div className="print-hint no-print">
            <div><strong>Print setup:</strong> Landscape · A4 · Default margins. Report cards print as 2 pages each (cover + data).</div>
          </div>

          <div className="cert-print-wrapper">
            {doc === "admission" ? (
              <AdmissionLetter student={student} />
            ) : doc === "transcript" ? (
              <Transcript student={student} semesters={semesters} />
            ) : !activePeriod ? (
              <div className="card pad"><div className="empty"><div className="t">No class selected</div></div></div>
            ) : (
              activePeriod.semesters.map(({ session, semester }) => {
                const report = buildReport(student, data.assessments, data.marks, data.exams, semester, session, activePeriod.className);
                const periodAssessments = data.assessments.filter(a =>
                  a.class_name === activePeriod.className && a.session_label === session && a.semester === semester
                );
                const periodExams = data.exams.filter(e =>
                  e.class_name === activePeriod.className && e.session_label === session && e.semester === semester
                );
                if (doc === "report") {
                  return (
                    <div key={`${session}-${semester}`} style={{ marginBottom: 8 }}>
                      <ReportCard student={{ ...student, class_name: activePeriod.className }} results={report.results} average={report.avg} pending={report.pending} sessionLabel={session} semester={semester} assessments={data.assessments} marks={data.marks} exams={data.exams} />
                    </div>
                  );
                }
                if (doc === "assessment") {
                  return (
                    <div key={`${session}-${semester}`} style={{ marginBottom: 8 }}>
                      <AssessmentRecord student={{ ...student, class_name: activePeriod.className }} assessments={periodAssessments} marks={data.marks} exams={periodExams} sessionLabel={session} semester={semester} />
                    </div>
                  );
                }
                return null;
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
