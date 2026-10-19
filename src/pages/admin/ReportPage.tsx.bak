import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { loadSchool, buildReport, type SchoolData } from "../../lib/data";
import { useRequireAuth } from "../../lib/auth";
import { useMode } from "../../lib/mode";
import { AdminTop } from "../../components/AdminTop";
import { I } from "../../components/Layout";
import { SemesterCertificate } from "../../components/SemesterCertificate";

export default function ReportPage() {
  const ready = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const [mode, setMode] = useMode();
  const [data, setData] = useState<SchoolData | null>(null);

  useEffect(() => { loadSchool().then(setData); }, []);

  if (!ready) return <div className="body"><div className="wrap"><div style={{ minHeight: 80 }} /></div></div>;
  if (!data) return <div className="body"><div className="wrap"><div style={{ minHeight: 80 }} /></div></div>;

  const s = data.students.find(x => x.id === id);
  if (!s) return <div className="body"><div className="wrap"><div className="empty"><div className="t">Student not found</div></div></div></div>;

  const report = buildReport(s, data.assessments, data.marks, data.exams);

  function print() {
    window.print();
  }

  return (
    <div>
      <AdminTop mode={mode} onMode={setMode} />
      <div className="body">
        <div className="wrap" style={{ maxWidth: 1160 }}>
          <div className="no-print" style={{ marginBottom: 14 }}>
            <Link className="btn btn-ghost btn-sm" to={`/admin/student/${s.id}`}>{I.back} Back</Link>
          </div>

          <div className="print-hint no-print">
            <span style={{ fontSize: 16, lineHeight: 1 }}>⚠</span>
            <div>
              <strong>Before you print:</strong> in the print dialog, set <strong>Layout to Landscape</strong> and <strong>Paper to A4</strong>.
              Otherwise the report will appear shrunken in the middle of a portrait page.
            </div>
          </div>

          <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={print}>{I.print} Print Semester Report</button>
          </div>

          <div className="cert-print-wrapper">
            <SemesterCertificate
              student={s}
              results={report.results}
              average={report.avg}
              pending={report.pending}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
