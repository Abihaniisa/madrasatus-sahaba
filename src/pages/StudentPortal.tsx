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
import { DauraReport } from "../documents/DauraReport";
import { supabase } from "../lib/supabase";

type DocKey = "report" | "assessment" | "transcript" | "admission" | "daura";
type ClassPeriod = { className: string; semesters: { session: string; semester: 1 | 2 }[] };

export default function StudentPortal() {
  const nav = useNavigate();
  const [data, setData] = useState<StudentPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeClass, setActiveClass] = useState<string | null>(null);
  const [doc, setDoc] = useState<DocKey>("report");
  const [dauraParticipations, setDauraParticipations] = useState<any[]>([]);
  const [dauraData, setDauraData] = useState<{ programs: any[]; assessments: any[]; marks: any[] }>({ programs: [], assessments: [], marks: [] });
  const [dauraLoading, setDauraLoading] = useState(false);
  const [activeDauraId, setActiveDauraId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!student) return;
    let cancelled = false;
    (async () => {
      const { data: parts } = await supabase.from("daura_participants").select("id, program_id, full_name, external, nin, phone").eq("student_id", student.id);
      if (cancelled) return;
      setDauraParticipations((parts as any[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, [student?.id]);

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
  const isSectionLevelDoc = doc === "transcript" || doc === "admission" || doc === "daura";

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
              <button className={"chip-f " + (doc === "report" ? "active" : "")} onClick={() => setDoc("report")}>Reports</button>
              <button className={"chip-f " + (doc === "transcript" ? "active" : "")} onClick={() => setDoc("transcript")}>Transcript</button>
              <button className={"chip-f " + (doc === "admission" ? "active" : "")} onClick={() => setDoc("admission")}>Admission Letter</button>
              {dauraParticipations.length > 0 && (<button className={"chip-f " + (doc === "daura" ? "active" : "")} onClick={() => setDoc("daura")}>Daura</button>)}
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
                      <AssessmentRecord student={{ ...student, class_name: activePeriod.className }} assessments={periodAssessments} marks={marks} exams={periodExams} sessionLabel={session} semester={semester} average={report.avg} pending={report.pending} />
                    </div>
                  );
                }
                return null;
              })
            )}
            {doc === "daura" && (
              <DauraView participations={dauraParticipations} data={dauraData} setData={setDauraData} loading={dauraLoading} setLoading={setDauraLoading} activeId={activeDauraId} setActiveId={setActiveDauraId} />
            )}
          </div>
        </div>
        <PublicTabBar />
      </section>
    </>
  );
}

function DauraView({ participations, data, setData, loading, setLoading, activeId, setActiveId }: {
  participations: any[];
  data: { programs: any[]; assessments: any[]; marks: any[] };
  setData: (d: { programs: any[]; assessments: any[]; marks: any[] }) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  activeId: string | null;
  setActiveId: (v: string | null) => void;
}) {
  useEffect(() => {
    if (participations.length === 0) { setData({ programs: [], assessments: [], marks: [] }); return; }
    const pids = participations.map((p: any) => p.program_id);
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [progs, asses, marksRes] = await Promise.all([
        supabase.from("daura_programs").select("*").in("id", pids),
        supabase.from("daura_assessments").select("*").in("program_id", pids),
        supabase.from("daura_marks").select("*"),
      ]);
      if (cancelled) return;
      const aidSet = new Set(((asses.data as any[]) ?? []).map((a: any) => a.id));
      const filteredMarks = ((marksRes.data as any[]) ?? []).filter((m: any) => aidSet.has(m.assessment_id));
      setData({ programs: (progs.data as any[]) ?? [], assessments: (asses.data as any[]) ?? [], marks: filteredMarks });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [participations.length]);

  if (participations.length === 0) {
    return <div className="card pad"><div className="empty"><div className="t">No Daura programmes</div><div className="d">Your Daura participation will appear here when the school adds you.</div></div></div>;
  }

  const activeParticipant = participations.find((p: any) => p.program_id === activeId) ?? null;
  const activeProgram = activeParticipant ? data.programs.find((pr: any) => pr.id === activeParticipant.program_id) : null;

  if (!activeParticipant || !activeProgram) {
    return (
      <div>
        <div className="chip-line no-print" style={{ marginBottom: 12 }}>
          {participations.map((p: any) => {
            const prog = data.programs.find((pr: any) => pr.id === p.program_id);
            return (
              <button key={p.program_id} className={"chip-f " + (activeId === p.program_id ? "active" : "")} onClick={() => setActiveId(p.program_id)}>
                {prog?.name ?? "Daura programme"}
              </button>
            );
          })}
        </div>
        {loading && <div className="card pad"><div className="sub">Loading…</div></div>}
      </div>
    );
  }

  const programAssessments = data.assessments.filter((a: any) => a.program_id === activeParticipant.program_id);
  const programMarks = data.marks.filter((m: any) => m.participant_id === activeParticipant.id);

  return (
    <div>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div className="chip-line" style={{ marginBottom: 0 }}>
          {participations.map((p: any) => {
            const prog = data.programs.find((pr: any) => pr.id === p.program_id);
            return (
              <button key={p.program_id} className={"chip-f " + (activeId === p.program_id ? "active" : "")} onClick={() => setActiveId(p.program_id)}>
                {prog?.name ?? "Daura programme"}
              </button>
            );
          })}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>{I.print} Print this card</button>
      </div>
      <DauraReport
        participant={{ id: activeParticipant.id, full_name: activeParticipant.full_name, external: activeParticipant.external, phone: activeParticipant.phone }}
        program={{ id: activeProgram.id, name: activeProgram.name, description: activeProgram.description ?? null, start_date: activeProgram.start_date ?? null, end_date: activeProgram.end_date ?? null, weeks: activeProgram.weeks ?? 0, subjects: activeProgram.subjects ?? [] }}
        assessments={programAssessments.map((a: any) => ({ id: a.id, subject: a.subject, label: a.label, max_marks: a.max_marks ?? 10 }))}
        marks={programMarks.map((m: any) => ({ assessment_id: m.assessment_id, participant_id: m.participant_id, value: m.value }))}
      />
    </div>
  );
}
