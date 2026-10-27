// src/pages/admin/Promotion.tsx — End-of-session promotion.
// Cohort-based (enrollments, not students.class_name) — fixes merge-across-classes bug.
// Pass rule: all 5 subjects ≥ 50 and no pending. Teacher can override any row.
// Execution is atomic via the promote_cohort RPC.

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ALL_CLASSES, SECTIONS } from "../../lib/config";
import { cohortFor, buildReport, loadSchool, type SchoolData } from "../../lib/data";
import { useRequireAuth, amISuperAdmin } from "../../lib/supabase";
import { getSettings } from "../../lib/settings";
import { getEffectiveSemester } from "../../lib/calendar";
import { AdminTop } from "../../ui/AdminShell";
import { I } from "../../ui/Shell";
import { DelayedSkeleton, Modal } from "../../ui/primitives";
import type { Student } from "../../types";

type Decision = "promote" | "repeat" | "withdrawn" | "graduate";

type RowStatus = "passed" | "failed" | "pending";

type Row = {
  student: Student;
  className: string;
  average: number | null;
  failed: { subject: string; final: number }[];
  pendingCount: number;
  status: RowStatus;
  decision: Decision;
};

function nextClass(cls: string): string | null {
  const idx = ALL_CLASSES.indexOf(cls);
  if (idx === -1) return null;
  if (idx === ALL_CLASSES.length - 1) return null;
  return ALL_CLASSES[idx + 1];
}

function isLastClassOfSchool(cls: string): boolean {
  return ALL_CLASSES[ALL_CLASSES.length - 1] === cls;
}

function suggestNextSession(current: string): string {
  const m = current.match(/^(\d{4})\/(\d{4})$/);
  if (!m) return current;
  return `${parseInt(m[1], 10) + 1}/${parseInt(m[2], 10) + 1}`;
}

function defaultDecision(status: RowStatus, cls: string): Decision {
  if (status === "passed") return isLastClassOfSchool(cls) ? "graduate" : "promote";
  return "repeat";
}

function decisionLabel(d: Decision): string {
  return d === "promote" ? "Promote" : d === "repeat" ? "Repeat" : d === "graduate" ? "Graduate" : "Withdrawn";
}

