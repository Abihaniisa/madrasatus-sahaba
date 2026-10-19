import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Read .env manually (no dotenv dependency needed)
const env = Object.fromEntries(
  readFileSync(new URL("./.env", import.meta.url), "utf8")
    .split("\n")
    .filter(l => l.includes("=") && !l.trim().startsWith("#"))
    .map(l => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) { console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env"); process.exit(1); }

const EMAIL = process.argv[2];
const PASSWORD = process.argv[3];
if (!EMAIL || !PASSWORD) { console.error("Usage: node diag.mjs <email> <password>"); process.exit(1); }

const supabase = createClient(url, key);

console.log("=== 1. Sign in ===");
const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (authErr) { console.error("AUTH ERROR:", authErr.message); process.exit(1); }
console.log("OK. User id:", authData.user.id);
console.log("OK. Email:", authData.user.email);

console.log("\n=== 2. Decode JWT payload ===");
const jwt = authData.session.access_token.split(".")[1];
const payload = JSON.parse(Buffer.from(jwt, "base64").toString("utf8"));
console.log("JWT email:", payload.email ?? "(MISSING)");
console.log("JWT role:", payload.role ?? "(none)");
console.log("JWT exp:", new Date(payload.exp * 1000).toISOString());
console.log("JWT sub (user id):", payload.sub);

console.log("\n=== 3. Query authorized_users (like isAuthorized) ===");
const { data: row, error: rowErr } = await supabase
  .from("authorized_users")
  .select("email, role, expires_at")
  .eq("email", authData.user.email)
  .maybeSingle();
console.log("Query error:", rowErr ? rowErr.message : "none");
console.log("Row returned:", row);

console.log("\n=== 4. Call is_authorized() RPC ===");
const { data: rpcData, error: rpcErr } = await supabase.rpc("is_authorized");
console.log("RPC error:", rpcErr ? rpcErr.message : "none");
console.log("RPC result:", rpcData);

console.log("\n=== 5. Sign out ===");
await supabase.auth.signOut();
console.log("Done.");
