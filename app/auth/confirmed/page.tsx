import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, ArrowRight } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const metadata = {
  title: "Email підтверджено | БудПомiч",
  description: "Електронну адресу успішно підтверджено.",
};

export default async function ConfirmedEmailPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/auth/login?error=confirmation_session_missing");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?error=confirmation_session_missing");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/auth/login?error=confirmation_failed");

  return (
    <main className="auth-page register-page">
      <div className="register-wrap">
        <section className="register-success" aria-live="polite">
          <div>
            <Check size={28} />
          </div>
          <h1>Електронну адресу підтверджено</h1>
          <p>Ваш акаунт активовано. Тепер ви можете перейти до особистого кабінету.</p>
          <Link className="register-submit-link" href="/dashboard">
            Увійти в кабінет
            <ArrowRight size={17} />
          </Link>
        </section>
      </div>
    </main>
  );
}
