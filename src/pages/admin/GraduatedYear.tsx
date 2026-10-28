// src/pages/admin/GraduatedYear.tsx — list of graduates for a section + year.
// Route: /admin/graduated/:section/:year  (year like "2025/2026")
// Click a graduate → /admin/student/:id (existing StudentPage).

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { loadSchool, buildReport, graduatedBySectionAndYear, type SchoolData } from "../../lib/data";
import { useRequireAuth } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { I } from "../../ui/Shell";
import { DelayedSkeleton } from "../../ui/primitives";

export default function GraduatedYear() {
  const ready = useRequireAuth();
  const { section, year } = useParams<{ section: string; year: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SchoolData | null>(null);

  useEffect(() => { loadSchool().then(setData); }, []);

  const sectionName = section ? decodeURIComponent(section) : "";
  const yearLabel = year ? decodeURIComponent(year) : "";

  const students = useMemo(() => {
    if (!data) return [];
    const map = graduatedBySectionAndYear(data);
    return map[sectionName]?.[yearLabel] ?? [];
  }, [data, sectionName, yearLabel]);

  const rows = useMemo(() => {
    return students.map(s => {
      let avg: number | null = null;
      try {
        avg = buildReport(s, data!.assessments, data!.marks, data!.exams, undefined, yearLabel, s.class_name, data!.enrollments).avg;
      } catch { avg = null; }
      const lastEnr = data!.enrollments
        .filter(e => e.student_id === s.id && (e.status === "completed" || e.status === "graduated"))
        .sort((a, b) => b.session_label.localeCompare(a.session_label))[0];
      return { s, avg, fromClass: lastEnr?.class_name ?? s.class_name };
    }).sort((a, b) => (a.s.reg_no).localeCompare(b.s.reg_no));
  }, [students, data, yearLabel]);

  if (!ready || !data) return <div className="body"><div className="wrap"><DelayedSkeleton ready={!!data} rows={5} /></div></div>;

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap">
          <div className="crumb">
            <Link to="/admin">Students</Link><span>/</span>
            <span className="current">{sectionName} · Class of {yearLabel}</span>
          </div>
          <div className="phead">
            <div>
              <h1>{sectionName} — Class of {yearLabel}</h1>
              <p className="sub">{rows.length} graduate{rows.length === 1 ? "" : "s"}</p>
            </div>
            <Link to="/admin" className="btn btn-ghost btn-sm">{I.back} Back to dashboard</Link>
          </div>

          {rows.length === 0 ? (
            <div className="card"><div className="empty"><div className="t">No graduates in this class</div></div></div>
          ) : (
            <div className="slist">
              {rows.map(({ s, avg, fromClass }) => (
                <button key={s.id} onClick={() => navigate(`/admin/student/${s.id}`)} className="srow" style={{ display: "grid", border: 0, textAlign: "left", width: "100%", cursor: "pointer", background: "none", color: "inherit", font: "inherit" }}>
                  <div className="avatar">{(s.name[0] ?? "") + (s.name.split(/\s+/)[1]?.[0] ?? "")}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="name">{s.name}</div>
                    <div className="id">{s.reg_no} · {fromClass}</div>
                  </div>
                  <div className="stat-mini">{avg != null ? avg.toFixed(1) + "%" : "—"}</div>
                  <div style={{ color: "var(--ink-4)" }}>{I.arrow}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
