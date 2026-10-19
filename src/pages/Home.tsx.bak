import { Link } from "react-router-dom";
import { CONFIG, SECTIONS } from "../lib/config";
import { PublicLayout, I, waLink } from "../components/Layout";

export default function Home() {
  return (
    <PublicLayout>
      <section className="hero">
        <div className="wrap">
          <div style={{ maxWidth: 660 }}>
            <span className="eyebrow">Established {CONFIG.founded}</span>
            <h1 className="d1">{CONFIG.name}</h1>
            <p className="lede">
              Preparing students to memorise the Book of Allah with structure, consistency, and an unbroken chain of learning.
            </p>
            <div className="hero-actions">
              <Link to="/curriculum" className="btn btn-primary">
                View curriculum {I.arrow}
              </Link>
              <a
                href={waLink(CONFIG.whatsapp, "As-salamu alaykum. I would like to enquire about admission.")}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-wa"
              >
                {I.whatsapp} Begin admission
              </a>
            </div>
            <div className="hero-arabic">
              وَرَتِّلِ الْقُرْءَانَ تَرْتِيلًا
            </div>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">The programme</span>
            <h2 className="d2">Three sections. One path.</h2>
            <p className="lede">
              Every student follows a documented curriculum from foundation to full memorisation.
            </p>
          </div>
          <div className="struct-grid">
            {SECTIONS.map((sec) => (
              <div key={sec.id} className="struct-card">
                <div className="title">
                  <span>{sec.name}</span>
                  {sec.inactive && <span className="pill pill-neutral">Opening soon</span>}
                </div>
                <div className="classes">
                  {sec.classes.map((c) => (
                    <span key={c} className="chip">{c}</span>
                  ))}
                </div>
                <div className="desc">{sec.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="wrap-narrow">
          <div className="founder-block">
            <div className="founder-photo">AB</div>
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
