// src/pages/admin/ExamSheet.tsx — record exam marks for one class + subject.

import { useEffect, useState } from "react";
import { supabase, amISuperAdmin } from "../../lib/supabase";
import { CONFIG } from "../../lib/config";
import type { Student } from "../../types";

type Props = {
  cls: string;
  students: Student[];
  initialSubject?: string;
  onClose: () => void;
};

export default function ExamSheet({ cls, students, initialSubject, onClose }: Props) {
  const [subject, setSubject] = useState(initialSubject || CONFIG.subjects[0]);
  const [marks, setMarks] = useState<Record<string, number | null>>({});
  const [ready, setReady] = useState(false);
  const [isSuper, setIsSuper] = useState(false);

  useEffect(() => { amISuperAdmin().then(setIsSuper); }, []);

  async function load() {
    setReady(false);
    const { data } = await supabase.from("exams").select("*")
      .eq("class_name", cls).eq("subject", subject)
      .eq("session_label", CONFIG.sessionLabel).eq("semester", CONFIG.currentSemester);
    const map: Record<string, number | null> = {};
    for (const e of (data ?? []) as any[]) map[e.student_id] = e.value;
    setMarks(map);
    setReady(true);
  }

  useEffect(() => { load(); }, [cls, subject]);

  const sorted = [...students].sort((a, b) => a.name.localeCompare(b.name));
  const recorded = sorted.filter(s => marks[s.id] != null).length;

  function onInput(sid: string, raw: string) {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, 3);
    let num = digits === "" ? null : parseInt(digits, 10);
    if (num != null && num > 100) num = 100;
    setMarks(prev => ({ ...prev, [sid]: num }));
  }

  async function onBlur(sid: string) {
    const value = marks[sid] ?? null;
    await supabase.from("exams").upsert(
      { student_id: sid, class_name: cls, subject, session_label: CONFIG.sessionLabel, semester: 1, value },
      { onConflict: "student_id,subject,session_label,semester" }
    );
  }

  async function clearExam() {
    if (!isSuper) return;
    const ok = window.confirm(`Clear the exam for ${cls} — ${subject}?\n\nThis will remove every recorded exam mark for this class, this subject, this semester.`);
    if (!ok) return;
    const ids = sorted.map(s => s.id);
    await supabase.from("exams").delete()
      .in("student_id", ids).eq("subject", subject)
      .eq("session_label", CONFIG.sessionLabel).eq("semester", CONFIG.currentSemester);
    await load();
  }

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

  if (!ready) return <div className="asheet"><div className="empty"><div className="t">Loading…</div></div></div>;

  return (
    <div className="asheet">
      <div className="asheet-head">
        <div className="row1">
          <div className="chips">
            <select className="input" style={{ maxWidth: 170 }} value={subject} onChange={e => setSubject(e.target.value)}>
              {CONFIG.subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="chip-a active" style={{ cursor: "default" }}>{CONFIG.semesterLabel} Exam</span>
            {isSuper && (
              <button className="chip-a" onClick={clearExam} style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>Clear exam</button>
            )}
          </div>
          <div className="sub" style={{ fontSize: 12, marginLeft: "auto" }}>Out of <strong>100</strong></div>
        </div>
      </div>

      <div className="asheet-sub">
        <div className="search" style={{ maxWidth: 260 }}>
          <input placeholder="Find a student" onChange={e => filter(e.target.value)} />
        </div>
        <button className="jump" onClick={jump}>Jump to first pending</button>
        <div className="prog"><span className="num">{recorded}</span> of {sorted.length} recorded</div>
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
        <button className="btn btn-primary btn-sm" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
