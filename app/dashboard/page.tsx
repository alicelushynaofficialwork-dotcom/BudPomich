import { redirect } from "next/navigation";
import { DashboardMasterApp } from "@/components/DashboardMasterApp";
import { requireAuthenticatedUserRole } from "@/lib/auth-server";
import { getDashboardPath, isCanonicalDashboardRequest } from "@/lib/auth";
import { getMasterById, masterProfiles } from "@/lib/masters";
import { defaultPortfolioItems } from "@/lib/portfolio";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MASTER_PROFILE_NOT_LINKED, resolveAuthenticatedMasterIdentity } from "@/lib/master-identity";

export const metadata = {
  title: "Кабінет майстра | БудПоміч",
};

type DashboardPageProps = {
  searchParams?: Promise<{ role?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const query = await searchParams;
  const role = await requireAuthenticatedUserRole();
  if (role === "admin") redirect(getDashboardPath(role));
  if (!isCanonicalDashboardRequest(role, "/dashboard", query?.role ?? null)) {
    redirect(getDashboardPath(role));
  }

  if (role === "master") {
    const supabase = await createServerSupabaseClient();
    if (!supabase) redirect("/auth/login?error=auth_unavailable");
    const resolved = await resolveAuthenticatedMasterIdentity(supabase);
    if (!resolved.ok) {
      if (resolved.code === MASTER_PROFILE_NOT_LINKED) {
        return <main className="dash-role-host"><div className="dash-empty">Публічний профіль майстра ще не підключено до акаунта.</div></main>;
      }
      redirect("/auth/login?error=missing_profile");
    }
    const master = getMasterById(resolved.identity.masterSlug);
    if (!master) return <main className="dash-role-host"><div className="dash-empty">Публічний профіль майстра ще не підключено до акаунта.</div></main>;
    const portfolioItems = defaultPortfolioItems.filter((item) => item.masterId === resolved.identity.masterSlug);
    return <DashboardMasterApp defaultRole={role} master={master} masters={masterProfiles} portfolioItems={portfolioItems} />;
  }

  const master = masterProfiles[0];
  if (!master) return null;
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
