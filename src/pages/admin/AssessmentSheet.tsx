// src/pages/admin/AssessmentSheet.tsx — record assessment marks for one class + subject.
// The 3-second flow: class → subject → assessment label → marks.

import { useEffect, useMemo, useState } from "react";
import { supabase, amISuperAdmin } from "../../lib/supabase";
import { CONFIG } from "../../lib/config";
import { Modal } from "../../ui/primitives";
import type { Assessment, Mark, Student } from "../../types";

export default function AssessmentSheet({
  cls, students, onClose,
}: { cls: string; students: Student[]; onClose: () => void }) {
  const [subject, setSubject] = useState<string>(CONFIG.subjects[0]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [marks, setMarks] = useState<Record<string, number | null>>({});
  const [ready, setReady] = useState(false);
  const [isSuper, setIsSuper] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { amISuperAdmin().then(setIsSuper); }, []);

  async function load() {
    setReady(false);
    const { data } = await supabase.from("assessments").select("*")
      .eq("class_name", cls).eq("subject", subject)
      .eq("session_label", CONFIG.sessionLabel).eq("semester", CONFIG.currentSemester)
      .order("created_at");
    const list = (data as Assessment[]) ?? [];
    setAssessments(list);
    const last = list[list.length - 1];
    setActiveId(last?.id ?? null);
    if (!last) { setMarks({}); setReady(true); return; }
    const { data: mData } = await supabase.from("marks").select("*").eq("assessment_id", last.id);
    const map: Record<string, number | null> = {};
    for (const m of (mData as Mark[]) ?? []) map[m.student_id] = m.value;
    setMarks(map);
    setReady(true);
  }

  useEffect(() => { load(); }, [cls, subject]);

  async function loadMarksFor(id: string) {
    setReady(false);
    const { data } = await supabase.from("marks").select("*").eq("assessment_id", id);
    const map: Record<string, number | null> = {};
    for (const m of (data as Mark[]) ?? []) map[m.student_id] = m.value;
    setMarks(map);
    setActiveId(id);
    setReady(true);
  }

  const active = assessments.find(a => a.id === activeId) || null;
  const sorted = useMemo(() => [...students].sort((a, b) => a.name.localeCompare(b.name)), [students]);
  const recordedCount = useMemo(() => sorted.filter(s => marks[s.id] != null).length, [sorted, marks]);

  async function deleteCurrent() {
    if (!active || !isSuper) return;
    await supabase.from("assessments").delete()
      .eq("class_name", cls).eq("label", active.label)
      .eq("session_label", CONFIG.sessionLabel).eq("semester", CONFIG.currentSemester);
    setConfirmDelete(false);
    await load();
  }

  async function commit(sid: string, value: number | null) {
    if (!active) return;
    await supabase.from("marks").upsert(
      { assessment_id: active.id, student_id: sid, value },
      { onConflict: "assessment_id,student_id" }
    );
  }

  function onInput(sid: string, raw: string) {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, 3);
    const max = active?.max_marks ?? CONFIG.assessmentMax;
    let num: number | null = digits === "" ? null : parseInt(digits, 10);
    if (num != null && num > max) num = max;
    setMarks(prev => ({ ...prev, [sid]: num }));
  }

  async function onBlur(sid: string) { await commit(sid, marks[sid] ?? null); }

  function jump() {
    const el = document.querySelector(".asheet-body .arow.pending input.mark") as HTMLInputElement | null;
    if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); setTimeout(() => el.focus(), 260); }
  }

  function filter(q: string) {
    const v = q.toLowerCase().trim();
    document.querySelectorAll<HTMLElement>(".asheet-body .arow").forEach(r => {
      r.style.display = !v || (r.dataset.name ?? "").includes(v) ? "" : "none";
    });
  }

  if (!ready && assessments.length === 0) return <div className="asheet"><div className="empty"><div className="t">Loading…</div></div></div>;

  if (!active) {
    return (
      <div className="asheet">
        <div className="asheet-head">
          <div className="row1">
            <select className="input" style={{ maxWidth: 200 }} value={subject} onChange={e => setSubject(e.target.value)}>
              {CONFIG.subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="empty" style={{ padding: "44px 20px" }}>
          <div className="t">No assessments yet</div>
          <div className="d">Ask the school office to create the next assessment for this class.</div>
        </div>
        <div className="asheet-foot">
          <div />
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="asheet">
      <div className="asheet-head">
        <div className="row1">
          <div className="chips">
            <select className="input" style={{ maxWidth: 150 }} value={subject} onChange={e => setSubject(e.target.value)}>
              {CONFIG.subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {assessments.map(a => (
              <button key={a.id} className={"chip-a " + (a.id === activeId ? "active" : "")} onClick={() => loadMarksFor(a.id)}>
                {a.label}
              </button>
            ))}
          </div>
          <div className="sub" style={{ fontSize: 12, marginLeft: "auto" }}>Out of <strong>{active.max_marks}</strong></div>
        </div>
      </div>

      <div className="asheet-sub">
        <div className="search" style={{ maxWidth: 260 }}>
          <input placeholder="Find a student" onChange={e => filter(e.target.value)} />
        </div>
        <button className="jump" onClick={jump}>Jump to first pending</button>
        <div className="prog"><span className="num">{recordedCount}</span> of {sorted.length} recorded</div>
      </div>

      <div className="asheet-body">
        {sorted.map(s => {
          const v = marks[s.id];
          const filled = v != null;
          return (
            <div key={s.id} className={"arow " + (filled ? "recorded" : "pending")} data-name={s.name.toLowerCase()}>
              <div className="avatar">{(s.name[0] ?? "") + (s.name.split(/\s+/)[1]?.[0] ?? "")}</div>
              <div style={{ minWidth: 0 }}>
                <div className="sname">{s.name}</div>
                <div className="sid">{s.reg_no}</div>
              </div>
              <input className="mark" type="text" inputMode="numeric" maxLength={3}
                value={v == null ? "" : String(v)} placeholder="—"
                onChange={e => onInput(s.id, e.target.value)}
                onBlur={() => onBlur(s.id)}
                onFocus={e => e.currentTarget.select()} />
            </div>
          );
        })}
      </div>

      <div className="asheet-foot">
        <div className="sub" style={{ fontSize: 12 }}>Marks save as you type.</div>
        <div style={{ display: "flex", gap: 8 }}>
          {isSuper && <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => setConfirmDelete(true)}>Delete</button>}
          <button className="btn btn-primary btn-sm" onClick={onClose}>Done</button>
        </div>
      </div>

      <Modal open={confirmDelete} title="Delete this assessment?"
        message={active ? `Delete "${active.label}"? This will permanently remove it from ALL subjects for ${cls}, along with any marks recorded.` : ""}
        confirmLabel="Delete" tone="danger"
        onConfirm={deleteCurrent} onCancel={() => setConfirmDelete(false)} />
    </div>
  );
}
