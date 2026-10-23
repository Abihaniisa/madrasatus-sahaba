import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CONFIG, SECTIONS, ALL_CLASSES } from "../../lib/config";
import { loadSchool, type SchoolData } from "../../lib/data";
import { useRequireAuth, amISuperAdmin } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { I, waLink } from "../../ui/Shell";
import { DelayedSkeleton } from "../../ui/primitives";
import { computeFee, fmtNGN, type FeeStatus } from "../../lib/calc";
import type { Student } from "../../types";
import { FeePanel } from "./FeePanel";

export default function Fees() {
  const ready = useRequireAuth();
  const [data, setData] = useState<SchoolData | null>(null);
  const [scope, setScope] = useState<string>("all");
  const [inClass, setInClass] = useState<string | null>(null);
  const [isSuper, setIsSuper] = useState(false);
  async function reload() { setData(await loadSchool()); }
  useEffect(() => { loadSchool().then(setData); amISuperAdmin().then(setIsSuper); }, []);

  if (!ready) return <div className="body"><div className="wrap"><DelayedSkeleton ready={false} rows={5} /></div></div>;
  if (!data) return <div className="body"><div className="wrap"><DelayedSkeleton ready={false} rows={5} /></div></div>;
  if (inClass) return <ClassDetail cls={inClass} data={data} onBack={() => setInClass(null)} isSuper={isSuper} onRefresh={reload} />;

  const scopes = [{ id: "all", label: "All" }, { id: "foundation", label: "Foundation" }, { id: "secondary", label: "Secondary" }, { id: "higher", label: "Higher" }];
  const classesToShow = scope === "all" ? ALL_CLASSES : (SECTIONS.find(s => s.id === scope)?.classes ?? []);

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap">
          <div className="crumb"><Link to="/admin">Portal</Link><span>/</span><span className="current">Fees</span></div>
          <div className="phead">
            <div><h1>Fees</h1><p className="sub">Registration fee · {CONFIG.sessionLabel} · {fmtNGN(CONFIG.registrationFee)} per student</p></div>
          </div>
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

function ClassDetail({ cls, data, onBack, isSuper, onRefresh }: { cls: string; data: SchoolData; onBack: () => void; isSuper: boolean; onRefresh: () => void }) {
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [copied, setCopied] = useState(false);
  const students = data.students.filter(s => s.class_name === cls);
  const order: Record<FeeStatus, number> = { unpaid: 0, partial: 1, scholarship: 2, paid: 3 };
  const sorted = [...students].sort((a, b) => {
    const ca = computeFee(a.id, data.fees, data.feePayments).status;
    const cb = computeFee(b.id, data.fees, data.feePayments).status;
    if (order[ca] !== order[cb]) return order[ca] - order[cb];
    return a.name.localeCompare(b.name);
  });
  const unpaidStudents = sorted.filter(s => {
    const st = computeFee(s.id, data.fees, data.feePayments).status;
    return st === "unpaid" || st === "partial";
  });
  async function copyUnpaidPhones() {
    const phones = unpaidStudents.map(s => {
      const raw = s.student_phone || s.guardian_phone || "";
      const digits = raw.replace(/[^0-9]/g, "");
      if (!digits) return null;
      return digits.startsWith("234") ? "+" + digits : digits.startsWith("0") ? "+234" + digits.slice(1) : "+234" + digits;
    }).filter((p): p is string => !!p);
    if (!phones.length) return;
    try { await navigator.clipboard.writeText(phones.join(", ")); }
    catch {
      const ta = document.createElement("textarea"); ta.value = phones.join(", ");
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2200);
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
            <div><h1>{cls}</h1><p className="sub">{students.length - unpaidStudents.length} paid · {unpaidStudents.length} unpaid · {CONFIG.sessionLabel}</p></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {unpaidStudents.length > 0 && <button className="btn btn-secondary btn-sm" onClick={copyUnpaidPhones}>{copied ? <>{I.check} Copied</> : <>{I.link} Copy unpaid numbers</>}</button>}
              <button className="btn btn-secondary btn-sm" onClick={onBack}>{I.back} All classes</button>
            </div>
          </div>
          {unpaidStudents.length > 0 && <div className="notice" style={{ marginBottom: 12 }}>Copy unpaid phone numbers into a WhatsApp Broadcast List to send one reminder to all.</div>}
          <div className="card" style={{ overflow: "hidden" }}>
            {sorted.map(s => {
              const c = computeFee(s.id, data.fees, data.feePayments);
              const tone = c.status === "paid" ? "success" : c.status === "partial" ? "warning" : c.status === "scholarship" ? "info" : "danger";
              const label = c.status === "paid" ? "Paid" : c.status === "partial" ? "Partial" : c.status === "scholarship" ? "Scholarship" : "Unpaid";
              const phone = (s.student_phone || s.guardian_phone || "").replace(/[^0-9+]/g, "");
              const showRemind = c.status !== "paid" && c.status !== "scholarship" && phone;
              return (
                <div key={s.id} className="fee-student">
                  <div className="avatar">{(s.name[0] ?? "") + (s.name.split(/\s+/)[1]?.[0] ?? "")}</div>
                  <button onClick={() => setActiveStudent(s)} style={{ background: "none", border: 0, textAlign: "left", padding: 0, cursor: "pointer", minWidth: 0 }}>
                    <div className="sname">{s.name}</div>
                    <div className="sid">{s.reg_no}{phone ? ` · ${phone}` : ""}</div>
                  </button>
                  <div className="num">{fmtNGN(c.paid)}<span className="lbl">Paid</span></div>
                  <div className="num" style={{ color: c.balance > 0 ? "var(--warning)" : undefined }}>{fmtNGN(c.balance)}<span className="lbl">Balance</span></div>
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
                    <span className={"pill pill-dot pill-" + tone}>{label}</span>
                    {showRemind && <a className="btn btn-wa btn-sm" href={waLink(phone, `As-salamu alaykum. A reminder about the registration fee for ${s.name} (${s.reg_no}).`)} target="_blank" rel="noopener noreferrer">{I.whatsapp} Remind</a>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {activeStudent && <FeePanel student={activeStudent} data={data} isSuper={isSuper} onClose={() => setActiveStudent(null)} onRefresh={onRefresh} />}
    </div>
  );
}
