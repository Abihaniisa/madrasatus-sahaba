import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CONFIG } from "../../lib/config";
import { getEffectiveSemester } from "../../lib/calendar";
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
            <button className="btn btn-primary" onClick={() => window.print()}>{I.print} Print {getEffectiveSemester() === 1 ? "First" : "Second"} Semester Report</button>
          </div>
          <div className="cert-print-wrapper">
            <ReportCard student={s} results={report.results} average={report.avg} pending={report.pending} assessments={data.assessments} marks={data.marks} exams={data.exams} />
          </div>
        </div>
      </div>
    </div>
  );
}

