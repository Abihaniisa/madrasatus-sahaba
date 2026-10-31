// src/lib/supabase.ts — client + auth + student session + access allowlist.
// isSuper is the only permission axis. No view/manage mode.

import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) console.warn("Supabase env vars missing. See .env.example.");

export const supabase = createClient(url ?? "", key ?? "");

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}
export async function signOut() {
  return supabase.auth.signOut();
}

export async function isAuthorized(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return false;
  const email = data.session.user.email;
  if (!email) return false;
  const { data: row } = await supabase.from("authorized_users").select("email").eq("email", email).maybeSingle();
  if (!row) { await supabase.auth.signOut(); return false; }
  return true;
}

type CacheState = "unknown" | "authorized" | "denied";
let cache: CacheState = "unknown";
let inflight: Promise<void> | null = null;

async function doCheck() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) { cache = "denied"; return; }
  cache = (await isAuthorized()) ? "authorized" : "denied";
}
async function ensureChecked(): Promise<CacheState> {
  if (cache !== "unknown") return cache;
  if (!inflight) inflight = doCheck().finally(() => { inflight = null; });
  await inflight;
  return cache;
}
export function resetAuth() { cache = "unknown"; inflight = null; }

export function useRequireAuth(): boolean {
  const nav = useNavigate();
  const [ready, setReady] = useState<boolean>(cache === "authorized");
  useEffect(() => {
    if (cache === "authorized") { setReady(true); return; }
    if (cache === "denied") { nav("/login", { state: { error: "Please sign in to continue." } }); return; }
    let cancelled = false;
    (async () => {
      const result = await ensureChecked();
      if (cancelled) return;
      if (result === "authorized") setReady(true);
      else nav("/login", { state: { error: "Please sign in to continue." } });
    })();
    return () => { cancelled = true; };
  }, [nav]);
  return ready;
}

export type StudentPortalData = {
  ok: boolean; error?: string; student?: any;
  marks?: any[]; exams?: any[]; assessments?: any[];
  fees?: any[]; fee_payments?: any[]; daura_participations?: any[]; classmates?: any[]; enrollments?: any[];
};

