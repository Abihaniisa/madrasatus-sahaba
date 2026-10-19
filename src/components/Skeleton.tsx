import { useEffect, useState } from "react";

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skel" style={{ width: `${60 + ((i * 13) % 35)}%` }} />
      ))}
    </div>
  );
}

/* Smart skeleton.
   Fast fetches (<500 ms) show nothing. Slow fetches show the skeleton
   only while the wait is genuinely noticeable. */
export function DelayedSkeleton({
  ready, rows = 4, delay = 200,
}: {
  ready: boolean;
  rows?: number;
  delay?: number;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (ready) { setShow(false); return; }
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [ready, delay]);

  if (ready || !show) return null;
  return <Skeleton rows={rows} />;
}
