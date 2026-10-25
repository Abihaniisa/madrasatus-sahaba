// src/pages/admin/EditMarks.tsx — historical mark editing.
// Current session: any admin. Past session: super admin only.
// Class chips = only classes that have at least one enrollment (attended classes).

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CONFIG, ALL_CLASSES } from "../../lib/config";
import { loadSchool, type SchoolData } from "../../lib/data";
import { useRequireAuth, amISuperAdmin, supabase } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { DelayedSkeleton } from "../../ui/primitives";
import type { Assessment } from "../../types";

type SessionOption = { session: string; semester: 1 | 2; key: string };
type Mode = "assessment" | "exam";

export default function EditMarks() {
  const { id: studentIdParam } = useParams<{ id?: string }>();
  const ready = useRequireAuth();
  const [data, setData] = useState<SchoolData | null>(null);
  const [isSuper, setIsSuper] = useState(false);
  const [cls, setCls] = useState<string>("");
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [subject, setSubject] = useState<string>(CONFIG.subjects[0]);
  const [mode, setMode] = useState<Mode>("assessment");
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadSchool().then(setData);
    amISuperAdmin().then(setIsSuper);
  }, []);

  const attendedClasses = useMemo<string[]>(() => {
    if (!data) return [];
    const seen = new Set<string>();
    for (const s of data.students) if (s.class_name) seen.add(s.class_name);
    for (const a of data.assessments) if (a.class_name) seen.add(a.class_name);
    for (const e of data.exams) if (e.class_name) seen.add(e.class_name);
    return ALL_CLASSES.filter(c => seen.has(c));
  }, [data]);

  useEffect(() => {
    if (!cls && attendedClasses.length > 0) setCls(attendedClasses[0]);
  }, [attendedClasses, cls]);

  const sessionOptions: SessionOption[] = useMemo(() => {
    if (!data || !cls) return [];
    const set = new Map<string, SessionOption>();
    for (const a of data.assessments) {
      if (a.class_name !== cls) continue;
      const key = `${a.session_label}|${a.semester}`;
      if (!set.has(key)) set.set(key, { session: a.session_label, semester: (a.semester === 2 ? 2 : 1) as 1 | 2, key });
    }
    for (const e of data.exams) {
      if (e.class_name !== cls) continue;
      const key = `${e.session_label}|${e.semester}`;
      if (!set.has(key)) set.set(key, { session: e.session_label, semester: (e.semester === 2 ? 2 : 1) as 1 | 2, key });
    }
    if (set.size === 0 && cls) {
      set.set(`${CONFIG.sessionLabel}|${CONFIG.currentSemester}`, { session: CONFIG.sessionLabel, semester: CONFIG.currentSemester as 1 | 2, key: `${CONFIG.sessionLabel}|${CONFIG.currentSemester}` });
    }
    return Array.from(set.values()).sort((a, b) => {
      const s = a.session.localeCompare(b.session);
      return s !== 0 ? s : a.semester - b.semester;
    });
  }, [data, cls]);

  const activeSession = sessionOptions.find(s => s.key === sessionKey) ?? sessionOptions[sessionOptions.length - 1] ?? null;

  useEffect(() => {
    if (sessionOptions.length > 0 && !sessionOptions.find(s => s.key === sessionKey)) {
      setSessionKey(sessionOptions[sessionOptions.length - 1].key);
    }
  }, [sessionOptions, sessionKey]);

  const isHistorical = activeSession
    ? !(activeSession.session === CONFIG.sessionLabel && activeSession.semester === CONFIG.currentSemester)
    : false;
  const canEdit = isSuper || !isHistorical;

  const classAssessments: Assessment[] = useMemo(() => {
    if (!data || !activeSession || !cls) return [];
    return data.assessments
      .filter(a => a.class_name === cls && a.session_label === activeSession.session && a.semester === activeSession.semester && a.subject === subject)
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [data, cls, activeSession, subject]);

  useEffect(() => {
    if (mode === "assessment" && classAssessments.length > 0) {
      if (!classAssessments.find(a => a.id === assessmentId)) {
        setAssessmentId(classAssessments[classAssessments.length - 1].id);
      }
    }
  }, [classAssessments, assessmentId, mode]);

  const studentsInClass = useMemo(() => {
    if (!data || !cls) return [];
    const list = data.students.filter(s => s.class_name === cls);
    const filtered = studentIdParam ? list.filter(s => s.id === studentIdParam) : list;
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [data, cls, studentIdParam]);

  if (!ready) return <div className="body"><div className="wrap"><DelayedSkeleton ready={ready} rows={5} /></div></div>;
  if (!data) return <div className="body"><div className="wrap"><DelayedSkeleton ready={!!data} rows={5} /></div></div>;

  if (attendedClasses.length === 0) {
    return (
      <div>
        <AdminTop />
        <div className="body">
          <div className="wrap">
            <div className="card"><div className="empty">
              <div className="t">No classes with records yet</div>
              <div className="d">Once students are enrolled in any class, it will appear here.</div>
            </div></div>
          </div>
        </div>
      </div>
    );
  }

  const activeAssessment = classAssessments.find(a => a.id === assessmentId) ?? null;

  function markFor(studentId: string): number | null {
    if (!data || !activeSession) return null;
    if (mode === "assessment" && activeAssessment) {
      const m = data.marks.find(x => x.assessment_id === activeAssessment.id && x.student_id === studentId);
      return m?.value ?? null;
    }
    if (mode === "exam") {
      const e = data.exams.find(x =>
        x.student_id === studentId &&
        x.subject === subject &&
        x.class_name === cls &&
        x.session_label === activeSession.session &&
        x.semester === activeSession.semester
      );
      return e?.value ?? null;
    }
    return null;
  }

  async function saveMark(studentId: string, raw: string) {
    if (!activeSession || !canEdit || !data) return;
    const digits = raw.replace(/[^0-9]/g, "");
    const max = mode === "assessment" ? (activeAssessment?.max_marks ?? 10) : 100;
    let num = digits === "" ? null : parseInt(digits, 10);
    if (num != null && num > max) num = max;
    setSaving(studentId);
    try {
      if (mode === "assessment" && activeAssessment) {
        const old = data.marks.find(x => x.assessment_id === activeAssessment.id && x.student_id === studentId);
        await supabase.from("marks").upsert(
          { assessment_id: activeAssessment.id, student_id: studentId, value: num },
          { onConflict: "assessment_id,student_id" }
        );
        await supabase.from("edit_log").insert({
          edited_by: (await supabase.auth.getSession()).data.session?.user.email ?? "unknown",
          table_name: "marks",
          row_id: old?.id ?? `${activeAssessment.id}:${studentId}`,
          old_value: old ? { value: old.value } : null,
          new_value: { value: num },
        });
      } else if (mode === "exam") {
        const old = data.exams.find(x =>
          x.student_id === studentId &&
          x.subject === subject &&
          x.class_name === cls &&
          x.session_label === activeSession.session &&
          x.semester === activeSession.semester
        );
        await supabase.from("exams").upsert(
          {
            student_id: studentId, subject, class_name: cls,
            session_label: activeSession.session, semester: activeSession.semester,
            value: num,
          },
          { onConflict: "student_id,subject,session_label,semester" }
        );
        await supabase.from("edit_log").insert({
          edited_by: (await supabase.auth.getSession()).data.session?.user.email ?? "unknown",
          table_name: "exams",
          row_id: old?.id ?? `${studentId}:${subject}:${activeSession.session}:${activeSession.semester}`,
          old_value: old ? { value: old.value } : null,
          new_value: { value: num },
        });
      }
      const fresh = await loadSchool();
      setData(fresh);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap" style={{ maxWidth: 1000 }}>
          <div className="crumb">
            <Link to="/admin">Students</Link><span>/</span>
            <span className="current">Edit marks</span>
          </div>
          <div className="phead">
            <div>
              <h1>Edit marks</h1>
              <p className="sub">
                {isHistorical
                  ? "Historical session — super admin only."
                  : "Current session — any admin can edit."}
              </p>
            </div>
            {isHistorical && !isSuper && <span className="pill pill-warning">Read-only for your role</span>}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>Class</div>
            <div className="chip-line" style={{ marginBottom: 0 }}>
              {attendedClasses.map(c => (
                <button key={c} className={"chip-f " + (cls === c ? "active" : "")} onClick={() => { setCls(c); setSessionKey(null); }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {activeSession && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>Session</div>
              <div className="chip-line" style={{ marginBottom: 0 }}>
                {sessionOptions.map(s => (
                  <button key={s.key} className={"chip-f " + (sessionKey === s.key ? "active" : "")} onClick={() => setSessionKey(s.key)}>
                    {s.session} · S{s.semester}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>Subject</div>
            <div className="chip-line" style={{ marginBottom: 0 }}>
              {CONFIG.subjects.map(s => (
                <button key={s} className={"chip-f " + (subject === s ? "active" : "")} onClick={() => setSubject(s)}>{s}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>Mode</div>
            <div className="chip-line" style={{ marginBottom: 0 }}>
              <button className={"chip-f " + (mode === "assessment" ? "active" : "")} onClick={() => setMode("assessment")}>Assessment</button>
              <button className={"chip-f " + (mode === "exam" ? "active" : "")} onClick={() => setMode("exam")}>Exam</button>
            </div>
          </div>

          {mode === "assessment" && classAssessments.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>Assessment</div>
              <div className="chip-line" style={{ marginBottom: 0 }}>
                {classAssessments.map((a, i) => (
                  <button key={a.id} className={"chip-f " + (assessmentId === a.id ? "active" : "")} onClick={() => setAssessmentId(a.id)}>A{i + 1}</button>
                ))}
              </div>
            </div>
          )}

          {mode === "assessment" && classAssessments.length === 0 && (
            <div className="card pad mb4"><p className="sub">No assessments exist for {cls} · {subject} · {activeSession?.session} S{activeSession?.semester}.</p></div>
          )}

          {studentsInClass.length === 0 ? (
            <div className="card"><div className="empty"><div className="t">No students in this class</div></div></div>
          ) : (
            <div className="asheet">
              <div className="asheet-head">
                <div className="row1">
                  <div className="sub" style={{ fontSize: 12 }}>
                    {cls} · {subject} · {mode === "assessment" ? (activeAssessment?.label ?? "—") : "Exam"} · Out of{" "}
                    <strong>{mode === "assessment" ? (activeAssessment?.max_marks ?? 10) : 100}</strong>
                  </div>
                  {!canEdit && <span className="pill pill-warning">Read-only</span>}
                </div>
              </div>
              <div className="asheet-body">
                {studentsInClass.map(s => {
                  const v = markFor(s.id);
                  const busy = saving === s.id;
                  return (
                    <div key={s.id} className={"arow " + (v != null ? "recorded" : "pending")}>
                      <div className="avatar">{(s.name[0] ?? "") + (s.name.split(/\s+/)[1]?.[0] ?? "")}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="sname">{s.name}</div>
                        <div className="sid">{s.reg_no}</div>
                      </div>
                      <input
                        key={`${subject}|${mode}|${assessmentId ?? "none"}|${s.id}|${v ?? "null"}`}
                        className="mark"
                        type="text"
                        inputMode="numeric"
                        maxLength={3}
                        defaultValue={v == null ? "" : String(v)}
                        placeholder="—"
                        disabled={!canEdit || busy}
                        onBlur={e => { if (canEdit) saveMark(s.id, e.target.value); }}
                        onFocus={e => e.currentTarget.select()}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="asheet-foot">
                <div className="sub" style={{ fontSize: 12 }}>
                  Edits save on blur. Every change is logged with your email, timestamp, and old/new value.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