const STUDENT_KEY = "madrasah.student";
export function saveStudentSession(nin: string, identifier: string) {
  sessionStorage.setItem(STUDENT_KEY, JSON.stringify({ nin, identifier }));
}
export function getStudentSession(): { nin: string; identifier: string } | null {
  const raw = sessionStorage.getItem(STUDENT_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
export function clearStudentSession() { sessionStorage.removeItem(STUDENT_KEY); }

export async function fetchStudentPortal(nin: string, identifier: string): Promise<StudentPortalData> {
  const { data, error } = await supabase.rpc("student_portal", { p_nin: nin, p_identifier: identifier });
  if (error) {
    console.error("Auth Error:", error.message);
    return { ok: false, error: "Invalid credentials. Please check your NIN and Registration Number." };
  }
  return data as StudentPortalData;
}

export type AccessRow = {
  email: string; role: "super_admin" | "admin";
  expires_at: string | null; created_at: string;
};

export async function listAccess(): Promise<AccessRow[]> {
  const { data, error } = await supabase.from("authorized_users").select("*").order("role", { ascending: true }).order("email");
  if (error) return [];
  return (data as AccessRow[]) ?? [];
}
export async function addAccess(email: string, isSuper: boolean, expiresAt: string | null) {
  return supabase.from("authorized_users").insert({
    email: email.toLowerCase().trim(), role: isSuper ? "super_admin" : "admin", expires_at: expiresAt,
  });
}
export async function updateExpiry(email: string, expiresAt: string | null) {
  return supabase.from("authorized_users").update({ expires_at: expiresAt }).eq("email", email);
}
export async function removeAccess(email: string) {
  return supabase.from("authorized_users").delete().eq("email", email);
}
export async function currentEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.email ?? null;
}
export async function amISuperAdmin(): Promise<boolean> {
  const { data } = await supabase.rpc("is_super_admin");
  return data === true;
}

// ─── Full student deletion (super admin, test mode) ──────────────
// Deletes: marks → exams → fee_payments → fees → enrollments → students
// Returns { error } on first failure; no partial rollback possible via client.
// ─── Full student deletion (super admin) ────────────────
// Postgres FKs:
//   marks/exams/fees/fee_payments/enrollments → students : CASCADE (auto-delete)
//   daura_participants → students : SET NULL  (would orphan — must delete manually)
//   daura_marks → daura_participants : CASCADE (auto-delete when participant goes)
// Strategy: manually remove Daura participation, delete student, verify everything.
// Compute the next sequential receipt number for a student+year.
// Format: R{year}-{regSeq}-{seq}  where regSeq is the last segment of student.reg_no
// and seq is (count of payments in that year + 1), zero-padded to 2 digits.
export async function nextReceiptNo(studentId: string, year: string, regNo: string): Promise<{ receiptNo: string; error: string | null }> {
  const { count, error } = await supabase
    .from("fee_payments")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("year", year);
  if (error) return { receiptNo: "", error: error.message };
  const seq = (count ?? 0) + 1;
  const regSeq = regNo.split(/[-/]/).pop() || "000";
  return { receiptNo: `R${year}-${regSeq}-${String(seq).padStart(2, "0")}`, error: null };
}

export async function deleteStudentCompletely(studentId: string): Promise<{ error: string | null }> {
  // 1. Fetch this student's Daura participations
  const { data: participations, error: pErr } = await supabase
    .from("daura_participants")
    .select("id")
    .eq("student_id", studentId);
  if (pErr) return { error: "daura_participants fetch: " + pErr.message };
  const partIds = ((participations as { id: string }[]) ?? []).map(r => r.id);

  // 2. Delete daura_marks for those participations (belt-and-suspenders; CASCADE would handle)
  if (partIds.length > 0) {
    const { error } = await supabase.from("daura_marks").delete().in("participant_id", partIds);
    if (error) return { error: "daura_marks: " + error.message };
  }

  // 3. Delete daura_participants rows (SET NULL would orphan them — must go now)
  if (partIds.length > 0) {
    const { error } = await supabase.from("daura_participants").delete().eq("student_id", studentId);
    if (error) return { error: "daura_participants: " + error.message };
  }

  // 4. Delete the student — Postgres cascades marks, exams, fees, fee_payments, enrollments
  {
    const { error } = await supabase.from("students").delete().eq("id", studentId);
    if (error) return { error: "students: " + error.message };
  }

  // 5. Verify: everything must be gone. Any non-zero count → fail with table name.
  const checks: { table: string; count: number }[] = [];
  const verifyTables: [string, string][] = [
    ["students", "id"],
    ["marks", "student_id"],
    ["exams", "student_id"],
    ["fees", "student_id"],
    ["fee_payments", "student_id"],
    ["enrollments", "student_id"],
    ["daura_participants", "student_id"],
  ];
  for (const [table, col] of verifyTables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(col, studentId);
    if (error) return { error: `verify ${table}: ${error.message}` };
    checks.push({ table, count: count ?? 0 });
  }
  const leftovers = checks.filter(c => c.count > 0);
  if (leftovers.length > 0) {
    return { error: "Delete incomplete: " + leftovers.map(c => `${c.table}=${c.count}`).join(", ") };
  }

  return { error: null };
}

// ─── Full Daura programme deletion (super admin) ────────────────
// Postgres cascades: daura_programs → daura_assessments → daura_marks
//                    daura_programs → daura_participants → daura_marks
// Single DELETE. Atomic. Verified after.
export async function deleteDauraProgramme(programId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("daura_programs").delete().eq("id", programId);
  if (error) return { error: error.message };
  // Verify the row is gone (catches RLS silently blocking the delete)
  const { count, error: vErr } = await supabase
    .from("daura_programs")
    .select("*", { count: "exact", head: true })
    .eq("id", programId);
  if (vErr) return { error: "verify failed: " + vErr.message };
  if ((count ?? 0) > 0) return { error: "Programme still exists after delete — RLS blocked or DB error" };
  return { error: null };
}

// ─── Lock helpers — backed by the generic locks table ───
// Scope: 'assessment' | 'exam' | 'daura_assessment'
// Key: e.g. "A3|2026/2027|1" (label|session|semester) or "Qur'an|2026/2027|1" (subject|session|semester)

export async function isLocked(scope: string, scope_key: string): Promise<boolean> {
  const { data } = await supabase
    .from("locks")
    .select("locked")
    .eq("scope", scope)
    .eq("scope_key", scope_key)
    .maybeSingle();
  return (data as { locked: boolean } | null)?.locked === true;
}

export async function setLock(scope: string, scope_key: string, locked: boolean, lockedBy: string | null = null): Promise<{ error: string | null }> {
  if (locked) {
    const { error } = await supabase.from("locks").upsert(
      { scope, scope_key, locked: true, locked_at: new Date().toISOString(), locked_by: lockedBy },
      { onConflict: "scope,scope_key" }
    );
    return { error: error?.message ?? null };
  }
  const { error } = await supabase.from("locks").delete().eq("scope", scope).eq("scope_key", scope_key);
  return { error: error?.message ?? null };
}

// Assessment lock — key: "A3|2026/2027|1"
export async function isAssessmentLocked(label: string, session_label: string, semester: number): Promise<boolean> {
  return isLocked("assessment", `${label}|${session_label}|${semester}`);
}
export async function setAssessmentLock(label: string, session_label: string, semester: number, locked: boolean): Promise<{ error: string | null }> {
  return setLock("assessment", `${label}|${session_label}|${semester}`, locked);
}

// Exam lock — key: "Qur'an|2026/2027|1"
export async function isExamLocked(subject: string, session_label: string, semester: number): Promise<boolean> {
  return isLocked("exam", `${subject}|${session_label}|${semester}`);
}
export async function setExamLock(subject: string, session_label: string, semester: number, locked: boolean): Promise<{ error: string | null }> {
  return setLock("exam", `${subject}|${session_label}|${semester}`, locked);
}
