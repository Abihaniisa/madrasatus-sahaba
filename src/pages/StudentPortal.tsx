// src/pages/StudentPortal.tsx — Student portal (mobile-first, real data).
// Real student from student_portal RPC. Real documents from existing components.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CONFIG, SECTIONS } from "../lib/config";
import { PublicNav, PublicTabBar, I } from "../ui/Shell";
import { getStudentSession, clearStudentSession, fetchStudentPortal, supabase, type StudentPortalData } from "../lib/supabase";
import { buildReport } from "../lib/data";
import { buildAllSemesters } from "../lib/calc";
import { getEffectiveSemester } from "../lib/calendar";
import { getSettings, loadSettings } from "../lib/settings";
import { ReportCard } from "../documents/ReportCard";
import { Transcript } from "../documents/Transcript";
import { AdmissionLetter } from "../documents/AdmissionLetter";
import { Receipt } from "../documents/Receipt";
import { DauraReport } from "../documents/DauraReport";
import type { Assessment, Exam, Mark, Student } from "../types";

type Page = "overview" | "documents" | "payments" | "daura";
type DocTab = "reports" | "transcripts" | "admission";
type Viewer =
  | { kind: "report"; session: string; semester: 1 | 2; className: string }
  | { kind: "transcript" }
  | { kind: "admission" }
  | { kind: "receipt"; paymentId: string }
  | { kind: "daura"; participantId: string; programId: string }
  | null;
type ReportRow = { className: string; session: string; semester: 1 | 2; average: number | null; pending: boolean };
type PaymentRow = { id: string; year: string; amount: number; method: string; paid_on: string; receipt_no: string | null; reference: string | null; note: string | null };
type DauraRow = { participantId: string; programId: string; programName: string; kind: "sessional" | "special"; sessionLabel: string | null; status: "open" | "closed" };

