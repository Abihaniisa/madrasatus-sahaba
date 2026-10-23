// src/pages/admin/Manage.tsx — super-admin hub. Settings, Access, Promotion, Fees.
// Non-super admins see the page but every action is hidden.

import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { amISuperAdmin } from "../../lib/supabase";
import { useRequireAuth } from "../../lib/supabase";
import { AdminTop } from "../../ui/AdminShell";
import { DelayedSkeleton } from "../../ui/primitives";
import { I } from "../../ui/Shell";

const ITEMS = [
  { to: "/admin/fees", title: "Fees", desc: "Record payments, print receipts, see balances.", icon: I.money },
  { to: "/admin/access", title: "Access Control", desc: "Choose who can sign in and manage admins.", icon: I.user },
  { to: "/admin/promotion", title: "End of Session", desc: "Promote, repeat, or graduate students.", icon: I.check },
];

export default function Manage() {
  const ready = useRequireAuth();
  const [isSuper, setIsSuper] = useState<boolean | null>(null);

  useEffect(() => { amISuperAdmin().then(setIsSuper).catch(() => setIsSuper(false)); }, []);

  if (!ready || isSuper === null) return <div className="body"><div className="wrap"><DelayedSkeleton ready={false} rows={3} /></div></div>;
  if (!isSuper) return <Navigate to="/admin" replace />;

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap">
          <div className="phead">
            <div>
              <h1>Manage</h1>
              <p className="sub">Administration tools for super admins.</p>
            </div>
          </div>
          <div className="struct-grid">
            {ITEMS.map((it) => (
              <Link key={it.to} to={it.to} className="struct-card" style={{ display: "block", padding: "20px" }}>
                <div className="title" style={{ color: "var(--primary)", fontSize: 18 }}>
                  <span>{it.title}</span>
                  {it.icon}
                </div>
                <div className="desc" style={{ marginTop: 8 }}>{it.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
