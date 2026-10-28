// src/pages/admin/ResultSheetPage.tsx — result sheet (ranked) for a class.
// Class locked from URL. Current session + semester. No pickers.

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ALL_CLASSES } from "../../lib/config";
import { loadSchool, currentSchoolSession, type SchoolData } from "../../lib/data";
import { getEffectiveSemester } from "../../lib/calendar";
import { useRequireAuth } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { I } from "../../ui/Shell";
import { DelayedSkeleton } from "../../ui/primitives";
import { ClassResultSheet } from "../../documents/ClassResultSheet";
import type { Student } from "../../types";

export default function ResultSheetPage() {
  const ready = useRequireAuth();
  const [data, setData] = useState<SchoolData | null>(null);
  const [params] = useSearchParams();
  const urlClass = params.get("class");
  const cls = (urlClass && ALL_CLASSES.includes(urlClass)) ? urlClass : (ALL_CLASSES[0] ?? "");

  useEffect(() => { loadSchool().then(setData); }, []);

  const sessionLabel = data ? currentSchoolSession(data) : "";

  const semester = getEffectiveSemester();

  const studentsInClass = useMemo<Student[]>(() => {
    if (!data) return [];
    const ids = new Set(
      data.enrollments
        .filter(e => e.class_name === cls && e.session_label === sessionLabel
          && (e.status === "active" || e.status === "repeating"))
        .map(e => e.student_id)
    );
    return data.students.filter(s => ids.has(s.id));
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
            <span className="current">Result Sheet</span>
          </div>
          <div className="phead no-print">
            <div>
              <h1>{cls} — Result Sheet</h1>
              <p className="sub">{studentsInClass.length} student{studentsInClass.length === 1 ? "" : "s"} · {sessionLabel} · Semester {semester}</p>
            </div>
            <Link to={`/admin/class/${encodeURIComponent(cls)}`} className="btn btn-ghost btn-sm">{I.back} Back to class</Link>
          </div>

          {studentsInClass.length === 0 ? (
            <div className="card"><div className="empty"><div className="t">No students enrolled</div></div></div>
          ) : (
            <>
              <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                  {I.print} Print result sheet
                </button>
              </div>

              <div className="print-hint no-print">
                <div><strong>Print setup:</strong> Portrait · A4 · Default margins.</div>
              </div>

              <div className="cert-print-wrapper">
                <ClassResultSheet
                  className={cls}
                  students={studentsInClass}
                  assessments={data.assessments}
                  marks={data.marks}
                  exams={data.exams}
                  sessionLabel={sessionLabel}
                  semester={semester}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
