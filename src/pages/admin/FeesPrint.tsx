// src/pages/admin/FeesPrint.tsx — batch print receipts.
// Reads ?ids=id1,id2,id3 from URL. One A5 receipt per payment. Auto-print on load.

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CONFIG } from "../../lib/config";
import { loadSchool, type SchoolData } from "../../lib/data";
import { useRequireAuth } from "../../lib/supabase";
import { I } from "../../ui/Shell";
import { computeFee } from "../../lib/calc";
import { Receipt } from "../../documents/Receipt";

export default function FeesPrint() {
  const ready = useRequireAuth();
  const [data, setData] = useState<SchoolData | null>(null);
  const [params] = useSearchParams();
  const ids = (params.get("ids") ?? "").split(",").filter(Boolean);
  const focus = params.get("focus");

  useEffect(() => { loadSchool().then(setData); }, []);
  const rows = useMemo(() => {
    if (!data) return [];
    const out: { student: any; payment: any; amount: number; paid: number; balance: number }[] = [];
    for (const sid of ids) {
      const student = data.students.find(s => s.id === sid);
      if (!student) continue;
      const allPayments = data.feePayments.filter(p => p.student_id === student.id);
      const c = computeFee(student.id, data.fees, data.feePayments);
      const filtered = focus ? allPayments.filter(p => p.id === focus) : allPayments;
      const sorted = filtered.sort((a, b) => (a.paid_on ?? "").localeCompare(b.paid_on ?? ""));
      for (const p of sorted) {
        out.push({ student, payment: p, amount: c.amount, paid: c.paid, balance: c.balance });
      }
    }
    return out;
  }, [data, ids.join(","), focus]);

  useEffect(() => {
    if (!data) return;
    if (rows.length === 0) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [data, rows.length]);



  if (!ready || !data) return <div className="body"><div className="wrap"><div style={{ minHeight: 80 }} /></div></div>;

  if (rows.length === 0) {
    return (
      <div className="body">
        <div className="wrap">
          <div className="card pad" style={{ maxWidth: 500, margin: "40px auto", textAlign: "center" }}>
            <div className="d3" style={{ marginBottom: 8 }}>No receipts to print</div>
            <p className="sub" style={{ marginBottom: 16 }}>None of the selected students have any recorded payments.</p>
            <Link to="/admin/fees" className="btn btn-primary">Back to fees</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="no-print body">
        <div className="wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div>
            <h1 className="d2">Printing {rows.length} receipt{rows.length === 1 ? "" : "s"}</h1>
            <p className="sub">One A5 portrait page per receipt. Confirm your print dialog shows A5 portrait.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={() => window.print()}>{I.print} Print now</button>
            <Link to="/admin/fees" className="btn btn-secondary">Close</Link>
          </div>
        </div>
      </div>
      <div className="print-area">
        {rows.map(({ student, payment, amount, paid, balance }) => (
          <div key={payment.id} className="cert-print-wrapper" style={{ marginBottom: 12 }}>
            <Receipt student={student} payment={payment} amount={amount} paid={paid} balance={balance} />
          </div>
        ))}
      </div>
    </div>
  );
}
