// src/pages/Curriculum.tsx — class list + per-class detail view.

import { useState } from "react";
import { CONFIG, SECTIONS } from "../lib/config";
import { getSettings } from "../lib/settings";
import { CURRICULUM } from "../lib/curriculum";
import { allWeeks, formatRange, type Week } from "../lib/calendar";
import { PublicLayout, I } from "../ui/Shell";

export default function Curriculum() {
  const [openClass, setOpenClass] = useState<string | null>(null);
  if (openClass) return <ClassDetail cls={openClass} onBack={() => setOpenClass(null)} />;

  return (
    <PublicLayout>
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Curriculum</span>
            <h1 className="d1">Every class has a defined path.</h1>
            <p className="lede">Five subjects per class. Tap a class to see its weekly breakdown.</p>
          </div>

          {SECTIONS.map(sec => (
            <div key={sec.id} className="sec-block">
              <div className="sec-head">
                <h2>
                  {sec.name}
                  {sec.inactive && <span className="pill pill-neutral" style={{ marginLeft: 8 }}>Opening soon</span>}
                </h2>
              </div>
              <div className="class-list">
                {sec.classes.map(c => {
                  const entry = CURRICULUM[c];
                  const disabled = sec.inactive || !entry;
                  return (
                    <button key={c} className="crow" disabled={disabled}
                      style={{ opacity: disabled ? 0.55 : 1, cursor: disabled ? "default" : "pointer" }}
                      onClick={() => !disabled && setOpenClass(c)}>
                      <div style={{ minWidth: 0 }}>
                        <div className="cname">{c}</div>
                        <div className="cmeta" style={{ whiteSpace: "normal", lineHeight: 1.4 }}>
                          {entry?.overview || "Coming soon"}
                        </div>
                      </div>
                      <div /><div />
                      <div>{!disabled && I.arrow}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="card pad mt6">
            <span className="eyebrow">Provisional</span>
            <p className="sub" style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.6 }}>
              Weekly breakdowns are being finalised. Dates shift with the session start date.
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function ClassDetail({ cls, onBack }: { cls: string; onBack: () => void }) {
  const [semester, setSemester] = useState<1 | 2>(1);
  const [subject, setSubject] = useState<string>("All");
  const entry = CURRICULUM[cls];
  if (!entry) return null;

  const data = semester === 1 ? entry.semester1 : entry.semester2;
  const subjects = Object.keys(data);
  const subjectsToShow = subject === "All" ? subjects : [subject];
  const teachingWeeks: Week[] = allWeeks().filter(w => w.blockType === "teaching" && w.semester === semester);

  return (
    <PublicLayout>
      <section className="section">
        <div className="wrap">
          <button className="btn btn-ghost btn-sm mb4 no-print" onClick={onBack}>{I.back} Back to curriculum</button>
          <div className="section-head">
            <span className="eyebrow">{getSettings().session_label}</span>
            <h1 className="d1">{cls}</h1>
            <p className="lede">{entry.overview}</p>
            <div style={{ marginTop: 14 }} className="no-print">
              <button className="btn btn-secondary" onClick={() => window.print()}>{I.print} Download this class as PDF</button>
            </div>
          </div>

          <div className="chip-line no-print" style={{ marginBottom: 10 }}>
            <button className={"chip-f " + (semester === 1 ? "active" : "")} onClick={() => setSemester(1)}>Semester 1</button>
            <button className={"chip-f " + (semester === 2 ? "active" : "")} onClick={() => setSemester(2)}>Semester 2</button>
          </div>

          <div className="chip-line no-print" style={{ marginBottom: 18 }}>
            <button className={"chip-f " + (subject === "All" ? "active" : "")} onClick={() => setSubject("All")}>All subjects</button>
            {subjects.map(s => (
              <button key={s} className={"chip-f " + (subject === s ? "active" : "")} onClick={() => setSubject(s)}>{s}</button>
            ))}
          </div>

          <div className="hidden-print" style={{ marginBottom: 14, fontSize: 12, color: "var(--ink-3)" }}>
            {cls} · {semester === 1 ? "Semester 1" : "Semester 2"} · {getSettings().session_label}
          </div>

          {subjectsToShow.map(subj => (
            <div key={subj} className="card mb3" style={{ overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
                <div style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: 16, color: "var(--primary)" }}>{subj}</div>
              </div>
              <div style={{ padding: "4px 18px 14px" }}>
                {teachingWeeks.map((wk, i) => {
                  const content = (data[subj] || [])[i] || "";
                  return (
                    <div key={wk.num} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 16, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>Week {i + 1}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{formatRange(wk)}</div>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{content}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
