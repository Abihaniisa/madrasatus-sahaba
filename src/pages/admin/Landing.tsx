// src/pages/admin/Landing.tsx — admin dashboard: search + class list + averages.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SECTIONS } from "../../lib/config";
import { classAverage, loadSchool, graduatedBySectionAndYear, type SchoolData } from "../../lib/data";
import { useRequireAuth } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { I } from "../../ui/Shell";
import { DelayedSkeleton } from "../../ui/primitives";

let schoolCache: { at: number; data: SchoolData } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;
const GIVE_UP_MS = 15000;
const MAX_RESULTS = 40;

function cachedSchool(): SchoolData | null {
  return schoolCache && Date.now() - schoolCache.at < CACHE_TTL_MS ? schoolCache.data : null;
}

function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function Landing() {
  const ready = useRequireAuth();
  const [data, setData] = useState<SchoolData | null>(cachedSchool);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [q, setQ] = useState("");

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
    if (!ready || data || failed) return;
    const t = setTimeout(() => setFailed(true), GIVE_UP_MS);
    return () => clearTimeout(t);
  }, [ready, data, failed, attempt]);

  const query = q.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!data || !query) return null;
    const all = data.students.filter(s => {
      const nameMatch = (s.name ?? "").toLowerCase().includes(query);
      const regMatch = (s.reg_no ?? "").toLowerCase().includes(query);
      const ninMatch = s.nin ? s.nin.toLowerCase().startsWith(query) : false;
      return nameMatch || regMatch || ninMatch;
    });
    return { list: all.slice(0, MAX_RESULTS), total: all.length };
  }, [data, query]);

  const overview = useMemo(() => {
    if (!data) return null;
    const classCounts = new Map<string, number>();
    for (const s of data.students) {
      classCounts.set(s.class_name, (classCounts.get(s.class_name) ?? 0) + 1);
    }
    const sectionCounts = SECTIONS.map(sec => data.students.filter(s => s.section === sec.id).length);
    const averages = new Map<string, ReturnType<typeof classAverage>>();
    for (const sec of SECTIONS) {
      if (sec.inactive) continue;
      for (const c of sec.classes) {
        let avg: ReturnType<typeof classAverage>;
        try {
          avg = classAverage(c, data.students, data.assessments, data.marks, data.exams);
        } catch {
          avg = null as ReturnType<typeof classAverage>;
        }
        averages.set(c, avg);
      }
    }
    return { classCounts, sectionCounts, averages };
  }, [data]);

  if (!ready) {
    return <div className="body"><div className="wrap"><DelayedSkeleton ready={false} rows={4} /></div></div>;
  }

  const loading = !data && !failed;
  const loadError = !data && failed;

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
                <input
                  placeholder="Search by name, NIN, or Reg. No."
                  aria-label="Search students by name, NIN, or registration number"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  onKeyDown={e => { if (e.key === "Escape") setQ(""); }}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <Link to="/admin/student/new" className="btn btn-primary btn-sm">{I.plus} Add student</Link>
            </div>
          </div>

          {loading && <DelayedSkeleton ready={false} rows={4} />}

          {loadError && (
            <div className="card" style={{ marginTop: 8 }}>
              <div className="empty">
                <div className="t">Couldn't load students</div>
                <div className="d">Check your connection and try again.</div>
                <div style={{ marginTop: 12 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setFailed(false); setAttempt(a => a + 1); }}
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {matches && (
            <div className="slist" style={{ marginTop: 8 }}>
              {matches.list.length === 0 ? (
                <div className="empty">
                  <div className="t">No matches</div>
                  <div className="d">Try a different name, NIN, or Reg. No.</div>
                </div>
              ) : (
                <>
                  {matches.list.map(s => (
                    <Link key={s.id} className="srow" to={`/admin/student/${s.id}`} style={{ display: "grid" }}>
                      <div className="avatar">{initials(s.name)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="name">{s.name}</div>
                        <div className="id">{s.reg_no} · {s.class_name}</div>
                      </div>
                      <div className="stat-mini">—</div>
                      <div style={{ color: "var(--ink-4)" }}>{I.arrow}</div>
                    </Link>
                  ))}
                  {matches.total > matches.list.length && (
                    <div className="d" style={{ padding: "10px 4px", color: "var(--ink-4)", fontSize: 13 }}>
                      Showing the first {matches.list.length} of {matches.total} matches. Keep typing to narrow it down.
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!query && data && overview && (
            <div>
              {SECTIONS.map((sec, i) => {
                const secCount = overview.sectionCounts[i] ?? 0;
                return (
                  <div key={sec.id} className="sec-block">
                    <div className="sec-head">
                      <h2>{sec.name}{sec.inactive && <span className="pill pill-neutral" style={{ marginLeft: 8 }}>Opening soon</span>}</h2>
                      <span className="meta">{secCount} {secCount === 1 ? "student" : "students"}</span>
                    </div>
                    <div className="class-list">
                      {sec.classes.map(c => {
                        if (sec.inactive) {
                          return (
                            <div key={c} className="crow" style={{ opacity: 0.55, cursor: "default" }} aria-disabled="true">
                              <div><div className="cname">{c}</div><div className="cmeta">Not yet active</div></div>
                              <div className="stats-cell"><div className="cnt">—</div><div className="lbl">Students</div></div>
                              <div className="stats-cell"><div className="cnt">—</div><div className="lbl">Average</div></div>
                              <div />
                            </div>
                          );
                        }
                        const count = overview.classCounts.get(c) ?? 0;
                        const avg = overview.averages.get(c);
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
                    {(() => {
                      const gradMap = graduatedBySectionAndYear(data);
                      const years = gradMap[sec.name] ?? {};
                      const yearKeys = Object.keys(years).sort().reverse();
                      if (yearKeys.length === 0) return null;
                      return (
                        <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--muted)", border: "1px solid var(--line)", borderRadius: "var(--r-2)" }}>
                          <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>
                            Graduated
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {yearKeys.map(y => (
                              <Link
                                key={y}
                                to={`/admin/graduated/${encodeURIComponent(sec.name)}/${encodeURIComponent(y)}`}
                                className="chip-f"
                                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                              >
                                Class of {y} · {years[y].length}
                              </Link>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
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
