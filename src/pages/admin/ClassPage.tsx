// src/pages/admin/ClassPage.tsx — students in a class + enter marks + new assessment + bulk print.

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SECTIONS, CONFIG } from "../../lib/config";
import { getEffectiveSemester, getSessionLabel } from "../../lib/calendar";
import { getSettings } from "../../lib/settings";
import { classAverage, buildReport, loadSchool, currentSessionForClass, type SchoolData } from "../../lib/data";
import { useRequireAuth, amISuperAdmin, supabase } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { I } from "../../ui/Shell";
import { Modal } from "../../ui/primitives";
import AssessmentSheet from "./AssessmentSheet";
import ExamSheet from "./ExamSheet";

let schoolCache: { at: number; data: SchoolData } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;
const GIVE_UP_MS = 15000;
const SKELETON_DELAY_MS = 150;

function cachedSchool(): SchoolData | null {
  return schoolCache && Date.now() - schoolCache.at < CACHE_TTL_MS ? schoolCache.data : null;
}

function safeDecode(v: string): string {
  try { return decodeURIComponent(v); } catch { return v; }
}

function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function LoadingRows({ rows = 5 }: { rows?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), SKELETON_DELAY_MS);
    return () => clearTimeout(t);
  }, []);
  if (!show) return <div style={{ minHeight: 240 }} aria-hidden="true" />;
  return (
    <div role="status" aria-busy="true" aria-label="Loading" style={{ display: "grid", gap: 10, marginTop: 8 }}>
      <style>{`@keyframes cp-shimmer{0%{opacity:.5}50%{opacity:1}100%{opacity:.5}}`}</style>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{
            height: 56,
            borderRadius: 10,
            background: "var(--ink-4)",
            opacity: 0.12,
            animation: "cp-shimmer 1.4s ease-in-out infinite",
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </div>
  );
}

