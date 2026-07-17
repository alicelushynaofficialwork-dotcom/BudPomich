export function getProfileInitials(fullName: string | null | undefined) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toLocaleUpperCase("uk-UA");
  }

  const singleName = parts[0] ?? "";
  if (singleName) return singleName.slice(0, 2).toLocaleUpperCase("uk-UA");
  return "КЛ";
}
