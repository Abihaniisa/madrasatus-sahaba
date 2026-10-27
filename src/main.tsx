import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./styles.css";

function UpdateToast() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const updater = registerSW({
      onNeedRefresh() { setNeedRefresh(true); },
      onOfflineReady() { setOfflineReady(true); },
    });
    setUpdateSW(() => updater);
  }, []);

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="toast" role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {needRefresh ? (
        <>
          <span>New version ready.</span>
          <button
            onClick={async () => { await updateSW?.(true); }}
            style={{ background: "#fff", color: "var(--primary)", border: 0, borderRadius: 6, padding: "6px 12px", fontWeight: 600, cursor: "pointer" }}
          >
            Reload
          </button>
          <button
            onClick={() => setNeedRefresh(false)}
            style={{ background: "transparent", color: "#fff", border: 0, padding: 0, opacity: 0.7, cursor: "pointer" }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </>
      ) : (
        <>
          <span>Ready for offline use.</span>
          <button
            onClick={() => setOfflineReady(false)}
            style={{ background: "transparent", color: "#fff", border: 0, padding: 0, opacity: 0.7, cursor: "pointer" }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <UpdateToast />
    </BrowserRouter>
  </React.StrictMode>
);
