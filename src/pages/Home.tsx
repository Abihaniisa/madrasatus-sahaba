// src/pages/Home.tsx — public homepage (redesign v2).
// Live counter from useLiveStatus(); counter fills the row, date sits beneath.

import { Link } from "react-router-dom";
import { CONFIG, SECTIONS, SITE_IMAGES, SITE_IMAGE_FALLBACKS, type SiteImageKey } from "../lib/config";
import { useLiveStatus } from "../lib/calendar";
import { PublicLayout, waLink } from "../ui/Shell";

function LiveCounter() {
  const status = useLiveStatus();
  const diff = Math.max(0, status.target.getTime() - Date.now());
  const d = Math.floor(diff / 864e5);
  const h = Math.floor((diff % 864e5) / 36e5);
  const m = Math.floor((diff % 36e5) / 6e4);
  const s = Math.floor((diff % 6e4) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="pub-counter-area">
      <div className="pub-counter" role="timer" aria-live="off">
        <div className="pub-counter-unit"><b>{d}</b><span>Days</span></div>
        <div className="pub-counter-sep" />
        <div className="pub-counter-unit"><b>{pad(h)}</b><span>Hrs</span></div>
        <div className="pub-counter-sep" />
        <div className="pub-counter-unit"><b>{pad(m)}</b><span>Mins</span></div>
        <div className="pub-counter-sep" />
        <div className="pub-counter-unit"><b>{pad(s)}</b><span>Secs</span></div>
      </div>
      {status.dateLabel && <div className="pub-counter-date">{status.dateLabel}</div>}
    </div>
  );
}

function SiteImage({ k, alt, className }: { k: SiteImageKey; alt: string; className: string }) {
  return (
    <div className={className} style={{ background: SITE_IMAGE_FALLBACKS[k] }}>
      <img
        src={SITE_IMAGES[k]}
        alt={alt}
        loading="lazy"
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    </div>
  );
}

export default function Home() {
  const status = useLiveStatus();
  return (
    <PublicLayout>
      <section className="pub-status" aria-label="Current academic semester">
        <div className="wrap pub-status-inner">
          <div className="pub-status-label">
            <span className="pub-status-dot" />
            <span><strong>{status.context}</strong> · <strong>{status.action}</strong></span>
          </div>
          <LiveCounter />
        </div>
      </section>

      <section className="pub-hero">
        <div className="wrap">
          <div className="pub-hero-shell">
            <SiteImage k="hero" alt="Students reciting and studying the Qur'an" className="pub-hero-photo" />
            <div className="pub-hero-content">
              <span className="pub-eyebrow">Established {CONFIG.founded}</span>
              <h1>{CONFIG.name}</h1>
              <p className="pub-hero-copy">
                Preparing students to memorise the Book of Allah with structure, consistency, and an unbroken chain of learning.
              </p>
              <div className="pub-hero-actions">
                <Link className="pub-btn pub-btn-light" to="/curriculum">Explore curriculum <span>→</span></Link>
                <a
                  className="pub-btn pub-btn-glass"
                  href={waLink(CONFIG.whatsapp, "As-salamu alaykum. I would like to enquire about admission.")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Inquire about admission
                </a>
              </div>
              <div className="pub-hero-verse">وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</div>
            </div>
            <div className="pub-hero-caption">Learning · Memorisation · Tarbiyah</div>
          </div>
        </div>
      </section>

      <section className="pub-programme" id="programme">
        <div className="wrap">
          <div className="pub-section-heading">
            <span className="pub-kicker">The programme</span>
            <h2 className="pub-section-title">Three sections. One path.</h2>
            <p className="pub-section-intro">Every student follows a documented curriculum from foundation to full memorisation.</p>
          </div>
          <div className="pub-programmes">
            {SECTIONS.map((sec, i) => {
              const key: SiteImageKey = sec.id === "foundation" ? "foundation" : sec.id === "secondary" ? "secondary" : "higher";
              const stage = "Stage " + String(i + 1).padStart(2, "0");
              return (
                <article key={sec.id} className="pub-programme-card">
                  <SiteImage k={key} alt={sec.name + " students"} className="pub-programme-image" />
                  <div className="pub-programme-body">
                    <span className="pub-stage-number">{stage}</span>
                    <h3 className="pub-programme-title">{sec.name}</h3>
                    <div className="pub-programme-tags">
                      {sec.classes.slice(0, 2).map(c => <span key={c} className="pub-tag">{c}</span>)}
                      {sec.inactive && <span className="pub-tag">Opening soon</span>}
                    </div>
                    <p>{sec.desc}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pub-founder">
        <div className="wrap">
          <article className="pub-founder-card">
            <div className="pub-founder-image" style={{ background: SITE_IMAGE_FALLBACKS.founder }}>
              <img
                src={CONFIG.founderImage}
                alt={CONFIG.founder + ", founder of " + CONFIG.short}
                loading="lazy"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <div className="pub-founder-copy">
              <span className="pub-kicker">The founder</span>
              <h2>{CONFIG.founder}</h2>
              <div className="pub-founder-role">{CONFIG.founderRole}</div>
              <p>
                A devoted scholar and educator who established {CONFIG.name} to provide authentic, structured, and accessible Qur'anic education to students from all backgrounds.
              </p>
            </div>
          </article>
        </div>
      </section>
    </PublicLayout>
  );
}
