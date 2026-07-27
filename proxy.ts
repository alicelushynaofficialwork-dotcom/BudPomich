import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getDashboardRedirect, isUserRole } from "@/lib/auth";
import {
  isInvalidRefreshTokenError,
  isSupabaseAuthCookie,
} from "@/lib/supabase-auth-error";

function createMiddlewareClient(
  request: NextRequest,
  responseRef: { current: NextResponse },
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        responseRef.current = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          responseRef.current.cookies.set(name, value, options);
        });
        Object.entries(headersToSet).forEach(([name, value]) => {
          responseRef.current.headers.set(name, value);
        });
      },
    },
  });
}

function isProtectedPath(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/") || pathname === "/client/dashboard" || pathname.startsWith("/admin");
}

function redirectWithRefreshedCookies(url: URL, response: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = response.headers.get(header);
    if (value) redirectResponse.headers.set(header, value);
  }
  return redirectResponse;
}

function clearSupabaseSessionCookies(
  request: NextRequest,
  response: NextResponse,
  supabaseUrl: string,
  cookieNames: string[],
) {
  for (const name of cookieNames) {
    if (!isSupabaseAuthCookie(name, supabaseUrl)) continue;

    request.cookies.delete(name);
    response.cookies.set(name, "", {
      path: "/",
      sameSite: "lax",
      maxAge: 0,
    });
  }
}

function loginRedirect(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/auth/login";
  loginUrl.search = "";
  return loginUrl;
}

export async function proxy(request: NextRequest) {
  const responseRef = { current: NextResponse.next({ request }) };
  const pathname = request.nextUrl.pathname;

  if (!isProtectedPath(pathname)) return responseRef.current;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sessionCookieNames = request.cookies.getAll().map(({ name }) => name);
  const supabase = createMiddlewareClient(request, responseRef);

  if (!supabase) {
    const loginUrl = loginRedirect(request);
    loginUrl.searchParams.set("error", "auth_unavailable");
    return NextResponse.redirect(loginUrl);
  }

  const { data: claimsData, error: authError } = await supabase.auth.getClaims();

  if (isInvalidRefreshTokenError(authError) && supabaseUrl) {
    const redirectResponse = NextResponse.redirect(loginRedirect(request));
    redirectResponse.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate, max-age=0",
    );
    redirectResponse.headers.set("Expires", "0");
    redirectResponse.headers.set("Pragma", "no-cache");
    clearSupabaseSessionCookies(
      request,
      redirectResponse,
      supabaseUrl,
      sessionCookieNames,
    );
    return redirectResponse;
  }

  const userId =
    typeof claimsData?.claims.sub === "string" ? claimsData.claims.sub : null;

  if (!userId) {
    const loginUrl = loginRedirect(request);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return redirectWithRefreshedCookies(loginUrl, responseRef.current);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!isUserRole(profile?.role)) {
    const loginUrl = loginRedirect(request);
    loginUrl.searchParams.set("error", "missing_profile");
    return redirectWithRefreshedCookies(loginUrl, responseRef.current);
  }

  const role = profile.role;
  const dashboardRedirect = getDashboardRedirect(
    role,
    pathname,
    request.nextUrl.searchParams.get("role"),
  );

  if (dashboardRedirect) {
    return redirectWithRefreshedCookies(new URL(dashboardRedirect, request.url), responseRef.current);
  }

  return responseRef.current;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
