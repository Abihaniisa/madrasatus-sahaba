import { CONFIG } from "../lib/config";
import type { FeePayment, Student } from "../lib/types";
import { fmtNGN, methodLabel } from "../lib/fees";

export function Receipt({
  student, payments, amount, paid, balance,
}: {
  student: Student;
  payments: FeePayment[];
  amount: number;
  paid: number;
  balance: number;
}) {
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const receiptNo = payments.length
    ? `R${CONFIG.regYear}-${student.reg_no.split("-").pop()}-${String(payments.length).padStart(2, "0")}`
    : "—";

  return (
    <div className="rc receipt-print" style={{ maxWidth: 620 }}>
      <div className="rc-head">
        <div className="s">{CONFIG.name}</div>
        <h2>Fee Receipt</h2>
        <div className="sub" style={{ marginTop: 4, fontSize: 12 }}>
          Receipt No. {receiptNo} · {today}
        </div>
      </div>

      <div className="rc-meta">
        <div className="r"><span className="k">Student</span><span className="v">{student.name}</span></div>
        <div className="r"><span className="k">Reg. No.</span><span className="v mono">{student.reg_no}</span></div>
        <div className="r"><span className="k">Class</span><span className="v">{student.class_name}</span></div>
        <div className="r"><span className="k">Session</span><span className="v">{CONFIG.sessionLabel}</span></div>
      </div>

      <table className="rt" style={{ fontSize: 13 }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Method</th>
            <th>Reference</th>
            <th style={{ textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 ? (
            <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--ink-3)" }}>No payments recorded</td></tr>
          ) : payments.map(p => (
            <tr key={p.id}>
              <td>{new Date(p.paid_on).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
              <td>{methodLabel(p.method)}</td>
              <td className="mono" style={{ fontSize: 11.5 }}>{p.reference || "—"}</td>
              <td className="n">{fmtNGN(p.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rc-sum">
        <div className="it"><div className="l">Fee Due</div><div className="v">{fmtNGN(amount)}</div></div>
        <div className="it"><div className="l">Total Paid</div><div className="v">{fmtNGN(paid)}</div></div>
        <div className="it"><div className="l">Balance</div><div className="v">{fmtNGN(balance)}</div></div>
      </div>

      <div className="rc-foot">
        <div>This receipt is issued for the payments recorded above.</div>
        <div className="rc-sign">
          <div>Recorded by</div>
          <div>Head of School</div>
        </div>
      </div>
    </div>
  );
}
