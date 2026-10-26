// src/pages/admin/Settings.tsx — school settings (super admin only).
// Session start date + Ramadan window. Everything else derives from session start + blocks.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRequireAuth, amISuperAdmin, supabase } from "../../lib/supabase";
import { getSettings, loadSettings, saveSettings, type SchoolSettings } from "../../lib/settings";
import { AdminTop } from "../../ui/AdminShell";
import { DelayedSkeleton } from "../../ui/primitives";
import { I } from "../../ui/Shell";

export default function Settings() {
  const ready = useRequireAuth();
  const nav = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [session_label, setSessionLabel] = useState("");
  const [session_start_date, setSessionStart] = useState("");
  const [current_semester_override, setSemesterOverride] = useState<string>("");
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
      setSessionLabel(s.session_label);
      setSessionStart(s.session_start_date);
      setSemesterOverride(s.current_semester_override == null ? "" : String(s.current_semester_override));
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
    if (!session_label) { setMsg({ type: "err", text: "Session label is required." }); return; }
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
    await supabase.auth.refreshSession();
    const payload: Partial<SchoolSettings> = {
      session_label,
      session_start_date,
      current_semester_override: current_semester_override === "" ? null : parseInt(current_semester_override, 10),
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
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Session label</label>
              <input className="input" value={session_label} onChange={e => setSessionLabel(e.target.value)} placeholder="2026/2027" />
              <div className="hint">The academic session identifier, e.g. 2026/2027. Shown on reports, receipts, transcripts.</div>
            </div>
            <div className="field">
              <label>Session start date</label>
              <input className="input" type="date" value={session_start_date} onChange={e => setSessionStart(e.target.value)} />
              <div className="hint">The first day of the academic year. All weeks, exams, holidays and the session end are computed from this date.</div>
            </div>
          </div>

          <div className="card pad mb4">
            <div className="d3" style={{ marginBottom: 12 }}>Current semester</div>
            <div className="field">
              <label>Semester override</label>
              <select className="input" value={current_semester_override} onChange={e => setSemesterOverride(e.target.value)}>
                <option value="">Auto (derived from session dates)</option>
                <option value="1">First semester</option>
                <option value="2">Second semester</option>
              </select>
              <div className="hint">Leave on Auto. Override only for testing or backfilling.</div>
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
