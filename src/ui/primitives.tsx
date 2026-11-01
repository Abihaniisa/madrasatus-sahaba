// src/ui/primitives.tsx — Modal + Skeleton + DelayedSkeleton.

import { useEffect, useState, type ReactNode } from "react";

export function Modal({
  open, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel",
  tone = "primary", onConfirm, onCancel, children,
}: {
  open: boolean; title: string; message?: string;
  confirmLabel?: string; cancelLabel?: string;
  tone?: "primary" | "danger";
  onConfirm: () => void; onCancel: () => void; children?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="d3" style={{ marginBottom: message || children ? 8 : 18 }}>{title}</div>
        {message && <p className="sub" style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: children ? 12 : 20 }}>{message}</p>}
        {children}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button className={"btn " + (tone === "danger" ? "btn-danger" : "btn-primary")} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skel" style={{ width: `${60 + ((i * 13) % 35)}%` }} />
      ))}
    </div>
  );
}

export function DelayedSkeleton({ ready, rows = 4, delay = 200 }: { ready: boolean; rows?: number; delay?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (ready) { setShow(false); return; }
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [ready, delay]);
  if (ready || !show) return null;
  return <Skeleton rows={rows} />;
}

export function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);
  if (online) return null;
  return (
    <div role="status" aria-live="polite" style={{
      position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
      background: "#7f2b25", color: "#fff", padding: "10px 16px",
      borderRadius: 10, fontSize: 13, fontWeight: 500,
      boxShadow: "0 8px 24px rgba(0,0,0,.18)", zIndex: 300,
      maxWidth: "calc(100vw - 32px)", textAlign: "center",
    }}>
      You're offline — some features may not work.
    </div>
  );
}

import React from "react";

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App crashed:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 700, margin: "40px auto" }}>
          <h2 style={{ color: "#a33b32", marginBottom: 12 }}>Something went wrong</h2>
          <p style={{ color: "#4B534C", marginBottom: 16 }}>The page could not be displayed. Please reload or go back.</p>
          <pre style={{ background: "#f7f6f1", padding: 16, borderRadius: 8, fontSize: 12, overflow: "auto", color: "#7f2b25", whiteSpace: "pre-wrap" }}>
            {this.state.error.message}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: "10px 16px", background: "#1E4830", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
