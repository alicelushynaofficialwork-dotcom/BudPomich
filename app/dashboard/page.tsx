import { redirect } from "next/navigation";
import { DashboardMasterApp } from "@/components/DashboardMasterApp";
import { requireAuthenticatedUserRole } from "@/lib/auth-server";
import { getDashboardPath, isCanonicalDashboardRequest } from "@/lib/auth";
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
  const role = await requireAuthenticatedUserRole();
  if (role === "admin") redirect(getDashboardPath(role));
  if (!isCanonicalDashboardRequest(role, "/dashboard", query?.role ?? null)) {
    redirect(getDashboardPath(role));
  }
  const portfolioItems = defaultPortfolioItems.filter((item) => item.masterId === master.id);

  return (
    <DashboardMasterApp
      defaultRole={role}
      master={master}
      masters={masterProfiles}
      portfolioItems={portfolioItems}
    />
  );
}
