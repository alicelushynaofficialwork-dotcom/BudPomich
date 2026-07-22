import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Plus } from "lucide-react";
import { PortfolioManager } from "@/components/PortfolioManager";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveAuthenticatedMasterIdentity } from "@/lib/master-identity";

export const metadata: Metadata = {
  title: "Портфоліо | Кабінет БудПоміч",
  description: "Керування роботами у портфоліо майстра.",
};

export default async function PortfolioPage() {
  const supabase = await createServerSupabaseClient();
  const resolved = supabase ? await resolveAuthenticatedMasterIdentity(supabase) : null;
  if (!resolved?.ok) return <main className="portfolio-page"><div className="dash-empty">Публічний профіль майстра ще не підключено до акаунта.</div></main>;
  return (
    <main className="portfolio-page">
      <header className="portfolio-header">
        <Link className="portfolio-brand" href="/dashboard">
          <Image
            className="portfolio-logo"
            src="/logo/budpomich-logo-v4.svg"
            alt="БудПоміч — будівельний помічник"
            width={820}
            height={380}
            priority
          />
        </Link>
        <Link className="portfolio-back" href="/dashboard">
          <ArrowLeft size={17} /> До кабінету
        </Link>
      </header>

      <section className="portfolio-page-heading portfolio-list-heading">
        <div>
          <p className="portfolio-eyebrow">Кабінет майстра</p>
          <h1>Моє портфоліо</h1>
          <p>
            Усі завершені проєкти в одному місці. Додавайте нові роботи, щоб
            клієнти краще бачили ваш досвід.
          </p>
        </div>
        <Link className="portfolio-add-button" href="/dashboard/portfolio/new">
          <Plus size={18} /> Додати роботу
        </Link>
      </section>

      <div className="portfolio-list">
        <PortfolioManager masterId={resolved.identity.masterSlug} />
      </div>
    </main>
  );
}
