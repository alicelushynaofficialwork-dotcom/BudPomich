import { DashboardMasterApp } from "@/components/DashboardMasterApp";
import { getMasterById, masterProfiles } from "@/lib/masters";
import { defaultPortfolioItems } from "@/lib/portfolio";

export const metadata = {
  title: "Кабінет майстра | БудПоміч",
};

type DashboardPageProps = {
  searchParams?: Promise<{ role?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const master = getMasterById("andrey-ponomarenko");
  if (!master) return null;

  const query = await searchParams;
  const defaultRole =
    query?.role === "client" || query?.role === "contractor" ? query.role : "master";
  const portfolioItems = defaultPortfolioItems.filter((item) => item.masterId === master.id);

  return (
    <DashboardMasterApp
      defaultRole={defaultRole}
      master={master}
      masters={masterProfiles}
      portfolioItems={portfolioItems}
    />
  );
}
