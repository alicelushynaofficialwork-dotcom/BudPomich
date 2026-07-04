import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { masterProfiles } from "@/lib/masters";

export const metadata: Metadata = {
  title: "Роботи майстрів | БудПоміч",
  description: "Реальні приклади робіт майстрів із цінами та описом.",
};

const works = [
  {
    id: "bathroom",
    masterId: "serhii-ivanenko",
    title: "Ремонт ванної кімнати на Позняках",
    description:
      "Підготовка поверхонь, гідроізоляція та укладання великоформатної плитки.",
    price: "22 440 грн",
    crop: "left",
    category: "Плиточні роботи",
  },
  {
    id: "electrics",
    masterId: "andrii-koval",
    title: "Електрика у двокімнатній квартирі",
    description:
      "Нова проводка, монтаж електрощита, розеток та сценаріїв освітлення.",
    price: "26 200 грн",
    crop: "center",
    category: "Електромонтаж",
  },
  {
    id: "kitchen",
    masterId: "profi-bud",
    title: "Кухня після комплексного ремонту",
    description:
      "Вирівнювання стін, фарбування, підготовка електрики та монтаж меблів.",
    price: "34 800 грн",
    crop: "right",
    category: "Комплексний ремонт",
  },
] as const;

export default function FeedPage() {
  return (
    <main className="works-page">
      <SiteHeader active="feed" showBecomeMaster />

      <section className="works-hero">
        <p className="works-eyebrow">Реальні проєкти та ціни</p>
        <h1>Подивіться, як працюють майстри</h1>
        <p>
          Приклади завершених об&apos;єктів допоможуть оцінити підхід,
          якість виконання та орієнтовну вартість робіт.
        </p>
      </section>

      <section className="works-content">
        <div className="works-heading">
          <div>
            <p className="works-eyebrow">Останні роботи</p>
            <h2>Портфоліо спільноти</h2>
          </div>
          <span>{works.length} нові проєкти</span>
        </div>

        <div className="works-layout">
          <div className="works-list">
            {works.map((work) => {
              const master = masterProfiles.find(
                (profile) => profile.id === work.masterId,
              );

              if (!master) return null;

              return (
                <article className="work-feed-card" key={work.id}>
                  <div className={`work-feed-image feed-crop-${work.crop}`}>
                    <span>{work.category}</span>
                  </div>
                  <div className="work-feed-body">
                    <div className="work-feed-author">
                      <div className={`work-feed-avatar avatar-${master.accent}`}>
                        {master.initials}
                      </div>
                      <div>
                        <Link href={`/masters/${master.id}`}>{master.name}</Link>
                        <p>{master.profession} · {master.city}</p>
                      </div>
                      <div className="work-feed-rating">
                        <span>★</span> {master.rating.toFixed(1)}
                      </div>
                    </div>

                    <div className="work-feed-copy">
                      <div>
                        <h2>{work.title}</h2>
                        <p>{work.description}</p>
                      </div>
                      <strong>{work.price}</strong>
                    </div>

                    <div className="work-feed-footer">
                      <span>Завершений проєкт</span>
                      <Link href={`/masters/${master.id}`}>
                        Переглянути майстра →
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="works-sidebar">
            <p className="works-eyebrow">Рекомендовані</p>
            <h2>Майстри з високим рейтингом</h2>
            <div className="recommended-list">
              {masterProfiles.slice(0, 3).map((master) => (
                <Link
                  className="recommended-master"
                  href={`/masters/${master.id}`}
                  key={master.id}
                >
                  <div className={`work-feed-avatar avatar-${master.accent}`}>
                    {master.initials}
                  </div>
                  <div>
                    <strong>{master.name}</strong>
                    <span>{master.profession} · {master.city}</span>
                  </div>
                  <b>★ {master.rating.toFixed(1)}</b>
                </Link>
              ))}
            </div>
            <Link className="all-masters-link" href="/masters">
              Усі майстри
            </Link>
          </aside>
        </div>
      </section>

      <footer className="works-footer">
        <strong>БудПоміч</strong>
        <span>Майстри, яким можна довіряти.</span>
      </footer>
    </main>
  );
}
