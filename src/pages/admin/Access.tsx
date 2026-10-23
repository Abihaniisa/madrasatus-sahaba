import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRequireAuth, listAccess, addAccess, updateExpiry, removeAccess, currentEmail, amISuperAdmin, type AccessRow } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { DelayedSkeleton, Modal } from "../../ui/primitives";
import { I } from "../../ui/Shell";

export default function Access() {
  const ready = useRequireAuth();
  const nav = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newSuper, setNewSuper] = useState(false);
  const [newExpiry, setNewExpiry] = useState("");
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  async function refresh() { setRows(await listAccess()); }

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const isSuper = await amISuperAdmin();
      if (!isSuper) { nav("/admin"); return; }
      setAllowed(true);
      setMe(await currentEmail());
      refresh();
    })();
  }, [ready, nav]);

  if (!ready || !allowed) return <div className="body"><div className="wrap"><DelayedSkeleton ready={ready && allowed} rows={4} /></div></div>;

  async function onAdd() {
    const email = newEmail.toLowerCase().trim();
    if (!email) return;
    setBusy(true);
    const { error } = await addAccess(email, newSuper, newExpiry || null);
    setBusy(false);
    if (error) return;
    setNewEmail(""); setNewSuper(false); setNewExpiry(""); refresh();
  }
  async function onSetExpiry(email: string, value: string) { await updateExpiry(email, value || null); refresh(); }
  async function confirmRemove() { if (!pendingRemove) return; await removeAccess(pendingRemove); setPendingRemove(null); refresh(); }

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap">
          <div className="crumb"><Link to="/admin">Portal</Link><span>/</span><span className="current">Access</span></div>
          <div className="phead"><div><h1>Access</h1><p className="sub">Grant and revoke portal access.</p></div></div>
          <div className="card pad mb4">
            <div className="d3" style={{ marginBottom: 12 }}>Add access</div>
            <div className="stack g3">
              <div className="field"><label>Email</label>
                <input className="input" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="teacher@example.com" autoComplete="off" /></div>
              <div className="row g3" style={{ flexWrap: "wrap" }}>
                <div className="field flex1" style={{ minWidth: 180 }}><label>Expires on <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional)</span></label>
                  <input className="input" type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} /></div>
                <div className="field" style={{ minWidth: 140 }}><label>Role</label>
                  <div className="chip-line" style={{ marginBottom: 0 }}>
                    <button type="button" className={"chip-f " + (!newSuper ? "active" : "")} onClick={() => setNewSuper(false)}>Admin</button>
                    <button type="button" className={"chip-f " + (newSuper ? "active" : "")} onClick={() => setNewSuper(true)}>Super admin</button>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-primary" onClick={onAdd} disabled={busy || !newEmail}>
                  {busy ? "Adding…" : <>{I.plus} Grant access</>}
                </button>
              </div>
            </div>
          </div>
          {rows.length === 0 ? (
            <div className="card"><div className="empty"><div className="t">No one yet</div></div></div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              {rows.map(r => {
                const isMe = r.email === me;
                const isSuperRow = r.role === "super_admin";
                return (
                  <div key={r.email} className="access-row">
                    <div style={{ minWidth: 0 }}>
                      <div className="email">{r.email}
                        {isMe && <span className="pill pill-info" style={{ marginLeft: 8 }}>you</span>}
                        {isSuperRow && <span className="pill pill-primary" style={{ marginLeft: 8 }}>super</span>}
                      </div>
                      <div className="meta">{isSuperRow ? "Super admin" : "Admin"} · {r.expires_at ? `Expires ${r.expires_at}` : "No expiry"}</div>
                    </div>
                    <div>
                      <input className="input" type="date" value={r.expires_at ?? ""} onChange={e => onSetExpiry(r.email, e.target.value)}
                        style={{ padding: "6px 8px", fontSize: 12.5, width: 140 }} />
                    </div>
                    <div>
                      <button className="btn btn-ghost btn-sm" onClick={() => setPendingRemove(r.email)}
                        disabled={isMe || isSuperRow} style={{ opacity: (isMe || isSuperRow) ? .4 : 1 }}>Remove</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Modal open={!!pendingRemove} title="Remove access?"
        message={pendingRemove ? `${pendingRemove} will be signed out on their next click. Their Supabase Auth account is not deleted.` : ""}
        confirmLabel="Remove" tone="danger" onConfirm={confirmRemove} onCancel={() => setPendingRemove(null)} />
    </div>
  );
}
