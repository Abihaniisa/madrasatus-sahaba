// src/pages/admin/DauraAssessmentSheetPage.tsx — assessment sheet for a Daura programme.
// Route: /admin/daura/:id/assessment-sheet
// Assessment picker (labels A1..AN), then renders DauraAssessmentSheet.

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useRequireAuth, supabase } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { I } from "../../ui/Shell";
import { DelayedSkeleton } from "../../ui/primitives";
import { DauraAssessmentSheet } from "../../documents/DauraAssessmentSheet";
import type { DauraAssessment, DauraMark, DauraParticipant, DauraProgram } from "../../types";

export default function DauraAssessmentSheetPage() {
  const ready = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const [program, setProgram] = useState<DauraProgram | null>(null);
  const [participants, setParticipants] = useState<DauraParticipant[]>([]);
  const [assessments, setAssessments] = useState<DauraAssessment[]>([]);
  const [marks, setMarks] = useState<DauraMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !id) return;
    (async () => {
      const [p, part, a] = await Promise.all([
        supabase.from("daura_programs").select("*").eq("id", id).maybeSingle(),
        supabase.from("daura_participants").select("*").eq("program_id", id).order("full_name"),
        supabase.from("daura_assessments").select("*").eq("program_id", id).order("created_at"),
      ]);
      setProgram((p.data as DauraProgram) ?? null);
      setParticipants((part.data as DauraParticipant[]) ?? []);
      const assList = (a.data as DauraAssessment[]) ?? [];
      setAssessments(assList);
      if (assList.length > 0) {
        const ids = assList.map(x => x.id);
        const m = await supabase.from("daura_marks").select("*").in("assessment_id", ids);
        setMarks((m.data as DauraMark[]) ?? []);
      }
      setLoading(false);
    })();
  }, [ready, id]);

  const labels = useMemo(() => {
    const set = new Set<string>();
    for (const a of assessments) if (!a.is_evaluation) set.add(a.label);
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [assessments]);

  useEffect(() => {
    if (labels.length > 0 && (!activeLabel || !labels.includes(activeLabel))) {
      setActiveLabel(labels[labels.length - 1]);
    }
  }, [labels, activeLabel]);

  if (!ready || loading) return <div className="body"><div className="wrap"><DelayedSkeleton ready={!loading} rows={5} /></div></div>;
  if (!program) return <div className="body"><div className="wrap"><div className="empty"><div className="t">Programme not found</div></div></div></div>;

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap" style={{ maxWidth: 1160 }}>
          <div className="crumb no-print">
            <Link to="/admin/daura">Daura</Link><span>/</span>
            <Link to={`/admin/daura/${program.id}`}>{program.name}</Link><span>/</span>
            <span className="current">Assessment Sheet</span>
          </div>
          <div className="phead no-print">
            <div>
              <h1>{program.name} — Assessment Sheet</h1>
              <p className="sub">{participants.length} participants · {assessments.filter(a => !a.is_evaluation).length} assessments</p>
            </div>
            <Link to={`/admin/daura/${program.id}`} className="btn btn-ghost btn-sm">{I.back} Back to programme</Link>
          </div>

          {labels.length === 0 ? (
            <div className="card"><div className="empty"><div className="t">No assessments yet</div><div className="d">Create assessments in the Marks tab first.</div></div></div>
          ) : (
            <>
              <div className="no-print" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>Assessment</div>
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
              {activeLabel && (
                <div className="cert-print-wrapper">
                  <DauraAssessmentSheet
                    program={program}
                    assessmentLabel={activeLabel}
                    participants={participants}
                    assessments={assessments}
                    marks={marks}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
