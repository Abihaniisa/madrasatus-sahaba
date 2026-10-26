// src/lib/settings.ts — school settings from Supabase (session start, Ramadan window).
// In-memory cache so reads are synchronous after first load.

import { supabase } from "./supabase";
import { CONFIG } from "./config";

export type SchoolSettings = {
  session_label: string;
  session_start_date: string;
  ramadan_start_date: string | null;
  ramadan_end_date: string | null;
  current_semester_override: number | null;
};

const FALLBACK: SchoolSettings = {
  session_label: CONFIG.sessionLabel,
  session_start_date: CONFIG.calendar.sessionStart,
  ramadan_start_date: null,
  ramadan_end_date: null,
  current_semester_override: null,
};

let cache: SchoolSettings = FALLBACK;
let loaded = false;
let inflight: Promise<SchoolSettings> | null = null;

export function getSettings(): SchoolSettings {
  return cache;
}

export async function loadSettings(): Promise<SchoolSettings> {
  if (loaded) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from("school_settings")
      .select("session_label, session_start_date, ramadan_start_date, ramadan_end_date, current_semester_override")
      .eq("id", 1)
      .maybeSingle();
    if (!error && data) {
      cache = {
        session_label: data.session_label ?? FALLBACK.session_label,
        session_start_date: data.session_start_date ?? FALLBACK.session_start_date,
        ramadan_start_date: data.ramadan_start_date ?? null,
        ramadan_end_date: data.ramadan_end_date ?? null,
        current_semester_override: data.current_semester_override ?? null,
      };
      loaded = true;
    }
    return cache;
  })().finally(() => { inflight = null; });
  return inflight;
}

export async function saveSettings(next: Partial<SchoolSettings>): Promise<{ error: string | null }> {
  const update: Record<string, string | number | null> = {};
  if (next.session_label !== undefined) update.session_label = next.session_label;
  if (next.session_start_date !== undefined) update.session_start_date = next.session_start_date;
  if (next.ramadan_start_date !== undefined) update.ramadan_start_date = next.ramadan_start_date;
  if (next.ramadan_end_date !== undefined) update.ramadan_end_date = next.ramadan_end_date;
  if (next.current_semester_override !== undefined) update.current_semester_override = next.current_semester_override;
  update.updated_at = new Date().toISOString();

  const { error } = await supabase.from("school_settings").update(update).eq("id", 1);
  if (error) return { error: error.message };

  cache = { ...cache, ...next };
  loaded = true;
  return { error: null };
}
