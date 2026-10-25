// src/pages/admin/StudentPage.tsx — full student profile + report card + fee summary.
// Buttons: Records / Edit marks / Edit / Delete (delete is super-admin only).

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CONFIG } from "../../lib/config";
import { buildReport, loadSchool, type SchoolData } from "../../lib/data";
import { fmtNGN } from "../../lib/calc";
import { useRequireAuth, amISuperAdmin, supabase, deleteStudentCompletely } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { I, waLink } from "../../ui/Shell";
import { DelayedSkeleton, Modal } from "../../ui/primitives";
import { ReportCard } from "../../documents/ReportCard";

export default function StudentPage() {
  const ready = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [data, setData] = useState<SchoolData | null>(null);
  const [isSuper, setIsSuper] = useState(false);
  const [confirmMode, setConfirmMode] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);

  async function reload() { setData(await loadSchool()); }
  useEffect(() => {
    loadSchool().then(setData);
    amISuperAdmin().then(setIsSuper);
  }, []);

  if (!ready) return <div className="body"><div className="wrap"><DelayedSkeleton ready={ready} rows={5} /></div></div>;
  if (!data) return <div className="body"><div className="wrap"><DelayedSkeleton ready={!!data} rows={5} /></div></div>;

  const s = data.students.find(x => x.id === id);
  if (!s) return <div className="body"><div className="wrap"><div className="empty"><div className="t">Student not found</div></div></div></div>;

  const report = buildReport(s, data.assessments, data.marks, data.exams);
  const fee = data.fees.find(f => f.student_id === s.id && f.year === CONFIG.regYear);
  const phone = (s.student_phone || s.guardian_phone || "").replace(/[^0-9+]/g, "");

  async function toggleMode() {
    if (!isSuper) return;
    setBusy(true);
    await supabase.from("students").update({ mode: s!.mode === "online" ? "physical" : "online" }).eq("id", s!.id);
    await reload();
    setBusy(false);
    setConfirmMode(false);
  }

  async function handleDelete() {
    if (!isSuper || !s) return;
    setDeleting(true);
    const res = await deleteStudentCompletely(s.id);
    setDeleting(false);
    setConfirmDelete(false);
    if (res.error) {
      window.alert("Delete failed: " + res.error);
      return;
    }
    nav("/admin");
  }

  const feeTone = !fee ? "neutral" :
    fee.status === "paid" ? "success" :
    fee.status === "partial" ? "warning" :
    fee.status === "scholarship" ? "info" : "danger";
  const feeLabel = !fee ? "No fee" :
    fee.status === "paid" ? "Paid" :
    fee.status === "partial" ? "Partial" :
    fee.status === "scholarship" ? "Scholarship" : "Unpaid";

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap">
          <div className="crumb no-print">
            <Link to="/admin">Students</Link><span>/</span>
            <Link to={`/admin/class/${encodeURIComponent(s.class_name)}`}>{s.class_name}</Link><span>/</span>
            <span className="current">{s.name}</span>
          </div>

          <div className="ph no-print">
            <div className="pav">{(s.name[0] ?? "") + (s.name.split(/\s+/)[1]?.[0] ?? "")}</div>
            <div className="pinfo">
              <h1>{s.name}</h1>
              <div className="pmeta">
                <span>Reg. No. <strong>{s.reg_no}</strong></span>
                <span>Class <strong>{s.class_name}</strong></span>
                {s.nin && <span>NIN <strong className="mono">{"•".repeat(7) + s.nin.slice(-4)}</strong></span>}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {report.pending
                  ? <span className="pill pill-warning pill-dot">Pending</span>
                  : report.avg != null
                    ? <span className="pill pill-success pill-dot">{report.avg}%</span>
                    : <span className="pill pill-neutral pill-dot">No results</span>}
                <button type="button" onClick={() => isSuper && setConfirmMode(true)}
                  className="pill pill-info"
                  style={{ cursor: isSuper ? "pointer" : "default", border: 0, font: "inherit", fontFamily: "var(--sans)", fontSize: "11.5px", fontWeight: 500, padding: "2px 9px" }}>
                  {s.mode === "online" ? "Online" : "Physical"}
                </button>
                <span className={"pill pill-dot pill-" + feeTone}>{feeLabel}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link className="btn btn-secondary btn-sm" to={`/admin/student/${s.id}/records`}>{I.folder} Records</Link>
              <Link className="btn btn-secondary btn-sm" to={`/admin/student/${s.id}/marks`}>{I.check} Edit marks</Link>
              <Link className="btn btn-secondary btn-sm" to={`/admin/student/${s.id}/edit`}>{I.plus} Edit</Link>
              {isSuper && (
                <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => setConfirmDelete(true)}>
                  Delete
                </button>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div className="d3">Semester Report Card</div>
                <div className="sub" style={{ marginTop: 2 }}>{CONFIG.sessionLabel} · {CONFIG.semesterLabel}</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowPrintModal(true)}>{I.print} Print report</button>
            </div>
            <div className="cert-print-wrapper" style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: "var(--r-3)", background: "var(--surface)", padding: 12 }}>
              <ReportCard student={s} results={report.results} average={report.avg} pending={report.pending} assessments={data.assessments} marks={data.marks} exams={data.exams} />
            </div>
          </div>

          <div className="card no-print">
            <div style={{ padding: "18px 20px" }}>
              <div className="d3" style={{ marginBottom: 10 }}>Fees</div>
              {fee ? (
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "baseline" }}>
                  <div><div className="sub">Amount</div><div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600 }}>{fmtNGN(fee.amount)}</div></div>
                  <div><div className="sub">Paid</div><div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600 }}>{fmtNGN(fee.paid)}</div></div>
                  <div><div className="sub">Balance</div><div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, color: "var(--warning)" }}>{fmtNGN(fee.amount - fee.paid)}</div></div>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                    <span className={"pill pill-dot pill-" + feeTone}>{feeLabel}</span>
                    {fee.status !== "paid" && fee.status !== "scholarship" && phone && (
                      <a className="btn btn-wa btn-sm" href={waLink(phone, `As-salamu alaykum. A reminder about the registration fee for ${s.name} (${s.reg_no}).`)} target="_blank" rel="noopener noreferrer">
                        {I.whatsapp} Remind
                      </a>
                    )}
                  </div>
                </div>
              ) : <p className="sub">No fee on record.</p>}
            </div>
          </div>
        </div>
      </div>

      <Modal open={showPrintModal} title="Print setup" confirmLabel="Print"
        onConfirm={() => { setShowPrintModal(false); setTimeout(() => window.print(), 200); }}
        onCancel={() => setShowPrintModal(false)}>
        <p className="sub" style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 10 }}>
          Set these in your browser print dialog:
        </p>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9, fontSize: 13.5 }}>
          <li>Layout — <strong>Landscape</strong></li>
          <li>Paper — <strong>A4</strong></li>
          <li>Margins — <strong>Default</strong></li>
        </ul>
      </Modal>

      <Modal open={confirmMode} title="Change mode?"
        message={s ? `Switch ${s.name} to ${s.mode === "online" ? "Physical" : "Online"}?` : ""}
        confirmLabel={busy ? "Changing…" : "Change"}
        onConfirm={toggleMode}
        onCancel={() => setConfirmMode(false)} />

      <Modal
        open={confirmDelete}
        title="Delete this student?"
        message={s ? `Delete ${s.name} (${s.reg_no})? This removes their marks, exams, fees, payments, and enrollments. This cannot be undone.` : ""}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