export default function StudentPortal() {
  const nav = useNavigate();
  const [data, setData] = useState<StudentPortalData | null>(null);
  const [page, setPage] = useState<Page>("overview");
  const [docTab, setDocTab] = useState<DocTab>("reports");
  const [viewer, setViewer] = useState<Viewer>(null);
  const [dauraData, setDauraData] = useState<{ programs: any[]; assessments: any[]; marks: any[] }>({ programs: [], assessments: [], marks: [] });
  const [dauraLoading, setDauraLoading] = useState(false);

  useEffect(() => {
    if (!CONFIG.studentLoginEnabled) { nav("/login"); return; }
    const s = getStudentSession();
    if (!s) { nav("/login"); return; }
    (async () => {
      await loadSettings();
      const res = await fetchStudentPortal(s.nin, s.identifier);
      if (!res.ok) { clearStudentSession(); nav("/login"); return; }
      setData(res);
    })();
  }, [nav]);

  useEffect(() => {
    const parts = (data?.daura_participations as any[] | undefined) ?? [];
    if (parts.length === 0) return;
    const pids = Array.from(new Set(parts.map(p => p.program_id)));
    let cancelled = false;
    setDauraLoading(true);
    (async () => {
      const [progs, asses] = await Promise.all([
        supabase.from("daura_programs").select("*").in("id", pids),
        supabase.from("daura_assessments").select("*").in("program_id", pids),
      ]);
      if (cancelled) return;
      const assesList = (asses.data as any[]) ?? [];
      const assesIds = assesList.map(a => a.id);
      let marksList: any[] = [];
      if (assesIds.length > 0) {
        const { data: mks } = await supabase.from("daura_marks").select("*").in("assessment_id", assesIds);
        marksList = (mks as any[]) ?? [];
      }
      setDauraData({ programs: (progs.data as any[]) ?? [], assessments: assesList, marks: marksList });
      setDauraLoading(false);
    })();
    return () => { cancelled = true; };
  }, [data?.daura_participations]);

  const student = data?.student as Student | undefined;
  const assessments = (data?.assessments ?? []) as Assessment[];
  const marks = (data?.marks ?? []) as Mark[];
  const exams = (data?.exams ?? []) as Exam[];
  const enrollments = (data?.enrollments ?? []) as any[];
  const payments = (data?.fee_payments ?? []) as any[];
  const fees = (data?.fees ?? []) as any[];

  const sessionLabel = getSettings().session_label;
  const semesterLabel = getEffectiveSemester() === 1 ? "First" : "Second";
  const sectionName = student ? (SECTIONS.find(s => s.id === student.section)?.name ?? student.section) : "";

  const reports: ReportRow[] = useMemo(() => {
    if (!student) return [];
    const groups = buildAllSemesters(student, assessments, marks, exams, enrollments);
    return groups
      .map(g => {
        const r = buildReport(student, assessments, marks, exams, g.semester === 2 ? 2 : 1, g.session_label, g.class_name, enrollments);
        return { className: g.class_name, session: g.session_label, semester: (g.semester === 2 ? 2 : 1) as 1 | 2, average: r.avg, pending: r.pending };
      })
      .sort((a, b) => {
        const s = b.session.localeCompare(a.session);
        return s !== 0 ? s : b.semester - a.semester;
      });
  }, [student, assessments, marks, exams, enrollments]);

  const transcripts = useMemo(() => {
    const bySection = new Map<string, Set<string>>();
    for (const r of reports) {
      const sec = SECTIONS.find(s => s.classes.includes(r.className));
      if (!sec) continue;
      if (!bySection.has(sec.name)) bySection.set(sec.name, new Set());
      bySection.get(sec.name)!.add(r.className);
    }
    return Array.from(bySection.entries()).map(([name, classSet]) => ({ sectionName: name, classes: Array.from(classSet) }));
  }, [reports]);

  const paymentRows: PaymentRow[] = useMemo(() => (payments as any[])
    .map(p => ({ id: p.id, year: p.year, amount: Number(p.amount ?? 0), method: p.method, paid_on: p.paid_on, receipt_no: p.receipt_no, reference: p.reference, note: p.note }))
    .sort((a, b) => (b.paid_on ?? "").localeCompare(a.paid_on ?? "")), [payments]);

  const dauraRows: DauraRow[] = useMemo(() => {
    const parts = (data?.daura_participations as any[] | undefined) ?? [];
    const out: DauraRow[] = [];
    for (const p of parts) {
      const prog = dauraData.programs.find((x: any) => x.id === p.program_id);
      if (!prog) continue;
      out.push({ participantId: p.id, programId: p.program_id, programName: prog.name ?? "Daura programme", kind: prog.kind ?? "special", sessionLabel: prog.session_label ?? null, status: prog.status ?? "closed" });
    }
    return out;
  }, [data?.daura_participations, dauraData.programs]);

  function signOut() { clearStudentSession(); nav("/"); }

  function feeSummary() {
    if (!student) return { amount: 0, paid: 0, balance: 0 };
    const f = (fees as any[]).find(x => x.student_id === student.id && x.year === CONFIG.regYear);
    const amount = f?.amount ?? CONFIG.registrationFee;
    const paid = paymentRows.filter(p => p.year === CONFIG.regYear).reduce((s, p) => s + p.amount, 0);
    return { amount, paid, balance: Math.max(0, amount - paid) };
  }

  function renderViewer() {
    if (!viewer || !student) return null;
    if (viewer.kind === "report") {
      const r = buildReport(student, assessments, marks, exams, viewer.semester, viewer.session, viewer.className, enrollments);
      return <ReportCard student={{ ...student, class_name: viewer.className }} results={r.results} average={r.avg} pending={r.pending} sessionLabel={viewer.session} semester={viewer.semester} assessments={assessments} marks={marks} exams={exams} />;
    }
    if (viewer.kind === "transcript") {
      const groups = buildAllSemesters(student, assessments, marks, exams, enrollments);
      return <Transcript student={student} semesters={groups} />;
    }
    if (viewer.kind === "admission") return <AdmissionLetter student={student} enrollments={enrollments} />;
    if (viewer.kind === "receipt") {
      const p = paymentRows.find(x => x.id === viewer.paymentId);
      if (!p) return null;
      const fee = feeSummary();
      return <Receipt student={student} payment={p as any} amount={fee.amount} paid={fee.paid} balance={fee.balance} />;
    }
    if (viewer.kind === "daura") {
      const part = ((data?.daura_participations as any[]) ?? []).find(p => p.id === viewer.participantId);
      const prog = dauraData.programs.find(p => p.id === viewer.programId);
      if (!part || !prog) return null;
      const progAssessments = dauraData.assessments.filter((a: any) => a.program_id === viewer.programId);
      const progMarks = dauraData.marks.filter((m: any) => m.participant_id === viewer.participantId);
      return <DauraReport participant={part} program={prog} assessments={progAssessments} marks={progMarks} />;
    }
    return null;
  }

  if (!data || !student) {
    return (<>
      <PublicNav onSignOut={signOut} />
      <div className="body"><div className="wrap"><div className="empty"><div className="t">Loading…</div></div></div></div>
    </>);
  }

  if (viewer) {
    return (<>
      <PublicNav onSignOut={signOut} />
      <div className="no-print" style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", gap: 8, alignItems: "center", background: "var(--surface)", position: "sticky", top: 0, zIndex: 50 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setViewer(null)}>{I.back} Back</button>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>{I.print} Print</button>
      </div>
      <div className="cert-print-wrapper" style={{ padding: "20px 16px" }}>
        {renderViewer()}
      </div>
    </>);
  }

  const fee = feeSummary();
  const initials = (student.name[0] ?? "") + (student.name.split(/\s+/)[1]?.[0] ?? "");

  return (<>
    <PublicNav onSignOut={signOut} />
    <div className="body" style={{ paddingBottom: 80 }}>
      <div className="wrap" style={{ maxWidth: 900 }}>
        <div className="portal-welcome">
          <div className="portal-eyebrow">Student portal</div>
          <h1 className="portal-title">Student dashboard</h1>
          <p className="sub">View your academic records, financial transactions and Daura programme history.</p>
        </div>

        <div className="portal-profile">
          <div className="pav">{initials}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 className="portal-student-name">{student.name}</h2>
            <div className="pmeta">
              <span>Reg. No. <strong>{student.reg_no}</strong></span>
              <span>Class <strong>{student.class_name}</strong></span>
              <span>Section <strong>{sectionName}</strong></span>
              <span>Session <strong>{sessionLabel}</strong></span>
            </div>
          </div>
          <span className="pill pill-success pill-dot" style={{ whiteSpace: "nowrap" }}>Active</span>
        </div>

        <div className="portal-tabs">
          <button className={"portal-tab " + (page === "overview" ? "active" : "")} onClick={() => setPage("overview")}>Overview</button>
          <button className={"portal-tab " + (page === "documents" ? "active" : "")} onClick={() => setPage("documents")}>Academic documents</button>
          <button className={"portal-tab " + (page === "payments" ? "active" : "")} onClick={() => setPage("payments")}>Payments &amp; fees</button>
          <button className={"portal-tab " + (page === "daura" ? "active" : "")} onClick={() => setPage("daura")}>Daura history</button>
        </div>

        {page === "overview" && (<>
          <div className="portal-sec-head">
            <div className="portal-eyebrow">Current enrolment</div>
            <h2 className="portal-sec-title">Academic summary</h2>
            <p className="sub">Your current academic information.</p>
          </div>
          <div className="portal-stats">
            <div className="portal-stat"><div className="portal-stat-label">Academic session</div><div className="portal-stat-value">{sessionLabel}</div><div className="portal-stat-note">Current session</div></div>
            <div className="portal-stat"><div className="portal-stat-label">Semester</div><div className="portal-stat-value">{semesterLabel}</div><div className="portal-stat-note">Current semester</div></div>
            <div className="portal-stat"><div className="portal-stat-label">Current class</div><div className="portal-stat-value">{student.class_name}</div><div className="portal-stat-note">{sectionName} section</div></div>
          </div>

          <div className="portal-sec-head" style={{ marginTop: 24 }}>
            <h2 className="portal-sec-title">Student records</h2>
            <p className="sub">Select a category to view your records.</p>
          </div>
          <div className="portal-quick">
            <button className="portal-quick-card" onClick={() => setPage("documents")}>
              <div className="portal-quick-icon">▤</div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <h3>Reports &amp; transcripts</h3>
                <p>Semester reports and stage transcripts, including previous academic sessions.</p>
              </div>
              <div className="portal-quick-arrow">›</div>
            </button>
            <button className="portal-quick-card" onClick={() => { setDocTab("admission"); setPage("documents"); }}>
              <div className="portal-quick-icon">✉</div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <h3>Admission letter</h3>
                <p>View and print your official admission letter.</p>
              </div>
              <div className="portal-quick-arrow">›</div>
            </button>
            <button className="portal-quick-card" onClick={() => setPage("payments")}>
              <div className="portal-quick-icon">₦</div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <h3>Payments &amp; fees</h3>
                <p>Review school fees and registration fee transactions by session.</p>
              </div>
              <div className="portal-quick-arrow">›</div>
            </button>
            <button className="portal-quick-card" onClick={() => setPage("daura")}>
              <div className="portal-quick-icon">✦</div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <h3>Daura programme</h3>
                <p>Access sessional and special Daura records.</p>
              </div>
              <div className="portal-quick-arrow">›</div>
            </button>
          </div>
        </>)}

        {page === "documents" && (<>
          <div className="portal-sec-head">
            <div className="portal-eyebrow">Academic records</div>
            <h2 className="portal-sec-title">Documents</h2>
            <p className="sub">View available documents.</p>
          </div>
          <div className="chip-line">
            <button className={"chip-f " + (docTab === "reports" ? "active" : "")} onClick={() => setDocTab("reports")}>Reports</button>
            <button className={"chip-f " + (docTab === "transcripts" ? "active" : "")} onClick={() => setDocTab("transcripts")}>Transcripts</button>
            <button className={"chip-f " + (docTab === "admission" ? "active" : "")} onClick={() => setDocTab("admission")}>Admission letter</button>
          </div>

          {docTab === "reports" && (
            <div className="card" style={{ overflow: "hidden", marginTop: 12 }}>
              {reports.length === 0 ? (
                <div className="empty"><div className="t">No reports yet</div><div className="d">Reports will appear once marks are entered.</div></div>
              ) : (
                reports.map((r, i) => (
                  <div key={`${r.session}-${r.semester}-${r.className}`} className="portal-record">
                    <div className="portal-record-icon">▤</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="portal-record-title">{r.className} · {r.semester === 1 ? "First" : "Second"} semester report</div>
                      <div className="portal-record-meta">{r.session} · {r.pending ? "Pending" : (r.average != null ? r.average.toFixed(1) + "%" : "—")}</div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setViewer({ kind: "report", session: r.session, semester: r.semester, className: r.className })}>View</button>
                  </div>
                ))
              )}
            </div>
          )}

          {docTab === "transcripts" && (
            <div className="card" style={{ overflow: "hidden", marginTop: 12 }}>
              {transcripts.length === 0 ? (
                <div className="empty"><div className="t">No transcripts yet</div></div>
              ) : (
                transcripts.map(t => (
                  <div key={t.sectionName} className="portal-record">
                    <div className="portal-record-icon">▥</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="portal-record-title">{t.sectionName} transcript</div>
                      <div className="portal-record-meta">{t.classes.join(" · ")}</div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setViewer({ kind: "transcript" })}>View</button>
                  </div>
                ))
              )}
            </div>
          )}

          {docTab === "admission" && (
            <div className="card" style={{ overflow: "hidden", marginTop: 12 }}>
              <div className="portal-record">
                <div className="portal-record-icon">✉</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="portal-record-title">Official admission letter</div>
                  <div className="portal-record-meta">{student.reg_no} · {student.joined}</div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setViewer({ kind: "admission" })}>View</button>
              </div>
            </div>
          )}
        </>)}

        {page === "payments" && (<>
          <div className="portal-sec-head">
            <div className="portal-eyebrow">Financial records</div>
            <h2 className="portal-sec-title">Payments &amp; fees</h2>
            <p className="sub">Current session fee: ₦{fee.amount.toLocaleString()} · Paid: ₦{fee.paid.toLocaleString()} · Balance: ₦{fee.balance.toLocaleString()}</p>
          </div>
          <div className="card" style={{ overflow: "hidden" }}>
            {paymentRows.length === 0 ? (
              <div className="empty"><div className="t">No payments yet</div></div>
            ) : (
              paymentRows.map(p => (
                <div key={p.id} className="portal-record">
                  <div className="portal-record-icon">₦</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="portal-record-title">₦{p.amount.toLocaleString()} · {p.method === "cash" ? "Cash" : p.method === "transfer" ? "Bank transfer" : p.method === "pos" ? "POS" : "Other"}</div>
                    <div className="portal-record-meta">{new Date(p.paid_on).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}{p.receipt_no ? " · " + p.receipt_no : ""}</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setViewer({ kind: "receipt", paymentId: p.id })}>Receipt</button>
                </div>
              ))
            )}
          </div>
        </>)}

        {page === "daura" && (<>
          <div className="portal-sec-head">
            <div className="portal-eyebrow">Programme records</div>
            <h2 className="portal-sec-title">Daura history</h2>
            <p className="sub">Records of sessional and special Daura programmes.</p>
          </div>
          <div className="card" style={{ overflow: "hidden" }}>
            {dauraLoading ? (
              <div className="empty"><div className="t">Loading Daura records…</div></div>
            ) : dauraRows.length === 0 ? (
              <div className="empty"><div className="t">No Daura programmes</div><div className="d">Your Daura participation will appear when the school adds you.</div></div>
            ) : (
              dauraRows.map(d => (
                <div key={d.participantId} className="portal-record">
                  <div className="portal-record-icon">✦</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="portal-record-title">{d.programName}</div>
                    <div className="portal-record-meta">{d.kind === "sessional" ? "Sessional" : "Special"} · {d.sessionLabel ?? "—"} · {d.status === "open" ? "Open" : "Closed"}</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setViewer({ kind: "daura", participantId: d.participantId, programId: d.programId })}>View</button>
                </div>
              ))
            )}
          </div>
        </>)}

      </div>
    </div>
    <PublicTabBar />
  </>);
}
