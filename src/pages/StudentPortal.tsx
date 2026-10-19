import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CONFIG } from "../lib/config";
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

  useEffect(() => {
    if (!CONFIG.studentLoginEnabled) { nav("/login"); return; }
    const s = getStudentSession();
    if (!s) { nav("/login"); return; }
    (async () => {
      const res = await fetchStudentPortal(s.nin, s.reg_no);
      if (!res.ok) { clearStudentSession(); nav("/login"); return; }
      setData(res);
      setLoading(false);
    })();
  }, [nav]);

  function signOut() {
    clearStudentSession();
    nav("/login");
  }

  if (loading) return <div className="body"><div className="wrap"><div style={{ minHeight: 80 }} /></div></div>;
  if (!data || !data.student) return null;

  const s = data.student as Student;
  const marks = (data.marks ?? []) as Mark[];
  const exams = (data.exams ?? []) as Exam[];
  const assessments = (data.assessments ?? []) as Assessment[];
  const report = buildReport(s, assessments, marks, exams);

  const classmates: Classmate[] = (data as any).classmates ?? [];
  const otherClassmates = classmates.filter(c => c.name !== s.name);

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
                <SemesterCertificate
                  student={s}
                  results={report.results}
                  average={report.avg}
                  pending={report.pending}
                />
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

          <div className="card mb4 no-print">
            <div style={{ padding: "18px 20px 10px" }}>
              <div className="d3">My classmates</div>
              <div className="sub" style={{ marginTop: 2 }}>
                {s.class_name} · {otherClassmates.length} other{otherClassmates.length === 1 ? "" : "s"}
              </div>
            </div>
            <div style={{ padding: "0 20px 18px" }}>
              {otherClassmates.length === 0 ? (
                <div className="empty" style={{ padding: "12px 0" }}>
                  <div className="d">No other students in your class yet.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {otherClassmates.map((c, i) => (
                    <div
                      key={c.name + i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 0",
                        borderTop: i === 0 ? "none" : "1px solid var(--line)",
                      }}
                    >
                      <div
                        style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: "var(--muted)", color: "var(--ink)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "var(--serif)", fontWeight: 600, fontSize: 13,
                          flexShrink: 0,
                        }}
                      >
                        {(c.name[0] ?? "") + (c.name.split(/\s+/)[1]?.[0] ?? "")}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</div>
                        <div className="sub" style={{ fontSize: 12, marginTop: 1 }}>
                          {c.section}
                          {c.gender ? ` · ${c.gender === "male" ? "Male" : "Female"}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
