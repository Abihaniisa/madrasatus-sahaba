// src/pages/Login.tsx — unified staff + student login.
// Detects student by 11-digit NIN; staff by email; falls through to error.
// The Staff/Student toggle is visual only — it changes placeholder text.
// The actual login flow auto-detects from the input, so both tabs work the same.

import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CONFIG } from "../lib/config";
import { signIn, supabase, isAuthorized, saveStudentSession, fetchStudentPortal } from "../lib/supabase";

type Mode = "staff" | "student";

export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("staff");
  const [identifier, setIdentifier] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cleanId = identifier.replace(/\s+/g, "");
  const isStudentId = /^\d{11}$/.test(cleanId);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
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
      if (!res.ok) { setErr(res.error || "Invalid credentials."); setBusy(false); return; }
      saveStudentSession(cleanId, sec.toUpperCase());
      setBusy(false);
      nav("/me");
      return;
    }

    setErr("Enter an email (for staff) or your 11-digit NIN (for students).");
    setBusy(false);
  }

  const showStudentPlaceholders = mode === "student";

  return (
    <div className="login-shell">
      <Link to="/" className="login-back-float">← Back to public site</Link>

      <div className="login-card">
        <style>{STYLES}</style>

        <img src="/logo.svg" alt="" className="login-logo" />

        <h1 className="login-title">Sign in</h1>
        <p className="login-sub">{CONFIG.short}</p>

        <div className="login-modes" role="tablist" aria-label="Login type">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "staff"}
            className={"login-mode" + (mode === "staff" ? " is-active" : "")}
            onClick={() => setMode("staff")}
          >
            Staff
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "student"}
            className={"login-mode" + (mode === "student" ? " is-active" : "")}
            onClick={() => setMode("student")}
          >
            Student
          </button>
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="login-id">{showStudentPlaceholders ? "NIN (11 digits)" : "Email address"}</label>
            <input
              id="login-id"
              className="input login-input"
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder={showStudentPlaceholders ? "11-digit NIN" : "you@school.edu.ng"}
              required
              autoComplete="username"
              inputMode={showStudentPlaceholders ? "numeric" : "email"}
            />
          </div>

          <div className="field">
            <label htmlFor="login-secret">{showStudentPlaceholders ? "Reg. No. or Phone" : "Password"}</label>
            <input
              id="login-secret"
              className="input login-input"
              type={showStudentPlaceholders ? "text" : "password"}
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder={showStudentPlaceholders ? "2026/MS/001 or 080..." : "••••••••"}
              required
              autoComplete={showStudentPlaceholders ? "off" : "current-password"}
              autoCapitalize={showStudentPlaceholders ? "characters" : "none"}
            />
          </div>

          {err && <div className="notice" style={{ maxWidth: 320, margin: "0 auto" }}>{err}</div>}

          <button type="submit" className="btn btn-primary btn-lg btn-block login-submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <a
          href="https://veritas-verify.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="login-veritas"
        >
          <span className="login-veritas-logo">
            <img
              src="/veritas-logo.svg"
              alt=""
              width={28}
              height={28}
              style={{ display: "block" }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          </span>
          <span className="login-veritas-body">
            <span className="login-veritas-name">Veritas</span>
            <span className="login-veritas-desc">Sahaba certificates, verifiable.</span>
          </span>
          <span className="login-veritas-cta">Open →</span>
        </a>
      </div>
    </div>
  );
}

const STYLES = `
  .login-shell {
    position: relative;
    min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    padding: 20px 16px 20px;
    background:
      radial-gradient(120% 60% at 50% -10%, var(--primary-soft), transparent 70%),
      var(--bg);
  }
  .login-back-float {
    position: absolute; top: 16px; left: 16px;
    display: inline-flex; align-items: center;
    min-height: 40px; padding: 0 14px;
    background: var(--surface); border: 1px solid var(--line);
    border-radius: 10px;
    font-size: 13px; font-weight: 500; color: var(--ink-2);
    text-decoration: none;
    transition: border-color .2s ease, color .2s ease;
  }
  .login-back-float:hover { border-color: var(--primary); color: var(--primary); }

  .login-card {
    position: relative; overflow: hidden;
    width: 100%; max-width: 400px;
    padding: 24px 22px 20px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 20px;
    box-shadow: 0 8px 24px rgba(20,30,22,.06), 0 16px 40px rgba(20,30,22,.05);
  }
  .login-card::before {
    content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px;
    background: linear-gradient(90deg, var(--primary), var(--primary-soft));
  }
  .login-logo {
    display: block; width: 60px; height: 60px; margin: 0 auto 16px;
  }
  .login-title {
    margin: 0; text-align: center;
    font-family: var(--serif); font-size: 24px; font-weight: 700; letter-spacing: -.01em;
    color: var(--ink);
  }
  .login-sub {
    margin: 6px 0 0; text-align: center; font-size: 14px; color: var(--ink-3);
  }

  .login-modes {
    display: grid; grid-template-columns: 1fr 1fr; gap: 4px;
    margin: 20px auto 18px; padding: 4px;
    max-width: 320px; width: 100%;
    border: 1px solid var(--line); border-radius: 10px;
    background: var(--primary-soft);
  }
  .login-mode {
    padding: 8px 6px; text-align: center;
    font-size: 12.5px; font-weight: 600; color: var(--ink-3);
    border-radius: 8px;
    background: transparent; border: none; cursor: pointer;
    font-family: inherit;
    transition: background .2s ease, color .2s ease, box-shadow .2s ease;
  }
  .login-mode:hover { color: var(--primary); }
  .login-mode.is-active {
    background: var(--surface); color: var(--primary);
    box-shadow: 0 1px 3px rgba(0,0,0,.10);
  }

  .login-form { display: flex; flex-direction: column; gap: 16px; align-items: stretch; }
  .login-form .field { display: flex; flex-direction: column; gap: 6px; }
  .login-form label {
    font-size: 12.5px; font-weight: 600; color: var(--ink-2);
    max-width: 320px; width: 100%; margin: 0 auto;
  }
  .login-input {
    width: 100%; max-width: 320px; min-height: 48px;
    margin: 0 auto;
    font-size: 16px; padding: 10px 12px;
    border: 1px solid var(--line-2); border-radius: 10px;
    background: var(--surface); color: var(--ink);
    transition: border-color .15s, box-shadow .15s;
  }
  .login-input:hover { border-color: var(--ink-3); }
  .login-input:focus {
    outline: none; border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-ring);
  }
  .login-submit { margin: 4px auto 0; min-height: 50px; max-width: 320px; width: 100%; }

  .login-veritas {
    display: flex; align-items: center; gap: 12px;
    margin-top: 22px; padding: 12px 14px;
    border: 1px solid var(--line); border-radius: 10px;
    color: var(--ink-2); text-decoration: none;
    transition: border-color .2s ease, transform .2s ease;
  }
  .login-veritas:hover { border-color: var(--primary); transform: translateY(-1px); }
  .login-veritas-logo {
    flex: none; width: 28px; height: 28px;
    background: var(--primary-soft); border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--serif); font-weight: 700; color: var(--primary); font-size: 14px;
    overflow: hidden;
  }
  .login-veritas-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .login-veritas-name { font-size: 13px; font-weight: 600; color: var(--ink); }
  .login-veritas-desc { font-size: 11.5px; color: var(--ink-3); line-height: 1.3; }
  .login-veritas-cta { flex: none; font-size: 12px; font-weight: 600; color: var(--primary); }

  @media (min-width: 480px) {
    .login-shell { padding: 24px; }
    .login-card { padding: 28px 34px 22px; }
  }
`;
