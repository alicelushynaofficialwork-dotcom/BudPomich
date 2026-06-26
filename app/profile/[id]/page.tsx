import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileMasterView } from "@/components/ProfileMasterView";
import { getMasterById, masterProfiles } from "@/lib/masters";

type ProfilePageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export function generateStaticParams() {
  return [
    ...masterProfiles.map(({ id }) => ({ id })),
    ...masterProfiles.map((_, index) => ({ id: String(index + 1) })),
  ];
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const master = getMasterById((await params).id);

  return {
    title: master
      ? `${master.name}, ${master.profession} | БудПоміч`
      : "Мастера не найдено",
    description: master?.description,
  };
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const master = getMasterById((await params).id);
  const query = await searchParams;

  if (!master) {
    notFound();
  }

  return (
    <ProfileMasterView
      master={master}
      ownerSource={query?.from === "profile" ? "profile" : undefined}
    />
  );
}
