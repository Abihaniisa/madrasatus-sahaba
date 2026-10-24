// src/pages/admin/Settings.tsx — school settings (super admin only).
// Session start date + Ramadan window. Everything else derives from session start + blocks.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRequireAuth, amISuperAdmin } from "../../lib/supabase";
import { getSettings, loadSettings, saveSettings, type SchoolSettings } from "../../lib/settings";
import { AdminTop } from "../../ui/AdminShell";
import { DelayedSkeleton } from "../../ui/primitives";
import { I } from "../../ui/Shell";

export default function Settings() {
  const ready = useRequireAuth();
  const nav = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [session_start_date, setSessionStart] = useState("");
  const [ramadan_start_date, setRamadanStart] = useState("");
  const [ramadan_end_date, setRamadanEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const isSuper = await amISuperAdmin();
      if (!isSuper) { nav("/admin"); return; }
      setAllowed(true);
      const s = await loadSettings();
      setSessionStart(s.session_start_date);
      setRamadanStart(s.ramadan_start_date ?? "");
      setRamadanEnd(s.ramadan_end_date ?? "");
      setLoading(false);
    })();
  }, [ready, nav]);

  if (!ready || !allowed || loading) {
    return <div className="body"><div className="wrap"><DelayedSkeleton ready={ready && allowed && !loading} rows={4} /></div></div>;
  }

  async function save() {
    setMsg(null);
    if (!session_start_date) { setMsg({ type: "err", text: "Session start date is required." }); return; }
    if ((ramadan_start_date && !ramadan_end_date) || (!ramadan_start_date && ramadan_end_date)) {
      setMsg({ type: "err", text: "Enter both Ramadan start and end, or leave both empty." });
      return;
    }
    if (ramadan_start_date && ramadan_end_date && ramadan_start_date > ramadan_end_date) {
      setMsg({ type: "err", text: "Ramadan end must be after Ramadan start." });
      return;
    }
    setBusy(true);
    const payload: Partial<SchoolSettings> = {
      session_start_date,
      ramadan_start_date: ramadan_start_date || null,
      ramadan_end_date: ramadan_end_date || null,
    };
    const { error } = await saveSettings(payload);
    setBusy(false);
    if (error) { setMsg({ type: "err", text: error }); return; }
    setMsg({ type: "ok", text: "Saved. The counter will use the new dates from the next page load." });
  }

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap-narrow">
          <div className="crumb"><Link to="/admin">Portal</Link><span>/</span><Link to="/admin/manage">Manage</Link><span>/</span><span className="current">Settings</span></div>
          <div className="phead">
            <div>
              <h1>School settings</h1>
              <p className="sub">Session start and Ramadan window. Everything else is derived automatically.</p>
            </div>
          </div>

          <div className="card pad mb4">
            <div className="d3" style={{ marginBottom: 12 }}>Session</div>
            <div className="field">
              <label>Session start date</label>
              <input className="input" type="date" value={session_start_date} onChange={e => setSessionStart(e.target.value)} />
              <div className="hint">The first day of the academic year. All weeks, exams, holidays and the session end are computed from this date.</div>
            </div>
          </div>

          <div className="card pad mb4">
            <div className="d3" style={{ marginBottom: 12 }}>Ramadan <span className="sub" style={{ fontWeight: 400 }}>(optional)</span></div>
            <div className="row g3" style={{ flexWrap: "wrap" }}>
              <div className="field flex1" style={{ minWidth: 180 }}>
                <label>Ramadan start</label>
                <input className="input" type="date" value={ramadan_start_date} onChange={e => setRamadanStart(e.target.value)} />
              </div>
              <div className="field flex1" style={{ minWidth: 180 }}>
                <label>Ramadan end</label>
                <input className="input" type="date" value={ramadan_end_date} onChange={e => setRamadanEnd(e.target.value)} />
              </div>
            </div>
            <div className="hint" style={{ marginTop: 8 }}>If set, the counter pauses during this window and resumes after. Leave both empty to skip Ramadan for this session.</div>
          </div>

          {msg && <div className="notice" style={{ background: msg.type === "ok" ? "var(--success-soft)" : undefined, color: msg.type === "ok" ? "var(--success)" : undefined, borderColor: msg.type === "ok" ? "var(--success-line)" : undefined }}>{msg.text}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button className="btn btn-primary" disabled={busy} onClick={save}>
              {busy ? "Saving…" : <>{I.check} Save settings</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
