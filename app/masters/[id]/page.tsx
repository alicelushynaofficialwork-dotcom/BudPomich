import { redirect } from "next/navigation";

type LegacyMasterPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LegacyMasterPage({ params }: LegacyMasterPageProps) {
  const { id } = await params;
  redirect(`/profile/${id}`);
}
