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
    if (cache === "denied") { nav("/login"); return; }
    let cancelled = false;
    (async () => {
      const result = await ensureChecked();
      if (cancelled) return;
      if (result === "authorized") setReady(true);
      else nav("/login");
    })();
    return () => { cancelled = true; };
  }, [nav]);
  return ready;
}

export type StudentPortalData = {
  ok: boolean; error?: string; student?: any;
  marks?: any[]; exams?: any[]; assessments?: any[];
  fees?: any[]; fee_payments?: any[]; daura_participations?: any[]; classmates?: any[];
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
export async function deleteStudentCompletely(studentId: string): Promise<{ error: string | null }> {
  // 1. marks (child of assessments)
  {
    const { error } = await supabase.from("marks").delete().eq("student_id", studentId);
    if (error) return { error: `marks: ${error.message}` };
  }
  // 2. exams
  {
    const { error } = await supabase.from("exams").delete().eq("student_id", studentId);
    if (error) return { error: `exams: ${error.message}` };
  }
  // 3. fee_payments
  {
    const { error } = await supabase.from("fee_payments").delete().eq("student_id", studentId);
    if (error) return { error: `fee_payments: ${error.message}` };
  }
  // 4. fees
  {
    const { error } = await supabase.from("fees").delete().eq("student_id", studentId);
    if (error) return { error: `fees: ${error.message}` };
  }
  // 5. enrollments
  {
    const { error } = await supabase.from("enrollments").delete().eq("student_id", studentId);
    if (error) return { error: `enrollments: ${error.message}` };
  }
  // 6. students (parent)
  {
    const { error } = await supabase.from("students").delete().eq("id", studentId);
    if (error) return { error: `students: ${error.message}` };
  }
  return { error: null };
}
