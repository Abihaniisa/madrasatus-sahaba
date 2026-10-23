// src/pages/admin/ClassPage.tsx — students in a class + enter marks + new assessment.
// Super admins only: "New Assessment". All admins: "Enter marks" / "Enter exam".

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SECTIONS, CONFIG } from "../../lib/config";
import { classAverage, buildReport, loadSchool, type SchoolData } from "../../lib/data";
import { useRequireAuth, amISuperAdmin, supabase } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { I } from "../../ui/Shell";
import { Modal } from "../../ui/primitives";
import AssessmentSheet from "./AssessmentSheet";
import ExamSheet from "./ExamSheet";

export default function ClassPage() {
  const ready = useRequireAuth();
  const { cls: clsRaw } = useParams<{ cls: string }>();
  const cls = decodeURIComponent(clsRaw || "");
  const [data, setData] = useState<SchoolData | null>(null);
  const [sheet, setSheet] = useState<"none" | "assessment" | "exam">("none");
  const [isSuper, setIsSuper] = useState(false);
  const [confirmNewAssessment, setConfirmNewAssessment] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadSchool().then(setData);
    amISuperAdmin().then(setIsSuper);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const sec = SECTIONS.find(s => s.classes.includes(cls));
  if (!ready) return <div className="body"><div className="wrap"><div style={{ minHeight: 80 }} /></div></div>;
  if (!sec) return <div className="body"><div className="wrap"><div className="empty"><div className="t">Class not found</div></div></div></div>;

  const students = data?.students.filter(s => s.class_name === cls) ?? [];
  const avg = data ? classAverage(cls, data.students, data.assessments, data.marks, data.exams) : null;

  async function createAssessment() {
    setBusy(true);
    const existing = (data?.assessments ?? []).filter(
      a => a.class_name === cls && a.semester === CONFIG.currentSemester && a.session_label === CONFIG.sessionLabel
    );
    const numbers = new Set(existing.map(a => {
      const m = a.label.match(/^Assessment\s+(\d+)$/i);
      return m ? parseInt(m[1], 10) : 0;
    }));
    let next = 1;
    while (numbers.has(next)) next++;
    const label = `Assessment ${next}`;
    const rows = CONFIG.subjects.map(subject => ({
      class_name: cls, subject, label,
      max_marks: CONFIG.assessmentMax,
      session_label: CONFIG.sessionLabel, semester: 1,
    }));
    await supabase.from("assessments").insert(rows);
    setBusy(false);
    setConfirmNewAssessment(false);
    loadSchool().then(setData);
    setToast("Assessment created. You can now find it in 'Enter Marks'.");
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
              <p className="sub">{students.length} {students.length === 1 ? "student" : "students"} · Class average {avg != null ? avg + "%" : "—"}</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link className="btn btn-secondary btn-sm" to={`/admin/sheet/${encodeURIComponent(cls)}`}>{I.print} Class sheet</Link>
              {sheet === "none" && (
                <>
                  {isSuper && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setConfirmNewAssessment(true)}>{I.plus} New Assessment</button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => setSheet("assessment")}>Enter marks</button>
                  <button className="btn btn-primary btn-sm" onClick={() => setSheet("exam")}>Enter exam</button>
                </>
              )}
            </div>
          </div>

          {sheet === "assessment" ? (
            <AssessmentSheet cls={cls} students={students} onClose={() => { setSheet("none"); loadSchool().then(setData); }} />
          ) : sheet === "exam" ? (
            <ExamSheet cls={cls} students={students} onClose={() => { setSheet("none"); loadSchool().then(setData); }} />
          ) : students.length === 0 ? (
            <div className="card"><div className="empty"><div className="t">No students in this class</div></div></div>
          ) : (
            <div className="slist">
              {[...students].sort((a, b) => {
                if (!data) return a.name.localeCompare(b.name);
                const ra = buildReport(a, data.assessments, data.marks, data.exams).avg ?? -1;
                const rb = buildReport(b, data.assessments, data.marks, data.exams).avg ?? -1;
                return rb - ra;
              }).map(s => {
                const r = data ? buildReport(s, data.assessments, data.marks, data.exams) : null;
                return (
                  <Link key={s.id} className="srow" to={`/admin/student/${s.id}`} style={{ display: "grid" }}>
                    <div className="avatar">{(s.name[0] ?? "") + (s.name.split(/\s+/)[1]?.[0] ?? "")}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="name">{s.name}</div>
                      <div className="id">{s.reg_no}</div>
                    </div>
                    <div className="stat-mini">{r?.pending ? "Pending" : r?.avg != null ? r.avg + "%" : "—"}</div>
                    <div style={{ color: "var(--ink-4)" }}>{I.arrow}</div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      <Modal
        open={confirmNewAssessment}
        title="Create new assessment?"
        message={`This creates the next Assessment for all ${CONFIG.subjects.length} subjects in ${cls}. Teachers will then fill in marks for their subject.`}
        confirmLabel={busy ? "Creating…" : "Create"}
        onConfirm={createAssessment}
        onCancel={() => setConfirmNewAssessment(false)}
      />
    </div>
  );
}
