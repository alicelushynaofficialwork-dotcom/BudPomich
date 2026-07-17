export const userRoles = ["client", "master", "contractor", "admin"] as const;

export type UserRole = (typeof userRoles)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && userRoles.includes(value as UserRole);
}

export function getDashboardPath(role: UserRole) {
  switch (role) {
    case "client":
      return "/client/dashboard";
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
  switch (role) {
    case "client":
      return pathname === "/client/dashboard" && requestedRole === null;
    case "contractor":
      return pathname === "/dashboard" && requestedRole === "contractor";
    case "master":
      return pathname === "/dashboard" && requestedRole === null;
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
  if (
    pathname === "/client/dashboard" &&
    (role !== "client" || !isCanonicalDashboardRequest(role, pathname, requestedRole))
  ) {
    return targetPath;
  }
  if (pathname.startsWith("/dashboard/") && role !== "master") return targetPath;
  if (pathname === "/dashboard" && !isCanonicalDashboardRequest(role, pathname, requestedRole)) {
    return targetPath;
  }
  if (pathname.startsWith("/admin")) return targetPath;

  return null;
}

