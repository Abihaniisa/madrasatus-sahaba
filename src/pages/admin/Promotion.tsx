import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CONFIG, ALL_CLASSES } from "../../lib/config";
import { loadSchool, type SchoolData } from "../../lib/data";
import { useRequireAuth, amISuperAdmin, supabase } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { DelayedSkeleton } from "../../ui/primitives";
import { I } from "../../ui/Shell";

type Decision = "promote" | "repeat" | "withdrawn";

function nextClass(cls: string): string | null {
  const idx = ALL_CLASSES.indexOf(cls);
  if (idx === -1) return null;
  if (idx === ALL_CLASSES.length - 1) return null;
  return ALL_CLASSES[idx + 1];
}
function suggestNextSession(current: string): string {
  const m = current.match(/^(\d{4})\/(\d{4})$/);
  if (!m) return current;
  return `${parseInt(m[1], 10) + 1}/${parseInt(m[2], 10) + 1}`;
}

export default function Promotion() {
  const ready = useRequireAuth();
  const nav = useNavigate();
  const [data, setData] = useState<SchoolData | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [curSession, setCurSession] = useState(CONFIG.sessionLabel);
  const [nextSession, setNextSession] = useState(suggestNextSession(CONFIG.sessionLabel));
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const isSuper = await amISuperAdmin();
      if (!isSuper) { nav("/admin"); return; }
      setAllowed(true);
      const s = await loadSchool();
      setData(s);
      const d: Record<string, Decision> = {};
      for (const st of s.students) if (st.status === "active") d[st.id] = "promote";
      setDecisions(d);
    })();
  }, [ready, nav]);

  const groups = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, typeof data.students>();
    for (const st of data.students) {
      if (st.status !== "active") continue;
      if (!map.has(st.class_name)) map.set(st.class_name, []);
      map.get(st.class_name)!.push(st);
    }
    return Array.from(map.entries()).sort((a, b) => ALL_CLASSES.indexOf(a[0]) - ALL_CLASSES.indexOf(b[0]));
  }, [data]);

  function setDecision(sid: string, d: Decision) { setDecisions(prev => ({ ...prev, [sid]: d })); }
  function setClassDecision(cls: string, d: Decision) {
    const ids = (data?.students ?? []).filter(s => s.class_name === cls && s.status === "active").map(s => s.id);
    setDecisions(prev => {
      const next = { ...prev };
      for (const id of ids) next[id] = d;
      return next;
    });
  }

  async function apply() {
    if (!data) return;
    const counts = { promote: 0, repeat: 0, withdrawn: 0 };
    for (const d of Object.values(decisions)) counts[d]++;
    if (!window.confirm(`Apply promotion?\n\nPromote: ${counts.promote}\nRepeat: ${counts.repeat}\nWithdrawn: ${counts.withdrawn}\n\nCurrent session: ${curSession}\nNew session: ${nextSession}`)) return;

    setBusy(true);
    const today = new Date().toISOString().slice(0, 10);

    for (const st of data.students) {
      if (st.status !== "active") continue;
      const d = decisions[st.id] ?? "promote";
      await supabase.from("enrollments").insert({
        student_id: st.id, class_name: st.class_name, session_label: curSession,
        status: d === "promote" ? "active" : d === "repeat" ? "repeating" : "withdrawn",
        started: st.joined, ended: today,
      });
      if (d === "withdrawn") { await supabase.from("students").update({ status: "withdrawn" }).eq("id", st.id); continue; }
      const targetClass = d === "repeat" ? st.class_name : nextClass(st.class_name);
      if (targetClass === null) {
        await supabase.from("students").update({ status: "graduated" }).eq("id", st.id);
        await supabase.from("enrollments").insert({ student_id: st.id, class_name: st.class_name, session_label: nextSession, status: "graduated", started: today });
        continue;
      }
      await supabase.from("enrollments").insert({ student_id: st.id, class_name: targetClass, session_label: nextSession, status: "active", started: today });
      await supabase.from("students").update({ class_name: targetClass, status: "active" }).eq("id", st.id);
    }
    setBusy(false);
    window.alert("Promotion complete.");
    const s = await loadSchool(); setData(s);
  }

  if (!ready || !allowed) return <div className="body"><div className="wrap"><DelayedSkeleton ready={ready && allowed} rows={3} /></div></div>;

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap">
          <div className="crumb"><Link to="/admin">Portal</Link><span>/</span><span className="current">Promotion</span></div>
          <div className="phead"><div><h1>End of Session</h1><p className="sub">Move every active student to their next class at the end of the session. Bulk by default.</p></div></div>
          <div className="card pad mb4">
            <div className="row g3" style={{ flexWrap: "wrap" }}>
              <div className="field flex1" style={{ minWidth: 180 }}><label>Current session</label>
                <input className="input" value={curSession} onChange={e => setCurSession(e.target.value)} /></div>
              <div className="field flex1" style={{ minWidth: 180 }}><label>New session</label>
                <input className="input" value={nextSession} onChange={e => setNextSession(e.target.value)} /></div>
            </div>
            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn btn-primary" disabled={busy || !data} onClick={apply}>
                {busy ? "Applying…" : <>{I.check} Apply promotion</>}
              </button>
            </div>
          </div>
          {!data ? <DelayedSkeleton ready={!!data} rows={5} /> :
            groups.length === 0 ? (
              <div className="card"><div className="empty"><div className="t">No active students</div></div></div>
            ) : groups.map(([cls, students]) => {
              const target = nextClass(cls);
              const targetLabel = target ?? "Graduate";
              return (
                <div key={cls} className="sec-block">
                  <div className="sec-head">
                    <h2>{cls} <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>→</span> {targetLabel}</h2>
                    <span className="meta">{students.length} students</span>
                  </div>
                  <div className="row g2" style={{ marginBottom: 8, flexWrap: "wrap" }}>
                    <button className="chip-f active" onClick={() => setClassDecision(cls, "promote")}>Promote all</button>
                    <button className="chip-f" onClick={() => setClassDecision(cls, "repeat")}>Repeat all</button>
                    <button className="chip-f" onClick={() => setClassDecision(cls, "withdrawn")}>Withdraw all</button>
                  </div>
                  <div className="card" style={{ overflow: "hidden" }}>
                    {students.map(s => {
                      const d = decisions[s.id] ?? "promote";
                      return (
                        <div key={s.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 500, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                            <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>{s.reg_no}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            {(["promote", "repeat", "withdrawn"] as Decision[]).map(opt => (
                              <button key={opt} onClick={() => setDecision(s.id, opt)}
                                className={"chip-a " + (d === opt ? "active" : "")}
                                style={{ textTransform: "capitalize" }}>{opt}</button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}
