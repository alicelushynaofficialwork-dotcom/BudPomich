import "server-only";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getDashboardPath, isUserRole, type UserRole } from "@/lib/auth";

export async function getAuthenticatedUserRole(): Promise<UserRole | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || !isUserRole(profile?.role)) return null;
  return profile.role;
}

export async function requireAuthenticatedUserRole(): Promise<UserRole> {
  const role = await getAuthenticatedUserRole();
  if (!role) redirect("/auth/login?error=missing_profile");
  if (role === "admin") redirect(getDashboardPath(role));
  return role;
}

export async function requireMasterRole() {
  const role = await requireAuthenticatedUserRole();
  if (role !== "master") redirect(getDashboardPath(role));
  return role;
}
