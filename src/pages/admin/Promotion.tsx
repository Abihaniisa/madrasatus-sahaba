// src/pages/admin/Promotion.tsx — End-of-session promotion.
// One school-wide operation. Promote or Repeat per student.
// Graduation from Foundation / Secondary / Higher is automatic at class boundaries.
// Advances school_settings.session_label via promoteCohort (idempotent, versioned).

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  PROMOTION_CLASSES,
  NEXT_CLASS,
  GRADUATION_MILESTONES,
} from "../../lib/config";
import {
  cohortFor,
  buildReport,
  loadSchool,
  currentSessionForClass,
  promoteCohort,
  type SchoolData,
  type PromoteDecision,
} from "../../lib/data";
import { loadSettings, getSettings } from "../../lib/settings";
import { useRequireAuth, amISuperAdmin } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { I } from "../../ui/Shell";
import { DelayedSkeleton } from "../../ui/primitives";

type Decision = "promote" | "repeat";
type RowStatus = "passed" | "failed" | "pending";
type Milestone = "Foundation" | "Secondary" | "Higher" | null;

type Row = {
  studentId: string;
  name: string;
  regNo: string;
  className: string;
  toClass: string;
  average: number | null;
  failed: { subject: string; final: number }[];
  pendingCount: number;
  status: RowStatus;
  decision: Decision;
  graduationMilestone: Milestone;
};

function defaultDecision(status: RowStatus): Decision {
  return status === "passed" ? "promote" : "repeat";
}

