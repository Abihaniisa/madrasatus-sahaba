// src/pages/admin/AssessmentSheetPage.tsx — one assessment N × all 5 subjects × all students.
// Class locked from URL. Assessment picker only. Current session + semester.

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ALL_CLASSES } from "../../lib/config";
import { loadSchool, currentSchoolSession, type SchoolData } from "../../lib/data";
import { getEffectiveSemester } from "../../lib/calendar";
import { useRequireAuth } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { I } from "../../ui/Shell";
import { DelayedSkeleton } from "../../ui/primitives";
import { AssessmentSheetDoc } from "../../documents/AssessmentSheetDoc";
import type { Student } from "../../types";

export default function AssessmentSheetPage() {
  const ready = useRequireAuth();
  const [data, setData] = useState<SchoolData | null>(null);
  const [params] = useSearchParams();
  const urlClass = params.get("class");
  const cls = (urlClass && ALL_CLASSES.includes(urlClass)) ? urlClass : (ALL_CLASSES[0] ?? "");
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  useEffect(() => { loadSchool().then(setData); }, []);

  const sessionLabel = data ? currentSchoolSession(data) : "";

  const semester = getEffectiveSemester();

  // Distinct assessment labels for this class+session+semester
  const labels = useMemo(() => {
    if (!data) return [] as string[];
    const set = new Set<string>();
    for (const a of data.assessments) {
      if (a.class_name !== cls) continue;
      if (a.session_label !== sessionLabel) continue;
      if (a.semester !== semester) continue;
      set.add(a.label);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [data, cls, sessionLabel, semester]);

  useEffect(() => {
    if (labels.length > 0 && (!activeLabel || !labels.includes(activeLabel))) {
      setActiveLabel(labels[labels.length - 1]);
    }
  }, [labels, activeLabel]);

  const studentsInClass = useMemo<Student[]>(() => {
    if (!data) return [];
    const ids = new Set(
      data.enrollments
        .filter(e => e.class_name === cls && e.session_label === sessionLabel
          && (e.status === "active" || e.status === "repeating"))
        .map(e => e.student_id)
    );
    return data.students.filter(s => ids.has(s.id)).sort((a, b) => a.reg_no.localeCompare(b.reg_no));
  }, [data, cls, sessionLabel]);

  if (!ready || !data) return <div className="body"><div className="wrap"><DelayedSkeleton ready={!!data} rows={5} /></div></div>;

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap" style={{ maxWidth: 1160 }}>
          <div className="crumb no-print">
            <Link to="/admin">Students</Link><span>/</span>
            <Link to={`/admin/class/${encodeURIComponent(cls)}`}>{cls}</Link><span>/</span>
            <span className="current">Assessment Sheet</span>
          </div>
          <div className="phead no-print">
            <div>
              <h1>{cls} — Assessment Sheet</h1>
              <p className="sub">{studentsInClass.length} student{studentsInClass.length === 1 ? "" : "s"} · {sessionLabel} · Semester {semester}</p>
            </div>
            <Link to={`/admin/class/${encodeURIComponent(cls)}`} className="btn btn-ghost btn-sm">{I.back} Back to class</Link>
          </div>

          {labels.length === 0 ? (
            <div className="card"><div className="empty"><div className="t">No assessments created for this class</div><div className="d">Create assessments in Manage → Assessments.</div></div></div>
          ) : (
            <>
              <div className="no-print" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>
                  Assessment
                </div>
                <div className="chip-line" style={{ marginBottom: 0 }}>
                  {labels.map(l => (
                    <button key={l} className={"chip-f " + (activeLabel === l ? "active" : "")} onClick={() => setActiveLabel(l)}>{l}</button>
                  ))}
                </div>
              </div>

              <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} disabled={!activeLabel}>
                  {I.print} Print sheet
                </button>
              </div>

              <div className="print-hint no-print">
                <div><strong>Print setup:</strong> Landscape · A4 · Default margins.</div>
              </div>

              {activeLabel && studentsInClass.length === 0 ? (
                <div className="card"><div className="empty"><div className="t">No students enrolled in this class</div><div className="d">Enroll a student in {cls} for {sessionLabel} to see the sheet.</div></div></div>
              ) : activeLabel ? (
                <div className="cert-print-wrapper">
                  <AssessmentSheetDoc
                    className={cls}
                    assessmentLabel={activeLabel}
                    students={studentsInClass}
                    assessments={data.assessments}
                    marks={data.marks}
                    sessionLabel={sessionLabel}
                    semester={semester}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
