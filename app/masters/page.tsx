import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { masterProfiles } from "@/lib/masters";

export const metadata: Metadata = {
  title: "Майстри | БудПоміч",
  description: "Перевірені майстри для ремонту та будівництва у вашому місті.",
};

type MastersPageProps = {
  searchParams: Promise<{ from?: string }>;
};

export default async function MastersPage({ searchParams }: MastersPageProps) {
  const fromDashboard = (await searchParams).from === "dashboard";
  const dashboardSuffix = fromDashboard ? "?from=dashboard" : "";

  return (
    <main className="masters-page">
      <header className="masters-header">
        <Link className="masters-brand" href="/masters">
          <Image
            className="brand-logo-image"
            src="/logo/budpomich-logo-v4.svg"
            alt="БудПоміч — будівельний помічник"
            width={790}
            height={420}
            priority
          />
        </Link>
        <nav aria-label="Основна навігація">
          <Link
            className="active"
            href={fromDashboard ? "/masters?from=dashboard" : "/masters"}
          >
            Майстри
          </Link>
          <Link href="/feed">Роботи</Link>
          <Link href={fromDashboard ? "/dashboard" : "/auth/login"}>
            {fromDashboard ? "Кабінет" : "Увійти"}
          </Link>
        </nav>
        <Link
          className="header-cta"
          href={fromDashboard ? "/dashboard" : "/auth/register"}
        >
          {fromDashboard ? "До кабінету" : "Стати майстром"}
        </Link>
      </header>

      <section className="masters-hero">
        <div>
          <p className="eyebrow">Надійні фахівці поруч</p>
          <h1>Знайдіть майстра для вашого завдання</h1>
          <p>
            Порівнюйте досвід, ціни та відгуки. Обирайте спеціаліста,
            якому готові довірити свою оселю.
          </p>
        </div>
        <div className="hero-stat">
          <strong>{masterProfiles.length}</strong>
          <span>перевірених профілів у каталозі</span>
        </div>
      </section>

      <section className="masters-catalog" aria-labelledby="catalog-title">
        <div className="catalog-heading">
          <div>
            <p className="eyebrow">Каталог майстрів</p>
            <h2 id="catalog-title">Оберіть свого фахівця</h2>
          </div>
          <p>Знайдено {masterProfiles.length} майстрів</p>
        </div>

        <div className="masters-grid">
          {masterProfiles.map((master) => (
            <article className="directory-card" key={master.id}>
              <div className="directory-card-top">
                <div className={`directory-avatar avatar-${master.accent}`}>
                  {master.initials}
                </div>
                <div>
                  <p className="master-profession">{master.profession}</p>
                  <h3>{master.name}</h3>
                  <p className="master-city">⌖ {master.city} · {master.experience}</p>
                </div>
              </div>

              <div className="rating-row">
                <span className="rating-star">★</span>
                <strong>{master.rating.toFixed(1)}</strong>
                <span>{master.reviews} відгуків</span>
              </div>

              <p className="directory-description">{master.description}</p>

              <div className="directory-card-bottom">
                <p>
                  Ціна від
                  <strong>{master.priceFrom.toLocaleString("uk-UA")} грн</strong>
                </p>
                <Link href={`/profile/${master.id}${dashboardSuffix}`}>
                  Переглянути профіль <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="masters-footer">
        <strong>БудПоміч</strong>
        <span>Майстри, яким можна довіряти.</span>
      </footer>
    </main>
  );
}
