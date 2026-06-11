import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMasterById, masterProfiles } from "@/lib/masters";

type MasterPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return masterProfiles.map(({ id }) => ({ id }));
}

export async function generateMetadata({
  params,
}: MasterPageProps): Promise<Metadata> {
  const master = getMasterById((await params).id);

  return {
    title: master ? `${master.name}, ${master.profession} | БудПоміч` : "Майстра не знайдено",
    description: master?.description,
  };
}

export default async function MasterProfilePage({ params }: MasterPageProps) {
  const master = getMasterById((await params).id);

  if (!master) {
    notFound();
  }

  return (
    <main className="masters-page profile-directory-page">
      <header className="masters-header">
        <Link className="masters-brand" href="/masters">
          <span>Б</span>
          БудПоміч
        </Link>
        <nav aria-label="Основна навігація">
          <Link className="active" href="/masters">Майстри</Link>
          <Link href="/feed">Роботи</Link>
          <Link href="/auth/login">Увійти</Link>
        </nav>
        <Link className="header-cta" href="/auth/register">Стати майстром</Link>
      </header>

      <div className="profile-breadcrumb">
        <Link href="/masters">Майстри</Link>
        <span>/</span>
        <span>{master.name}</span>
      </div>

      <section className="master-profile-hero">
        <div className="profile-person">
          <div className={`profile-directory-avatar avatar-${master.accent}`}>
            {master.initials}
          </div>
          <div>
            <p className="eyebrow">{master.profession}</p>
            <h1>{master.name}</h1>
            <p className="profile-location">⌖ {master.city} · {master.experience}</p>
            <div className="rating-row">
              <span className="rating-star">★</span>
              <strong>{master.rating.toFixed(1)}</strong>
              <span>{master.reviews} відгуків</span>
            </div>
          </div>
        </div>

        <div className="profile-action-card">
          <span>Вартість робіт</span>
          <strong>від {master.priceFrom.toLocaleString("uk-UA")} грн</strong>
          <a href="#request">Залишити заявку</a>
          <small>Майстер відповість після уточнення деталей</small>
        </div>
      </section>

      <div className="master-profile-layout">
        <div className="profile-main-column">
          <section className="profile-section">
            <p className="eyebrow">Про майстра</p>
            <h2>Досвід і підхід до роботи</h2>
            <p className="profile-about">{master.fullDescription}</p>
          </section>

          <section className="profile-section">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">Портфоліо</p>
                <h2>Виконані роботи</h2>
              </div>
              <span>{master.works.length} проєкти</span>
            </div>
            <div className="work-gallery">
              {master.works.map((work) => (
                <article className="work-card" key={work.title}>
                  <div className={`work-image work-crop-${work.crop}`} />
                  <div>
                    <h3>{work.title}</h3>
                    <p>⌖ {work.location}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="services-panel" id="request">
          <p className="eyebrow">Послуги</p>
          <h2>Що виконує майстер</h2>
          <div className="services-list">
            {master.services.map((service) => (
              <div key={service.name}>
                <span>{service.name}</span>
                <strong>{service.price}</strong>
              </div>
            ))}
          </div>
          <a className="request-button" href={`mailto:hello@budpomich.ua?subject=Заявка для ${master.name}`}>
            Залишити заявку
          </a>
          <p className="request-note">
            Опишіть завдання, і ми передамо заявку майстру. Без оплати на сайті.
          </p>
        </aside>
      </div>

      <footer className="masters-footer">
        <strong>БудПоміч</strong>
        <Link href="/masters">Повернутися до каталогу</Link>
      </footer>
    </main>
  );
}
