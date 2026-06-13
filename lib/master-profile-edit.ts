import type { MasterProfile } from "@/lib/masters";

export type EditableMasterProfile = Pick<
  MasterProfile,
  | "id"
  | "name"
  | "profession"
  | "city"
  | "description"
  | "fullDescription"
  | "priceFrom"
  | "experience"
  | "services"
>;

export const masterProfileStorageKey = "budpomich.master-profile-edits";

export function mergeMasterProfile(
  master: MasterProfile,
  edit?: EditableMasterProfile | null,
): MasterProfile {
  if (!edit || edit.id !== master.id) return master;

  return {
    ...master,
    ...edit,
    initials: edit.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase(),
  };
}
