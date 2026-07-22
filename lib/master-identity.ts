import type { SupabaseClient } from "@supabase/supabase-js";

export const MASTER_PROFILE_NOT_LINKED = "MASTER_PROFILE_NOT_LINKED" as const;

export type AuthenticatedMasterProfile = {
  id: string;
  email: string;
  role: "master";
  master_slug: string;
  full_name?: string | null;
  phone?: string | null;
  city?: string | null;
};

export type AuthenticatedMasterIdentity = {
  authUserId: string;
  profileId: string;
  masterSlug: string;
  profile: AuthenticatedMasterProfile;
};

export async function resolveAuthenticatedMasterIdentity(supabase: SupabaseClient) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return { ok: false as const, code: "AUTH_REQUIRED" as const };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role, master_slug, full_name, phone, city")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return { ok: false as const, code: "PROFILE_QUERY_FAILED" as const, error };
  if (!data || data.role !== "master") return { ok: false as const, code: "NOT_MASTER" as const };
  if (typeof data.master_slug !== "string" || !data.master_slug.trim()) {
    return { ok: false as const, code: MASTER_PROFILE_NOT_LINKED };
  }

  const profile = { ...data, role: "master" as const, master_slug: data.master_slug.trim() };
  return {
    ok: true as const,
    identity: {
      authUserId: user.id,
      profileId: profile.id,
      masterSlug: profile.master_slug,
      profile,
    } satisfies AuthenticatedMasterIdentity,
  };
}
