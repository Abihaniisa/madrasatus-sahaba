import { useState } from "react";
import { CONFIG } from "../../lib/config";
import { supabase } from "../../lib/supabase";
import { computeFee, fmtNGN, methodLabel } from "../../lib/calc";
import { Modal } from "../../ui/primitives";
import { I } from "../../ui/Shell";
import { Receipt } from "../../documents/Receipt";
import type { FeePayment, Student } from "../../types";
import type { SchoolData } from "../../lib/data";

export function FeePanel({ student, data, isSuper, onClose, onRefresh }: {
  student: Student; data: SchoolData; isSuper: boolean; onClose: () => void; onRefresh: () => void;
}) {
  const c = computeFee(student.id, data.fees, data.feePayments);
  const [showAdd, setShowAdd] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [amount, setAmount] = useState(String(c.balance || CONFIG.registrationFee));
  const [method, setMethod] = useState<FeePayment["method"]>("cash");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function addPayment() {
    const n = parseInt(amount, 10);
    if (!n || n <= 0) { setErr("Amount must be greater than 0."); return; }
    setBusy(true); setErr(null);
    const { error } = await supabase.from("fee_payments").insert({
      student_id: student.id, year: CONFIG.regYear, amount: n, method,
      reference: reference.trim() || null, note: note.trim() || null, paid_on: paidOn,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setShowAdd(false); setAmount(""); setReference(""); setNote(""); onRefresh();
  }
  async function deletePayment(id: string) {
    await supabase.from("fee_payments").delete().eq("id", id);
    setConfirmDelete(null); onRefresh();
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ alignItems: "flex-start", paddingTop: 40, overflowY: "auto" }}>
      <div className="modal-card" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div className="d3">{student.name}</div>
            <div className="sub" style={{ marginTop: 3 }}>{student.reg_no} · {student.class_name}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="summary" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 16 }}>
          <div className="it"><div className="l">Amount</div><div className="v">{fmtNGN(c.amount)}</div></div>
          <div className="it"><div className="l">Paid</div><div className="v">{fmtNGN(c.paid)}</div></div>
          <div className="it"><div className="l">Balance</div><div className="v">{fmtNGN(c.balance)}</div></div>
        </div>
        <div className="d3" style={{ marginBottom: 8 }}>Payment history</div>
        {c.payments.length === 0 ? (
          <p className="sub" style={{ marginBottom: 16 }}>No payments recorded yet.</p>
        ) : (
          <table className="rt" style={{ fontSize: 13, marginBottom: 16 }}>
            <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th style={{ textAlign: "right" }}>Amount</th>{isSuper && <th></th>}</tr></thead>
            <tbody>
              {c.payments.map(p => (
                <tr key={p.id}>
                  <td>{new Date(p.paid_on).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td>{methodLabel(p.method)}</td>
                  <td className="mono" style={{ fontSize: 11.5 }}>{p.reference || "—"}</td>
                  <td className="n">{fmtNGN(p.amount)}</td>
                  {isSuper && <td className="n"><button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => setConfirmDelete(p.id)}>Delete</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!showAdd && (
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            {c.payments.length > 0 && <button className="btn btn-secondary" onClick={() => setShowReceipt(true)}>{I.print} Print receipt</button>}
            {isSuper && c.status !== "scholarship" && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>{I.plus} Record payment</button>}
            {!isSuper && <span className="sub" style={{ alignSelf: "center" }}>Only super admin records payments.</span>}
          </div>
        )}
        {showAdd && (
          <div className="card pad" style={{ background: "var(--muted)" }}>
            <div className="d3" style={{ marginBottom: 12 }}>Record payment</div>
            <div className="stack g3">
              <div className="row g3" style={{ flexWrap: "wrap" }}>
                <div className="field flex1" style={{ minWidth: 140 }}><label>Amount</label>
                  <input className="input" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ""))} /></div>
                <div className="field flex1" style={{ minWidth: 140 }}><label>Date</label>
                  <input className="input" type="date" value={paidOn} onChange={e => setPaidOn(e.target.value)} /></div>
              </div>
              <div className="row g3" style={{ flexWrap: "wrap" }}>
                <div className="field flex1" style={{ minWidth: 160 }}><label>Method</label>
                  <div className="chip-line" style={{ marginBottom: 0 }}>
                    {(["cash", "transfer", "pos", "other"] as FeePayment["method"][]).map(m => (
                      <button key={m} type="button" className={"chip-f " + (method === m ? "active" : "")} onClick={() => setMethod(m)}>{methodLabel(m)}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="field"><label>Reference <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional)</span></label>
                <input className="input" value={reference} onChange={e => setReference(e.target.value)} /></div>
              <div className="field"><label>Note <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional)</span></label>
                <input className="input" value={note} onChange={e => setNote(e.target.value)} /></div>
              {err && <div className="notice">{err}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => { setShowAdd(false); setErr(null); }}>Cancel</button>
                <button className="btn btn-primary" disabled={busy} onClick={addPayment}>{busy ? "Saving…" : "Save payment"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Modal open={!!confirmDelete} title="Delete this payment?" message="The payment will be removed and the fee balance recalculated."
        confirmLabel="Delete" tone="danger" onConfirm={() => confirmDelete && deletePayment(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
      {showReceipt && (
        <div className="modal-backdrop" style={{ background: "#fff", alignItems: "flex-start", paddingTop: 20, zIndex: 300 }} onClick={() => setShowReceipt(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 660 }}>
            <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowReceipt(false)}>Close</button>
              <button className="btn btn-primary btn-sm" onClick={() => window.print()}>{I.print} Print</button>
            </div>
            <Receipt student={student} payments={c.payments} amount={c.amount} paid={c.paid} balance={c.balance} />
          </div>
        </div>
      )}
    </div>
  );
}
