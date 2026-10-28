// src/pages/admin/Fees.tsx — landing: global search across all students + class list.
// Class detail: Paid / Partial / Unpaid filters, checkbox per row, batch print within class.

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CONFIG, SECTIONS, ALL_CLASSES } from "../../lib/config";
import { loadSchool, type SchoolData } from "../../lib/data";
import { useRequireAuth } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { I, waLink } from "../../ui/Shell";
import { DelayedSkeleton } from "../../ui/primitives";
import { computeFee, fmtNGN, type FeeStatus } from "../../lib/calc";
import { invalidateSchoolCache, currentSchoolSession } from "../../lib/data";
import { getSettings } from "../../lib/settings";
import type { Student } from "../../types";

export default function Fees() {
  const ready = useRequireAuth();
  const [data, setData] = useState<SchoolData | null>(null);
  const [scope, setScope] = useState<string>("all");
  const [q, setQ] = useState("");
  const [inClass, setInClass] = useState<string | null>(null);
  useEffect(() => { loadSchool().then(setData); }, []);

  if (!ready || !data) return <div className="body"><div className="wrap"><DelayedSkeleton ready={!!data} rows={5} /></div></div>;
  if (inClass) return <ClassDetail cls={inClass} data={data} onBack={() => setInClass(null)} />;

  const scopes = [{ id: "all", label: "All" }, { id: "foundation", label: "Foundation" }, { id: "secondary", label: "Secondary" }, { id: "higher", label: "Higher" }];
  const classesToShow = scope === "all" ? ALL_CLASSES : (SECTIONS.find(s => s.id === scope)?.classes ?? []);
  const ql = q.trim().toLowerCase();
  const searchResults = ql.length >= 2
    ? data.students.filter(s => s.name.toLowerCase().includes(ql) || s.reg_no.toLowerCase().includes(ql)).slice(0, 20)
    : [];

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap">
          <div className="crumb"><Link to="/admin">Portal</Link><span>/</span><span className="current">Fees</span></div>
          <div className="phead">
            <div><h1>Fees</h1><p className="sub">Registration fee · {data ? currentSchoolSession(data) : getSettings().session_label} · {fmtNGN(CONFIG.registrationFee)} per student</p></div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <input className="input" placeholder="Search any student by name or Reg. No." value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 420 }} />
          </div>

          {ql.length >= 2 && (
            <div className="card mb4" style={{ overflow: "hidden" }}>
              {searchResults.length === 0 ? (
                <div className="empty" style={{ padding: "20px" }}><div className="d">No students match "{q}"</div></div>
              ) : (
                searchResults.map(s => (
                  <Link key={s.id} to={`/admin/fees/student/${s.id}`}
                    style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--line)", color: "inherit" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>{s.reg_no}</div>
                    </div>
                    <span className="pill pill-neutral">{s.class_name}</span>
                    <span style={{ color: "var(--ink-4)" }}>{I.arrow}</span>
                  </Link>
                ))
              )}
            </div>
          )}

          <div className="chip-line">
            {scopes.map(sc => <button key={sc.id} className={"chip-f " + (scope === sc.id ? "active" : "")} onClick={() => setScope(sc.id)}>{sc.label}</button>)}
          </div>

          <div className="fee-sum">
            {classesToShow.map(cls => {
              const students = data.students.filter(s => s.class_name === cls);
              if (students.length === 0) return null;
              let paid = 0;
              for (const s of students) {
                const c = computeFee(s.id, data.fees, data.feePayments);
                if (c.status === "paid" || c.status === "scholarship") paid++;
              }
              const unpaid = students.length - paid;
              const tone = unpaid === 0 ? "paid" : paid === 0 ? "due" : "mixed";
              return (
                <button key={cls} className="fee-sum-row" onClick={() => setInClass(cls)}>
                  <div><div className="cname">{cls}</div><div className="cmeta">{students.length} students</div></div>
                  <div className={"stat " + tone}><div className="num">{paid}</div><div className="lbl">Paid</div></div>
                  <div className={"stat " + (unpaid === 0 ? "paid" : "due")}><div className="num">{unpaid}</div><div className="lbl">Unpaid</div></div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

type StatusFilter = "paid" | "unpaid";

function ClassDetail({ cls, data, onBack }: { cls: string; data: SchoolData; onBack: () => void }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusFilter>("unpaid");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const students = data.students.filter(s => s.class_name === cls);
  const withStatus = useMemo(() => {
    return students
      .map(s => ({ s, c: computeFee(s.id, data.fees, data.feePayments) }))
      .sort((a, b) => a.s.name.localeCompare(b.s.name));
  }, [students, data]);

  const filtered = useMemo(() => {
    if (status === "paid") return withStatus.filter(x => x.c.status === "paid" || x.c.status === "scholarship");
    return withStatus.filter(x => x.c.status === "unpaid" || x.c.status === "partial");
  }, [withStatus, status]);

  const counts = useMemo(() => ({
    paid: withStatus.filter(x => x.c.status === "paid" || x.c.status === "scholarship").length,
    unpaid: withStatus.filter(x => x.c.status === "unpaid" || x.c.status === "partial").length,
  }), [withStatus]);

  const selectedIds = Object.keys(selected).filter(id => selected[id]);
  function toggle(id: string) { setSelected(prev => ({ ...prev, [id]: !prev[id] })); }
  function selectAllVisible() { setSelected(prev => { const n = { ...prev }; for (const { s } of filtered) n[s.id] = true; return n; }); }
  function clearAll() { setSelected({}); }
  function printSelected() {
    if (selectedIds.length === 0) return;
    navigate(`/admin/fees/print?ids=${selectedIds.join(",")}`);
  }

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap">
          <div className="crumb">
            <Link to="/admin">Portal</Link><span>/</span>
            <button onClick={onBack} style={{ color: "inherit", font: "inherit", padding: 0, background: "none", border: 0, cursor: "pointer" }}>Fees</button>
            <span>/</span><span className="current">{cls}</span>
          </div>
          <div className="phead">
            <div><h1>{cls}</h1><p className="sub">{students.length} students · {counts.unpaid} not fully paid · {currentSchoolSession(data)}</p></div>
            <button className="btn btn-secondary btn-sm" onClick={onBack}>{I.back} All classes</button>
          </div>

          <div className="chip-line">
            <button className={"chip-f " + (status === "paid" ? "active" : "")} onClick={() => setStatus("paid")}>Paid ({counts.paid})</button>
            <button className={"chip-f " + (status === "unpaid" ? "active" : "")} onClick={() => setStatus("unpaid")}>Unpaid ({counts.unpaid})</button>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            {selectedIds.length > 0 ? (
              <>
                <button className="btn btn-primary btn-sm" onClick={printSelected}>{I.print} Print {selectedIds.length} receipt{selectedIds.length === 1 ? "" : "s"}</button>
                <button className="btn btn-ghost btn-sm" onClick={clearAll}>Clear</button>
              </>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={selectAllVisible}>Select all shown</button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="card"><div className="empty"><div className="t">No students {status === "paid" ? "paid in full" : "with outstanding balance"}</div></div></div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              {filtered.map(({ s, c }) => {
                const tone = c.status === "paid" ? "success" : c.status === "partial" ? "warning" : c.status === "scholarship" ? "info" : "danger";
                const label = c.status === "paid" ? "Paid in full" : c.status === "partial" ? "Partial" : c.status === "scholarship" ? "Scholarship" : "Unpaid";
                const canSelect = c.paid > 0;
                return (
                  <div key={s.id} style={{ display: "grid", gridTemplateColumns: "24px minmax(0, 1fr) auto", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {canSelect && (
                        <input type="checkbox" checked={!!selected[s.id]} onChange={() => toggle(s.id)} onClick={e => e.stopPropagation()} style={{ cursor: "pointer", width: 18, height: 18 }} />
                      )}
                    </div>
                    <button onClick={() => navigate(`/admin/fees/student/${s.id}`)}
                      style={{ background: "none", border: 0, textAlign: "left", padding: 0, cursor: "pointer", minWidth: 0, width: "100%" }}>
                      <div style={{ fontWeight: 500, fontSize: 14, color: "var(--ink)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, lineHeight: 1.3 }}>{s.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--mono)", marginTop: 2 }}>{s.reg_no}</div>
                      <div style={{ fontSize: 11.5, color: c.balance > 0 ? "var(--warning)" : "var(--ink-3)", marginTop: 2, fontWeight: c.balance > 0 ? 600 : 400 }}>
                        {c.balance > 0 ? "Balance " + fmtNGN(c.balance) : "Paid in full"}
                      </div>
                    </button>
                    <span className={"pill pill-dot pill-" + tone} style={{ whiteSpace: "nowrap" }}>{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
