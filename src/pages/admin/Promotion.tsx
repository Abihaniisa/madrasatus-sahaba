// src/pages/admin/Promotion.tsx — End-of-session promotion.
// Cohort-based (enrollments, not students.class_name) — fixes merge-across-classes bug.
// Pass rule: all 5 subjects ≥ 50 and no pending. Teacher can override any row.
// Execution is atomic via the promote_cohort RPC.

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ALL_CLASSES, SECTIONS } from "../../lib/config";
import { cohortFor, buildReport, loadSchool, currentSessionForClass, type SchoolData } from "../../lib/data";
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
      const classSession = currentSessionForClass(data, cls);
      if (!classSession) continue;
      const cohort = cohortFor(data, cls, classSession);
      for (const student of cohort) {
        const report = buildReport(student, data.assessments, data.marks, data.exams, undefined, classSession, cls, data.enrollments);
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
  }, [data, overrides]);

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
                Only students with an active enrollment in the current session are shown.
              </p>
            </div>
          </div>

          <div className="card pad mb4">
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
            <div className="card"><div className="empty"><div className="t">No active students</div><div className="d">There are no active enrollments to promote. Create enrollments by registering students first.</div></div></div>
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
        title="Confirm Promotion?"
        confirmLabel={busy ? "Applying…" : "Confirm"}
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={execute}
        onCancel={() => setConfirmOpen(false)}
      >
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink)", marginBottom: 14 }}>
          Students will advance to their next classes or graduate. Academic sessions follow enrollment history, not today's date.
        </p>
        <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--danger)", fontWeight: 600 }}>
          🔴 Warning: This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
