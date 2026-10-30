// src/pages/admin/Records.tsx — Historical record browser for ONE student.
// Class chips = attended classes only. Document chips = Report Card / Assessment Record / Transcript / Admission Letter.
// Report Card renders cover + data per semester. Transcript renders all sections. Admission is one document.

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SECTIONS } from "../../lib/config";
import { loadSchool, buildReport, type SchoolData } from "../../lib/data";
import { buildAllSemesters } from "../../lib/calc";
import { useRequireAuth, supabase } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { I } from "../../ui/Shell";
import { DelayedSkeleton } from "../../ui/primitives";
import { ReportCard } from "../../documents/ReportCard";
import { AssessmentRecord } from "../../documents/AssessmentRecord";
import { Transcript } from "../../documents/Transcript";
import { AdmissionLetter } from "../../documents/AdmissionLetter";
import { DauraReport } from "../../documents/DauraReport";
import { DauraAssessmentReport } from "../../documents/DauraAssessmentReport";

type DocKey = "report" | "assessment" | "transcript" | "admission" | "daura";
type ClassPeriod = { className: string; semesters: { session: string; semester: 1 | 2 }[] };

export default function Records() {
  const ready = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SchoolData | null>(null);
  const [activeClass, setActiveClass] = useState<string | null>(null);
  const [doc, setDoc] = useState<DocKey>("report");
  const [dauraParticipations, setDauraParticipations] = useState<any[]>([]);
  const [dauraPrograms, setDauraPrograms] = useState<any[]>([]);
  const [dauraAssessments, setDauraAssessments] = useState<any[]>([]);
  const [dauraMarks, setDauraMarks] = useState<any[]>([]);
  const [dauraLoaded, setDauraLoaded] = useState(false);

  useEffect(() => { loadSchool().then(setData); }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: parts } = await supabase
        .from("daura_participants")
        .select("*")
        .eq("student_id", id);
      const list = (parts as any[]) ?? [];
      setDauraParticipations(list);
      if (list.length === 0) { setDauraLoaded(true); return; }
      const pids = Array.from(new Set(list.map(p => p.program_id)));
      const [progs, asses] = await Promise.all([
        supabase.from("daura_programs").select("*").in("id", pids),
        supabase.from("daura_assessments").select("*").in("program_id", pids),
      ]);
      setDauraPrograms((progs.data as any[]) ?? []);
      setDauraAssessments((asses.data as any[]) ?? []);
      const assesIds = ((asses.data as any[]) ?? []).map((a: any) => a.id);
      if (assesIds.length > 0) {
        const { data: mks } = await supabase.from("daura_marks").select("*").in("assessment_id", assesIds);
        setDauraMarks((mks as any[]) ?? []);
      }
      setDauraLoaded(true);
    })();
  }, [id]);

  const student = data?.students.find(s => s.id === id);

  const classPeriods: ClassPeriod[] = useMemo(() => {
    if (!student || !data) return [];
    const semesters = buildAllSemesters(student, data.assessments, data.marks, data.exams, data.enrollments);
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
  const isSectionLevelDoc = doc === "transcript" || doc === "admission" || doc === "daura";

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
              <button className={"chip-f " + (doc === "report" ? "active" : "")} onClick={() => setDoc("report")}>Reports</button>
              <button className={"chip-f " + (doc === "transcript" ? "active" : "")} onClick={() => setDoc("transcript")}>Transcript</button>
              <button className={"chip-f " + (doc === "admission" ? "active" : "")} onClick={() => setDoc("admission")}>Admission Letter</button>
              <button className={"chip-f " + (doc === "daura" ? "active" : "")} onClick={() => setDoc("daura")}>Daura</button>
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
              <AdmissionLetter student={student} enrollments={data.enrollments} />
            ) : doc === "transcript" ? (
              <Transcript student={student} semesters={semesters} />
            ) : doc === "daura" ? (
              !dauraLoaded ? (
                <div className="card pad"><div className="sub">Loading Daura records…</div></div>
              ) : dauraParticipations.length === 0 ? (
                <div className="card"><div className="empty"><div className="t">No Daura programmes</div><div className="d">This student has not participated in any Daura.</div></div></div>
              ) : (
                dauraParticipations.map((part: any) => {
                  const prog = dauraPrograms.find((pr: any) => pr.id === part.program_id);
                  if (!prog) return null;
                  const progAssessments = dauraAssessments.filter((a: any) => a.program_id === part.program_id);
                  const progMarks = dauraMarks.filter((m: any) => m.participant_id === part.id);
                  return (
                    <div key={part.id} style={{ marginBottom: 20 }}>
                      <div className="no-print" style={{ padding: "8px 14px", background: "var(--primary-soft)", borderLeft: "3px solid var(--primary)", fontSize: 13, fontWeight: 500, color: "var(--primary)", marginBottom: 8, borderRadius: "var(--r-1)" }}>
                        {prog.kind === "sessional" ? `Sessional Daura · ${prog.session_label ?? ""}` : prog.name || "Special Daura"}
                      </div>
                      <DauraAssessmentReport
                        participant={part}
                        program={prog}
                        assessments={progAssessments}
                        marks={progMarks}
                      />
                      <DauraReport
                        participant={part}
                        program={prog}
                        assessments={progAssessments}
                        marks={progMarks}
                      />
                    </div>
                  );
                })
              )
            ) : !activePeriod ? (
              <div className="card pad"><div className="empty"><div className="t">No class selected</div></div></div>
            ) : (
              activePeriod.semesters.map(({ session, semester }) => {
                const report = buildReport(student, data.assessments, data.marks, data.exams, semester, session, activePeriod.className, data.enrollments);
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
                      <AssessmentRecord student={{ ...student, class_name: activePeriod.className }} assessments={periodAssessments} marks={data.marks} exams={periodExams} sessionLabel={session} semester={semester} average={report.avg} pending={report.pending} />
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
