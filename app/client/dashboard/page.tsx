import { redirect } from "next/navigation";
import { requireAuthenticatedUserRole } from "@/lib/auth-server";
import { getDashboardPath } from "@/lib/auth";
import "./client-dashboard.css";

export const metadata = {
  title: "Кабінет клієнта | БудПоміч",
};

export default async function ClientDashboardPage() {
  const role = await requireAuthenticatedUserRole();
  redirect(getDashboardPath(role));
}
