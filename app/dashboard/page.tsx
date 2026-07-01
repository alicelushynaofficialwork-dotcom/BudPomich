import { DashboardMasterApp } from "@/components/DashboardMasterApp";
import { getMasterById } from "@/lib/masters";
import { defaultPortfolioItems } from "@/lib/portfolio";

export const metadata = {
  title: "Кабінет майстра | БудПоміч",
};

export default function DashboardPage() {
  const master = getMasterById("andrey-ponomarenko");
  if (!master) return null;

  const portfolioItems = defaultPortfolioItems.filter((item) => item.masterId === master.id);

  return <DashboardMasterApp master={master} portfolioItems={portfolioItems} />;
}
