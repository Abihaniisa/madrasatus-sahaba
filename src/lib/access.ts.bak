import { supabase } from "./supabase";

export type AccessRow = {
  email: string;
  role: string;
  is_super: boolean;
  expires_at: string | null;
  created_at: string;
};

export async function listAccess(): Promise<AccessRow[]> {
  const { data, error } = await supabase
    .from("authorized_users")
    .select("*")
    .order("is_super", { ascending: false })
    .order("email");
  if (error) return [];
  return (data as AccessRow[]) ?? [];
}

export async function addAccess(email: string, isSuper: boolean, expiresAt: string | null) {
  return supabase.from("authorized_users").insert({
    email: email.toLowerCase().trim(),
    role: isSuper ? "super_admin" : "admin",
    is_super: isSuper,
    expires_at: expiresAt,
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
