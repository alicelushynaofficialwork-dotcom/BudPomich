import { NextResponse, type NextRequest } from "next/server";
import { completeEmailConfirmation, getSafeConfirmationNext } from "@/lib/auth-confirmation";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const next = getSafeConfirmationNext(request.nextUrl.searchParams.get("next"));
  const supabase = await createServerSupabaseClient();

  if (!supabase) return redirectTo(request, "/auth/login?error=confirmation_failed");

  const result = await completeEmailConfirmation(supabase, tokenHash, type);
  if (result.ok) return redirectTo(request, next);

  return redirectTo(request, "/auth/login?error=confirmation_failed");
}
