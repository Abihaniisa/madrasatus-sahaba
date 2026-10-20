import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { amISuperAdmin } from "../../lib/access";
import { useRequireAuth } from "../../lib/auth";
import { useMode } from "../../lib/mode";
import { AdminTop } from "../../components/AdminTop";
import { DelayedSkeleton } from "../../components/Skeleton";
import { I } from "../../components/Layout";

const ITEMS = [
  { to: "/admin/settings", title: "School Settings", desc: "Update session dates, semester, and registration year.", icon: I.folder },
  { to: "/admin/access", title: "Access Control", desc: "Choose who can sign in and manage admins.", icon: I.user },
  { to: "/admin/promotion", title: "End of Session", desc: "Promote, repeat or graduate students at the close of a session.", icon: I.check },
];

export default function Manage() {
  const ready = useRequireAuth();
  const [mode, setMode] = useMode();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => { amISuperAdmin().then(setAllowed).catch(() => setAllowed(false)); }, []);

  if (!ready || allowed === null) return <div className="body"><div className="wrap"><DelayedSkeleton ready={false} rows={3} /></div></div>;
  if (!allowed) return <Navigate to="/admin" replace />;

  return (
    <div>
      <AdminTop mode={mode} onMode={setMode} />
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
