// src/pages/Materials.tsx — public materials list.

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Material } from "../types";
import { PublicLayout, I } from "../ui/Shell";
import { DelayedSkeleton } from "../ui/primitives";

export default function Materials() {
  const [list, setList] = useState<Material[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("materials").select("*").eq("published", true)
        .order("order_num", { ascending: true, nullsFirst: false });
      if (error) setError(error.message);
      else setList((data as Material[]) ?? []);
      setReady(true);
    })();
  }, []);

  return (
    <PublicLayout>
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Materials</span>
            <h1 className="d1">Learning materials.</h1>
            <p className="lede">Published resources from the school.</p>
          </div>

          {!ready && <DelayedSkeleton ready={ready} rows={3} />}

          {error && (
            <div className="card"><div className="empty">
              <div className="t">Could not load materials</div><div className="d">{error}</div>
            </div></div>
          )}

          {ready && !error && list.length === 0 && (
            <div className="card"><div className="empty">
              <div className="t">No materials published yet</div>
              <div className="d">Resources uploaded by the school will appear here.</div>
            </div></div>
          )}

          {ready && !error && list.length > 0 && (
            <div className="card" style={{ overflow: "hidden" }}>
              {list.map(m => (
                <div key={m.id} className="mat">
                  <div className="mat-ico">{m.kind === "file" ? I.file : I.link}</div>
                  <div className="mat-body">
                    <div className="mat-title">{m.title}</div>
                    <div className="mat-meta">
                      {m.class_name !== "all" && <span>{m.class_name}</span>}
                      {m.subject !== "general" && <span>{m.subject}</span>}
                      {m.note && <span style={{ fontStyle: "italic" }}>{m.note}</span>}
                    </div>
                  </div>
                  <div>
                    {m.kind === "link" && m.url && (
                      <a className="btn btn-ghost btn-sm" href={m.url} target="_blank" rel="noopener noreferrer">Open</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
