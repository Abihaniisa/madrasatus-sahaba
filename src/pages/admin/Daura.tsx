// src/pages/admin/Daura.tsx — Daura list. Two tabs: Sessional | Special.
// Sessional — one per session, auto-derived session_label, current session only in list.
// Special — any number, ad-hoc programmes, session_label nullable.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRequireAuth, amISuperAdmin, supabase } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { DelayedSkeleton } from "../../ui/primitives";
import { I } from "../../ui/Shell";
import { CONFIG } from "../../lib/config";
import { loadSchool, currentSchoolSession, invalidateSchoolCache, type SchoolData } from "../../lib/data";

import type { DauraProgram } from "../../types";

type Tab = "sessional" | "special";

export default function Daura() {
  const ready = useRequireAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("sessional");
  const [sessional, setSessional] = useState<DauraProgram | null | undefined>(undefined);
  const [special, setSpecial] = useState<DauraProgram[] | null>(null);
  const [data, setData] = useState<SchoolData | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [isSuper, setIsSuper] = useState(false);
  const [schoolSession, setSchoolSession] = useState<string>("");

  async function refresh() {
    const [sRes, spRes, school] = await Promise.all([
      supabase.from("daura_programs").select("*").eq("kind", "sessional").order("created_at", { ascending: false }),
      supabase.from("daura_programs").select("*").eq("kind", "special").order("created_at", { ascending: false }),
      loadSchool(),
    ]);
    setData(school);
    const current = currentSchoolSession(school);
    setSchoolSession(current);
    const sList = (sRes.data as DauraProgram[]) ?? [];
    setSessional(sList.find(p => p.session_label === current) ?? null);
    setSpecial((spRes.data as DauraProgram[]) ?? []);
  }

  useEffect(() => {
    if (!ready) return;
    refresh();
    amISuperAdmin().then(setIsSuper);
  }, [ready]);

  async function createSessional() {
    if (!isSuper) return;
    invalidateSchoolCache();
    const { data: inserted, error } = await supabase.from("daura_programs").insert({
      name: `Sessional Daura ${schoolSession}`,
      description: "Sessional Daura — every class participates",
      start_date: null,
      end_date: null,
      weeks: 6,
      subjects: CONFIG.subjects,
      status: "open",
      kind: "sessional",
      session_label: schoolSession,
    }).select().single();
    if (error || !inserted) {
      window.alert("Could not create sessional Daura: " + (error?.message ?? "unknown"));
      return;
    }
    nav(`/admin/daura/${(inserted as DauraProgram).id}`);
  }

  if (!ready) return <div className="body"><div className="wrap"><DelayedSkeleton ready={ready} rows={4} /></div></div>;

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap">
          <div className="crumb"><Link to="/admin">Portal</Link><span>/</span><span className="current">Daura</span></div>
          <div className="phead">
            <div>
              <h1>Daura</h1>
              <p className="sub">Independent intensive programmes. Separate from semester and section averages.</p>
            </div>
            {tab === "special" && !showCreate && isSuper && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>{I.plus} New special Daura</button>
            )}
            {tab === "sessional" && isSuper && sessional === null && (
              <button className="btn btn-primary btn-sm" onClick={createSessional}>{I.plus} Create sessional Daura for {schoolSession}</button>
            )}
          </div>

          <div className="chip-line">
            <button className={"chip-f " + (tab === "sessional" ? "active" : "")} onClick={() => setTab("sessional")}>Sessional</button>
            <button className={"chip-f " + (tab === "special" ? "active" : "")} onClick={() => setTab("special")}>Special</button>
          </div>

          {tab === "sessional" && (
            <>
              {sessional === undefined ? (
                <DelayedSkeleton ready={false} rows={3} />
              ) : sessional === null ? (
                <div className="card"><div className="empty"><div className="t">No sessional Daura for {schoolSession}</div><div className="d">Create one to enable mark entry for every class in this session.</div></div></div>
              ) : (
                <div className="card" style={{ overflow: "hidden" }}>
                  <Link to={`/admin/daura/${sessional.id}`} className="crow" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto" }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="cname">{sessional.name}</div>
                      <div className="cmeta">{sessional.session_label ?? schoolSession} · {sessional.subjects.length} subjects</div>
                    </div>
                    <span className={"pill pill-dot " + (sessional.status === "open" ? "pill-success" : "pill-neutral")}>{sessional.status === "open" ? "Open" : "Closed"}</span>
                    <div style={{ color: "var(--ink-4)" }}>{I.arrow}</div>
                  </Link>
                </div>
              )}
            </>
          )}

          {tab === "special" && (
            <>
              {showCreate && (
                <CreateForm onCancel={() => setShowCreate(false)} onCreated={(id) => { setShowCreate(false); nav(`/admin/daura/${id}`); }} />
              )}
              {!special ? (
                <DelayedSkeleton ready={!!special} rows={4} />
              ) : special.length === 0 ? (
                <div className="card"><div className="empty"><div className="t">No special Dauras yet</div><div className="d">Create one whenever needed.</div></div></div>
              ) : (
                <div className="card" style={{ overflow: "hidden" }}>
                  {special.map(p => (
                    <Link key={p.id} to={`/admin/daura/${p.id}`} className="crow" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto" }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="cname">{p.name}</div>
                        <div className="cmeta">
                          {p.start_date || "no start"}{p.end_date ? ` → ${p.end_date}` : ""} · {p.weeks} week{p.weeks === 1 ? "" : "s"} · {p.subjects.length} subjects
                        </div>
                      </div>
                      <span className={"pill pill-dot " + (p.status === "open" ? "pill-success" : "pill-neutral")}>{p.status === "open" ? "Open" : "Closed"}</span>
                      <div style={{ color: "var(--ink-4)" }}>{I.arrow}</div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [subjectsText, setSubjectsText] = useState(CONFIG.subjects.join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) { setError("Please enter a programme name."); return; }
    setBusy(true); setError(null);
    const subjects = subjectsText.split(",").map(s => s.trim()).filter(Boolean);
    if (subjects.length === 0) { setError("Please enter at least one subject."); setBusy(false); return; }
    const { data, error } = await supabase.from("daura_programs").insert({
      name: name.trim(),
      description: null,
      start_date: null,
      end_date: null,
      weeks: 1,
      subjects,
      status: "open",
      kind: "special",
      session_label: null,
    }).select().single();
    setBusy(false);
    if (error || !data) { setError(error?.message ?? "Could not create"); return; }
    onCreated((data as DauraProgram).id);
  }

  return (
    <div className="card pad mb4">
      <div className="d3" style={{ marginBottom: 12 }}>New special Daura</div>
      <div className="stack g3">
        <div className="field"><label>Name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ramadan Intensive" /></div>
        <div className="field"><label>Subjects <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(comma-separated)</span></label>
          <input className="input" value={subjectsText} onChange={e => setSubjectsText(e.target.value)} /></div>
        {error && <div className="notice">{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Creating…" : "Create programme"}</button>
        </div>
      </div>
    </div>
  );
}
