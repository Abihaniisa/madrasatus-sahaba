// src/pages/admin/BulkPrint.tsx — whole-class bulk print.
// Pick class + session + semester + document type. Renders N copies (one per student),
// or ONE class-level document. Print button prints the whole thing as one PDF.

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { CONFIG, ALL_CLASSES } from "../../lib/config";
import { loadSchool, buildReport, type SchoolData } from "../../lib/data";
import { buildAllSemesters } from "../../lib/calc";
import { useRequireAuth } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { I } from "../../ui/Shell";
import { DelayedSkeleton } from "../../ui/primitives";
import { ReportCard } from "../../documents/ReportCard";
import { AssessmentRecord } from "../../documents/AssessmentRecord";
import { AdmissionLetter } from "../../documents/AdmissionLetter";
import { Certificate } from "../../documents/Certificate";
import { ClassSheet } from "../../documents/ClassSheet";
import { ClassResultSheet } from "../../documents/ClassResultSheet";
import type { Student } from "../../types";

type DocKey =
  | "report" | "assessment" | "admission" | "certificate"
  | "class-sheet" | "class-result";

type SessionOption = { session: string; semester: 1 | 2; key: string };

export default function BulkPrint() {
  const ready = useRequireAuth();
  const [data, setData] = useState<SchoolData | null>(null);
  const [searchParams] = useSearchParams();
  const initialClass = searchParams.get("class");
  const [cls, setCls] = useState<string>((initialClass && ALL_CLASSES.includes(initialClass)) ? initialClass : (ALL_CLASSES[0] ?? ""));
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [doc, setDoc] = useState<DocKey>("report");
  const [subject, setSubject] = useState<string>(CONFIG.subjects[0]);

  useEffect(() => { loadSchool().then(setData); }, []);

  const studentsInClass = useMemo<Student[]>(() => {
    if (!data) return [];
    return data.students.filter(s => s.class_name === cls).sort((a, b) => a.name.localeCompare(b.name));
  }, [data, cls]);

  const sessionOptions: SessionOption[] = useMemo(() => {
    if (!data) return [];
    const set = new Map<string, SessionOption>();
    for (const a of data.assessments) {
      if (a.class_name !== cls) continue;
      const key = `${a.session_label}|${a.semester}`;
      if (!set.has(key)) {
        set.set(key, {
          session: a.session_label,
          semester: (a.semester === 2 ? 2 : 1) as 1 | 2,
          key,
        });
      }
    }
    if (set.size === 0) {
      set.set(`${CONFIG.sessionLabel}|${CONFIG.currentSemester}`, {
        session: CONFIG.sessionLabel,
        semester: CONFIG.currentSemester as 1 | 2,
        key: `${CONFIG.sessionLabel}|${CONFIG.currentSemester}`,
      });
    }
    return Array.from(set.values()).sort((a, b) => {
      const s = a.session.localeCompare(b.session);
      return s !== 0 ? s : a.semester - b.semester;
    });
  }, [data, cls]);

  const activeSession = sessionOptions.find(s => s.key === sessionKey) ?? sessionOptions[sessionOptions.length - 1] ?? null;

  useEffect(() => {
    if (sessionOptions.length > 0 && !sessionOptions.find(s => s.key === sessionKey)) {
      setSessionKey(sessionOptions[sessionOptions.length - 1].key);
    }
  }, [sessionOptions, sessionKey]);

  if (!ready) return <div className="body"><div className="wrap"><DelayedSkeleton ready={ready} rows={5} /></div></div>;
  if (!data) return <div className="body"><div className="wrap"><DelayedSkeleton ready={!!data} rows={5} /></div></div>;

  const classLevelDocs: DocKey[] = ["class-sheet", "class-result"];
  const perStudentDocs: DocKey[] = ["report", "assessment", "admission", "certificate"];

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap" style={{ maxWidth: 1160 }}>
          <div className="crumb no-print">
            <Link to="/admin">Students</Link><span>/</span>
            <span className="current">Bulk print</span>
          </div>
          <div className="phead no-print">
            <div>
              <h1>Bulk print</h1>
              <p className="sub">One browser print → one PDF, N pages. No zip. No server.</p>
            </div>
          </div>

          <div className="no-print" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>
              Step 1 — pick a class
            </div>
            <div className="chip-line" style={{ marginBottom: 0 }}>
              {ALL_CLASSES.map(c => (
                <button key={c} className={"chip-f " + (cls === c ? "active" : "")} onClick={() => { setCls(c); setSessionKey(null); }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {activeSession && (
            <div className="no-print" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>
                Step 2 — pick a period
              </div>
              <div className="chip-line" style={{ marginBottom: 0 }}>
                {sessionOptions.map(s => (
                  <button key={s.key} className={"chip-f " + (sessionKey === s.key ? "active" : "")} onClick={() => setSessionKey(s.key)}>
                    {s.session} · S{s.semester}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="no-print" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>
              Step 3 — pick a document
            </div>
            <div className="chip-line" style={{ marginBottom: 0 }}>
              {perStudentDocs.map(k => (
                <button key={k} className={"chip-f " + (doc === k ? "active" : "")} onClick={() => setDoc(k)}>
                  {k === "report" ? "Report Cards" : k === "assessment" ? "Assessment Records" : k === "admission" ? "Admission Letters" : "Certificates"}
                </button>
              ))}
              {classLevelDocs.map(k => (
                <button key={k} className={"chip-f " + (doc === k ? "active" : "")} onClick={() => setDoc(k)}>
                  {k === "class-sheet" ? "Class Sheet (one subject)" : "Class Result Sheet"}
                </button>
              ))}
            </div>
          </div>

          {doc === "class-sheet" && (
            <div className="no-print" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>
                Step 4 — pick a subject
              </div>
              <div className="chip-line" style={{ marginBottom: 0 }}>
                {CONFIG.subjects.map(s => (
                  <button key={s} className={"chip-f " + (subject === s ? "active" : "")} onClick={() => setSubject(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <div className="sub">
              {studentsInClass.length} student{studentsInClass.length === 1 ? "" : "s"} in {cls}
              {activeSession && <> · {activeSession.session} · S{activeSession.semester}</>}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => window.print()} disabled={!studentsInClass.length}>
              {I.print} Print all ({studentsInClass.length})
            </button>
          </div>

          <div className="print-hint no-print">
            <div>
              <strong>Print setup:</strong> {classLevelDocs.includes(doc) ? "Portrait" : "Landscape"} · A4 · Default margins.
            </div>
          </div>

          <div className="cert-print-wrapper">
            {!activeSession ? (
              <div className="card pad"><div className="empty"><div className="t">Pick a session to continue</div></div></div>
            ) : doc === "class-sheet" ? (
              <ClassSheet
                className={cls}
                subject={subject}
                students={studentsInClass}
                assessments={data.assessments}
                marks={data.marks}
                exams={data.exams}
                sessionLabel={activeSession.session}
                semester={activeSession.semester}
              />
            ) : doc === "class-result" ? (
              <ClassResultSheet
                className={cls}
                students={studentsInClass}
                assessments={data.assessments}
                marks={data.marks}
                exams={data.exams}
                sessionLabel={activeSession.session}
                semester={activeSession.semester}
              />
            ) : studentsInClass.length === 0 ? (
              <div className="card pad"><div className="empty"><div className="t">No students in this class</div></div></div>
            ) : studentsInClass.map(student => {
              if (doc === "admission") {
                return <div key={student.id} style={{ marginBottom: 8 }}><AdmissionLetter student={student} /></div>;
              }
              const report = buildReport(student, data.assessments, data.marks, data.exams, activeSession.semester, activeSession.session, cls);
              if (doc === "report") {
                return (
                  <div key={student.id} style={{ marginBottom: 8 }}>
                    <ReportCard
                      student={{ ...student, class_name: cls }}
                      results={report.results}
                      average={report.avg}
                      pending={report.pending}
                      sessionLabel={activeSession.session}
                      semester={activeSession.semester}
                    />
                  </div>
                );
              }
              if (doc === "assessment") {
                const periodAssessments = data.assessments.filter(a =>
                  a.class_name === cls &&
                  a.session_label === activeSession.session &&
                  a.semester === activeSession.semester
                );
                return (
                  <div key={student.id} style={{ marginBottom: 8 }}>
                    <AssessmentRecord
                      student={{ ...student, class_name: cls }}
                      assessments={periodAssessments}
                      marks={data.marks}
                      sessionLabel={activeSession.session}
                      semester={activeSession.semester}
                    />
                  </div>
                );
              }
              if (doc === "certificate") {
                return (
                  <div key={student.id} style={{ marginBottom: 8 }}>
                    <Certificate
                      student={{ ...student, class_name: cls }}
                      results={report.results}
                      average={report.avg}
                      pending={report.pending}
                      semester={activeSession.semester}
                      sessionLabel={activeSession.session}
                    />
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
