// src/pages/StudentPortal.tsx — student view. Same document set as admin Records, without
// the editing buttons. Two-step filter: pick period, pick document. Print button.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CONFIG, SECTIONS } from "../lib/config";
import { PublicNav, I } from "../ui/Shell";
import { getStudentSession, clearStudentSession, fetchStudentPortal, type StudentPortalData } from "../lib/supabase";
import { buildReport } from "../lib/data";
import { buildAllSemesters } from "../lib/calc";
import { ReportCard } from "../documents/ReportCard";
import { AssessmentRecord } from "../documents/AssessmentRecord";
import { Transcript } from "../documents/Transcript";
import { AdmissionLetter } from "../documents/AdmissionLetter";
import { Certificate } from "../documents/Certificate";
import type { Assessment, Exam, Mark, Student } from "../types";

type DocKey = "report" | "assessment" | "transcript" | "admission" | "certificate";

export default function StudentPortal() {
  const nav = useNavigate();
  const [data, setData] = useState<StudentPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodKey, setPeriodKey] = useState<string | null>(null);
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

  const periods = useMemo(() =>
    semesters.map(g => ({
      session: g.session_label,
      className: g.class_name,
      semester: (g.semester === 2 ? 2 : 1) as 1 | 2,
      key: `${g.session_label}|${g.class_name}|${g.semester}`,
    })),
  [semesters]);

  const activePeriod = periods.find(p => p.key === periodKey) ?? periods[periods.length - 1] ?? null;

  useEffect(() => {
    if (!periodKey && periods.length > 0) setPeriodKey(periods[periods.length - 1].key);
  }, [periods, periodKey]);

  if (loading) return <div className="body"><div className="wrap"><div style={{ minHeight: 80 }} /></div></div>;
  if (!data || !student) return null;

  const sectionName = SECTIONS.find(s => s.id === student.section)?.name ?? student.section;
  const activeReport = activePeriod
    ? buildReport(student, assessments, marks, exams, activePeriod.semester, activePeriod.session, activePeriod.className)
    : null;
  const activeAssessments = activePeriod
    ? assessments.filter(a => a.class_name === activePeriod.className && a.session_label === activePeriod.session && a.semester === activePeriod.semester)
    : [];

  return (
    <div>
      <PublicNav />
      <section className="section" style={{ minHeight: "80vh" }}>
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
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
            </div>
          </div>

          <div className="no-print" style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>
              Step 1 — pick a period
            </div>
            {periods.length === 0 ? (
              <div className="card pad"><p className="sub">No records yet. Your marks will appear here as teachers enter them.</p></div>
            ) : (
              <div className="chip-line" style={{ marginBottom: 0 }}>
                {periods.map(p => (
                  <button key={p.key} className={"chip-f " + (p.key === activePeriod?.key ? "active" : "")} onClick={() => setPeriodKey(p.key)}>
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
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>{I.print} Print this document</button>
          </div>

          <div className="print-hint no-print">
            <div><strong>Print setup:</strong> Landscape · A4 · Default margins.</div>
          </div>

          <div className="cert-print-wrapper">
            {!activePeriod ? (
              <div className="card pad"><div className="empty"><div className="t">No period selected</div></div></div>
            ) : doc === "report" && activeReport ? (
              <ReportCard student={student} results={activeReport.results} average={activeReport.avg} pending={activeReport.pending} sessionLabel={activePeriod.session} semester={activePeriod.semester} />
            ) : doc === "assessment" ? (
              <AssessmentRecord student={student} assessments={activeAssessments} marks={marks} sessionLabel={activePeriod.session} semester={activePeriod.semester} />
            ) : doc === "transcript" ? (
              <Transcript student={student} semesters={semesters} sectionId={student.section} />
            ) : doc === "admission" ? (
              <AdmissionLetter student={student} />
            ) : doc === "certificate" && activeReport ? (
              <Certificate student={student} results={activeReport.results} average={activeReport.avg} pending={activeReport.pending} semester={activePeriod.semester} sessionLabel={activePeriod.session} />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
