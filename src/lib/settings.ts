import { supabase } from "./supabase";

export type SchoolSettings = {
  session_label: string;
  current_semester: number;
  reg_year: string;
  session_start_date: string;
  session_end_date: string;
  ramadan_start_date: string | null;
  ramadan_end_date: string | null;
};

export let SETTINGS: SchoolSettings = {
  session_label: "2026/2027",
  current_semester: 1,
  reg_year: "2026",
  session_start_date: "2026-03-28",
  session_end_date: "2027-03-20",
  ramadan_start_date: null,
  ramadan_end_date: null,
};

export async function loadSettings() {
  const { data } = await supabase.from("school_settings").select("*").eq("id", 1).single();
  if (data) SETTINGS = data as SchoolSettings;
}

export async function saveSettings(newSettings: Partial<SchoolSettings>) {
  await supabase.from("school_settings").update(newSettings).eq("id", 1);
  await loadSettings();
}
