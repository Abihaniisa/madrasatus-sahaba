// src/pages/StudentPortal.tsx — Student view. Same documents as admin Records, no editing.
// Sign out is a top-right absolute button. Print uses class-based hiding (no DOM paths).

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CONFIG, SECTIONS } from "../lib/config";
import { PublicNav, PublicTabBar, I } from "../ui/Shell";
import { getStudentSession, clearStudentSession, fetchStudentPortal, type StudentPortalData } from "../lib/supabase";
import { buildReport } from "../lib/data";
import { buildAllSemesters } from "../lib/calc";
import { ReportCard } from "../documents/ReportCard";
import { AssessmentRecord } from "../documents/AssessmentRecord";
import { Transcript } from "../documents/Transcript";
import { AdmissionLetter } from "../documents/AdmissionLetter";
import type { Assessment, Exam, Mark, Student } from "../types";

type DocKey = "report" | "assessment" | "transcript" | "admission";
type ClassPeriod = { className: string; semesters: { session: string; semester: 1 | 2 }[] };

export default function StudentPortal() {
  const nav = useNavigate();
  const [data, setData] = useState<StudentPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeClass, setActiveClass] = useState<string | null>(null);
  const [doc, setDoc] = useState<DocKey>("report");

  useEffect(() => {
    if (!CONFIG.studentLoginEnabled) { nav("/login"); return; }
    const s = getStudentSession();
    if (!s) { nav("/login"); return; }
    (async () => {
      const res = await fetchStudentPortal(s.nin, s.identifier);
      if (!res.ok) { clearStudentSession(); nav("/login"); return; }
      setData(res);
      setLoading(false);
    })();
  }, [nav]);

  function signOut() { clearStudentSession(); nav("/"); }

  const student = data?.student as Student | undefined;
  const marks = (data?.marks ?? []) as Mark[];
  const exams = (data?.exams ?? []) as Exam[];
  const assessments = (data?.assessments ?? []) as Assessment[];

  const semesters = useMemo(() => {
    if (!student) return [];
    return buildAllSemesters(student, assessments, marks, exams);
  }, [student, assessments, marks, exams]);

  const classPeriods: ClassPeriod[] = useMemo(() => {
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
  }, [semesters]);

  useEffect(() => {
    if (!activeClass && classPeriods.length > 0) setActiveClass(classPeriods[classPeriods.length - 1].className);
  }, [classPeriods, activeClass]);

  if (loading) return <div className="body"><div className="wrap"><div style={{ minHeight: 80 }} /></div></div>;
  if (!data || !student) return null;

  const sectionName = SECTIONS.find(s => s.id === student.section)?.name ?? student.section;
  const activePeriod = classPeriods.find(p => p.className === activeClass) ?? null;
  const isSectionLevelDoc = doc === "transcript" || doc === "admission";

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 6mm; }
          html, body, #root { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          .no-print, .nav, .tabbar, .foot { display: none !important; }
          .student-portal-page { min-height: 0 !important; padding: 0 !important; }
          .student-portal-page .wrap { padding: 0 !important; max-width: none !important; }
          .student-portal-page .ph { display: none !important; }
          .student-portal-page .chip-line { display: none !important; }
          .student-portal-page .print-hint { display: none !important; }
          .student-portal-page .cert-print-wrapper { padding: 0 !important; margin: 0 !important; border: none !important; background: transparent !important; }
        }
      `}</style>
      <PublicNav onSignOut={signOut} />
      <section className="section student-portal-page" style={{ minHeight: "80vh" }}>
        <div className="wrap" style={{ maxWidth: 1160 }}>
          <div className="ph no-print">
            <div className="pav">{(student.name[0] ?? "") + (student.name.split(/\s+/)[1]?.[0] ?? "")}</div>
            <div className="pinfo">
              <h1>{student.name}</h1>
              <div className="pmeta">
                <span>Reg. No. <strong>{student.reg_no}</strong></span>
                <span>Class <strong>{student.class_name}</strong></span>
                <span>Section <strong>{sectionName}</strong></span>
              </div>
            </div>
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
                <div className="card pad"><p className="sub">No records yet. Your marks will appear here as teachers enter them.</p></div>
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
                const report = buildReport(student, assessments, marks, exams, semester, session, activePeriod.className);
                const periodAssessments = assessments.filter(a =>
                  a.class_name === activePeriod.className && a.session_label === session && a.semester === semester
                );
                const periodExams = exams.filter(e =>
                  e.class_name === activePeriod.className && e.session_label === session && e.semester === semester
                );
                if (doc === "report") {
                  return (
                    <div key={`${session}-${semester}`} style={{ marginBottom: 8 }}>
                      <ReportCard student={{ ...student, class_name: activePeriod.className }} results={report.results} average={report.avg} pending={report.pending} sessionLabel={session} semester={semester} assessments={assessments} marks={marks} exams={exams} />
                    </div>
                  );
                }
                if (doc === "assessment") {
                  return (
                    <div key={`${session}-${semester}`} style={{ marginBottom: 8 }}>
                      <AssessmentRecord student={{ ...student, class_name: activePeriod.className }} assessments={periodAssessments} marks={marks} exams={periodExams} sessionLabel={session} semester={semester} />
                    </div>
                  );
                }
                return null;
              })
            )}
          </div>
        </div>
        <PublicTabBar />
      </section>
    </>
  );
}
