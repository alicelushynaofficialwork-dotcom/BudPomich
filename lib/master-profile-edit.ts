import type { MasterProfile } from "@/lib/masters";

export type EditableMasterProfile = Pick<
  MasterProfile,
  | "id"
  | "name"
  | "profession"
  | "city"
  | "district"
  | "description"
  | "fullDescription"
  | "avatarUrl"
  | "coverImageUrl"
  | "avatarZoom"
  | "avatarPositionX"
  | "avatarPositionY"
  | "coverZoom"
  | "coverPositionX"
  | "coverPositionY"
  | "priceFrom"
  | "experience"
  | "services"
>;

export const masterProfileStorageKey = "budpomich.master-profile-edits";

export function normalizeMasterServices(
  services: MasterProfile["services"],
): MasterProfile["services"] {
  const seen = new Set<string>();

  return services.filter((service) => {
    const key = `${service.name.trim().toLowerCase()}|${service.price.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mergeMasterProfile(
  master: MasterProfile,
  edit?: EditableMasterProfile | null,
): MasterProfile {
  if (!edit || edit.id !== master.id) return master;

  return {
    ...master,
    ...edit,
    avatarUrl: edit.avatarUrl || master.avatarUrl,
    coverImageUrl: edit.coverImageUrl || master.coverImageUrl,
    services: normalizeMasterServices(edit.services),
    initials: edit.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase(),
  };
}
