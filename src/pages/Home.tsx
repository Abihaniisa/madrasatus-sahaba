// src/pages/Home.tsx — public homepage. Includes inline LivePointer (countdown banner).

import { Link } from "react-router-dom";
import { CONFIG, SECTIONS } from "../lib/config";
import { useLiveStatus } from "../lib/calendar";
import { PublicLayout, I, waLink } from "../ui/Shell";

function LivePointer() {
  const status = useLiveStatus();
  const diff = Math.max(0, status.target.getTime() - Date.now());
  const d = Math.floor(diff / 864e5);
  const h = Math.floor((diff % 864e5) / 36e5);
  const m = Math.floor((diff % 36e5) / 6e4);
  const s = Math.floor((diff % 6e4) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section className="lp-status" aria-label="School status">
      <div className="lp-panel">
        <div className="lp-lead">
          <div className="lp-dot-wrapper">
            <div className={`lp-dot ${status.mode === "session" ? "calm" : ""}`} />
            <div className="lp-ring" />
            <div className="lp-ring" />
          </div>
          <div className="lp-headline">
            {status.context} · <strong>{status.action}</strong>
          </div>
        </div>
        <div className="lp-right">
          <div className="lp-units" role="timer">
            <div className="lp-unit"><b>{d}</b><span>Days</span></div>
            <div className="lp-sep" />
            <div className="lp-unit"><b>{pad(h)}</b><span>Hrs</span></div>
            <div className="lp-sep" />
            <div className="lp-unit"><b>{pad(m)}</b><span>Mins</span></div>
            <div className="lp-sep" />
            <div className="lp-unit"><b>{pad(s)}</b><span>Secs</span></div>
          </div>
          {status.dateLabel && <div className="lp-date">{status.dateLabel}</div>}
        </div>
      </div>
    </section>
  );
}


export default function Home() {
  return (
    <PublicLayout>
      <LivePointer />
      <section className="home-hero">
        <div className="wrap">
          <div className="home-hero-inner">
            <span className="eyebrow">Established {CONFIG.founded}</span>
            <h1 className="d1">{CONFIG.name}</h1>
            <p className="lede">
              Preparing students to memorise the Book of Allah with structure, consistency, and an unbroken chain of learning.
            </p>
            <div className="hero-actions">
              <Link to="/curriculum" className="btn btn-primary">View curriculum {I.arrow}</Link>
              <a href={waLink(CONFIG.whatsapp, "As-salamu alaykum. I would like to enquire about admission.")} target="_blank" rel="noopener noreferrer" className="btn btn-wa">
                {I.whatsapp} Begin admission
              </a>
            </div>
            <div className="hero-arabic">وَرَتِّلِ الْقُرْءَانَ تَرْتِيلًا</div>
          </div>
        </div>
      </section>

      <section className="home-programme">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">The programme</span>
            <h2 className="d2">Three sections. One path.</h2>
            <p className="lede">Every student follows a documented curriculum from foundation to full memorisation.</p>
          </div>
          <div className="struct-grid">
            {SECTIONS.map((sec) => (
              <div key={sec.id} className="struct-card">
                <div className="title">
                  <span>{sec.name}</span>
                  {sec.inactive && <span className="pill pill-neutral">Opening soon</span>}
                </div>
                <div className="classes">
                  {sec.classes.map((c) => <span key={c} className="chip">{c}</span>)}
                </div>
                <div className="desc">{sec.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-founder">
        <div className="wrap-narrow">
          <div className="founder-block">
            <div className="founder-photo">
              <img src={CONFIG.founderImage} alt={CONFIG.founder} loading="lazy" decoding="async"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />
            </div>
            <div className="founder-info">
              <h3>{CONFIG.founder}</h3>
              <div className="role">{CONFIG.founderRole}</div>
              <p>
                A devoted scholar and educator who established {CONFIG.name} to provide authentic,
                structured, and accessible Qur'anic education to students from all backgrounds.
              </p>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
