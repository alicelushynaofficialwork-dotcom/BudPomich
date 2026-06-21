import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { BookingForm } from "@/components/BookingForm";
import { SiteHeader } from "@/components/SiteHeader";
import type { MasterProfile } from "@/lib/masters";

type ProfileMasterViewProps = {
  master: MasterProfile;
};

export function ProfileMasterView({ master }: ProfileMasterViewProps) {
  return (
    <main className="masters-page profile-public-page">
      <SiteHeader active="masters" showMasterCard />

      <div className="profile-breadcrumb">
        <Link href="/masters">← Каталог майстрів</Link>
      </div>

      <section className="public-profile-hero">
        <div className="profile-person">
          <div className={`profile-directory-avatar avatar-${master.accent}`}>
            {master.initials}
          </div>
          <div>
            <p className="eyebrow">{master.profession}</p>
            <h1>{master.name}</h1>
            <p className="profile-location">
              <MapPin size={15} /> {master.city} · {master.experience}
            </p>
            <div className="rating-row">
              <Star className="rating-star" size={17} />
              <strong>{master.rating.toFixed(1)}</strong>
              <span>{master.reviews} відгуків</span>
            </div>
          </div>
        </div>

        <div className="profile-action-card">
          <span>Вартість робіт</span>
          <strong>від {master.priceFrom.toLocaleString("uk-UA")} грн</strong>
          <a href="#booking">Обрати вільну дату</a>
          <a className="profile-secondary-action" href="#message">
            Написати майстру
          </a>
        </div>
      </section>

      <section className="profile-booking-shell">
        <BookingForm
          masterId={master.id}
          masterName={master.name}
          busyDates={master.busyDates}
        />
      </section>

      <div className="master-profile-layout">
        <div className="profile-main-column">
          <section className="profile-section">
            <p className="eyebrow">ПРО МАЙСТРА</p>
            <h2>Досвід і підхід до роботи</h2>
            <p className="profile-about">{master.fullDescription}</p>
          </section>

          <section className="profile-section">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">ПОРТФОЛІО</p>
                <h2>Виконані роботи</h2>
              </div>
              <span>{master.works.length} проєкти</span>
            </div>
            <div className="work-gallery">
              {master.works.map((work, index) => {
                const details =
                  work.details ??
                  (index === 0
                    ? [
                        {
                          name: "Монтаж електрощита",
                          quantity: "1 шт",
                          unitPrice: "4 500 грн",
                          total: "4 500 грн",
                        },
                        {
                          name: "Монтаж електроточки",
                          quantity: "62 шт",
                          unitPrice: "350 грн",
                          total: "21 700 грн",
                        },
                      ]
                    : [
                        {
                          name: master.services[0]?.name ?? "Основна послуга",
                          quantity: "1 обʼєкт",
                          unitPrice: master.services[0]?.price ?? "за кошторисом",
                          total: work.total ?? "за кошторисом",
                        },
                      ]);

                return (
                  <article className="work-card" key={work.title}>
                    <div className={`work-image work-crop-${work.crop}`} />
                    <div className="work-card-body">
                      <div className="work-meta-row">
                        <span>{work.category ?? "Квартира"}</span>
                        <small>{work.location}</small>
                      </div>
                      <h3>{work.title}</h3>
                      <p>
                        {work.description ??
                          "Комплекс робіт виконано під ключ з погодженим кошторисом і фінальною перевіркою якості."}
                      </p>
                      <div className="work-total">
                        <span>Підсумкова вартість</span>
                        <strong>{work.total ?? (index === 0 ? "26 200 грн" : "за кошторисом")}</strong>
                      </div>
                      <div className="work-detail-list">
                        {details.map((item) => (
                          <div key={`${work.title}-${item.name}`}>
                            <span>{item.name}</span>
                            <small>
                              {item.quantity} × {item.unitPrice} = {item.total}
                            </small>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="services-panel">
          <p className="eyebrow">ПОСЛУГИ</p>
          <h2>Що виконує майстер</h2>
          <div className="services-list">
            {master.services.map((service) => (
              <div key={service.name}>
                <span>{service.name}</span>
                <strong>{service.price}</strong>
              </div>
            ))}
          </div>
          <a className="request-button" href="#booking">
            Обрати дату для заявки
          </a>
        </aside>
      </div>
    </main>
  );
}
