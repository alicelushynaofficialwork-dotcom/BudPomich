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
      return "/admin";
    case "master":
    default:
      return "/dashboard";
  }
}

