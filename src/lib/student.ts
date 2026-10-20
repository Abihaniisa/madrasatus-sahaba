import { supabase } from "./supabase";

export type StudentPortalData = {
  ok: boolean;
  error?: string;
  student?: any;
  marks?: any[];
  exams?: any[];
  assessments?: any[];
  fees?: any[];
  fee_payments?: any[];
  daura_participations?: any[];
  classmates?: any[];
};

const KEY = "madrasah.student";

export function saveStudentSession(nin: string, identifier: string) {
  sessionStorage.setItem(KEY, JSON.stringify({ nin, identifier }));
}

export function getStudentSession(): { nin: string; identifier: string } | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearStudentSession() {
  sessionStorage.removeItem(KEY);
}

export async function fetchStudentPortal(nin: string, identifier: string): Promise<StudentPortalData> {
  const { data, error } = await supabase.rpc("student_portal", { p_nin: nin, p_identifier: identifier });
  if (error) {
    // Hide technical database errors from the student
    console.error("Auth Error:", error.message);
    return { ok: false, error: "Invalid credentials. Please check your NIN and Registration Number." };
  }
  return data as StudentPortalData;
}
