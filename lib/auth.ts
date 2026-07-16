export const userRoles = ["client", "master", "contractor", "admin"] as const;

export type UserRole = (typeof userRoles)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && userRoles.includes(value as UserRole);
}

export function getDashboardPath(role: UserRole) {
  switch (role) {
    case "client":
      return "/dashboard?role=client";
    case "contractor":
      return "/dashboard?role=contractor";
    case "admin":
      return "/auth/login?error=unsupported_role";
    case "master":
    default:
      return "/dashboard";
  }
}

export function isCanonicalDashboardRequest(
  role: UserRole,
  pathname: string,
  requestedRole: string | null,
) {
  if (pathname !== "/dashboard") return false;

  switch (role) {
    case "client":
      return requestedRole === "client";
    case "contractor":
      return requestedRole === "contractor";
    case "master":
      return requestedRole === null;
    case "admin":
      return false;
  }
}

export function getDashboardRedirect(
  role: UserRole,
  pathname: string,
  requestedRole: string | null,
) {
  const targetPath = getDashboardPath(role);

  if (role === "admin") return targetPath;
  if (pathname === "/client/dashboard") return targetPath;
  if (pathname.startsWith("/dashboard/") && role !== "master") return targetPath;
  if (pathname === "/dashboard" && !isCanonicalDashboardRequest(role, pathname, requestedRole)) {
    return targetPath;
  }
  if (pathname.startsWith("/admin")) return targetPath;

  return null;
}

