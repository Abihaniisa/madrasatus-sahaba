import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CONFIG } from "../lib/config";
import { amISuperAdmin } from "../lib/access";
import { supabase } from "../lib/supabase";
import { I } from "./Layout";

export function AdminTop({ mode, onMode }: { mode: "view" | "manage"; onMode: (m: "view" | "manage") => void }) {
  const loc = useLocation();
  const p = loc.pathname;
  const on = (k: string) => (p === k ? "active" : "");
  const [superAdmin, setSuperAdmin] = useState(false);

  useEffect(() => { amISuperAdmin().then(setSuperAdmin); }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <>
      <div className="top">
        <div className="wrap top-inner">
          <Link to="/admin" className="brand">
            <div className="brand-mark">M</div>
            <div>
              <div className="brand-name">{CONFIG.short}</div>
            </div>
          </Link>
          <div className="top-nav">
            <Link to="/admin" className={on("/admin")}>Students</Link>
            <Link to="/admin/daura" className={on("/admin/daura")}>Daura</Link>
            <Link to="/admin/content" className={on("/admin/content")}>Content</Link>
            <Link to="/admin/fees" className={on("/admin/fees")}>Fees</Link>
            {superAdmin && <Link to="/admin/promotion" className={on("/admin/promotion")}>End of Session</Link>}
            {superAdmin && <Link to="/admin/access" className={on("/admin/access")}>Access</Link>}
          </div>
          <div className="top-right">
            <div className="mode-toggle">
              <button className={mode === "view" ? "active" : ""} onClick={() => onMode("view")}>View</button>
              <button className={mode === "manage" ? "active manage" : ""} onClick={() => onMode("manage")}>Manage</button>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={signOut} title="Sign out">Sign out</button>
          </div>
        </div>
      </div>
      {mode === "manage" && (
        <div className="edit-banner">
          <div className="wrap edit-banner-inner">
            <strong>Manage mode.</strong> Changes are saved automatically.
          </div>
        </div>
      )}
      <div className="tabbar">
        <div className="tabbar-inner">
          <Link to="/admin" className={on("/admin")}>{I.user}Students</Link>
          <Link to="/admin/daura" className={on("/admin/daura")}>{I.book}Daura</Link>
          <Link to="/admin/content" className={on("/admin/content")}>{I.folder}Content</Link>
          <Link to="/admin/fees" className={on("/admin/fees")}>{I.money}Fees</Link>
        </div>
      </div>
    </>
  );
}
