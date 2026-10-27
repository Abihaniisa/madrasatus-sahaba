// src/pages/admin/StudentForm.tsx — create / edit a student.

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SECTIONS, ALL_CLASSES, CONFIG } from "../../lib/config";
import { supabase, useRequireAuth } from "../../lib/supabase";
import { getSessionLabel } from "../../lib/calendar";
import { AdminTop } from "../../ui/AdminShell";
import { DelayedSkeleton } from "../../ui/primitives";
import { I } from "../../ui/Shell";
import type { Student } from "../../types";

export default function StudentForm() {
  const ready = useRequireAuth();
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [original, setOriginal] = useState<Student | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [nin, setNin] = useState("");
  const [cls, setCls] = useState(ALL_CLASSES[0] ?? "");
  const [studentMode, setStudentMode] = useState<"physical" | "online">("physical");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      const { data, error } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      const s = data as Student;
      setOriginal(s);
      setName(s.name ?? "");
      setDob(s.dob ?? "");
      setGender((s.gender as "male" | "female") ?? "");
      setNin(s.nin ?? "");
      setCls(s.class_name ?? ALL_CLASSES[0]);
      setStudentMode(s.mode);
      setGuardianName(s.guardian_name ?? "");
      setGuardianPhone(s.guardian_phone ?? "");
      setStudentPhone(s.student_phone ?? "");
      setAddress(s.address ?? "");
      setLoading(false);
    })();
  }, [id, isEdit]);

  const sectionForClass = useMemo(() => SECTIONS.find(s => s.classes.includes(cls))?.id ?? "secondary", [cls]);

  function validate(): string | null {
    if (!name.trim()) return "Full name is required.";
    if (!dob) return "Date of birth is required.";
    if (!gender) return "Gender is required.";
    if (!/^\d{11}$/.test(nin)) return "NIN must be exactly 11 digits.";
    if (!cls) return "Class is required.";
    if (guardianPhone && !/^0\d{10}$/.test(guardianPhone) && !/^\+?234\d{10}$/.test(guardianPhone)) {
      return "Guardian phone should look like 08012345678 or +2348012345678.";
    }
    if (studentPhone && !/^0\d{10}$/.test(studentPhone) && !/^\+?234\d{10}$/.test(studentPhone)) {
      return "Student phone should look like 08012345678 or +2348012345678.";
    }
    return null;
  }

  async function submit() {
    setError(null);
    const v = validate();
    if (v) { setError(v); return; }
    setBusy(true);

    if (isEdit && original) {
      const { error } = await supabase.from("students").update({
        name: name.trim(), dob, gender, class_name: cls, section: sectionForClass,
        mode: studentMode,
        guardian_name: guardianName.trim() || null,
        guardian_phone: guardianPhone.trim() || null,
        student_phone: studentPhone.trim() || null,
        address: address.trim() || null,
      }).eq("id", original.id);
      setBusy(false);
      if (error) { setError(error.message); return; }
      nav(`/admin/student/${original.id}`);
      return;
    }

    const { data, error } = await supabase.from("students").insert({
      name: name.trim(), dob, gender, nin,
      section: sectionForClass, class_name: cls, mode: studentMode,
      status: "active", joined: new Date().toISOString().slice(0, 10),
      guardian_name: guardianName.trim() || null,
      guardian_phone: guardianPhone.trim() || null,
      student_phone: studentPhone.trim() || null,
      address: address.trim() || null,
    }).select().single();

    if (error || !data) {
      const msg = error?.message ?? "";
      setError(msg.includes("students_nin_unique") || msg.toLowerCase().includes("duplicate key")
        ? "This NIN is already on record. Contact the school if this is an error."
        : msg || "Could not create student.");
      setBusy(false);
      return;
    }

    const newStudent = data as Student;
    await supabase.from("enrollments").insert({
      student_id: newStudent.id, class_name: cls, session_label: getSessionLabel(new Date()),
      status: "active", started: newStudent.joined,
    });
    await supabase.from("fees").insert({
      student_id: newStudent.id, year: CONFIG.regYear,
      amount: CONFIG.registrationFee, status: "unpaid",
    });
    setBusy(false);
    nav(`/admin/student/${newStudent.id}`);
  }

  if (!ready) return <div className="body"><div className="wrap"><DelayedSkeleton ready={ready} rows={4} /></div></div>;
  if (loading) return <div className="body"><div className="wrap"><DelayedSkeleton ready={!loading} rows={6} /></div></div>;
  if (notFound) return <div className="body"><div className="wrap"><div className="empty"><div className="t">Student not found</div></div></div></div>;

  return (
    <div>
      <AdminTop />
      <div className="body">
        <div className="wrap-narrow">
          <div className="crumb">
            <Link to="/admin">Students</Link><span>/</span>
            <span className="current">{isEdit ? "Edit student" : "Add student"}</span>
          </div>

          <div className="phead">
            <div>
              <h1>{isEdit ? `Edit ${original?.name ?? ""}` : "Add a student"}</h1>
              <p className="sub">{isEdit ? `Registration ${original?.reg_no} · NIN and registration are permanent.` : "A permanent registration number is assigned on save."}</p>
            </div>
          </div>

          <div className="card pad">
            <div className="stack g3">
              <div className="field">
                <label>Full name</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ahmadu Bello" autoComplete="off" />
              </div>

              <div className="row g3" style={{ flexWrap: "wrap" }}>
                <div className="field flex1" style={{ minWidth: 170 }}>
                  <label>Date of birth</label>
                  <input className="input" type="date" value={dob} onChange={e => setDob(e.target.value)} />
                </div>
                <div className="field flex1" style={{ minWidth: 170 }}>
                  <label>Gender</label>
                  <div className="chip-line" style={{ marginBottom: 0 }}>
                    <button type="button" className={"chip-f " + (gender === "male" ? "active" : "")} onClick={() => setGender("male")}>Male</button>
                    <button type="button" className={"chip-f " + (gender === "female" ? "active" : "")} onClick={() => setGender("female")}>Female</button>
                  </div>
                </div>
              </div>

              <div className="field">
                <label>NIN (11 digits)</label>
                <input className="input" inputMode="numeric" maxLength={11} value={nin}
                  onChange={e => setNin(e.target.value.replace(/[^0-9]/g, "").slice(0, 11))}
                  placeholder="12345678901" disabled={isEdit} autoComplete="off" />
                {isEdit && <div className="hint">NIN is permanent. Contact the school to change it in the database.</div>}
              </div>

              <div className="field">
                <label>Class</label>
                <select className="input" value={cls} onChange={e => setCls(e.target.value)}>
                  {SECTIONS.filter(s => !s.inactive).map(section => (
                    <optgroup key={section.id} label={section.name}>
                      {section.classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Mode</label>
                <div className="chip-line" style={{ marginBottom: 0 }}>
                  <button type="button" className={"chip-f " + (studentMode === "physical" ? "active" : "")} onClick={() => setStudentMode("physical")}>Physical</button>
                  <button type="button" className={"chip-f " + (studentMode === "online" ? "active" : "")} onClick={() => setStudentMode("online")}>Online</button>
                </div>
              </div>

              <div className="divider" />

              <div className="row g3" style={{ flexWrap: "wrap" }}>
                <div className="field flex1" style={{ minWidth: 200 }}>
                  <label>Guardian name <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional)</span></label>
                  <input className="input" value={guardianName} onChange={e => setGuardianName(e.target.value)} placeholder="Yusuf Bello" autoComplete="off" />
                </div>
                <div className="field flex1" style={{ minWidth: 200 }}>
                  <label>Guardian phone <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional)</span></label>
                  <input className="input" inputMode="tel" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} placeholder="08012345678" autoComplete="off" />
                </div>
              </div>

              <div className="row g3" style={{ flexWrap: "wrap" }}>
                <div className="field flex1" style={{ minWidth: 200 }}>
                  <label>Student phone <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional)</span></label>
                  <input className="input" inputMode="tel" value={studentPhone} onChange={e => setStudentPhone(e.target.value)} placeholder="08012345678" autoComplete="off" />
                </div>
                <div className="field flex1" style={{ minWidth: 200 }}>
                  <label>Address <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional)</span></label>
                  <input className="input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Kano" autoComplete="off" />
                </div>
              </div>

              {error && <div className="notice">{error}</div>}

              <div className="row g2" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => nav(-1 as any)} disabled={busy}>Cancel</button>
                <button className="btn btn-primary" onClick={submit} disabled={busy}>
                  {busy ? "Saving…" : <>{I.check} {isEdit ? "Save changes" : "Add student"}</>}
                </button>
              </div>
            </div>
          </div>

          <div className="card pad mt4" style={{ background: "var(--muted)" }}>
            <p className="sub" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
              On save: a permanent registration number is assigned, an enrolment record is created for the current session, and a registration fee is added to the student's account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
