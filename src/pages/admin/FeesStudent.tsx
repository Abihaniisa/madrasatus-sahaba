// src/pages/admin/FeesStudent.tsx — one student's full fee record.
// Receipts rendered ON SCREEN, fit-to-screen (A5), print individually or all.

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CONFIG } from "../../lib/config";
import { loadSchool, currentFeeYear, type SchoolData } from "../../lib/data";
import { useRequireAuth, amISuperAdmin, supabase, nextReceiptNo } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { I } from "../../ui/Shell";
import { DelayedSkeleton, Modal } from "../../ui/primitives";
import { computeFee, fmtNGN, methodLabel } from "../../lib/calc";
import { Receipt } from "../../documents/Receipt";
import type { FeePayment } from "../../types";

export default function FeesStudent() {
  const ready = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SchoolData | null>(null);
  const [isSuper, setIsSuper] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<FeePayment["method"]>("cash");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));

  async function reload() { setData(await loadSchool()); }

  useEffect(() => {
    loadSchool().then(setData);
    amISuperAdmin().then(setIsSuper);
  }, []);

  const student = data?.students.find(s => s.id === id);

  const payments = useMemo(() => {
    if (!data || !student) return [];
    return data.feePayments
      .filter(p => p.student_id === student.id)
      .sort((a, b) => (b.paid_on ?? "").localeCompare(a.paid_on ?? ""));
  }, [data, student]);

  const feeCalc = useMemo(() => {
    if (!data || !student) return null;
    return computeFee(student.id, data.fees, data.feePayments);
  }, [data, student]);

  useEffect(() => {
    if (feeCalc && !showAdd) setAmount(String(feeCalc.balance || CONFIG.registrationFee));
  }, [feeCalc, showAdd]);

  async function addPayment() {
    if (!student) return;
    const n = parseInt(amount, 10);
    if (!n || n <= 0) { setErr("Amount must be greater than 0."); return; }
    setBusy(true); setErr(null);
    const rn = await nextReceiptNo(student.id, currentFeeYear(), student.reg_no);
    if (rn.error) { setBusy(false); setErr("Receipt number: " + rn.error); return; }
    const { error } = await supabase.from("fee_payments").insert({
      student_id: student.id, year: currentFeeYear(), amount: n, method,
      reference: reference.trim() || null, note: note.trim() || null, paid_on: paidOn,
      receipt_no: rn.receiptNo,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setShowAdd(false); setReference(""); setNote("");
    await reload();
  }

  async function deletePayment(pid: string) {
    await supabase.from("fee_payments").delete().eq("id", pid);
    setConfirmDelete(null);
    await reload();
  }

  if (!ready || !data) return <div className="body"><div className="wrap"><DelayedSkeleton ready={!!data} rows={5} /></div></div>;
  if (!student) return <div className="body"><div className="wrap"><div className="empty"><div className="t">Student not found</div></div></div></div>;

  const fee = data.fees.find(f => f.student_id === student.id && f.year === currentFeeYear());
  const feeAmount = fee?.amount ?? CONFIG.registrationFee;
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, feeAmount - totalPaid);

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap">
          <div className="crumb no-print">
            <Link to="/admin">Portal</Link><span>/</span>
            <Link to="/admin/fees">Fees</Link><span>/</span>
            <span className="current">{student.name}</span>
          </div>
          <div className="phead no-print">
            <div>
              <h1>{student.name}</h1>
              <p className="sub">{student.reg_no} · {student.class_name} · {CONFIG.sessionLabel}</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {payments.length > 0 && <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/admin/fees/print?ids=${student.id}`)}>{I.print} Print all</button>}
              {isSuper && <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(v => !v)}>{I.plus} {showAdd ? "Cancel" : "Record payment"}</button>}
            </div>
          </div>

          <div className="summary no-print" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 16 }}>
            <div className="it"><div className="l">Fee Due</div><div className="v">{fmtNGN(feeAmount)}</div></div>
            <div className="it"><div className="l">Paid</div><div className="v">{fmtNGN(totalPaid)}</div></div>
            <div className="it"><div className="l">Balance</div><div className="v">{fmtNGN(balance)}</div></div>
          </div>

          {showAdd && (
            <div className="card pad mb4 no-print" style={{ background: "var(--muted)" }}>
              <div className="d3" style={{ marginBottom: 12 }}>Record payment</div>
              <div className="stack g3">
                <div className="row g3" style={{ flexWrap: "wrap" }}>
                  <div className="field flex1" style={{ minWidth: 140 }}><label>Amount</label>
                    <input className="input" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ""))} /></div>
                  <div className="field flex1" style={{ minWidth: 140 }}><label>Date</label>
                    <input className="input" type="date" value={paidOn} onChange={e => setPaidOn(e.target.value)} /></div>
                </div>
                <div className="field"><label>Method</label>
                  <div className="chip-line" style={{ marginBottom: 0 }}>
                    {(["cash", "transfer", "pos", "other"] as FeePayment["method"][]).map(m => (
                      <button key={m} type="button" className={"chip-f " + (method === m ? "active" : "")} onClick={() => setMethod(m)}>{methodLabel(m)}</button>
                    ))}
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

          {payments.length === 0 ? (
            <div className="card no-print"><div className="empty"><div className="t">No payments yet</div><div className="d">Record a payment to generate the first receipt.</div></div></div>
          ) : (
            <>
              <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <div className="d3">Receipts ({payments.length})</div>
              </div>
              {payments.map(p => (
                <div key={p.id} style={{ marginBottom: 20 }}>
                  <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
                    <div className="sub" style={{ fontSize: 12.5 }}>
                      {new Date(p.paid_on).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      {" · "}{fmtNGN(p.amount)}
                      {p.receipt_no ? " · " + p.receipt_no : ""}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/admin/fees/print?ids=${student.id}&focus=${p.id}`)}>{I.print} Print</button>
                      {isSuper && <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => setConfirmDelete(p.id)}>Delete</button>}
                    </div>
                  </div>
                  <div className="cert-print-wrapper">
                    <Receipt student={student} payment={p} amount={feeAmount} paid={totalPaid} balance={balance} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
      <Modal open={!!confirmDelete} title="Delete this payment?" message="The payment will be removed and the fee balance recalculated. This cannot be undone."
        confirmLabel="Delete" tone="danger" onConfirm={() => confirmDelete && deletePayment(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
    </div>
  );
}
