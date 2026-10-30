// src/pages/admin/Assessments.tsx — super-admin only.
// Central control of assessments. Creating "Assessment N" is school-wide:
// it inserts one row per (class, subject) for all active classes.
// Lock/unlock per assessment number disables mark entry for that N across the whole school.
// Cap: 18 assessments per session per semester.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CONFIG, SECTIONS, ALL_CLASSES } from "../../lib/config";
import { loadSchool, invalidateSchoolCache, currentSchoolSession, type SchoolData } from "../../lib/data";
import { useRequireAuth, amISuperAdmin, supabase, isAssessmentLocked, setAssessmentLock } from "../../lib/supabase";
import { getSettings } from "../../lib/settings";
import { getEffectiveSemester } from "../../lib/calendar";
import { AdminTop } from "../../ui/AdminShell";
import { I } from "../../ui/Shell";
import { DelayedSkeleton, Modal } from "../../ui/primitives";

const MAX_ASSESSMENTS = 18;

type Row = { label: string; locked: boolean; count: number };

export default function Assessments() {
  const ready = useRequireAuth();
  const [allowed, setAllowed] = useState(false);
  const [data, setData] = useState<SchoolData | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmCreate, setConfirmCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const session = data ? currentSchoolSession(data) : getSettings().session_label;
  const semester = getEffectiveSemester();

  async function loadRows() {
    const { data: assRows } = await supabase
      .from("assessments")
      .select("label")
      .eq("session_label", session)
      .eq("semester", semester);
    const labels = new Map<string, number>();
    for (const r of (assRows as { label: string }[]) ?? []) {
      labels.set(r.label, (labels.get(r.label) ?? 0) + 1);
    }
    const list: Row[] = [];
    for (const [label, count] of labels) {
      list.push({ label, count, locked: await isAssessmentLocked(label, session, semester) });
    }
    list.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    setRows(list);
  }

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const isSuper = await amISuperAdmin();
      if (!isSuper) return; // gate
      setAllowed(true);
      setData(await loadSchool());
    })();
  }, [ready]);

  useEffect(() => {
    if (!data) return;
    loadRows();
  }, [data, session, semester]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function nextNumber(): number {
    if (!rows) return 1;
    const existing = new Set(
      rows.map(r => {
        const m = r.label.match(/^Assessment\s+(\d+)$/i);
        return m ? parseInt(m[1], 10) : 0;
      })
    );
    let n = 1;
    while (existing.has(n)) n++;
    return n;
  }

  async function createAssessment() {
    if (!rows) return;
    if (busy) return; // prevent double-click
    if (rows.length >= MAX_ASSESSMENTS) {
      setToast(`Maximum ${MAX_ASSESSMENTS} assessments per session. Delete one to create another.`);
      setConfirmCreate(false);
      return;
    }
    setBusy(true);
    const n = nextNumber();
    const label = `Assessment ${n}`;
    // All active classes × all subjects
    const activeClasses = SECTIONS.filter(s => !s.inactive).flatMap(s => s.classes);
    const newRows = activeClasses.flatMap(className =>
      CONFIG.subjects.map(subject => ({
        class_name: className,
        subject,
        label,
        max_marks: CONFIG.assessmentMax,
        session_label: session,
        semester,
      }))
    );
    const { data: existing } = await supabase
      .from("assessments")
      .select("id")
      .eq("label", label)
      .eq("session_label", session)
      .eq("semester", semester)
      .limit(1);
    if (existing && existing.length > 0) {
      setBusy(false);
      setConfirmCreate(false);
      setToast(`${label} already exists. Delete it first to recreate.`);
      return;
    }
    const { error } = await supabase.from("assessments").insert(newRows);
    setBusy(false);
    setConfirmCreate(false);
    if (error) {
      setToast("Couldn't create: " + error.message);
      return;
    }
    invalidateSchoolCache();
    setData(await loadSchool());
    await loadRows();
    setToast(`${label} created for ${activeClasses.length} classes × ${CONFIG.subjects.length} subjects.`);
  }

  async function toggleLock(label: string, currentLocked: boolean) {
    setBusy(true);
    await setAssessmentLock(label, session, semester, !currentLocked);
    await loadRows();
    setBusy(false);
  }

  async function deleteAssessment(label: string) {
    setBusy(true);
    await supabase.from("assessments")
      .delete()
      .eq("label", label)
      .eq("session_label", session)
      .eq("semester", semester);
    setBusy(false);
    setConfirmDelete(null);
    invalidateSchoolCache();
    setData(await loadSchool());
    await loadRows();
    setToast(`${label} deleted across all classes.`);
  }

  if (!ready || !allowed) return <div className="body"><div className="wrap"><DelayedSkeleton ready={!!rows} rows={5} /></div></div>;

  const count = rows?.length ?? 0;
  const canCreate = count < MAX_ASSESSMENTS;

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap-narrow">
          <div className="crumb">
            <Link to="/admin">Portal</Link><span>/</span>
            <Link to="/admin/manage">Manage</Link><span>/</span>
            <span className="current">Assessments</span>
          </div>
          <div className="phead">
            <div>
              <h1>Assessments</h1>
              <p className="sub">
                School-wide creation. Creating an assessment applies to every active class and every subject.
                {" "}{session} · Semester {semester} · {count} of {MAX_ASSESSMENTS} created.
              </p>
            </div>
            {canCreate && !busy && (
              <button className="btn btn-primary btn-sm" onClick={() => setConfirmCreate(true)}>
                {I.plus} Create Assessment {nextNumber()}
              </button>
            )}
          </div>

          {count === 0 ? (
            <div className="card"><div className="empty"><div className="t">No assessments yet</div><div className="d">Create the first assessment to enable mark entry across all classes.</div></div></div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              {rows!.map(r => (
                <div key={r.label} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{r.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{r.count} rows · {r.count / CONFIG.subjects.length} classes</div>
                  </div>
                  <button className={"btn btn-sm " + (r.locked ? "btn-secondary" : "btn-ghost")} disabled={busy} onClick={() => toggleLock(r.label, r.locked)}>
                    {r.locked ? "🔒 Locked · Unlock" : "🔓 Open · Lock"}
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} disabled={busy} onClick={() => setConfirmDelete(r.label)}>Delete</button>
                </div>
              ))}
            </div>
          )}

          {!canCreate && (
            <div className="notice" style={{ marginTop: 12 }}>
              Maximum {MAX_ASSESSMENTS} assessments per session. Delete an existing one to create another.
            </div>
          )}
        </div>
      </div>

      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}

      <Modal
        open={confirmCreate}
        title={`Create Assessment ${nextNumber()}?`}
        message={`This will create Assessment ${nextNumber()} for every active class (${SECTIONS.filter(s => !s.inactive).flatMap(s => s.classes).length}) and every subject (${CONFIG.subjects.length}). Teachers can enter marks for it in every class.`}
        confirmLabel={busy ? "Creating…" : "Create"}
        onConfirm={createAssessment}
        onCancel={() => setConfirmCreate(false)}
      />

      <Modal
        open={!!confirmDelete}
        title="Delete this assessment?"
        message={confirmDelete ? `Delete ${confirmDelete} across every class and subject? All recorded marks for it will be permanently removed.` : ""}
        confirmLabel={busy ? "Deleting…" : "Delete"}
        tone="danger"
        onConfirm={() => confirmDelete && deleteAssessment(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
