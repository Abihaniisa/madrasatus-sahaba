// src/pages/admin/Landing.tsx — admin dashboard: search + class list + averages.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SECTIONS } from "../../lib/config";
import { classAverage, loadSchool, type SchoolData } from "../../lib/data";
import { useRequireAuth } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { I } from "../../ui/Shell";
import { DelayedSkeleton } from "../../ui/primitives";

export default function Landing() {
  const ready = useRequireAuth();
  const [data, setData] = useState<SchoolData | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => { loadSchool().then(setData); }, []);

  const matches = useMemo(() => {
    if (!data || !q.trim()) return null;
    const needle = q.toLowerCase().trim();
    return data.students
      .filter(s => {
        const nameMatch = s.name.toLowerCase().includes(needle);
        const regMatch = s.reg_no.toLowerCase().includes(needle);
        const ninMatch = s.nin ? s.nin.startsWith(needle) : false;
        return nameMatch || regMatch || ninMatch;
      })
      .slice(0, 40);
  }, [data, q]);

  if (!ready) return <div className="body"><div className="wrap"><DelayedSkeleton ready={false} rows={4} /></div></div>;

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap">
          <div className="phead">
            <div>
              <h1>Students</h1>
              <p className="sub">Browse by section and class, or search directly.</p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div className="search">
                <span className="icon">{I.search}</span>
                <input placeholder="Search by name, NIN, or Reg. No." value={q} onChange={e => setQ(e.target.value)} autoComplete="off" />
              </div>
              <Link to="/admin/student/new" className="btn btn-primary btn-sm">{I.plus} Add student</Link>
            </div>
          </div>

          {matches && (
            <div className="slist" style={{ marginTop: 8 }}>
              {matches.length === 0 ? (
                <div className="empty">
                  <div className="t">No matches</div>
                  <div className="d">Try a different name, NIN, or Reg. No.</div>
                </div>
              ) : (
                matches.map(s => (
                  <Link key={s.id} className="srow" to={`/admin/student/${s.id}`} style={{ display: "grid" }}>
                    <div className="avatar">{(s.name[0] ?? "") + (s.name.split(/\s+/)[1]?.[0] ?? "")}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="name">{s.name}</div>
                      <div className="id">{s.reg_no} · {s.class_name}</div>
                    </div>
                    <div className="stat-mini">—</div>
                    <div style={{ color: "var(--ink-4)" }}>{I.arrow}</div>
                  </Link>
                ))
              )}
            </div>
          )}

          {!q && data && (
            <div>
              {SECTIONS.map(sec => {
                const secStudents = data.students.filter(s => s.section === sec.id);
                return (
                  <div key={sec.id} className="sec-block">
                    <div className="sec-head">
                      <h2>{sec.name}{sec.inactive && <span className="pill pill-neutral" style={{ marginLeft: 8 }}>Opening soon</span>}</h2>
                      <span className="meta">{secStudents.length} {secStudents.length === 1 ? "student" : "students"}</span>
                    </div>
                    <div className="class-list">
                      {sec.classes.map(c => {
                        const count = data.students.filter(s => s.class_name === c).length;
                        const avg = sec.inactive ? null : classAverage(c, data.students, data.assessments, data.marks, data.exams);
                        if (sec.inactive) {
                          return (
                            <div key={c} className="crow" style={{ opacity: 0.55, cursor: "default" }}>
                              <div><div className="cname">{c}</div><div className="cmeta">Not yet active</div></div>
                              <div className="stats-cell"><div className="cnt">—</div><div className="lbl">Students</div></div>
                              <div className="stats-cell"><div className="cnt">—</div><div className="lbl">Average</div></div>
                              <div />
                            </div>
                          );
                        }
                        return (
                          <Link key={c} className="crow" to={`/admin/class/${encodeURIComponent(c)}`} style={{ display: "grid" }}>
                            <div><div className="cname">{c}</div><div className="cmeta">{sec.name}</div></div>
                            <div className="stats-cell"><div className="cnt">{count}</div><div className="lbl">Students</div></div>
                            <div className="stats-cell"><div className="cnt">{avg != null ? avg + "%" : "—"}</div><div className="lbl">Average</div></div>
                            <div style={{ color: "var(--ink-4)" }}>{I.arrow}</div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
