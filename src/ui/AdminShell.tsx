// src/ui/AdminShell.tsx — admin top bar + mobile tab bar.
// Bottom nav: Students · Daura · Content · Manage (gear icon).
// Top nav: Students · Daura · Content · Manage (super admin nav links inside Manage).

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CONFIG } from "../lib/config";
import { amISuperAdmin, supabase } from "../lib/supabase";
import { I } from "./Shell";
import { Modal } from "./primitives";

export function AdminTop() {
  const loc = useLocation();
  const p = loc.pathname;
  const on = (k: string) => (p === k || (k !== "/admin" && p.startsWith(k)) ? "active" : "");
  const [superAdmin, setSuperAdmin] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const nav = useNavigate();

  useEffect(() => { amISuperAdmin().then(setSuperAdmin); }, []);

  function requestSignOut() { setConfirmSignOut(true); }
  async function doSignOut() {
    setConfirmSignOut(false);
      await supabase.auth.signOut();
      nav("/", { replace: true });
  }

  return (
    <>
      <div className="top">
        <div className="wrap top-inner">
          <Link to="/admin" className="brand">
            <img src="/logo.svg" className="brand-logo" alt="" />
            <div><div className="brand-name">{CONFIG.short}</div></div>
          </Link>
          <div className="top-nav">
            <Link to="/admin" className={p === "/admin" ? "active" : ""}>Students</Link>
            <Link to="/admin/daura" className={on("/admin/daura")}>Daura</Link>
            <Link to="/admin/content" className={on("/admin/content")}>Content</Link>
            <Link to="/admin/manage" className={on("/admin/manage") || on("/admin/fees") || on("/admin/access") || on("/admin/promotion")}>Manage</Link>
          </div>
          <div className="top-right">
            <button className="pub-portal-link pub-signout" onClick={requestSignOut} title="Sign out">Sign out</button>
          </div>
        </div>
      </div>
      <div className="tabbar">
        <div className="tabbar-inner">
          <Link to="/admin" className={p === "/admin" ? "active" : ""}>{I.user}Students</Link>
          <Link to="/admin/daura" className={on("/admin/daura")}>{I.book}Daura</Link>
          <Link to="/admin/content" className={on("/admin/content")}>{I.folder}Content</Link>
          <Link to="/admin/manage" className={on("/admin/manage") || on("/admin/fees") || on("/admin/access") || on("/admin/promotion")}>{I.gear}Manage</Link>
        </div>
      </div>
    <Modal
      open={confirmSignOut}
      title="Sign out?"
      message="You will need to log in again."
      confirmLabel="Sign out"
      tone="danger"
      onConfirm={doSignOut}
      onCancel={() => setConfirmSignOut(false)}
    />
    </>
  );
}
