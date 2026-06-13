import { redirect } from "next/navigation";

type LegacyMasterPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
};

export default async function LegacyMasterPage({
  params,
  searchParams,
}: LegacyMasterPageProps) {
  const { id } = await params;
  const fromDashboard = (await searchParams).view === "dashboard";

  redirect(`/profile/${id}${fromDashboard ? "?from=dashboard" : ""}`);
}
