import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CONFIG, SECTIONS } from "../lib/config";
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

export default function StudentPortal() {
  const nav = useNavigate();
  const [data, setData] = useState<StudentPortalData | null>(null);
  const [loading, setLoading] = useState(true);
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
    nav("/"); // Redirects to public site
  }

  if (loading) return <div className="body"><div className="wrap"><div style={{ minHeight: 80 }} /></div></div>;
  if (!data || !data.student) return null;

  const s = data.student as Student;
  const marks = (data.marks ?? []) as Mark[];
  const exams = (data.exams ?? []) as Exam[];
  const assessments = (data.assessments ?? []) as Assessment[];
  const report = buildReport(s, assessments, marks, exams);

  const classmates: Classmate[] = (data as any).classmates ?? [];
  // Sort to put the current student first
  const sortedClassmates = [...classmates].sort((a, b) => {
    if (a.name === s.name) return -1;
    if (b.name === s.name) return 1;
    return a.name.localeCompare(b.name);
  });

  const payments = data.fee_payments ?? [];
  const amount = CONFIG.registrationFee;
  const paid = payments.reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0);
  const balance = Math.max(0, amount - paid);
  const status = paid === 0 ? "Unpaid" : paid >= amount ? "Paid" : "Partial";

  return (
    <div>
      <style>{`
        .student-cert-screen { overflow-x: auto; overflow-y: hidden; padding-bottom: 16px; }
        .student-cert-scale { transform: scale(0.6); transform-origin: top left; width: 166.667%; margin: 0 auto; }
        @media print {
          .student-cert-screen { overflow: visible; padding-bottom: 0; }
          .student-cert-scale { transform: none; width: 100%; margin: 0; }
        }
      `}</style>
      <PublicNav />
      <section className="section">
        <div className="wrap">
          <div className="ph no-print">
            <div className="pav">{(s.name[0] ?? "") + (s.name.split(/\s+/)[1]?.[0] ?? "")}</div>
            <div className="pinfo">
              <h1>{s.name}</h1>
              <div className="pmeta">
                <span>Reg. No. <strong>{s.reg_no}</strong></span>
                <span>Class <strong>{s.class_name}</strong></span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {report.pending
                  ? <span className="pill pill-warning pill-dot">Pending</span>
                  : report.avg != null
                    ? <span className="pill pill-success pill-dot">{report.avg}%</span>
                    : <span className="pill pill-neutral pill-dot">No results yet</span>}
                <span className="pill pill-info">{s.mode === "online" ? "Online" : "Physical"}</span>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
          </div>

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

          <div className="card mb4 no-print">
            <div style={{ padding: "18px 20px" }}>
              <div className="d3" style={{ marginBottom: 10 }}>Fees</div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "baseline" }}>
                <div><div className="sub">Amount</div><div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600 }}>₦{amount.toLocaleString("en-NG")}</div></div>
                <div><div className="sub">Paid</div><div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600 }}>₦{paid.toLocaleString("en-NG")}</div></div>
                <div><div className="sub">Balance</div><div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, color: "var(--warning)" }}>₦{balance.toLocaleString("en-NG")}</div></div>
                <div style={{ marginLeft: "auto" }}>
                  <span className={"pill pill-dot pill-" + (status === "Paid" ? "success" : status === "Partial" ? "warning" : "danger")}>
                    {status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Class Directory & Roster */}
          <div className="card mb4 no-print">
             <div style={{ padding: "18px 20px" }}>
               <div className="d3" style={{ marginBottom: 10 }}>School Directory</div>
               <div className="struct-grid mb4">
                 {SECTIONS.map(sec => (
                   <div key={sec.id} className="struct-card" style={{ padding: 12 }}>
                     <div className="title" style={{ fontSize: 15, marginBottom: 6 }}>{sec.name}</div>
                     <div className="classes" style={{ gap: 6 }}>
                       {sec.classes.map(c => (
                         <button
                           key={c}
                           className={"chip " + (c === s.class_name ? "active" : "")}
                           style={{ cursor: "pointer", opacity: c === s.class_name ? 1 : 0.6 }}
                           onClick={() => {
                             if (c !== s.class_name) {
                               setRestrictedMsg(`Access Restricted. You are not enrolled in ${c}.`);
                             } else {
                               setRestrictedMsg(null);
                             }
                           }}
                         >
                           {c}
                         </button>
                       ))}
                     </div>
                   </div>
                 ))}
               </div>

               {restrictedMsg && (
                 <div className="notice mb4" style={{ background: "var(--warning-soft)", color: "var(--warning)", border: "1px solid #E8D4A8" }}>
                   {restrictedMsg}
                 </div>
               )}

               <div className="d3" style={{ marginBottom: 10 }}>My Class ({s.class_name})</div>
               
               {/* Admin actions - Greyed out */}
               <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, opacity: 0.4, pointerEvents: "none" }}>
                 <button className="btn btn-secondary btn-sm" disabled>{I.print} Class sheet</button>
                 <button className="btn btn-secondary btn-sm" disabled>Enter marks</button>
                 <button className="btn btn-primary btn-sm" disabled>Enter exam</button>
               </div>

               <div className="slist">
                 {sortedClassmates.map((c, i) => {
                   const isMe = c.name === s.name;
                   return (
                     <div key={c.name + i} className="srow" style={{ display: "grid", opacity: isMe ? 1 : 0.5 }}>
                       <div className="avatar">{(c.name[0] ?? "") + (c.name.split(/\s+/)[1]?.[0] ?? "")}</div>
                       <div style={{ minWidth: 0 }}>
                         <div className="name">{c.name} {isMe && <span className="pill pill-primary" style={{ marginLeft: 6, fontSize: 10 }}>You</span>}</div>
                         <div className="id">{c.section}</div>
                       </div>
                       <div className="stat-mini">—</div>
                       <div style={{ color: "var(--ink-4)", cursor: isMe ? "pointer" : "default" }}>{I.arrow}</div>
                     </div>
                   );
                 })}
               </div>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}
