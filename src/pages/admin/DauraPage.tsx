import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRequireAuth } from "../../lib/auth";
import { useMode } from "../../lib/mode";
import { AdminTop } from "../../components/AdminTop";
import { DelayedSkeleton } from "../../components/Skeleton";
import { I } from "../../components/Layout";
import { CONFIG } from "../../lib/config";
import { supabase } from "../../lib/supabase";

type DauraProgram = {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  weeks: number;
  status: "open" | "closed";
  subjects: string[];
  created_at: string;
};

export default function DauraPage() {
  const ready = useRequireAuth();
  const nav = useNavigate();
  const [mode, setMode] = useMode();
  const [programs, setPrograms] = useState<DauraProgram[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function refresh() {
    const { data } = await supabase
      .from("daura_programs")
      .select("*")
      .order("created_at", { ascending: false });
    setPrograms((data as DauraProgram[]) ?? []);
  }

  useEffect(() => { if (ready) refresh(); }, [ready]);

  if (!ready) return <div className="body"><div className="wrap"><DelayedSkeleton ready={ready} rows={4} /></div></div>;

  return (
    <div>
      <AdminTop mode={mode} onMode={setMode} />
      <div className="body">
        <div className="wrap">
          <div className="crumb">
            <Link to="/admin">Portal</Link><span>/</span><span className="current">Daura</span>
          </div>
          <div className="phead">
            <div>
              <h1>Daura</h1>
              <p className="sub">Independent intensive programmes. Separate from semester and section averages.</p>
            </div>
            {!showCreate && (
              <button 
                className="btn btn-primary btn-sm" 
                onClick={() => setShowCreate(true)}
                disabled={mode !== "manage"}
                title={mode !== "manage" ? "Switch to Manage to create a programme" : ""}
              >
                {I.plus} New programme
              </button>
            )}
          </div>

          {showCreate && (
            <CreateForm
              onCancel={() => setShowCreate(false)}
              onCreated={(id) => { setShowCreate(false); nav(`/admin/daura/${id}`); }}
            />
          )}

          {!programs ? <DelayedSkeleton ready={!!programs} rows={4} /> :
            programs.length === 0 ? (
              <div className="card"><div className="empty">
                <div className="t">No Daura programmes yet</div>
                <div className="d">Create one to begin.</div>
              </div></div>
            ) : (
              <div className="card" style={{ overflow: "hidden" }}>
                {programs.map(p => (
                  <Link key={p.id} to={`/admin/daura/${p.id}`} className="crow" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto" }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="cname">{p.name}</div>
                      <div className="cmeta">
                        {p.start_date || "no start"} {p.end_date ? `→ ${p.end_date}` : ""} · {p.weeks} week{p.weeks === 1 ? "" : "s"}
                      </div>
                    </div>
                    <span className={"pill pill-dot " + (p.status === "open" ? "pill-success" : "pill-neutral")}>
                      {p.status === "open" ? "Open" : "Closed"}
                    </span>
                    <div style={{ color: "var(--ink-4)" }}>{I.arrow}</div>
                  </Link>
                ))}
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}

function CreateForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [weeks, setWeeks] = useState("6");
  const [subjectsText, setSubjectsText] = useState(CONFIG.subjects.join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) { setError("Please enter a programme name."); return; }
    setBusy(true);
    setError(null);
    const subjects = subjectsText.split(",").map(s => s.trim()).filter(Boolean);
    if (subjects.length === 0) { setError("Please enter at least one subject."); setBusy(false); return; }
    
    const { data, error } = await supabase
      .from("daura_programs")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        weeks: parseInt(weeks, 10) || 1,
        subjects: subjects,
        status: "open",
      })
      .select()
      .single();
    setBusy(false);
    if (error || !data) { setError(error?.message ?? "Could not create"); return; }
    onCreated((data as DauraProgram).id);
  }

  return (
    <div className="card pad mb4">
      <div className="d3" style={{ marginBottom: 12 }}>New Daura programme</div>
      <div className="stack g3">
        <div className="field">
          <label>Name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ramadan 2026 Intensive" />
        </div>
        <div className="field">
          <label>Description <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional)</span></label>
          <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Crash course in Qur'an, fiqh and Arabic" />
        </div>
        <div className="row g3" style={{ flexWrap: "wrap" }}>
          <div className="field flex1" style={{ minWidth: 150 }}>
            <label>Start date <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional)</span></label>
            <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="field flex1" style={{ minWidth: 150 }}>
            <label>End date <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional)</span></label>
            <input className="input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="field" style={{ minWidth: 110, maxWidth: 140 }}>
            <label>Weeks</label>
            <input className="input" inputMode="numeric" value={weeks} onChange={e => setWeeks(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Subjects <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(comma-separated)</span></label>
          <input className="input" value={subjectsText} onChange={e => setSubjectsText(e.target.value)} />
        </div>
        {error && <div className="notice">{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>
            {busy ? "Creating…" : "Create programme"}
          </button>
        </div>
      </div>
    </div>
  );
}
