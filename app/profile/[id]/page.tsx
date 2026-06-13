import type { Metadata } from "next";
import { getMasterById } from "@/lib/masters";
import { PublicMasterProfile } from "@/components/PublicMasterProfile";

type PublicProfilePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
};

export async function generateMetadata({
  params,
}: PublicProfilePageProps): Promise<Metadata> {
  const master = getMasterById((await params).id);

  return {
    title: master ? `${master.name} | Портфоліо БудПоміч` : "Майстра не знайдено",
    description: master?.description,
  };
}

export default async function PublicProfilePage({
  params,
  searchParams,
}: PublicProfilePageProps) {
  const source = (await searchParams).from;
  const ownerSource = ["dashboard", "profile", "portfolio"].includes(
    source ?? "",
  )
    ? (source as "dashboard" | "profile" | "portfolio")
    : undefined;

  return (
    <PublicMasterProfile
      masterId={(await params).id}
      ownerSource={ownerSource}
    />
  );
}
