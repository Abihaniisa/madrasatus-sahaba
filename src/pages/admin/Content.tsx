import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CONFIG, ALL_CLASSES } from "../../lib/config";
import { loadMaterials } from "../../lib/data";
import type { Material } from "../../types";
import { useRequireAuth, supabase } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { I } from "../../ui/Shell";

export default function Content() {
  const ready = useRequireAuth();
  const [list, setList] = useState<Material[]>([]);
  const [title, setTitle] = useState("");
  const [cls, setCls] = useState("all");
  const [subject, setSubject] = useState("general");
  const [note, setNote] = useState("");
  const [order, setOrder] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() { setList(await loadMaterials(false)); }
  useEffect(() => { if (ready) refresh(); }, [ready]);

  if (!ready) return <div className="body"><div className="wrap"><div className="empty"><div className="t">Checking access…</div></div></div></div>;

  async function addLink() {
    if (!title.trim() || !url.trim()) return;
    setBusy(true);
    await supabase.from("materials").insert({
      title: title.trim(), class_name: cls, subject,
      note: note.trim() || null,
      order_num: order ? parseInt(order, 10) : null,
      kind: "link", url: url.trim(), published: true,
    });
    setTitle(""); setNote(""); setOrder(""); setUrl("");
    setBusy(false); refresh();
  }
  async function remove(id: string) { await supabase.from("materials").delete().eq("id", id); refresh(); }

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap-narrow">
          <div className="crumb"><Link to="/admin">Portal</Link><span>/</span><span className="current">Content</span></div>
          <div className="phead"><div><h1>Content</h1><p className="sub">Upload links and files for students.</p></div></div>
          <div className="card mb4 pad">
            <div className="d3" style={{ marginBottom: 12 }}>Add link</div>
            <div className="stack g3">
              <div className="field"><label>Title</label>
                <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Risalah — complete text" /></div>
              <div className="row g3" style={{ flexWrap: "wrap" }}>
                <div className="field flex1" style={{ minWidth: 150 }}><label>Class</label>
                  <select className="input" value={cls} onChange={e => setCls(e.target.value)}>
                    <option value="all">All classes</option>
                    {ALL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select></div>
                <div className="field flex1" style={{ minWidth: 150 }}><label>Subject</label>
                  <select className="input" value={subject} onChange={e => setSubject(e.target.value)}>
                    <option value="general">General</option>
                    {CONFIG.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select></div>
              </div>
              <div className="row g3" style={{ flexWrap: "wrap" }}>
                <div className="field flex1" style={{ minWidth: 180 }}><label>Note (optional)</label>
                  <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Week 1 revision" /></div>
                <div className="field" style={{ minWidth: 120, maxWidth: 140 }}><label>Order (optional)</label>
                  <input className="input" value={order} onChange={e => setOrder(e.target.value)} inputMode="numeric" placeholder="1, 2, 3..." /></div>
              </div>
              <div className="field"><label>Link</label>
                <input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://" /></div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-primary" disabled={busy} onClick={addLink}>{busy ? "Adding…" : <>{I.plus} Add link</>}</button>
              </div>
            </div>
          </div>
          {list.length === 0 ? (
            <div className="card"><div className="empty"><div className="t">Nothing published yet</div><div className="d">Add a link above to share it with students.</div></div></div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              {list.map(m => (
                <div key={m.id} className="mat">
                  <div className="mat-ico">{m.kind === "file" ? I.file : I.link}</div>
                  <div className="mat-body">
                    <div className="mat-title">{m.title}</div>
                    <div className="mat-meta">
                      {m.class_name !== "all" && <span>{m.class_name}</span>}
                      {m.subject !== "general" && <span>{m.subject}</span>}
                      {m.note && <span style={{ fontStyle: "italic" }}>{m.note}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {m.kind === "link" && m.url && <a className="btn btn-ghost btn-sm" href={m.url} target="_blank" rel="noopener noreferrer">Open</a>}
                    <button className="btn btn-ghost btn-sm" onClick={() => remove(m.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
