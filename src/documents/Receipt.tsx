// src/documents/Receipt.tsx — Fee Receipt. A5 portrait, premium document family.
// Receipt number comes from fee_payments.receipt_no (stamped at insert, stable).
// Fallback derivation for legacy rows without receipt_no.

import { CONFIG, SECTIONS } from "../lib/config";
import type { FeePayment, Student } from "../types";
import { fmtNGN, methodLabel } from "../lib/calc";

type Props = {
  student: Student;
  payment: FeePayment;
  amount: number;
  paid: number;
  balance: number;
};

function derivedReceiptNo(p: FeePayment, regNo: string): string {
  if (p.receipt_no) return p.receipt_no;
  const parts = regNo.split(/[-/]/);
  const seq = parts[parts.length - 1] || "000";
  return `R${p.year}-${seq}-?`;
}

function fmtDate(iso: string | null | undefined, style: "long" | "short" = "long"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", style === "long"
    ? { day: "numeric", month: "long", year: "numeric" }
    : { day: "2-digit", month: "short", year: "numeric" });
}

export function Receipt({ student, payment, amount, paid, balance }: Props) {
  const sectionName = SECTIONS.find(s => s.id === student.section)?.name ?? student.section;
  const receiptNo = derivedReceiptNo(payment, student.reg_no);
  const issued = fmtDate(new Date().toISOString());
  const paidOn = fmtDate(payment.paid_on);
  const regSeq = student.reg_no.split(/[-/]/).pop() || "—";

  return (
    <div className="doc-stage">
      <div className="rct-doc">
        <style>{STYLES}</style>

        <header className="rct-head">
          <img src="/logo.svg" alt="" />
          <div className="titles">
            <div className="school">{CONFIG.name}</div>
            <div className="doc">Fee Receipt</div>
          </div>
          <img src="/logo.svg" alt="" style={{ visibility: "hidden" }} />
        </header>

        <section className="rct-meta">
          <div><span>Receipt No.</span><b className="mono">{receiptNo}</b></div>
          <div><span>Date issued</span><b>{issued}</b></div>
        </section>

        <section className="rct-info">
          <div><span>Student</span><b>{student.name}</b></div>
          <div><span>Reg. No.</span><b className="mono">{student.reg_no}</b></div>
          <div><span>Class</span><b>{student.class_name}</b></div>
          <div><span>Section</span><b>{sectionName}</b></div>
          <div><span>Session</span><b>{payment.year}</b></div>
        </section>

        <section className="rct-payment">
          <div className="rct-row">
            <div><span>Payment date</span><b>{paidOn}</b></div>
            <div><span>Method</span><b>{methodLabel(payment.method)}</b></div>
          </div>
          <div className="rct-row">
            <div><span>Reference</span><b>{payment.reference || "—"}</b></div>
            <div><span>Amount paid</span><b className="big">{fmtNGN(payment.amount)}</b></div>
          </div>
          {payment.note && (
            <div className="rct-row" style={{ gridTemplateColumns: "1fr" }}>
              <div><span>Note</span><b>{payment.note}</b></div>
            </div>
          )}
        </section>

        <section className="rct-summary">
          <div>
            <small>Fee Due</small>
            <strong>{fmtNGN(amount)}</strong>
          </div>
          <div>
            <small>Total Paid (session)</small>
            <strong>{fmtNGN(paid)}</strong>
          </div>
          <div>
            <small>Balance</small>
            <strong>{fmtNGN(balance)}</strong>
          </div>
        </section>

        <section className="rct-sigs">
          <div className="sig">Bursar<span>Signature &amp; Date</span></div>
          <div className="sig">Head of School<span>Signature, Stamp &amp; Date</span></div>
        </section>

        <footer className="rct-foot">
          This receipt is issued for the payment recorded above.
          Keep it for your records — reprinted copies may be requested
          from the school office quoting the receipt number.
        </footer>
      </div>
    </div>
  );
}

