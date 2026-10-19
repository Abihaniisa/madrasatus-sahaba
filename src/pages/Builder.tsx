import { CONFIG } from "../lib/config";
import { PublicLayout, I } from "../components/Layout";

export default function Builder() {
  const b = CONFIG.builder;
  return (
    <PublicLayout>
      <section className="section">
        <div className="wrap-narrow">
          <div className="section-head">
            <span className="eyebrow">Built as Sadaqatul Jariyah</span>
            <h1 className="d1">{b.fullName ?? b.name}</h1>
            <p className="lede">Student, Madrasatus Sahaba Li Tahfizul Qur'an</p>
          </div>

          <div className="card pad-lg">
            <div style={{ display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div className="pav" style={{ width: 92, height: 92, padding: 0, overflow: "hidden" }}>
                <img
                  src={b.image}
                  alt={b.fullName ?? b.name}
                  loading="lazy"
                  decoding="async"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <p style={{ fontSize: 15, color: "var(--ink-2)", lineHeight: 1.7, marginBottom: 16 }}>
                  {b.prayer}
                </p>
                <p style={{ fontSize: 15, color: "var(--ink-2)", lineHeight: 1.7, marginBottom: 24 }}>
                  Any good that comes from this is from Allah; any mistake is from me.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a className="btn btn-wa" href={`https://wa.me/${b.phone}?text=${encodeURIComponent("As-salamu alaykum Abihani. I saw the Madrasatus Sahaba website you built.")}`} target="_blank" rel="noopener noreferrer">
                    {I.whatsapp} WhatsApp
                  </a>
                  <a className="btn btn-secondary" href={`mailto:${b.email}`}>{b.email}</a>
                </div>
              </div>
            </div>
          </div>

          <div className="card pad mt4" style={{ background: "var(--muted)" }}>
            <span className="eyebrow">Other work</span>
            <p className="sub" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6 }}>
              Founder of{" "}
              {b.projects.map((p, i) => (
                <span key={p.url}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontWeight: 500 }}>
                    {p.name}
                  </a>
                  {i < b.projects.length - 1 ? " and " : "."}
                </span>
              ))}
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
