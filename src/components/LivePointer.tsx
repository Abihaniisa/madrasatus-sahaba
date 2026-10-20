import { useEffect, useState } from "react";
import { SETTINGS } from "../lib/settings";
import { allWeeks } from "../lib/calendar";

export function useLiveStatus() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const start = new Date(SETTINGS.session_start_date + "T00:00:00Z");
  const end = new Date(SETTINGS.session_end_date + "T23:59:59Z");
  const isRamadan = SETTINGS.ramadan_start_date && SETTINGS.ramadan_end_date
    ? now >= new Date(SETTINGS.ramadan_start_date + "T00:00:00Z") && now <= new Date(SETTINGS.ramadan_end_date + "T23:59:59Z")
    : false;

  if (now < start || now > end) {
    let target = new Date(start);
    if (now > end) target.setUTCFullYear(target.getUTCFullYear() + 1);
    return { mode: "admission", context: isRamadan ? "Admission Open · Ramadan" : "Admission Open", action: "Closes in", target };
  }

  const weeks = allWeeks();
  const currentWeekObj = weeks.find(w => now >= w.startDate && now <= w.endDate);
  if (!currentWeekObj) return { mode: "admission", context: "Admission Open", action: "Closes in", target: start };

  if (isRamadan) return { mode: "session", context: `Ramadan Break`, action: "Resumes in", target: new Date(SETTINGS.ramadan_end_date + "T23:59:59Z") };

  const blockEndWeek = weeks.filter(w => w.blockType === currentWeekObj.blockType).pop()!;
  const target = new Date(blockEndWeek.endDate);
  let context = "";
  let action = "";

  switch (currentWeekObj.blockType) {
    case "teaching": 
      const semNum = currentWeekObj.blockLabel.includes("Second") ? "2nd" : "1st";
      context = `${semNum} Sem · Week ${currentWeekObj.teachingWeek} of 18`; 
      action = "Ends in"; 
      break;
    case "exam": context = `Exam Week`; action = "Ends in"; break;
    case "holiday": context = `Break`; const nextBlock = weeks.find(w => w.num > blockEndWeek.num); action = nextBlock ? `Next begins in` : "Session ends in"; break;
    case "daura": context = `Daura · Week ${currentWeekObj.num - (weeks.find(w => w.blockType === "daura")?.num || 1) + 1} of 6`; action = "Ends in"; break;
    case "ramadan": context = "Ramadan Break"; action = "Resumes in"; break;
  }
  return { mode: "session", context, action, target };
}

export function LivePointer() {
  const status = useLiveStatus();
  const diff = Math.max(0, status.target.getTime() - Date.now());
  const d = Math.floor(diff / 864e5);
  const h = Math.floor((diff % 864e5) / 36e5);
  const m = Math.floor((diff % 36e5) / 6e4);
  const s = Math.floor((diff % 6e4) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section className="lp-status" aria-label="School status">
      <style>{`
        .lp-status { 
          background: color-mix(in srgb, var(--primary) 4%, var(--bg)); 
          border-bottom: 1px solid var(--line); 
          padding: 10px 16px;
        }
        .lp-panel { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          gap: 16px; 
          max-width: 1120px; 
          margin: 0 auto; 
        }
        
        .lp-lead { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .lp-dot { position: relative; flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--gold); }
        .lp-dot::after { content: ""; position: absolute; inset: -4px; border-radius: 50%; border: 1px solid var(--gold); opacity: 0; animation: lp-ring 2.6s ease-out infinite; }
        .lp-dot.calm { background: var(--primary); } 
        .lp-dot.calm::after { display: none; }
        @keyframes lp-ring { from { transform: scale(.55); opacity: .7; } to { transform: scale(1.5); opacity: 0; } }
        
        .lp-headline { 
          font-family: var(--serif); 
          font-size: 13.5px; 
          line-height: 1.2; 
          color: var(--ink-2); 
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .lp-headline strong { 
          color: var(--primary); 
          font-weight: 600; 
        }
        
        .lp-units { display: flex; align-items: center; gap: 10px; background: var(--surface); padding: 6px 12px; border-radius: var(--r-2); border: 1px solid var(--line); box-shadow: var(--sh-1); flex-shrink: 0; }
        .lp-unit { text-align: center; display: flex; flex-direction: column; align-items: center; min-width: 28px; }
        .lp-unit b { font-family: var(--serif); font-weight: 600; font-size: 15px; line-height: 1; color: var(--primary); font-variant-numeric: tabular-nums; }
        .lp-unit span { font-size: 8px; letter-spacing: .05em; text-transform: uppercase; color: var(--ink-3); margin-top: 2px; }
        .lp-sep { width: 1px; height: 18px; background: var(--line); }

        @media (max-width: 640px) {
          .lp-panel { flex-direction: column; align-items: flex-start; gap: 8px; }
          .lp-units { width: 100%; justify-content: space-between; }
          .lp-headline { font-size: 13px; }
        }
      `}</style>

      <div className="lp-panel">
        <div className="lp-lead">
          <span className={`lp-dot ${status.mode === "session" ? "calm" : ""}`} aria-hidden="true" />
          <div className="lp-headline">
            {status.context} · <strong>{status.action}</strong>
          </div>
        </div>
        
        <div className="lp-units" role="timer">
          <div className="lp-unit"><b>{d}</b><span>Days</span></div>
          <div className="lp-sep" />
          <div className="lp-unit"><b>{pad(h)}</b><span>Hrs</span></div>
          <div className="lp-sep" />
          <div className="lp-unit"><b>{pad(m)}</b><span>Mins</span></div>
          <div className="lp-sep" />
          <div className="lp-unit"><b>{pad(s)}</b><span>Secs</span></div>
        </div>
      </div>
    </section>
  );
}