const STYLES = `
  .rct-doc {
    width: var(--rct-w, 148mm); min-height: var(--rct-h, 210mm); margin: 0 auto;
    background: #fffdf7; border: 1mm double #b8923a; padding: 4mm 6mm;
    display: flex; flex-direction: column; gap: 3mm; box-sizing: border-box;
    font-family: Georgia, "Times New Roman", serif; color: #1c2420;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .rct-head { display: flex; align-items: center; justify-content: center; gap: 4mm; border-bottom: 0.5mm solid #1f5a3a; padding-bottom: 2mm; }
  .rct-head img { width: 14mm; height: 14mm; object-fit: contain; flex: none; }
  .rct-head .titles { text-align: center; }
  .rct-head .school { font-size: 11pt; font-weight: bold; color: #143d27; line-height: 1.2; }
  .rct-head .doc { font-size: 10pt; color: #b8923a; letter-spacing: 3pt; text-transform: uppercase; margin-top: 1mm; font-weight: bold; }

  .rct-meta { display: flex; justify-content: space-between; font-family: Arial, sans-serif; font-size: 8.5pt; color: #444; }
  .rct-meta span { display: block; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.6pt; color: #5a6a5f; }
  .rct-meta b { font-size: 9.5pt; color: #143d27; }
  .rct-meta b.mono { font-family: "Courier New", monospace; letter-spacing: 0.5pt; }

  .rct-info { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2mm 5mm; background: #eef3ee; border: 0.3mm solid #c9d6c9; padding: 2.5mm 3.5mm; }
  .rct-info div { display: flex; flex-direction: column; gap: 0.5mm; }
  .rct-info span { color: #5a6a5f; text-transform: uppercase; font-size: 7pt; letter-spacing: 0.6pt; font-family: Arial, sans-serif; }
  .rct-info b { font-size: 10pt; color: #1c2420; }
  .rct-info b.mono { font-family: "Courier New", monospace; font-size: 9.5pt; }

  .rct-payment { border: 0.3mm solid #c9d6c9; padding: 2.5mm 3.5mm; display: flex; flex-direction: column; gap: 2mm; }
  .rct-row { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
  .rct-row > div { display: flex; flex-direction: column; gap: 0.5mm; }
  .rct-row span { color: #5a6a5f; text-transform: uppercase; font-size: 7pt; letter-spacing: 0.6pt; font-family: Arial, sans-serif; }
  .rct-row b { font-size: 10pt; color: #1c2420; }
  .rct-row b.big { font-size: 13pt; color: #143d27; font-weight: bold; }

  .rct-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; border-top: 0.4mm solid #b8923a; padding-top: 2.5mm; }
  .rct-summary > div { border: 0.35mm solid #1f5a3a; padding: 2mm 2mm; text-align: center; background: #eef3ee; }
  .rct-summary small { display: block; font-family: Arial, sans-serif; font-size: 6.5pt; text-transform: uppercase; letter-spacing: 0.6pt; color: #5a6a5f; margin-bottom: 1mm; }
  .rct-summary strong { display: block; font-size: 11pt; font-weight: bold; color: #143d27; line-height: 1.15; }

  .rct-sigs { display: flex; justify-content: space-around; align-items: flex-end; margin-top: auto; padding: 4mm 4mm 0; }
  .rct-sigs .sig { width: 55mm; text-align: center; border-top: 0.35mm solid #1c2420; padding-top: 1.2mm; font-size: 9pt; font-weight: bold; }
  .rct-sigs .sig span { display: block; font-size: 6.5pt; font-weight: normal; color: #666; font-family: Arial, sans-serif; }

  .rct-foot { margin-top: 3mm; padding-top: 2mm; border-top: 0.3mm solid #b8923a; font-family: Arial, sans-serif; font-size: 7pt; color: #555; line-height: 1.5; text-align: center; }

  @page { size: A5 portrait; margin: 6mm; }
  @media print {
    html, body { background: none; }
    .rct-doc { margin: 0; page-break-inside: avoid; break-inside: avoid; }
  }
`;
