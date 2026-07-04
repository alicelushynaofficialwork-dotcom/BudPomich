import { ClientCabinetApp } from "@/components/ClientCabinetApp";
import { masterProfiles } from "@/lib/masters";
import "./client-dashboard.css";

export const metadata = {
  title: "Кабінет клієнта | БудПоміч",
};

export default function ClientDashboardPage() {
  return <ClientCabinetApp masters={masterProfiles.slice(0, 6)} />;
}
