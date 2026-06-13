import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Майстри | БудПоміч",
  description: "Перевірені майстри для ремонту та будівництва у вашому місті.",
};

export default function MastersPage() {
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
          <Link className="active" href="/masters">Майстри</Link>
          <Link href="/feed">Роботи</Link>
          <Link href={fromDashboard ? "/dashboard" : "/auth/login"}>
            {fromDashboard ? "Кабінет" : "Увійти"}
          </Link>
        </nav>
        <Link className="header-cta" href="/auth/register">Стати майстром</Link>
      </header>

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
          <strong>{masters?.length || 0}</strong>
          <span>перевірених профілів у каталозі</span>
        </div>
      </section>

      <section className="masters-catalog">
        <div className="catalog-heading">
          <div>
            <p className="eyebrow">Каталог майстрів</p>
            <h2>Оберіть свого фахівця</h2>
          </div>

          <p>Знайдено {masters?.length || 0} майстрів</p>
        </div>

        <div className="masters-grid">
          {masters?.map((master: any) => (
            <article className="directory-card" key={master.id}>
              <div className="directory-card-top">
                <div className="directory-avatar">
                  {master.avatar_url ? (
                    <img
                      src={master.avatar_url}
                      alt={master.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "50%",
                      }}
                    />
                  ) : (
                    <span>{master.name?.[0]}</span>
                  )}
                </div>

                <div>
                  <p className="master-profession">{master.profession}</p>
                  <h3>{master.name}</h3>
                  <p className="master-rating">⭐ {master.rating || 5}</p>
                  <p className="master-city">⌖ {master.city}</p>
                </div>
              </div>

              {master.description && (
                <p className="directory-description">{master.description}</p>
              )}

              <div className="directory-card-bottom">
                <p>
                  Ціна від
                  <strong>{master.priceFrom.toLocaleString("uk-UA")} грн</strong>
                </p>
                <Link href={`/masters/${master.id}`}>
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
