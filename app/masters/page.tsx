import type { Metadata } from "next";
import { MastersCatalogView } from "@/components/MastersCatalogView";
import { masterProfiles } from "@/lib/masters";

export const metadata: Metadata = {
  title: "Майстри | БудПоміч",
  description:
    "Перевірені майстри для ремонту та будівництва у вашому місті.",
};

export default function MastersPage() {
  return <MastersCatalogView masters={masterProfiles} />;
}
