// src/lib/settings.ts — school settings from Supabase (session start, Ramadan window).
// In-memory cache so reads are synchronous after first load.

import { supabase } from "./supabase";
import { CONFIG } from "./config";

export type SchoolSettings = {
  session_start_date: string;
  ramadan_start_date: string | null;
  ramadan_end_date: string | null;
};

const FALLBACK: SchoolSettings = {
  session_start_date: CONFIG.calendar.sessionStart,
  ramadan_start_date: null,
  ramadan_end_date: null,
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
      .select("session_start_date, ramadan_start_date, ramadan_end_date")
      .eq("id", 1)
      .maybeSingle();
    if (!error && data) {
      cache = {
        session_start_date: data.session_start_date ?? FALLBACK.session_start_date,
        ramadan_start_date: data.ramadan_start_date ?? null,
        ramadan_end_date: data.ramadan_end_date ?? null,
      };
      loaded = true;
    }
    return cache;
  })().finally(() => { inflight = null; });
  return inflight;
}

export async function saveSettings(next: Partial<SchoolSettings>): Promise<{ error: string | null }> {
  const update: Record<string, string | null> = {};
  if (next.session_start_date !== undefined) update.session_start_date = next.session_start_date;
  if (next.ramadan_start_date !== undefined) update.ramadan_start_date = next.ramadan_start_date;
  if (next.ramadan_end_date !== undefined) update.ramadan_end_date = next.ramadan_end_date;
  update.updated_at = new Date().toISOString();

  const { error } = await supabase.from("school_settings").update(update).eq("id", 1);
  if (error) return { error: error.message };

  cache = { ...cache, ...next };
  loaded = true;
  return { error: null };
}
