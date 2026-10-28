// src/pages/admin/LocksPanel.tsx — super-admin controls for assessment + exam locks.
// School-wide: locking Assessment 3 disables mark entry for Assessment 3 across all classes/subjects.
// Locking Quran exam disables mark entry for Quran exam across all classes.

import { useEffect, useMemo, useState } from "react";
import { CONFIG } from "../../lib/config";
import { getSettings } from "../../lib/settings";
import { getEffectiveSemester } from "../../lib/calendar";
import { supabase, isAssessmentLocked, setAssessmentLock, isExamLocked, setExamLock } from "../../lib/supabase";
import { loadSchool, currentSchoolSession, type SchoolData } from "../../lib/data";
import { I } from "../../ui/Shell";

type LabelInfo = { label: string; locked: boolean };

export default function LocksPanel() {
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  useEffect(() => { loadSchool().then(setSchoolData); }, []);
  const session = schoolData ? currentSchoolSession(schoolData) : getSettings().session_label;
  const semester = getEffectiveSemester();
  const [labels, setLabels] = useState<LabelInfo[]>([]);
  const [exams, setExams] = useState<LabelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const { data } = await supabase
      .from("assessments")
      .select("label, locked")
      .eq("session_label", session)
      .eq("semester", semester);
    const rows = (data as { label: string; locked: boolean }[]) ?? [];
    const byLabel = new Map<string, boolean[]>();
    for (const r of rows) {
      if (!byLabel.has(r.label)) byLabel.set(r.label, []);
      byLabel.get(r.label)!.push(r.locked);
    }
    const labelList: LabelInfo[] = Array.from(byLabel.entries())
      .map(([label, arr]) => ({ label, locked: arr.length > 0 && arr.every(x => x) }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    setLabels(labelList);

    const examList: LabelInfo[] = [];
    for (const subj of CONFIG.subjects) {
      examList.push({ label: subj, locked: await isExamLocked(subj, session, semester) });
    }
    setExams(examList);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function toggleAssessment(label: string, currentLocked: boolean) {
    setBusy("A:" + label);
    await setAssessmentLock(label, session, semester, !currentLocked);
    await refresh();
    setBusy(null);
  }

  async function toggleExam(subject: string, currentLocked: boolean) {
    setBusy("E:" + subject);
    await setExamLock(subject, session, semester, !currentLocked);
    await refresh();
    setBusy(null);
  }

  if (loading) return <div className="card pad"><div className="sub">Loading locks…</div></div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div className="sub" style={{ fontSize: 12.5 }}>{session} · Semester {semester}</div>
      </div>

      {labels.length === 0 && exams.every(e => !e.locked) ? (
        <div className="card pad"><div className="empty"><div className="t">No assessments created for this session</div></div></div>
      ) : (
        <>
          {labels.length > 0 && (
            <div className="card mb4" style={{ overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 13, background: "var(--muted)" }}>
                Assessments (school-wide)
              </div>
              {labels.map(l => (
                <div key={l.label} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 14 }}>{l.label}</div>
                  <button
                    className={"btn btn-sm " + (l.locked ? "btn-secondary" : "btn-ghost")}
                    disabled={busy === "A:" + l.label}
                    onClick={() => toggleAssessment(l.label, l.locked)}
                  >
                    {busy === "A:" + l.label ? "…" : l.locked ? "🔒 Locked · Unlock" : "🔓 Open · Lock"}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="card mb4" style={{ overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 13, background: "var(--muted)" }}>
              Exams (per subject, school-wide)
            </div>
            {exams.map(e => (
              <div key={e.label} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>
                <div style={{ fontSize: 14 }}>{e.label}</div>
                <button
                  className={"btn btn-sm " + (e.locked ? "btn-secondary" : "btn-ghost")}
                  disabled={busy === "E:" + e.label}
                  onClick={() => toggleExam(e.label, e.locked)}
                >
                  {busy === "E:" + e.label ? "…" : e.locked ? "🔒 Locked · Unlock" : "🔓 Open · Lock"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
