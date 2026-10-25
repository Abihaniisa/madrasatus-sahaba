const fs = require("fs");
let applied = [];

// Fix 1: nav → window.location.href
{
  const p = "src/pages/admin/DauraProgramme.tsx";
  let s = fs.readFileSync(p, "utf8");
  const old = `    nav("/admin/daura");`;
  const nw = `    window.location.href = "/admin/daura";`;
  if (!s.includes(old)) { console.error("NOT FOUND: nav redirect"); process.exit(1); }
  s = s.replace(old, nw);
  fs.writeFileSync(p, s);
  applied.push("DauraProgramme: nav → window.location.href");
}

// Fix 2: replace deleteDauraProgramme with single-delete + verify
{
  const p = "src/lib/supabase.ts";
  let s = fs.readFileSync(p, "utf8");
  const startMarker = "// ─── Full Daura programme deletion";
  const start = s.indexOf(startMarker);
  if (start === -1) { console.error("deleteDauraProgramme marker not found"); process.exit(1); }
  const closeIdx = s.indexOf("\n}\n", start);
  if (closeIdx === -1) { console.error("function close not found"); process.exit(1); }
  const endAfter = closeIdx + 3;

  const newFn = `// ─── Full Daura programme deletion (super admin) ────────────────
// Postgres cascades: daura_programs → daura_assessments → daura_marks
//                    daura_programs → daura_participants → daura_marks
// Single DELETE. Atomic. Verified after.
export async function deleteDauraProgramme(programId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("daura_programs").delete().eq("id", programId);
  if (error) return { error: error.message };
  const { count, error: vErr } = await supabase
    .from("daura_programs")
    .select("*", { count: "exact", head: true })
    .eq("id", programId);
  if (vErr) return { error: "verify failed: " + vErr.message };
  if ((count ?? 0) > 0) return { error: "Programme still exists after delete — RLS blocked or DB error" };
  return { error: null };
}
`;

  s = s.slice(0, start) + newFn + s.slice(endAfter);
  fs.writeFileSync(p, s);
  applied.push("supabase.ts: single-delete + verify");
}

console.log("PATCH APPLIED — " + applied.length + " changes:");
applied.forEach(c => console.log("  ✓ " + c));
