import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CONFIG, SECTIONS, ALL_CLASSES } from "../lib/config";
import { PublicNav, I } from "../components/Layout";
import { getStudentSession, clearStudentSession, fetchStudentPortal, type StudentPortalData } from "../lib/student";
import { buildReport } from "../lib/data";
import { SemesterCertificate } from "../components/SemesterCertificate";
import type { Assessment, Exam, Mark, Student } from "../lib/types";

type Classmate = {
  name: string;
  class_name: string;
  section: string;
  gender: "male" | "female" | null;
};

type ViewState = "directory" | "class" | "certificate";

export default function StudentPortal() {
  const nav = useNavigate();
  const [data, setData] = useState<StudentPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>("directory");
  const [restrictedMsg, setRestrictedMsg] = useState<string | null>(null);

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

  function signOut() {
    clearStudentSession();
    nav("/");
  }

  if (loading) return <div className="body"><div className="wrap"><div style={{ minHeight: 80 }} /></div></div>;
  if (!data || !data.student) return null;

  const s = data.student as Student;
  const marks = (data.marks ?? []) as Mark[];
  const exams = (data.exams ?? []) as Exam[];
  const assessments = (data.assessments ?? []) as Assessment[];
  const report = buildReport(s, assessments, marks, exams);

  const classmates: Classmate[] = (data as any).classmates ?? [];
  const sortedClassmates = [...classmates].sort((a, b) => {
    if (a.name === s.name) return -1;
    if (b.name === s.name) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <style>{`
        .student-cert-screen { overflow-x: auto; overflow-y: hidden; padding-bottom: 16px; }
        .student-cert-scale { transform: scale(0.6); transform-origin: top left; width: 166.667%; margin: 0 auto; }
        @media print {
          .student-cert-screen { overflow: visible; padding-bottom: 0; }
          .student-cert-scale { transform: none; width: 100%; margin: 0; }
        }
        .greyed { opacity: 0.5; pointer-events: none; }
      `}</style>
      <PublicNav />
      
      <section className="section" style={{ minHeight: "80vh" }}>
        <div className="wrap">
          
          {/* TOP HEADER */}
          <div className="ph no-print">
            <div className="pav">{(s.name[0] ?? "") + (s.name.split(/\s+/)[1]?.[0] ?? "")}</div>
            <div className="pinfo">
              <h1>{s.name}</h1>
              <div className="pmeta">
                <span>Reg. No. <strong>{s.reg_no}</strong></span>
                <span>Class <strong>{s.class_name}</strong></span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
               {view !== "directory" && (
                 <button className="btn btn-secondary btn-sm" onClick={() => { setView("directory"); setRestrictedMsg(null); }}>← Directory</button>
               )}
               <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
            </div>
          </div>

          {/* VIEW 1: DIRECTORY */}
          {view === "directory" && (
            <div>
              <div className="phead" style={{ marginTop: 20 }}>
                <div>
                  <h2 className="d2" style={{ fontSize: 24 }}>School Directory</h2>
                  <p className="sub">You are enrolled in {s.class_name}. Other classes are restricted.</p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div className="search greyed">
                    <span className="icon">{I.search}</span>
                    <input placeholder="Search (Admin only)" />
                  </div>
                  <button className="btn btn-primary btn-sm greyed">Add student</button>
                </div>
              </div>

              {restrictedMsg && (
                <div className="notice mb4" style={{ background: "var(--warning-soft)", color: "var(--warning)", border: "1px solid #E8D4A8" }}>
                  {restrictedMsg}
                </div>
              )}

              <div className="struct-grid">
                {SECTIONS.map(sec => (
                  <div key={sec.id} className="struct-card">
                    <div className="title">{sec.name}</div>
                    <div className="classes">
                      {sec.classes.map(c => {
                        const isMyClass = c === s.class_name;
                        return (
                          <button
                            key={c}
                            className={"chip " + (isMyClass ? "active" : "greyed")}
                            style={{ cursor: isMyClass ? "pointer" : "default" }}
                            onClick={() => {
                              if (isMyClass) {
                                setView("class");
                                setRestrictedMsg(null);
                              } else {
                                setRestrictedMsg(`Access Restricted. You are not enrolled in ${c}.`);
                              }
                            }}
                          >
                            {c} {isMyClass && "✓"}
                          </button>
                        );
                      })}
                    </div>
                    <div className="desc">{sec.desc}</div>
                  </div>
                ))}
              </div>
              
              <div style={{ marginTop: 24 }}>
                <button className="btn btn-primary" onClick={() => setView("certificate")}>
                  {I.print} View My Certificate
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: CLASS PAGE */}
          {view === "class" && (
            <div>
              <div className="phead" style={{ marginTop: 20 }}>
                <div>
                  <h2 className="d2" style={{ fontSize: 24 }}>{s.class_name}</h2>
                  <p className="sub">{sortedClassmates.length} students · Class roster</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-secondary btn-sm greyed">{I.print} Class sheet</button>
                  <button className="btn btn-secondary btn-sm greyed">{I.plus} New Assessment</button>
                  <button className="btn btn-secondary btn-sm greyed">Enter marks</button>
                  <button className="btn btn-primary btn-sm greyed">Enter exam</button>
                </div>
              </div>

              <div className="slist">
                {sortedClassmates.map((c, i) => {
                  const isMe = c.name === s.name;
                  return (
                    <div 
                      key={c.name + i} 
                      className="srow" 
                      style={{ 
                        display: "grid", 
                        opacity: isMe ? 1 : 0.4, 
                        cursor: isMe ? "pointer" : "default",
                        background: isMe ? "var(--primary-soft)" : "transparent"
                      }}
                      onClick={() => { if (isMe) setView("certificate"); }}
                    >
                      <div className="avatar" style={{ background: isMe ? "var(--primary)" : "var(--muted)", color: isMe ? "#fff" : "var(--ink)" }}>
                        {(c.name[0] ?? "") + (c.name.split(/\s+/)[1]?.[0] ?? "")}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="name">
                          {c.name} {isMe && <span className="pill pill-primary" style={{ marginLeft: 6, fontSize: 10 }}>You</span>}
                        </div>
                        <div className="id">{c.section}</div>
                      </div>
                      <div className="stat-mini">—</div>
                      <div style={{ color: isMe ? "var(--primary)" : "var(--ink-4)" }}>
                        {isMe ? I.arrow : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 3: CERTIFICATE */}
          {view === "certificate" && (
            <div style={{ marginTop: 20 }}>
              <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div className="d3">Semester Report Card</div>
                  <div className="sub" style={{ marginTop: 2 }}>{CONFIG.sessionLabel} · {CONFIG.semesterLabel}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                  {I.print} Print report
                </button>
              </div>

              <div className="cert-print-wrapper" style={{ marginBottom: 24 }}>
                <div className="student-cert-screen">
                  <div className="student-cert-scale">
                    <SemesterCertificate student={s} results={report.results} average={report.avg} pending={report.pending} />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>
    </div>
  );
}
