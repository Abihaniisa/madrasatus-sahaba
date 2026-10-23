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
