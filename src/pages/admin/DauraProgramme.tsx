import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useRequireAuth, amISuperAdmin, supabase, deleteDauraProgramme } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { DelayedSkeleton, Modal } from "../../ui/primitives";
import { I } from "../../ui/Shell";
import { loadSchool, type SchoolData } from "../../lib/data";
import { DauraReport } from "../../documents/DauraReport";
import { DauraAssessmentReport } from "../../documents/DauraAssessmentReport";
import type { DauraProgram, DauraParticipant, DauraAssessment, DauraMark, Student } from "../../types";

type Tab = "participants" | "marks" | "report";

export default function DauraProgrammePage() {
  const ready = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const [program, setProgram] = useState<DauraProgram | null>(null);
  const [participants, setParticipants] = useState<DauraParticipant[]>([]);
  const [assessments, setAssessments] = useState<DauraAssessment[]>([]);
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("participants");
  const [historyFor, setHistoryFor] = useState<DauraParticipant | null>(null);
  const [isSuper, setIsSuper] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { amISuperAdmin().then(setIsSuper); }, []);

  async function refreshAll(pid: string) {
    const [p, part, a, s] = await Promise.all([
      supabase.from("daura_programs").select("*").eq("id", pid).maybeSingle(),
      supabase.from("daura_participants").select("*").eq("program_id", pid).order("external").order("full_name"),
      supabase.from("daura_assessments").select("*").eq("program_id", pid).order("created_at"),
      loadSchool(),
    ]);
    setProgram((p.data as DauraProgram) ?? null);
    setParticipants((part.data as DauraParticipant[]) ?? []);
    setAssessments((a.data as DauraAssessment[]) ?? []);
    setSchool(s);
    setLoading(false);
  }

  useEffect(() => { if (ready && id) refreshAll(id); }, [ready, id]);

  async function handleDelete() {
    if (!program) return;
    setDeleting(true);
    const res = await deleteDauraProgramme(program.id);
    setDeleting(false);
    setConfirmDelete(false);
    if (res.error) { window.alert("Delete failed: " + res.error); return; }
    window.location.href = "/admin/daura";
  }

  async function toggleStatus() {
    if (!program) return;
    await supabase.from("daura_programs").update({ status: program.status === "open" ? "closed" : "open" }).eq("id", program.id);
    refreshAll(program.id);
  }

  if (!ready || loading) return <div className="body"><div className="wrap"><DelayedSkeleton ready={!loading} rows={4} /></div></div>;
  if (!program) return <div className="body"><div className="wrap"><div className="empty"><div className="t">Programme not found</div></div></div></div>;

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap">
          <div className="crumb">
            <Link to="/admin">Portal</Link><span>/</span>
            <Link to="/admin/daura">Daura</Link><span>/</span>
            <span className="current">{program.name}</span>
          </div>
          <div className="phead">
            <div>
              <h1>{program.name}</h1>
              <p className="sub">
                {program.start_date || "no start"} {program.end_date ? `→ ${program.end_date}` : ""} · {participants.length} participant{participants.length === 1 ? "" : "s"} ·{" "}
                <span className={"pill pill-dot " + (program.status === "open" ? "pill-success" : "pill-neutral")}>
                  {program.status === "open" ? "Open" : "Closed"}
                </span>
              </p>
            </div>
            {isSuper && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link to={`/admin/daura/${program.id}/assessment-sheet`} className="btn btn-secondary btn-sm">
                  {I.print} Assessment Sheet
                </Link>
                <button className={"btn btn-sm " + (program.status === "open" ? "btn-secondary" : "btn-primary")} onClick={toggleStatus}>
                  {program.status === "open" ? "Close programme" : "Reopen"}
                </button>
                <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => setConfirmDelete(true)}>
                  Delete programme
                </button>
              </div>
            )}
          </div>
          <div className="chip-line no-print">
            <button className={"chip-f " + (tab === "participants" ? "active" : "")} onClick={() => setTab("participants")}>Participants</button>
            <button className={"chip-f " + (tab === "marks" ? "active" : "")} onClick={() => setTab("marks")}>Marks</button>
            <button className={"chip-f " + (tab === "report" ? "active" : "")} onClick={() => setTab("report")}>Report</button>
          </div>
          {tab === "participants" && (
            <ParticipantsTab program={program} participants={participants} school={school} isSuper={isSuper}
              onChange={() => refreshAll(program.id)} onOpenHistory={(p) => setHistoryFor(p)} />
          )}
          {tab === "marks" && (
            <MarksTab program={program} participants={participants} assessments={assessments} isSuper={isSuper}
              onChange={() => refreshAll(program.id)} />
          )}
          {tab === "report" && (
            <ReportTab program={program} participants={participants} assessments={assessments} />
          )}
        </div>
      </div>
      <Modal
        open={confirmDelete}
        title="Delete this programme?"
        message={program ? `Delete "${program.name}"? This permanently removes ${assessments.length} assessment${assessments.length === 1 ? "" : "s"}, ${participants.length} participant${participants.length === 1 ? "" : "s"}, and all recorded marks. This cannot be undone.` : ""}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      {historyFor && <HistoryPanel participant={historyFor} onClose={() => setHistoryFor(null)} />}
    </div>
  );
}

