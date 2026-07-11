import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getDashboardPath, isUserRole } from "@/lib/auth";

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
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/") || pathname.startsWith("/admin");
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createMiddlewareClient(request, response);
  const pathname = request.nextUrl.pathname;

  if (!supabase) return response;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isProtectedPath(pathname)) {
    return response;
  }

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = isUserRole(profile?.role) ? profile.role : "client";
  const targetPath = getDashboardPath(role);

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL(targetPath, request.url));
  }

  if (pathname === "/dashboard") {
    const requestedRole = request.nextUrl.searchParams.get("role");
    if ((requestedRole === "client" && role !== "client") || (requestedRole === "contractor" && role !== "contractor")) {
      return NextResponse.redirect(new URL(targetPath, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