export default function ClassPage() {
  const ready = useRequireAuth();
  const { cls: clsRaw } = useParams<{ cls: string }>();
  const cls = safeDecode(clsRaw || "");
  const [data, setData] = useState<SchoolData | null>(cachedSchool);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [sheet, setSheet] = useState<"none" | "assessment" | "exam">("none");
  const [isSuper, setIsSuper] = useState(false);
  const [confirmNewAssessment, setConfirmNewAssessment] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    let live = true;
    loadSchool()
      .then(d => {
        if (!live) return;
        schoolCache = { at: Date.now(), data: d };
        setData(d);
        setFailed(false);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => { live = false; };
  }, [ready, attempt]);

  useEffect(() => {
    if (!ready) return;
    let live = true;
    amISuperAdmin()
      .then(v => { if (live) setIsSuper(!!v); })
      .catch(() => { if (live) setIsSuper(false); });
    return () => { live = false; };
  }, [ready]);

  useEffect(() => {
    if (!ready || data || failed) return;
    const t = setTimeout(() => setFailed(true), GIVE_UP_MS);
    return () => clearTimeout(t);
  }, [ready, data, failed, attempt]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const sec = SECTIONS.find(s => s.classes.includes(cls));

  const students = useMemo(
    () => data?.students.filter(s => s.class_name === cls) ?? [],
    [data, cls]
  );

  const avg = useMemo(() => {
    if (!data) return null;
    try {
      return classAverage(cls, data.students, data.assessments, data.marks, data.exams);
    } catch {
      return null;
    }
  }, [data, cls]);

  const rows = useMemo(() => {
    const list = students.map(s => {
      let r: ReturnType<typeof buildReport> | null = null;
      if (data) {
        try { r = buildReport(s, data.assessments, data.marks, data.exams); } catch { r = null; }
      }
      return { s, r };
    });
    if (data) {
      list.sort((a, b) => {
        const diff = (b.r?.avg ?? -1) - (a.r?.avg ?? -1);
        return diff !== 0 ? diff : (a.s.name ?? "").localeCompare(b.s.name ?? "");
      });
    } else {
      list.sort((a, b) => (a.s.name ?? "").localeCompare(b.s.name ?? ""));
    }
    return list;
  }, [students, data]);

  if (!ready) {
    return <div className="body"><div className="wrap"><LoadingRows rows={4} /></div></div>;
  }
  if (!sec) {
    return (
      <div className="body"><div className="wrap">
        <div className="empty">
          <div className="t">Class not found</div>
          <div className="d">This class doesn't exist or the link is out of date.</div>
          <div style={{ marginTop: 12 }}>
            <Link className="btn btn-secondary btn-sm" to="/admin">Back to students</Link>
          </div>
        </div>
      </div></div>
    );
  }

  const loadError = !data && failed;

  function refresh() {
    setAttempt(a => a + 1);
  }

  async function createAssessment() {
    if (busy) return;
    setBusy(true);
    try {
      let source = data;
      try { source = await loadSchool(); } catch { /* fall back */ }

      const classSession = currentSessionForClass(source ?? data!, cls) ?? getSessionLabel(new Date());
      const existing = (source?.assessments ?? []).filter(
        a => a.class_name === cls && a.semester === getEffectiveSemester() && a.session_label === classSession
      );
      const numbers = new Set(existing.map(a => {
        const m = a.label.match(/^Assessment\s+(\d+)$/i);
        return m ? parseInt(m[1], 10) : 0;
      }));
      let next = 1;
      while (numbers.has(next)) next++;
      const label = `Assessment ${next}`;
      const newRows = CONFIG.subjects.map(subject => ({
        class_name: cls, subject, label,
        max_marks: CONFIG.assessmentMax,
        session_label: classSession, semester: getEffectiveSemester(),
      }));
      const { error } = await supabase.from("assessments").insert(newRows);
      if (error) throw error;

      setConfirmNewAssessment(false);
      refresh();
      setToast(`${label} created. You can now find it in 'Enter marks'.`);
    } catch {
      setConfirmNewAssessment(false);
      setToast("Couldn't create the assessment. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap">
          <div className="crumb">
            <Link to="/admin">Students</Link><span>/</span>
            <Link to="/admin">{sec.name}</Link><span>/</span>
            <span className="current">{cls}</span>
          </div>

          <div className="phead">
            <div>
              <h1>{cls}</h1>
              <p className="sub">
                {data
                  ? `${students.length} ${students.length === 1 ? "student" : "students"} · Class average ${avg != null ? avg + "%" : "—"}`
                  : loadError ? "Couldn't load this class" : "Loading students…"}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link className="btn btn-secondary btn-sm" to={`/admin/bulk?class=${encodeURIComponent(cls)}&doc=class-sheet`}>{I.print} Assessment Sheet</Link>
              <Link className="btn btn-secondary btn-sm" to={`/admin/bulk?class=${encodeURIComponent(cls)}&doc=class-result`}>{I.file} Result Sheet</Link>
              <Link className="btn btn-primary btn-sm" to={`/admin/bulk?class=${encodeURIComponent(cls)}&doc=report`}>{I.print} Bulk print</Link>
              <Link className="btn btn-secondary btn-sm" to={`/admin/bulk?class=${encodeURIComponent(cls)}`}>{I.print} Bulk print</Link>
              {sheet === "none" && (
                <>
                  {isSuper && (
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={!data || busy}
                      onClick={() => setConfirmNewAssessment(true)}
                    >
                      {I.plus} New Assessment
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm" disabled={!data} onClick={() => setSheet("assessment")}>Enter marks</button>
                  <button className="btn btn-primary btn-sm" disabled={!data} onClick={() => setSheet("exam")}>Enter exam</button>
                </>
              )}
            </div>
          </div>

          {loadError ? (
            <div className="card">
              <div className="empty">
                <div className="t">Couldn't load students</div>
                <div className="d">Check your connection and try again.</div>
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setFailed(false); refresh(); }}>Try again</button>
                </div>
              </div>
            </div>
          ) : !data ? (
            <LoadingRows rows={5} />
          ) : sheet === "assessment" ? (
            <AssessmentSheet cls={cls} students={students} onClose={() => { setSheet("none"); refresh(); }} />
          ) : sheet === "exam" ? (
            <ExamSheet cls={cls} students={students} onClose={() => { setSheet("none"); refresh(); }} />
          ) : students.length === 0 ? (
            <div className="card"><div className="empty"><div className="t">No students in this class</div></div></div>
          ) : (
            <div className="slist">
              {rows.map(({ s, r }) => (
                <Link key={s.id} className="srow" to={`/admin/student/${s.id}`} style={{ display: "grid" }}>
                  <div className="avatar">{initials(s.name)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="name">{s.name}</div>
                    <div className="id">{s.reg_no}</div>
                  </div>
                  <div className="stat-mini">{r?.pending ? "Pending" : r?.avg != null ? r.avg + "%" : "—"}</div>
                  <div style={{ color: "var(--ink-4)" }}>{I.arrow}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}

      <Modal
        open={confirmNewAssessment}
        title="Create new assessment?"
        message={`This creates the next Assessment for all ${CONFIG.subjects.length} subjects in ${cls}. Teachers will then fill in marks for their subject.`}
        confirmLabel={busy ? "Creating…" : "Create"}
        onConfirm={createAssessment}
        onCancel={() => { if (!busy) setConfirmNewAssessment(false); }}
      />
    </div>
  );
}
