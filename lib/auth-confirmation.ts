import type { EmailOtpType, SupabaseClient, User } from "@supabase/supabase-js";
import { isUserRole, type UserRole } from "./auth.ts";

const emailOtpTypes: EmailOtpType[] = [
  "email",
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
];

export function getSafeConfirmationNext(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/auth/confirmed";
  }
  return next;
}

export function getEmailOtpType(value: string | null): EmailOtpType | null {
  return emailOtpTypes.includes(value as EmailOtpType) ? (value as EmailOtpType) : null;
}

function metadataValue(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : "";
}

async function ensureProfile(supabase: SupabaseClient, user: User) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) return false;
  if (profile) return true;

  const metadata = user.user_metadata ?? {};
  const metadataRole = metadataValue(metadata, "role");
  const role: UserRole = isUserRole(metadataRole) && metadataRole !== "admin" ? metadataRole : "client";
  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    email: user.email ?? "",
    full_name: metadataValue(metadata, "full_name") || null,
    phone: metadataValue(metadata, "phone") || null,
    city: metadataValue(metadata, "city") || null,
    role,
    updated_at: new Date().toISOString(),
  });

  return !insertError;
}

export async function completeEmailConfirmation(
  supabase: SupabaseClient,
  tokenHash: string | null,
  typeValue: string | null,
) {
  const type = getEmailOtpType(typeValue);
  let verificationFailed = !tokenHash || !type;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    verificationFailed = Boolean(error);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, reason: verificationFailed ? "verification_failed" : "session_missing" };
  }

  const profileReady = await ensureProfile(supabase, user);
  if (!profileReady) return { ok: false as const, reason: "profile_failed" };

  return { ok: true as const, reusedSession: verificationFailed, user };
}