export default function Promotion() {
  const ready = useRequireAuth();
  const nav = useNavigate();
  const [data, setData] = useState<SchoolData | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, Decision>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [operationId, setOperationId] = useState("");
  const [expectedSession, setExpectedSession] = useState("");
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const isSuper = await amISuperAdmin();
      if (!isSuper) { nav("/admin"); return; }
      setAllowed(true);
      await loadSettings();
      setData(await loadSchool());
      setExpectedSession(getSettings().session_label);
    })();
  }, [ready, nav]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    const out: Row[] = [];
    for (const cls of PROMOTION_CLASSES) {
      const classSession = currentSessionForClass(data, cls);
      if (!classSession) continue;
      const cohort = cohortFor(data, cls, classSession);
      for (const student of cohort) {
        const report = buildReport(
          student, data.assessments, data.marks, data.exams,
          undefined, classSession, cls, data.enrollments
        );
        const failed = report.results
          .filter(r => !r.pending && r.final != null && r.final < 50)
          .map(r => ({ subject: r.subject, final: r.final! }));
        const pendingCount = report.results.filter(r => r.pending).length;
        const status: RowStatus = pendingCount > 0 ? "pending" : failed.length > 0 ? "failed" : "passed";
        const decision = overrides[student.id] ?? defaultDecision(status);
        const nextCls = NEXT_CLASS[cls];
        const toClass = decision === "repeat" ? cls : (nextCls ?? "");
        const milestone: Milestone = decision === "promote" ? (GRADUATION_MILESTONES[cls] ?? null) : null;
        out.push({
          studentId: student.id,
          name: student.name,
          regNo: student.reg_no,
          className: cls,
          toClass,
          average: report.avg,
          failed,
          pendingCount,
          status,
          decision,
          graduationMilestone: milestone,
        });
      }
    }
    return out;
  }, [data, overrides]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.name.toLowerCase().includes(q) || r.regNo.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of filteredRows) {
      if (!map.has(r.className)) map.set(r.className, []);
      map.get(r.className)!.push(r);
    }
    const list = (PROMOTION_CLASSES as readonly string[]);
    return Array.from(map.entries()).sort((a, b) => list.indexOf(a[0]) - list.indexOf(b[0]));
  }, [filteredRows]);

  const counts = useMemo(() => {
    const c = { promote: 0, repeat: 0, graduate: 0, total: rows.length };
    for (const r of rows) {
      if (r.decision === "promote") c.promote++;
      else c.repeat++;
      if (r.decision === "promote" && (r.graduationMilestone || NEXT_CLASS[r.className] === null)) c.graduate++;
    }
    return c;
  }, [rows]);

  const nextSession = useMemo(() => {
    if (!expectedSession) return "";
    const y = parseInt(expectedSession.split("/")[0], 10);
    if (isNaN(y)) return "";
    return `${y + 1}/${y + 2}`;
  }, [expectedSession]);

  function setDecision(sid: string, d: Decision) {
    setOverrides(prev => ({ ...prev, [sid]: d }));
  }
  function setClassDecision(cls: string, d: Decision) {
    setOverrides(prev => {
      const next = { ...prev };
      for (const r of rows.filter(x => x.className === cls)) next[r.studentId] = d;
      return next;
    });
  }
  function toggleExpanded(cls: string) {
    setExpanded(prev => ({ ...prev, [cls]: !prev[cls] }));
  }
  function expandAll() {
    const next: Record<string, boolean> = {};
    for (const [cls] of grouped) next[cls] = true;
    setExpanded(next);
  }
  function resetDefaults() { setOverrides({}); }

  function openReview() {
    if (rows.length === 0) return;
    const opId = (typeof crypto !== "undefined" && (crypto as Crypto).randomUUID)
      ? (crypto as Crypto).randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setOperationId(opId);
    setConfirmOpen(true);
  }

  async function execute() {
    if (!data || !expectedSession) return;
    setBusy(true);
    const decisions: PromoteDecision[] = rows.map(r => ({
      student_id: r.studentId,
      decision: r.decision,
      from_class: r.className,
      to_class: r.toClass,
      graduation_milestone: r.graduationMilestone,
    }));
    const res = await promoteCohort(decisions, operationId, expectedSession);
    setBusy(false);
    setConfirmOpen(false);
    if (!res.ok) {
      setToast({ ok: false, message: res.error ?? "Promotion failed" });
      return;
    }
    if (res.already_processed) {
      setToast({ ok: true, message: `Already processed — ${res.processed ?? 0} new row(s).` });
    } else {
      setToast({ ok: true, message: `Promoted ${res.processed ?? decisions.length} student${(res.processed ?? decisions.length) === 1 ? "" : "s"}. Session ${res.from_session} → ${res.to_session}.` });
    }
    setOverrides({});
    await loadSettings();
    setData(await loadSchool());
    setExpectedSession(getSettings().session_label);
  }

  if (!ready || !allowed) {
    return <div className="body"><div className="wrap"><DelayedSkeleton ready={ready && allowed} rows={3} /></div></div>;
  }

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap" style={{ paddingBottom: 90 }}>
          <div className="crumb">
            <Link to="/admin">Portal</Link><span>/</span>
            <span className="current">End of Session</span>
          </div>
          <div className="phead">
            <div>
              <h1>End of session</h1>
              <p className="sub">
                Close <strong>{expectedSession || "—"}</strong> and open <strong>{nextSession || "—"}</strong>.
                Only Promote or Repeat per student. Graduation from Foundation, Secondary, or Higher is automatic at the class boundary.
              </p>
            </div>
          </div>

          <div className="card pad mb4">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="sub" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Session to close</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600 }}>{expectedSession || "—"}</div>
                <div className="sub" style={{ fontSize: 12, marginTop: 2 }}>Next session: {nextSession || "—"}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={expandAll}>Expand all classes</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
            <div className="card pad"><div className="sub" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em" }}>Students</div><div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, color: "var(--primary)" }}>{counts.total}</div></div>
            <div className="card pad"><div className="sub" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em" }}>Promote</div><div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, color: "var(--success)" }}>{counts.promote}</div></div>
            <div className="card pad"><div className="sub" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em" }}>Repeat</div><div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, color: "var(--warning)" }}>{counts.repeat}</div></div>
            <div className="card pad"><div className="sub" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em" }}>Auto-graduate</div><div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, color: "var(--gold)" }}>{counts.graduate}</div></div>
          </div>

          <div className="notice" style={{ marginBottom: 14 }}>
            <strong>Important:</strong> Promotion advances the school's active session by one. Academic sessions follow the school's current session setting — never today's date.
          </div>

          <div style={{ marginBottom: 12 }}>
            <input className="input" placeholder="Search student or Reg. No." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 380 }} />
          </div>

          {!data ? (
            <DelayedSkeleton ready={!!data} rows={5} />
          ) : grouped.length === 0 ? (
            <div className="card"><div className="empty"><div className="t">No active students</div><div className="d">Create enrollments by registering students first.</div></div></div>
          ) : (
            grouped.map(([cls, classRows]) => {
              const isOpen = !!expanded[cls];
              const target = NEXT_CLASS[cls];
              const targetLabel = target === null ? "Graduates" : target === "" ? "Graduates" : target;
              const passed = classRows.filter(r => r.status === "passed").length;
              const failed = classRows.filter(r => r.status === "failed").length;
              const pending = classRows.filter(r => r.status === "pending").length;
              return (
                <div key={cls} className="card mb3" style={{ overflow: "hidden" }}>
                  <button
                    onClick={() => toggleExpanded(cls)}
                    style={{ width: "100%", border: 0, background: "transparent", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}
                  >
                    <span style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 9, background: "var(--primary-soft)", color: "var(--primary)", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .2s", flex: "none" }}>
                      {I.arrow}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 700 }}>{cls}</span>
                      <span style={{ display: "block", fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
                        {classRows.length} student{classRows.length === 1 ? "" : "s"} · {passed} passed · {failed} failed · {pending} pending
                      </span>
                    </span>
                    <span style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "right", flex: "none" }}>
                      → {targetLabel}
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{ borderTop: "1px solid var(--line)", padding: "10px 14px 14px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                        <button className="chip-f" onClick={() => setClassDecision(cls, "promote")}>Promote all</button>
                        <button className="chip-f" onClick={() => setClassDecision(cls, "repeat")}>Repeat all</button>
                      </div>
                      {classRows.map(r => {
                        const isLastClass = NEXT_CLASS[r.className] === null;
                        const boundaryMilestone = GRADUATION_MILESTONES[r.className];
                        return (
                          <div key={r.studentId} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: "flex", gap: 6, alignItems: "baseline", flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 500, fontSize: 14 }}>{r.name}</span>
                                <span className={"pill pill-dot pill-" + (r.status === "passed" ? "success" : r.status === "pending" ? "warning" : "danger")} style={{ fontSize: 10.5 }}>
                                  {r.status === "passed" ? "Passed" : r.status === "pending" ? "Pending" : "Failed"}
                                </span>
                                {r.decision === "promote" && boundaryMilestone && (
                                  <span className="pill pill-gold" style={{ fontSize: 10.5 }}>Graduates from {boundaryMilestone}</span>
                                )}
                                {r.decision === "promote" && isLastClass && (
                                  <span className="pill pill-gold" style={{ fontSize: 10.5 }}>Graduates from school</span>
                                )}
                              </div>
                              <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--mono)", marginTop: 2 }}>
                                {r.regNo}{r.average != null && <> · avg {r.average.toFixed(1)}</>}
                              </div>
                              {r.status === "failed" && r.failed.length > 0 && (
                                <div style={{ fontSize: 11.5, color: "var(--danger)", marginTop: 2 }}>
                                  Failed: {r.failed.map(f => `${f.subject} (${f.final.toFixed(1)})`).join(", ")}
                                </div>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <button onClick={() => setDecision(r.studentId, "promote")} className={"chip-a " + (r.decision === "promote" ? "active" : "")} style={{ fontSize: 12 }}>Promote</button>
                              <button onClick={() => setDecision(r.studentId, "repeat")} className={"chip-a " + (r.decision === "repeat" ? "active" : "")} style={{ fontSize: 12 }}>Repeat</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={resetDefaults}>Reset to defaults</button>
            <button className="btn btn-primary" disabled={busy || rows.length === 0} onClick={openReview}>
              {busy ? "Applying…" : <>{I.check} Review &amp; promote</>}
            </button>
          </div>
        </div>
      </div>

      <div className="no-print" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--surface)", borderTop: "1px solid var(--line)", padding: "10px 16px calc(10px + env(safe-area-inset-bottom))", zIndex: 50 }}>
        <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
            <strong style={{ color: "var(--ink)" }}>{rows.length}</strong> students · {counts.promote} promote · {counts.repeat} repeat
          </div>
          <button className="btn btn-primary btn-sm" disabled={busy || rows.length === 0} onClick={openReview}>
            {busy ? "Applying…" : "Review decisions →"}
          </button>
        </div>
      </div>

      {toast && <div className="toast" role="status" aria-live="polite">{toast.message}</div>}

      {confirmOpen && (
        <div className="modal-backdrop" onClick={() => !busy && setConfirmOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="d3" style={{ marginBottom: 8 }}>Review session transition</div>
            <p className="sub" style={{ fontSize: 13.5, marginBottom: 14 }}>
              Close <strong>{expectedSession}</strong> and open <strong>{nextSession}</strong>.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
              <div className="card pad" style={{ textAlign: "center" }}><div className="sub" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em" }}>Promote</div><div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, color: "var(--success)" }}>{counts.promote}</div></div>
              <div className="card pad" style={{ textAlign: "center" }}><div className="sub" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em" }}>Repeat</div><div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, color: "var(--warning)" }}>{counts.repeat}</div></div>
              <div className="card pad" style={{ textAlign: "center" }}><div className="sub" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em" }}>Graduate</div><div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, color: "var(--gold)" }}>{counts.graduate}</div></div>
            </div>
            <div className="notice" style={{ background: "var(--danger-soft)", borderColor: "var(--danger)", color: "var(--danger)", marginBottom: 14 }}>
              <strong>Final action:</strong> This closes the {expectedSession} enrolments and creates the {nextSession} enrolments (or graduation records). Existing marks, exams, and history are preserved. This action should be executed once per transition.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-ghost" disabled={busy} onClick={() => setConfirmOpen(false)}>Go back</button>
              <button className="btn btn-primary" disabled={busy} onClick={execute}>{busy ? "Applying…" : "Confirm transition"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
