import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PortfolioEditLoader } from "@/components/PortfolioEditLoader";

export const metadata: Metadata = {
  title: "Редагувати роботу | Кабінет БудПоміч",
  description: "Редагування проєкту у портфоліо майстра.",
};

type EditPortfolioPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPortfolioPage({
  params,
}: EditPortfolioPageProps) {
  const { id } = await params;

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
        <Link className="portfolio-back" href="/dashboard/portfolio">
          <ArrowLeft size={17} /> До портфоліо
        </Link>
      </header>

      <section className="portfolio-page-heading">
        <div>
          <p className="portfolio-eyebrow">Портфоліо майстра</p>
          <h1>Редагувати роботу</h1>
          <p>Оновіть опис, фото або кошторис виконаного проєкту.</p>
        </div>
        <span>Зміни з&apos;являться у публічному профілі</span>
      </section>

      <PortfolioEditLoader itemId={id} />
    </main>
  );
}
