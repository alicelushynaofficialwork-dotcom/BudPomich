import { redirect } from "next/navigation";
import { ClientCabinetApp } from "@/components/ClientCabinetApp";
import { getDashboardPath, isUserRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import "./client-dashboard.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Кабінет клієнта | БудПоміч",
};

export default async function ClientDashboardPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/auth/login?error=auth_unavailable");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/auth/login?next=/client/dashboard");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email, full_name, city, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || !isUserRole(profile.role)) {
    redirect("/auth/login?error=missing_profile");
  }

  if (profile.role !== "client") redirect(getDashboardPath(profile.role));

  return (
    <ClientCabinetApp
      mode="real"
      profile={{
        city: profile.city,
        email: profile.email || user.email || null,
        fullName: profile.full_name,
      }}
    />
  );
}
