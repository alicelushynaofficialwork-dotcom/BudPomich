import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getDashboardRedirect, isUserRole } from "@/lib/auth";

function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
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
  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createMiddlewareClient(request, response);
  const pathname = request.nextUrl.pathname;

  if (!isProtectedPath(pathname)) return response;

  if (!supabase) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("error", "auth_unavailable");
    return NextResponse.redirect(loginUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return redirectWithRefreshedCookies(loginUrl, response);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isUserRole(profile?.role)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("error", "missing_profile");
    return redirectWithRefreshedCookies(loginUrl, response);
  }

  const role = profile.role;
  const dashboardRedirect = getDashboardRedirect(
    role,
    pathname,
    request.nextUrl.searchParams.get("role"),
  );

  if (dashboardRedirect) {
    return redirectWithRefreshedCookies(new URL(dashboardRedirect, request.url), response);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
