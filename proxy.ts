import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getDashboardRedirect, isUserRole } from "@/lib/auth";

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

export async function proxy(request: NextRequest) {
  const responseRef = { current: NextResponse.next({ request }) };
  const supabase = createMiddlewareClient(request, responseRef);
  const pathname = request.nextUrl.pathname;

  if (!isProtectedPath(pathname)) return responseRef.current;

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
    return redirectWithRefreshedCookies(loginUrl, responseRef.current);
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