export default function Promotion() {
  const ready = useRequireAuth();
  const nav = useNavigate();
  const [data, setData] = useState<SchoolData | null>(null);
  const [allowed, setAllowed] = useState(false);
  const settings = getSettings();
  const [currentSession, setCurrentSession] = useState(settings.session_label);
  const [nextSession, setNextSession] = useState(suggestNextSession(settings.session_label));
  const [overrides, setOverrides] = useState<Record<string, Decision>>({});
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const isSuper = await amISuperAdmin();
      if (!isSuper) { nav("/admin"); return; }
      setAllowed(true);
      setData(await loadSchool());
    })();
  }, [ready, nav]);

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    const out: Row[] = [];
    for (const cls of ALL_CLASSES) {
      const cohort = cohortFor(data, cls, currentSession);
      for (const student of cohort) {
        const report = buildReport(student, data.assessments, data.marks, data.exams, undefined, currentSession, cls, data.enrollments);
        const failed = report.results
          .filter(r => !r.pending && r.final != null && r.final < 50)
          .map(r => ({ subject: r.subject, final: r.final! }));
        const pendingCount = report.results.filter(r => r.pending).length;
        const status: RowStatus = pendingCount > 0 ? "pending" : failed.length > 0 ? "failed" : "passed";
        const defaultD = defaultDecision(status, cls);
        const decision = overrides[student.id] ?? defaultD;
        out.push({ student, className: cls, average: report.avg, failed, pendingCount, status, decision });
      }
    }
    return out;
  }, [data, currentSession, overrides]);

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      if (!map.has(r.className)) map.set(r.className, []);
      map.get(r.className)!.push(r);
    }
    return Array.from(map.entries()).sort(
      (a, b) => ALL_CLASSES.indexOf(a[0]) - ALL_CLASSES.indexOf(b[0])
    );
  }, [rows]);

  const counts = useMemo(() => {
    const c = { promote: 0, repeat: 0, withdrawn: 0, graduate: 0 };
    for (const r of rows) c[r.decision]++;
    return c;
  }, [rows]);

  function setDecision(sid: string, d: Decision) {
    setOverrides(prev => ({ ...prev, [sid]: d }));
  }
  function setClassDecision(cls: string, d: Decision) {
    setOverrides(prev => {
      const next = { ...prev };
      for (const r of rows.filter(x => x.className === cls)) next[r.student.id] = d;
      return next;
    });
  }
  function resetDefaults() { setOverrides({}); }

  const isSemester2 = getEffectiveSemester() === 2;

  async function execute() {
    if (!data) return;
    setBusy(true); setResult(null);
    const decisionsPayload = rows.map(r => {
      const toClass =
        r.decision === "promote" ? nextClass(r.className) :
        r.decision === "repeat" ? r.className :
        r.decision === "graduate" ? r.className :
        r.className;
      return {
        student_id: r.student.id,
        decision: r.decision,
        from_class: r.className,
        to_class: toClass ?? r.className,
      };
    });

    const { data: rpc, error } = await (await import("../../lib/supabase")).supabase.rpc("promote_cohort", {
      p_current_session: currentSession,
      p_next_session: nextSession,
      p_decisions: decisionsPayload,
    });

    setBusy(false);
    setConfirmOpen(false);
    if (error) {
      setResult({ ok: false, message: error.message });
      return;
    }
    const payload = rpc as { ok: boolean; processed?: number; error?: string } | null;
    if (!payload?.ok) {
      setResult({ ok: false, message: payload?.error ?? "Promotion failed" });
      return;
    }
    setResult({ ok: true, message: `Promoted ${payload.processed ?? decisionsPayload.length} student${(payload.processed ?? decisionsPayload.length) === 1 ? "" : "s"}.` });
    setOverrides({});
    setData(await loadSchool());
  }

  if (!ready || !allowed) {
    return <div className="body"><div className="wrap"><DelayedSkeleton ready={ready && allowed} rows={3} /></div></div>;
  }

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap">
          <div className="crumb">
            <Link to="/admin">Portal</Link><span>/</span>
            <span className="current">End of Session</span>
          </div>
          <div className="phead">
            <div>
              <h1>End of session</h1>
              <p className="sub">
                Move active students to their next class, repeat, withdraw, or graduate.
                Only students with an active enrollment in <strong>{currentSession}</strong> are shown.
              </p>
            </div>
          </div>

          <div className="card pad mb4">
            <div className="row g3" style={{ flexWrap: "wrap" }}>
              <div className="field flex1" style={{ minWidth: 180 }}>
                <label>Current session</label>
                <input className="input" value={currentSession} onChange={e => setCurrentSession(e.target.value)} />
              </div>
              <div className="field flex1" style={{ minWidth: 180 }}>
                <label>New session</label>
                <input className="input" value={nextSession} onChange={e => setNextSession(e.target.value)} />
              </div>
            </div>
            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-ghost" onClick={resetDefaults}>Reset to defaults</button>
              <button className="btn btn-primary" disabled={busy || rows.length === 0} onClick={() => setConfirmOpen(true)}>
                {busy ? "Applying…" : <>{I.check} Review &amp; promote</>}
              </button>
            </div>
          </div>

          {result && (
            <div className="card pad mb4" style={{ background: result.ok ? "var(--success-soft)" : "var(--danger-soft)", borderColor: result.ok ? "var(--success-line)" : "var(--danger)", color: result.ok ? "var(--success)" : "var(--danger)" }}>
              {result.message}
            </div>
          )}

          {!data ? (
            <DelayedSkeleton ready={!!data} rows={5} />
          ) : grouped.length === 0 ? (
            <div className="card"><div className="empty"><div className="t">No active students in {currentSession}</div><div className="d">Enrollments for this session do not exist yet. Create them by enrolling students, or change the current session.</div></div></div>
          ) : (
            grouped.map(([cls, classRows]) => {
              const target = nextClass(cls);
              const targetLabel = target ?? "Graduated";
              const passed = classRows.filter(r => r.status === "passed").length;
              const failed = classRows.filter(r => r.status === "failed").length;
              const pending = classRows.filter(r => r.status === "pending").length;
              return (
                <div key={cls} className="sec-block">
                  <div className="sec-head">
                    <h2>{cls} <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>→</span> {targetLabel}</h2>
                    <span className="meta">
                      {classRows.length} students · {passed} passed · {failed} failed · {pending} pending
                    </span>
                  </div>
                  <div className="row g2" style={{ marginBottom: 8, flexWrap: "wrap" }}>
                    <button className="chip-f" onClick={() => setClassDecision(cls, "promote")}>Promote all</button>
                    <button className="chip-f" onClick={() => setClassDecision(cls, "repeat")}>Repeat all</button>
                    {isLastClassOfSchool(cls) && (
                      <button className="chip-f" onClick={() => setClassDecision(cls, "graduate")}>Graduate all</button>
                    )}
                    <button className="chip-f" onClick={() => setClassDecision(cls, "withdrawn")}>Withdraw all</button>
                  </div>
                  <div className="card" style={{ overflow: "hidden" }}>
                    {classRows.map(r => {
                      const statusTone = r.status === "passed" ? "success" : r.status === "pending" ? "warning" : "danger";
                      const statusLabel = r.status === "passed" ? "Passed" : r.status === "pending" ? "Pending" : "Failed";
                      return (
                        <div key={r.student.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--line)", alignItems: "center" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 500, fontSize: 14 }}>{r.student.name}</span>
                              <span className={"pill pill-dot pill-" + statusTone} style={{ fontSize: 10.5 }}>{statusLabel}</span>
                            </div>
                            <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--mono)", marginTop: 2 }}>
                              {r.student.reg_no}
                              {r.average != null && <> · avg {r.average.toFixed(1)}</>}
                            </div>
                            {r.status === "failed" && r.failed.length > 0 && (
                              <div style={{ fontSize: 11.5, color: "var(--danger)", marginTop: 2 }}>
                                Failed: {r.failed.map(f => `${f.subject} (${f.final.toFixed(1)})`).join(", ")}
                              </div>
                            )}
                            {r.status === "pending" && (
                              <div style={{ fontSize: 11.5, color: "var(--warning)", marginTop: 2 }}>
                                Pending: {r.pendingCount} subject{r.pendingCount === 1 ? "" : "s"} have no marks or exam
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {(["promote", "repeat", "withdrawn"] as Decision[]).map(opt => (
                              <button key={opt} onClick={() => setDecision(r.student.id, opt)}
                                className={"chip-a " + (r.decision === opt ? "active" : "")}
                                style={{ textTransform: "capitalize", fontSize: 12 }}>
                                {decisionLabel(opt)}
                              </button>
                            ))}
                            {isLastClassOfSchool(cls) && (
                              <button onClick={() => setDecision(r.student.id, "graduate")}
                                className={"chip-a " + (r.decision === "graduate" ? "active" : "")}
                                style={{ fontSize: 12 }}>
                                Graduate
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Modal
        open={confirmOpen}
        title="Confirm promotion"
        confirmLabel={busy ? "Applying…" : `Promote ${counts.promote + counts.graduate + counts.repeat + counts.withdrawn} student${(counts.promote + counts.graduate + counts.repeat + counts.withdrawn) === 1 ? "" : "s"}`}
        cancelLabel="Cancel"
        tone={isSemester2 ? "danger" : "primary"}
        onConfirm={execute}
        onCancel={() => setConfirmOpen(false)}
      >
        <div style={{ display: "grid", gap: 6, fontSize: 13, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--ink-3)" }}>Current session</span>
            <span style={{ fontWeight: 500 }}>{currentSession}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--ink-3)" }}>New session</span>
            <span style={{ fontWeight: 500 }}>{nextSession}</span>
          </div>
        </div>
        <div style={{ display: "grid", gap: 4, fontSize: 13, padding: "10px 0", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Promote</span><strong>{counts.promote}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Repeat</span><strong>{counts.repeat}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Withdrawn</span><strong>{counts.withdrawn}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Graduate</span><strong>{counts.graduate}</strong></div>
        </div>
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-2)", marginBottom: 10 }}>
          Students will move to the next class at the start of the new session. All existing marks, exams, enrollments, and receipts stay intact.
        </p>
        {isSemester2 && (
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--warning)", background: "var(--warning-soft)", padding: "8px 10px", borderRadius: 6, marginBottom: 10 }}>
            Semester 2 is currently active. Promoted students will have no Semester 1 records for their new class.
          </p>
        )}
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--danger)", fontWeight: 500 }}>
          ⚠ This will be applied immediately and cannot be undone from the app.
        </p>
      </Modal>
    </div>
  );
}
