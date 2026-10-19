import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CONFIG } from "../lib/config";
import { signIn, supabase, isAuthorized } from "../lib/supabase";
import { saveStudentSession, fetchStudentPortal } from "../lib/student";

export default function Login() {
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Strip every whitespace from the identifier. Emails have no valid
  // internal spaces; NINs are 11 digits; reg_no is normalized in the DB.
  // Stripping only helps — it can never corrupt a valid value.
  const cleanId = identifier.replace(/\s+/g, "");
  const isStudentId = /^\d{11}$/.test(cleanId);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    // Password: outer spaces trimmed (keyboard typo), inner spaces kept
    // exactly — they may be part of the secret.
    const sec = secret.trim();

    if (cleanId.includes("@")) {
      const { error } = await signIn(cleanId, sec);
      if (error) { setErr(error.message); setBusy(false); return; }
      const ok = await isAuthorized();
      if (!ok) { await supabase.auth.signOut(); setErr("Not authorized."); setBusy(false); return; }
      setBusy(false);
      nav("/admin");
      return;
    }

    if (isStudentId) {
      const res = await fetchStudentPortal(cleanId, sec.toUpperCase());
      if (!res.ok) { setErr(res.error || "NIN and Reg. No. do not match."); setBusy(false); return; }
      saveStudentSession(cleanId, sec.toUpperCase());
      setBusy(false);
      nav("/me");
      return;
    }

    setErr("Enter an email (for staff) or your 11-digit NIN (for students).");
    setBusy(false);
  }

  return (
    <div className="login-shell">
      <div className="login-card" style={{ maxWidth: 420 }}>
        <img src="/logo.svg" alt="" width={60} height={60} style={{ display: "block", margin: "0 auto 18px" }} />
        <h1>Sign in</h1>
        <p className="sub">{CONFIG.short}</p>

        {/* Veritas — verified credentials banner */}
        <a
          href="https://veritas-verify.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            margin: "16px 0 20px",
            border: "1px solid var(--line)",
            borderRadius: 10,
            textDecoration: "none",
            color: "var(--ink)",
            transition: "border-color .15s",
          }}
        >
          <img
            src="/veritas-logo.svg"
            alt=""
            width={28}
            height={28}
            style={{ display: "block", flexShrink: 0 }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
              Veritas
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.3 }}>
              Sahaba certificates, verifiable on Veritas.
            </div>
          </div>
          <div style={{ color: "var(--primary)", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
            Open →
          </div>
        </a>

        <form className="login-form" onSubmit={onSubmit}>
          <div className="field">
            <label>{isStudentId ? "NIN (11 digits)" : "Email address"}</label>
            <input
              className="input"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="Staff: email · Student: 11-digit NIN"
              required
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label>{isStudentId ? "Registration number" : "Password"}</label>
            <input
              className="input"
              type={isStudentId ? "text" : "password"}
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder={isStudentId ? "2026/MS/001" : "••••••••"}
              required
              autoComplete={isStudentId ? "off" : "current-password"}
              autoCapitalize={isStudentId ? "characters" : "none"}
            />
          </div>
          {err && <div className="notice">{err}</div>}
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <Link to="/" className="login-public" style={{ marginTop: 20 }}>← Back to public site</Link>
      </div>
    </div>
  );
}
