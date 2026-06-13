import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PortfolioForm } from "@/components/PortfolioForm";

export const metadata: Metadata = {
  title: "Додати роботу | Кабінет БудПоміч",
  description: "Додавання роботи до портфоліо майстра.",
};

export default function NewPortfolioItemPage() {
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
          <h1>Додати нову роботу</h1>
          <p>
            Покажіть результат клієнтам і додайте прозорий кошторис виконаних
            робіт.
          </p>
        </div>
        <span>Чернетка зберігається після відправлення</span>
      </section>

      <PortfolioForm />
    </main>
  );
}