function ParticipantsTab({ program, participants, school, isSuper, onChange, onOpenHistory }: {
  program: DauraProgram; participants: DauraParticipant[]; school: SchoolData | null;
  isSuper: boolean; onChange: () => void; onOpenHistory: (p: DauraParticipant) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [externalOpen, setExternalOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "students" | "external">("all");
  const shown = participants.filter(p => filter === "all" ? true : filter === "students" ? !p.external : p.external);

  return (
    <div>
      {isSuper && (
        <div className="card pad mb3" style={{ background: "var(--muted)" }}>
          <div className="d3" style={{ marginBottom: 8 }}>Targets</div>
          <div className="sub" style={{ marginBottom: 12, fontSize: 12 }}>
            What the participant is working toward in each subject. Shown prominently on the report card.
          </div>
          <div className="stack g3">
            {(program.subjects ?? []).map(subj => (
              <div className="field" key={subj}>
                <label>{subj}</label>
                <input
                  className="input"
                  value={(program.targets?.[subj] ?? "")}
                  placeholder={
                    subj === "Qur'an" ? "e.g. 5 Hizb" :
                    subj === "Hadith" ? "e.g. Arba'un Hadith" :
                    subj === "Tajweed" ? "e.g. Kitab al-Tajweed Book 1" :
                    subj === "Fiqh" ? "e.g. Mukhtasar al-Akhdari" :
                    subj === "Arabic" ? "e.g. Nahwul Wadih Book 1" :
                    "Target for " + subj
                  }
                  onChange={async e => {
                    const nextTargets = { ...(program.targets ?? {}), [subj]: e.target.value };
                    await supabase.from("daura_programs").update({ targets: nextTargets }).eq("id", program.id);
                    onChange();
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {isSuper && program.status === "open" && (
        <div className="row g2 mb3" style={{ flexWrap: "wrap" }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setPickerOpen(true)}>{I.plus} Add from class</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setExternalOpen(true)}>{I.plus} Add external</button>
        </div>
      )}
      {pickerOpen && school && (
        <ClassPicker school={school}
          existingIds={participants.map(p => p.student_id).filter((x): x is string => !!x)}
          onClose={() => setPickerOpen(false)}
          onAdded={async (students) => {
            const rows = students.map(s => ({ program_id: program.id, student_id: s.id, full_name: s.name, external: false, phone: null, nin: null }));
            await supabase.from("daura_participants").insert(rows);
            setPickerOpen(false); onChange();
          }} />
      )}
      {externalOpen && (
        <ExternalForm onCancel={() => setExternalOpen(false)}
          onSave={async (v) => {
            await supabase.from("daura_participants").insert({
              program_id: program.id, student_id: null,
              full_name: v.full_name.trim(), external: true,
              phone: v.phone.trim() || null, nin: v.nin.trim() || null,
            });
            setExternalOpen(false); onChange();
          }} />
      )}
      {participants.length > 0 && (
        <div className="chip-line" style={{ marginBottom: 12 }}>
          <button className={"chip-f " + (filter === "all" ? "active" : "")} onClick={() => setFilter("all")}>All</button>
          <button className={"chip-f " + (filter === "students" ? "active" : "")} onClick={() => setFilter("students")}>Students</button>
          <button className={"chip-f " + (filter === "external" ? "active" : "")} onClick={() => setFilter("external")}>External</button>
        </div>
      )}
      {shown.length === 0 ? (
        <div className="card"><div className="empty"><div className="t">No participants yet</div></div></div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {shown.map(p => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>
              <button style={{ background: "none", border: 0, textAlign: "left", minWidth: 0, cursor: "pointer", padding: 0 }} onClick={() => onOpenHistory(p)}>
                <div style={{ fontWeight: 500, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--ink)" }}>{p.full_name}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                  {p.external ? "External" : "Student"}
                  {p.phone ? " · " + p.phone : ""}
                  {p.nin ? " · NIN " + "•".repeat(7) + p.nin.slice(-4) : ""}
                </div>
              </button>
              <span className={"pill pill-dot " + (p.external ? "pill-info" : "pill-primary")}>{p.external ? "External" : "Student"}</span>
              {isSuper && program.status === "open" && (
                <button className="btn btn-ghost btn-sm" onClick={async () => {
                  if (!window.confirm(`Remove ${p.full_name} from this programme?`)) return;
                  await supabase.from("daura_participants").delete().eq("id", p.id);
                  onChange();
                }}>Remove</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClassPicker({ school, existingIds, onClose, onAdded }: {
  school: SchoolData; existingIds: string[]; onClose: () => void; onAdded: (students: Student[]) => void;
}) {
  const classes = Array.from(new Set(school.students.map(s => s.class_name))).sort();
  const [filter, setFilter] = useState<string>("all");
  const available = school.students.filter(s => !existingIds.includes(s.id));
  const visible = filter === "all" ? available : available.filter(s => s.class_name === filter);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  function toggle(id: string) { setSelected(prev => ({ ...prev, [id]: !prev[id] })); }
  function selectVisible() { setSelected(prev => { const next = { ...prev }; for (const s of visible) next[s.id] = true; return next; }); }
  function clearAll() { setSelected({}); }
  const chosen = available.filter(s => selected[s.id]);
  const classCount = new Set(chosen.map(s => s.class_name)).size;

  return (
    <div className="card pad mb3">
      <div className="row g3 mb3" style={{ flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 600 }}>Add students from any class</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={selectVisible}>Select all{filter === "all" ? "" : " in " + filter}</button>
          <button className="btn btn-ghost btn-sm" onClick={clearAll} disabled={chosen.length === 0}>Clear</button>
        </div>
      </div>
      <div className="chip-line" style={{ marginBottom: 10 }}>
        <button type="button" className={"chip-f " + (filter === "all" ? "active" : "")} onClick={() => setFilter("all")}>All</button>
        {classes.map(c => (
          <button key={c} type="button" className={"chip-f " + (filter === c ? "active" : "")} onClick={() => setFilter(c)}>{c}</button>
        ))}
      </div>
      <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid var(--line)", borderRadius: "var(--r-2)" }}>
        {visible.length === 0 ? (
          <div className="empty"><div className="t">{filter === "all" ? "Everyone is already added" : "Everyone in " + filter + " is already added"}</div></div>
        ) : (
          visible.map(s => (
            <label key={s.id} style={{ display: "grid", gridTemplateColumns: "22px 1fr auto", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--line)", cursor: "pointer" }}>
              <input type="checkbox" checked={!!selected[s.id]} onChange={() => toggle(s.id)} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>{s.reg_no} · {s.class_name}</div>
              </div>
            </label>
          ))
        )}
      </div>
      <div className="row g2 mt3" style={{ justifyContent: "flex-end", alignItems: "center" }}>
        <div className="sub" style={{ fontSize: 12, marginRight: "auto" }}>
          {chosen.length === 0 ? "No students selected" : `${chosen.length} selected from ${classCount} class${classCount === 1 ? "" : "es"}`}
        </div>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={chosen.length === 0} onClick={() => onAdded(chosen)}>
          Add {chosen.length || ""} {chosen.length === 1 ? "student" : "students"}
        </button>
      </div>
    </div>
  );
}

function ExternalForm({ onCancel, onSave }: { onCancel: () => void; onSave: (v: { full_name: string; phone: string; nin: string }) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nin, setNin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  function submit() {
    if (!name.trim()) { setErr("Name is required"); return; }
    if (nin && !/^\d{11}$/.test(nin)) { setErr("NIN must be exactly 11 digits"); return; }
    setErr(null);
    onSave({ full_name: name, phone, nin });
  }
  return (
    <div className="card pad mb3">
      <div className="d3" style={{ marginBottom: 12 }}>External participant</div>
      <div className="stack g3">
        <div className="field"><label>Full name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ahmadu Bello" /></div>
        <div className="row g3" style={{ flexWrap: "wrap" }}>
          <div className="field flex1" style={{ minWidth: 180 }}><label>Phone <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional)</span></label>
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" placeholder="08012345678" /></div>
          <div className="field flex1" style={{ minWidth: 180 }}><label>NIN <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional, for Veritas)</span></label>
            <input className="input" value={nin} onChange={e => setNin(e.target.value.replace(/[^0-9]/g, "").slice(0, 11))} inputMode="numeric" placeholder="11 digits" /></div>
        </div>
        {err && <div className="notice">{err}</div>}
        <div className="row g2" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Add</button>
        </div>
      </div>
    </div>
  );
}

function MarksTab({ program, participants, assessments, isSuper, onChange }: {
  program: DauraProgram; participants: DauraParticipant[]; assessments: DauraAssessment[];
  isSuper: boolean; onChange: () => void;
}) {
  const subjects = program.subjects ?? [];
  const [subject, setSubject] = useState<string>(subjects[0] ?? "");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [marks, setMarks] = useState<DauraMark[]>([]);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const inSubject = assessments.filter(a => a.subject === subject);
  const regularAssessments = inSubject.filter(a => !a.is_evaluation);
  const evaluation = inSubject.find(a => a.is_evaluation) ?? null;
  const active = inSubject.find(a => a.id === activeId) ?? inSubject[inSubject.length - 1] ?? null;

  useEffect(() => {
    if (!active) { setMarks([]); return; }
    setActiveId(active.id);
    setLoadingMarks(true);
    supabase.from("daura_marks").select("*").eq("assessment_id", active.id).then(({ data }) => {
      setMarks((data as DauraMark[]) ?? []);
      setLoadingMarks(false);
    });
  }, [active?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Create one assessment across ALL subjects of this programme.
  // Sessional Daura: cap 24. Special Daura: no cap.
  async function addAssessment() {
    if (program.kind === "sessional" && regularAssessments.length >= 24) {
      setToast("Maximum 24 assessments for sessional Daura.");
      return;
    }
    // Determine next label number based on ALL subjects (not just current)
    const allRegular = assessments.filter(a => !a.is_evaluation);
    const numbers = new Set<number>();
    for (const a of allRegular) {
      const m = a.label.match(/^Assessment\s+(\d+)$/i);
      if (m) numbers.add(parseInt(m[1], 10));
    }
    let next = 1;
    while (numbers.has(next)) next++;
    const label = "Assessment " + next;
    const rows = subjects.map(subj => ({
      program_id: program.id,
      subject: subj,
      label,
      max_marks: 10,
      is_evaluation: false,
    }));
    const { error } = await supabase.from("daura_assessments").insert(rows);
    if (error) { setToast("Failed: " + error.message); return; }
    setToast(`${label} created for ${subjects.length} subjects.`);
    onChange();
  }

  // Create evaluation for ALL subjects (only if no evaluation exists for this programme yet).
  async function addEvaluation() {
    const existingEval = assessments.find(a => a.is_evaluation);
    if (existingEval) { setToast("Evaluation already exists for this programme."); return; }
    const rows = subjects.map(subj => ({
      program_id: program.id,
      subject: subj,
      label: "Evaluation",
      max_marks: 100,
      is_evaluation: true,
    }));
    const { error } = await supabase.from("daura_assessments").insert(rows);
    if (error) { setToast("Failed: " + error.message); return; }
    setToast("Evaluation created for " + subjects.length + " subjects.");
    onChange();
  }

  async function removeActive() {
    if (!active) return;
    if (!window.confirm(`Delete "${active.label}" for ALL subjects? All ${participants.length} participants' marks for it will be removed.`)) return;
    // Delete same label across all subjects in this programme
    await supabase.from("daura_assessments")
      .delete()
      .eq("program_id", program.id)
      .eq("label", active.label)
      .eq("is_evaluation", active.is_evaluation);
    setActiveId(null);
    onChange();
  }

  function markFor(pid: string): number | null {
    if (!active) return null;
    const m = marks.find(x => x.assessment_id === active.id && x.participant_id === pid);
    return m?.value ?? null;
  }

  async function onBlur(pid: string, raw: string) {
    if (!active) return;
    const digits = raw.replace(/[^0-9]/g, "");
    let num = digits === "" ? null : parseInt(digits, 10);
    if (num != null && num > active.max_marks) num = active.max_marks;
    await supabase.from("daura_marks").upsert(
      { assessment_id: active.id, participant_id: pid, value: num },
      { onConflict: "assessment_id,participant_id" }
    );
    const { data } = await supabase.from("daura_marks").select("*").eq("assessment_id", active.id);
    setMarks((data as DauraMark[]) ?? []);
  }

  if (subjects.length === 0) return <div className="card"><div className="empty"><div className="t">No subjects defined</div></div></div>;

  const sorted = [...participants].sort((a, b) => a.full_name.localeCompare(b.full_name));
  const recorded = active ? sorted.filter(p => markFor(p.id) != null).length : 0;
  const nextLabel = "Assessment " + (() => {
    const allRegular = assessments.filter(a => !a.is_evaluation);
    const numbers = new Set<number>();
    for (const a of allRegular) {
      const m = a.label.match(/^Assessment\s+(\d+)$/i);
      if (m) numbers.add(parseInt(m[1], 10));
    }
    let next = 1;
    while (numbers.has(next)) next++;
    return next;
  })();

  return (
    <div>
      <div className="chip-line" style={{ marginBottom: 12 }}>
        {subjects.map(s => (
          <button key={s} className={"chip-f " + (subject === s ? "active" : "")} onClick={() => { setSubject(s); setActiveId(null); }}>{s}</button>
        ))}
      </div>

      {isSuper && program.status === "open" && (
        <div className="row g2 mb3" style={{ flexWrap: "wrap" }}>
          <button className="btn btn-primary btn-sm" onClick={addAssessment}>{I.plus} Create {nextLabel}</button>
          {!evaluation && <button className="btn btn-secondary btn-sm" onClick={addEvaluation}>{I.plus} Create Evaluation</button>}
          {active && <button className="btn btn-ghost btn-sm" onClick={removeActive} style={{ color: "var(--danger)" }}>Delete {active.label}</button>}
        </div>
      )}

      {!active ? (
        <div className="card"><div className="empty"><div className="t">No assessments for {subject} yet</div></div></div>
      ) : (
        <div className="asheet">
          <div className="asheet-head">
            <div className="row1">
              <div className="chips">
                {regularAssessments.map(a => (
                  <button key={a.id} className={"chip-a " + (a.id === active.id ? "active" : "")} onClick={() => setActiveId(a.id)}>{a.label}</button>
                ))}
                {evaluation && (
                  <button className={"chip-a " + (evaluation.id === active.id ? "active" : "")} onClick={() => setActiveId(evaluation.id)}>
                    ⭐ Evaluation
                  </button>
                )}
              </div>
              <div className="sub" style={{ fontSize: 12, marginLeft: "auto" }}>Out of <strong>{active.max_marks}</strong></div>
            </div>
          </div>
          <div className="no-print" style={{ padding: "8px 18px", background: "var(--primary-soft)", borderLeft: "3px solid var(--primary)", fontSize: 13, fontWeight: 500, color: "var(--primary)" }}>
            Entering marks for <strong>{subject}</strong> · <strong>{active.label}</strong> · out of <strong>{active.max_marks}</strong>
          </div>
          <div className="asheet-sub">
            <div className="prog"><span className="num">{recorded}</span> of {sorted.length} recorded</div>
          </div>
          <div className="asheet-body">
            {loadingMarks ? (
              <div className="empty"><div className="t">Loading marks…</div></div>
            ) : sorted.length === 0 ? (
              <div className="empty"><div className="t">No participants yet</div></div>
            ) : sorted.map(p => {
              const v = markFor(p.id);
              const filled = v != null;
              return (
                <div key={p.id} className={"arow " + (filled ? "recorded" : "pending")}>
                  <div className="avatar">{(p.full_name[0] ?? "") + (p.full_name.split(/\s+/)[1]?.[0] ?? "")}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="sname">{p.full_name}</div>
                    <div className="sid">{p.external ? "External" : "Student"}</div>
                  </div>
                  <input className="mark" type="text" inputMode="numeric" maxLength={3}
                    defaultValue={v == null ? "" : String(v)} placeholder="—"
                    disabled={program.status === "closed" || !isSuper}
                    onBlur={e => onBlur(p.id, e.target.value)}
                    onFocus={e => e.currentTarget.select()} />
                </div>
              );
            })}
          </div>
        </div>
      )}
      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
    </div>
  );
}

function ReportTab({ program, participants, assessments }: {
  program: DauraProgram; participants: DauraParticipant[]; assessments: DauraAssessment[];
}) {
  const [marks, setMarks] = useState<DauraMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DauraParticipant | null>(null);
  const [printAll, setPrintAll] = useState(false);

  useEffect(() => {
    (async () => {
      if (assessments.length === 0) { setMarks([]); setLoading(false); return; }
      const ids = assessments.map(a => a.id);
      const { data } = await supabase.from("daura_marks").select("*").in("assessment_id", ids);
      setMarks((data as DauraMark[]) ?? []);
      setLoading(false);
    })();
  }, [assessments]);

  useEffect(() => {
    if (!printAll) return;
    const t = setTimeout(() => {
      window.print();
      setTimeout(() => setPrintAll(false), 400);
    }, 250);
    return () => clearTimeout(t);
  }, [printAll]);

  if (loading) return <DelayedSkeleton ready={!loading} rows={4} />;
  if (assessments.length === 0) return <div className="card"><div className="empty"><div className="t">No assessments yet</div><div className="d">Add assessments in the Marks tab first.</div></div></div>;

  const sorted = [...participants].sort((a, b) => a.full_name.localeCompare(b.full_name));

  function doPrintAll() { setPrintAll(true); }

  function doPrintOne() {
    window.print();
  }

  // Bulk print view — all cards stacked, one per page
  if (printAll) {
    return (
      <div>
        <div className="cert-print-wrapper">
          {sorted.map(p => (
            <>
              <DauraAssessmentReport key={p.id + "-ar"} program={program} participant={p} assessments={assessments} marks={marks} />
              <DauraReport key={p.id + "-rep"} program={program} participant={p} assessments={assessments} marks={marks} />
            </>
          ))}
        </div>
      </div>
    );
  }

  // Single participant card view
  if (selected) {
    return (
      <div>
        <div className="row mb3 no-print" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>← Back to roster</button>
          <button className="btn btn-primary btn-sm" onClick={doPrintOne}>{I.print} Print this card</button>
        </div>
        <div className="cert-print-wrapper">
          <>
            <DauraAssessmentReport program={program} participant={selected} assessments={assessments} marks={marks} />
            <DauraReport program={program} participant={selected} assessments={assessments} marks={marks} />
          </>
        </div>
      </div>
    );
  }

  // Roster view
  return (
    <div>
      <div className="row mb3 no-print" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-primary btn-sm" onClick={doPrintAll}>{I.print} Print all {sorted.length}</button>
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        {sorted.map((p, i) => (
          <button key={p.id} onClick={() => setSelected(p)}
            style={{ display: "grid", gridTemplateColumns: "30px minmax(0,1fr) auto auto", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "none", border: 0, borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: "var(--line)", width: "100%", textAlign: "left", cursor: "pointer", color: "inherit", font: "inherit" }}>
            <div style={{ color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 12 }}>{i + 1}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.full_name}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                {p.external ? "External" : "Student"}{p.phone ? " · " + p.phone : ""}
              </div>
            </div>
            {p.external && <span className="pill pill-info" style={{ fontSize: 10 }}>external</span>}
            <div style={{ color: "var(--ink-4)" }}>{I.arrow}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function HistoryPanel({ participant, onClose }: { participant: DauraParticipant; onClose: () => void }) {
  const [programs, setPrograms] = useState<{ program_id: string; name: string; start_date: string | null; end_date: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const key = participant.nin || participant.student_id;
      if (!key) { setLoading(false); return; }
      let q = supabase.from("daura_participants").select("program_id, daura_programs(name, start_date, end_date)");
      if (participant.nin) q = q.eq("nin", participant.nin);
      else q = q.eq("student_id", participant.student_id);
      const { data } = await q;
      const rows = (data as any[]) ?? [];
      setPrograms(rows.map(r => ({
        program_id: r.program_id,
        name: r.daura_programs?.name ?? "",
        start_date: r.daura_programs?.start_date ?? null,
        end_date: r.daura_programs?.end_date ?? null,
      })).filter(r => r.name));
      setLoading(false);
    })();
  }, [participant.id]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(23,28,24,.4)", zIndex: 100, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ background: "var(--surface)", width: "100%", maxWidth: 420, height: "100%", overflowY: "auto", padding: 22, boxShadow: "var(--sh-3)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div className="d3">{participant.full_name}</div>
            <div className="sub" style={{ marginTop: 3 }}>
              {participant.external ? "External" : "Student"}{participant.phone ? " · " + participant.phone : ""}
            </div>
            {participant.nin && <div className="sub mono" style={{ marginTop: 2, fontSize: 11.5 }}>NIN {"•".repeat(7) + participant.nin.slice(-4)}</div>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Daura history</div>
        {loading ? <div className="sub">Loading…</div> :
          programs.length === 0 ? (
            <div className="sub">This is their first Daura programme.</div>
          ) : (
            <div>
              {programs.map(p => (
                <Link key={p.program_id} to={`/admin/daura/${p.program_id}`}
                  style={{ display: "block", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "var(--r-2)", marginBottom: 8, color: "var(--ink)" }}>
                  <div style={{ fontWeight: 500, fontSize: 13.5 }}>{p.name}</div>
                  <div className="sub" style={{ fontSize: 11.5, marginTop: 2 }}>
                    {p.start_date || ""} {p.end_date ? `→ ${p.end_date}` : ""}
                  </div>
                </Link>
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}
