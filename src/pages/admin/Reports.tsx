import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CONFIG } from "../../lib/config";
import { loadSchool, buildReport, type SchoolData } from "../../lib/data";
import { useRequireAuth } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { I } from "../../ui/Shell";
import { ReportCard } from "../../documents/ReportCard";

export function ReportPage() {
  const ready = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SchoolData | null>(null);
  useEffect(() => { loadSchool().then(setData); }, []);

  if (!ready) return <div className="body"><div className="wrap"><div style={{ minHeight: 80 }} /></div></div>;
  if (!data) return <div className="body"><div className="wrap"><div style={{ minHeight: 80 }} /></div></div>;
  const s = data.students.find(x => x.id === id);
  if (!s) return <div className="body"><div className="wrap"><div className="empty"><div className="t">Student not found</div></div></div></div>;
  const report = buildReport(s, data.assessments, data.marks, data.exams);

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap" style={{ maxWidth: 1160 }}>
          <div className="no-print" style={{ marginBottom: 14 }}>
            <Link className="btn btn-ghost btn-sm" to={`/admin/student/${s.id}`}>{I.back} Back</Link>
          </div>
          <div className="print-hint no-print">
            <div>
              <strong>Print setup</strong>
              <ul style={{ margin: "6px 0 0 0", paddingLeft: 18, lineHeight: 1.6 }}>
                <li>Layout — <strong>Landscape</strong></li>
                <li>Paper — <strong>A4</strong></li>
              </ul>
            </div>
          </div>
          <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={() => window.print()}>{I.print} Print {CONFIG.currentSemester === 1 ? "First" : "Second"} Semester Report</button>
          </div>
          <div className="cert-print-wrapper">
            <ReportCard student={s} results={report.results} average={report.avg} pending={report.pending} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SheetPage() {
  const ready = useRequireAuth();
  const { cls: clsRaw } = useParams<{ cls: string }>();
  const cls = decodeURIComponent(clsRaw || "");
  const [data, setData] = useState<SchoolData | null>(null);
  const [subject, setSubject] = useState<string>(CONFIG.subjects[0]);
  useEffect(() => { loadSchool().then(setData); }, []);

  if (!ready) return <div className="body"><div className="wrap"><div style={{ minHeight: 80 }} /></div></div>;
  if (!data) return <div className="body"><div className="wrap"><div style={{ minHeight: 80 }} /></div></div>;

  const students = [...data.students.filter(s => s.class_name === cls)].sort((a, b) => a.name.localeCompare(b.name));
  const assessments = data.assessments
    .filter(a => a.class_name === cls && a.subject === subject && a.session_label === CONFIG.sessionLabel && a.semester === CONFIG.currentSemester)
    .sort((a, b) => parseInt(a.label.match(/(\d+)/)?.[1] ?? "0", 10) - parseInt(b.label.match(/(\d+)/)?.[1] ?? "0", 10));
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  function markFor(sid: string, aid: string): number | null {
    const m = data!.marks.find(x => x.assessment_id === aid && x.student_id === sid);
    return m?.value ?? null;
  }
  function subjectAvg(sid: string): number | null {
    if (!assessments.length) return null;
    let sum = 0, counted = 0;
    for (const a of assessments) {
      const v = markFor(sid, a.id);
      if (v == null) return null;
      sum += v / a.max_marks; counted++;
    }
    return counted ? Math.round((sum / counted) * 10000) / 100 : null;
  }

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap">
          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <Link className="btn btn-ghost btn-sm" to={`/admin/class/${encodeURIComponent(cls)}`}>{I.back} Back to class</Link>
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>{I.print} Print</button>
          </div>
          <div className="chip-line no-print" style={{ marginBottom: 16 }}>
            {CONFIG.subjects.map(subj => <button key={subj} className={"chip-f " + (subject === subj ? "active" : "")} onClick={() => setSubject(subj)}>{subj}</button>)}
          </div>
          <div className="rc rc-landscape sheet-print">
            <div className="rc-head">
              <div className="s">{CONFIG.name}</div>
              <h2>Assessment Sheet · {subject}</h2>
              <div className="sub" style={{ marginTop: 4, fontSize: 12 }}>{cls} · {CONFIG.sessionLabel} · {CONFIG.semesterLabel}</div>
            </div>
            {students.length === 0 ? (
              <div className="empty"><div className="t">No students in this class</div></div>
            ) : (
              <>
                {assessments.length === 0 && (
                  <div className="sub" style={{ textAlign: "center", marginBottom: 12, fontSize: 12 }}>No assessments recorded for {subject} yet.</div>
                )}
                <div className="sheet-scroll">
                  <table className="rt table-land sheet-table">
                    <thead><tr>
                      <th style={{ width: 34 }}>#</th>
                      <th style={{ minWidth: 160, textAlign: "left" }}>Student</th>
                      {assessments.map((a, i) => <th key={a.id} className="assess" style={{ textAlign: "right", minWidth: 48 }}>A{i + 1}</th>)}
                      <th style={{ textAlign: "right", minWidth: 60 }}>Avg %</th>
                    </tr></thead>
                    <tbody>
                      {students.map((s, i) => {
                        const avg = subjectAvg(s.id);
                        return (
                          <tr key={s.id}>
                            <td className="n" style={{ color: "var(--ink-3)" }}>{i + 1}</td>
                            <td className="s">{s.name}</td>
                            {assessments.map(a => {
                              const v = markFor(s.id, a.id);
                              return <td key={a.id} className="n">{v == null ? "—" : v}</td>;
                            })}
                            <td className="n" style={{ fontWeight: 600 }}>{avg != null ? avg.toFixed(1) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="rc-foot">
              <div>{students.length} students · {assessments.length} assessments · Issued {today}</div>
              <div className="rc-sign"><div>Subject Teacher</div><div>Head of School</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
