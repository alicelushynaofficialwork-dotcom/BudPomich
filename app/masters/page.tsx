import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { masterProfiles } from "@/lib/masters";

export const metadata: Metadata = {
  title: "Майстри | БудПоміч",
  description:
    "Перевірені майстри для ремонту та будівництва у вашому місті.",
};

export default function MastersPage() {
  const masters = masterProfiles;

  return (
    <main className="masters-page">
      <SiteHeader active="masters" showBecomeMaster />

      <section className="masters-hero">
        <div>
          <p className="eyebrow">Надійні фахівці поруч</p>
          <h1>Знайдіть майстра для вашого завдання</h1>
          <p>
            Порівнюйте досвід, ціни та відгуки. Обирайте спеціаліста, якому
            готові довірити свою оселю.
          </p>
        </div>

        <div className="hero-stat">
          <strong>{masters.length}</strong>
          <span>перевірених профілів у каталозі</span>
        </div>
      </section>

      <section className="masters-catalog">
        <div className="catalog-heading">
          <div>
            <p className="eyebrow">Каталог майстрів</p>
            <h2>Оберіть свого фахівця</h2>
          </div>

          <p>Знайдено {masters.length} майстрів</p>
        </div>

        <div className="masters-grid">
          {masters.map((master) => (
            <article className="directory-card" key={master.id}>
              <div className="directory-card-top">
                <div className={`directory-avatar avatar-${master.accent}`}>
                  <span>{master.initials}</span>
                </div>

                <div>
                  <p className="master-profession">{master.profession}</p>
                  <h3>{master.name}</h3>
                  <p className="master-rating">
                    ★ {master.rating.toFixed(1)} · {master.reviews} відгуків
                  </p>
                  <p className="master-city">
                    ⌖ {master.city} · {master.experience}
                  </p>
                </div>
              </div>

              <p className="directory-description">{master.description}</p>

              <div className="directory-card-bottom">
                <p>
                  Ціна від
                  <strong>{master.priceFrom.toLocaleString("uk-UA")} грн</strong>
                </p>
                <Link href={`/profile/${master.id}`}>Переглянути профіль →</Link>
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
