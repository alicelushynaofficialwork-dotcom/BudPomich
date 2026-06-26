"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutDashboard, MapPin, Pencil, Star } from "lucide-react";
import { BookingForm, DirectMessageForm } from "@/components/BookingForm";
import { SiteHeader } from "@/components/SiteHeader";
import { getMasterServices } from "@/lib/master-services";
import type { MasterProfile } from "@/lib/masters";
import {
  type EditableMasterProfile,
  masterProfileStorageKey,
  mergeMasterProfile,
} from "@/lib/master-profile-edit";
import {
  defaultPortfolioItems,
  formatUah,
  type PortfolioItem,
  portfolioStorageKey,
} from "@/lib/portfolio";

type ProfileMasterViewProps = {
  master: MasterProfile;
  ownerSource?: "profile";
};

function getPortfolioPhotos(item: PortfolioItem) {
  const photos = item.photoUrls?.length
    ? item.photoUrls
    : item.photoUrl
      ? [item.photoUrl]
      : [];

  const fallback = "/images/portfolio-triptych.png";
  return Array.from(new Set([...photos, fallback])).filter(Boolean);
}

export function ProfileMasterView({ master, ownerSource }: ProfileMasterViewProps) {
  const [profileEdit, setProfileEdit] = useState<EditableMasterProfile | null>(null);
  const [savedPortfolioItems, setSavedPortfolioItems] = useState<PortfolioItem[]>([]);
  const [activePortfolioSlides, setActivePortfolioSlides] = useState<Record<string, number>>({});
  const visibleMaster = useMemo(() => mergeMasterProfile(master, profileEdit), [master, profileEdit]);
  const bookingServices = getMasterServices(visibleMaster.id);
  const portfolioItems = useMemo(() => {
    const defaults = defaultPortfolioItems.filter((item) => item.masterId === visibleMaster.id);
    const map = new Map(
      [...defaults, ...savedPortfolioItems].map((item) => [item.id, item]),
    );
    return Array.from(map.values());
  }, [savedPortfolioItems, visibleMaster.id]);
  const avatarCropStyle = {
    objectPosition: `${visibleMaster.avatarPositionX ?? 50}% ${visibleMaster.avatarPositionY ?? 35}%`,
    transformOrigin: `${visibleMaster.avatarPositionX ?? 50}% ${visibleMaster.avatarPositionY ?? 35}%`,
    transform: `scale(${visibleMaster.avatarZoom ?? 1})`,
  };

  useEffect(() => {
    const localProfiles = JSON.parse(
      localStorage.getItem(masterProfileStorageKey) ?? "{}",
    ) as Record<string, EditableMasterProfile>;

    if (localProfiles[master.id]) {
      setProfileEdit(localProfiles[master.id]);
    }

    const localPortfolioItems = JSON.parse(
      localStorage.getItem(portfolioStorageKey) ?? "[]",
    ) as PortfolioItem[];
    setSavedPortfolioItems(
      localPortfolioItems.filter((item) => item.masterId === master.id),
    );

    fetch(`/api/profile?masterId=${encodeURIComponent(master.id)}`)
      .then((response) => response.json())
      .then((result: { profile?: EditableMasterProfile | null }) => {
        if (!result.profile) return;
        setProfileEdit((current) => ({
          ...current,
          ...result.profile!,
          avatarUrl: result.profile!.avatarUrl || current?.avatarUrl || "",
          coverImageUrl: result.profile!.coverImageUrl || current?.coverImageUrl || "",
          avatarZoom: result.profile!.avatarZoom ?? current?.avatarZoom ?? 1,
          avatarPositionX: result.profile!.avatarPositionX ?? current?.avatarPositionX ?? 50,
          avatarPositionY: result.profile!.avatarPositionY ?? current?.avatarPositionY ?? 35,
          coverZoom: result.profile!.coverZoom ?? current?.coverZoom ?? 1,
          coverPositionX: result.profile!.coverPositionX ?? current?.coverPositionX ?? 50,
          coverPositionY: result.profile!.coverPositionY ?? current?.coverPositionY ?? 50,
        }));
      })
      .catch(() => undefined);

    fetch(`/api/portfolio?masterId=${encodeURIComponent(master.id)}`)
      .then((response) => response.json())
      .then((result: { items?: PortfolioItem[] }) => {
        const remoteItems = result.items;
        if (!remoteItems?.length) return;
        setSavedPortfolioItems((current) => {
          const map = new Map(
            [...remoteItems, ...current].map((item) => [item.id, item]),
          );
          return Array.from(map.values());
        });
      })
      .catch(() => undefined);
  }, [master.id]);

  return (
    <main className="masters-page profile-public-page">
      <SiteHeader active="masters" showMasterCard />

      <div className="profile-breadcrumb">
        <Link href="/masters">← Каталог майстрів</Link>
      </div>

      <section
        className={`public-profile-hero ${visibleMaster.coverImageUrl ? "has-cover-image" : ""}`}
        id="profile-top"
        style={
          visibleMaster.coverImageUrl
            ? ({
                "--profile-cover-image": `url(${visibleMaster.coverImageUrl})`,
                "--profile-cover-x": `${visibleMaster.coverPositionX ?? 50}%`,
                "--profile-cover-y": `${visibleMaster.coverPositionY ?? 50}%`,
                "--profile-cover-scale": `${visibleMaster.coverZoom ?? 1}`,
                "--profile-cover-zoom": `${Math.max(100, (visibleMaster.coverZoom ?? 1) * 100)}%`,
              } as CSSProperties)
            : undefined
        }
      >
        <div className="profile-person">
          <div className={`profile-directory-avatar avatar-${visibleMaster.accent}`}>
            {visibleMaster.avatarUrl ? (
              <img src={visibleMaster.avatarUrl} alt={`Фото ${visibleMaster.name}`} style={avatarCropStyle} />
            ) : (
              visibleMaster.initials
            )}
          </div>
          <div>
            <p className="eyebrow">{visibleMaster.profession}</p>
            <h1>{visibleMaster.name}</h1>
            <p className="profile-location">
              <MapPin size={15} /> {visibleMaster.city}
              {visibleMaster.district ? `, ${visibleMaster.district}` : ""} · {visibleMaster.experience}
            </p>
            {(visibleMaster.lastSeenText || visibleMaster.registeredText) && (
              <div className="profile-activity-row">
                {visibleMaster.lastSeenText && <span>{visibleMaster.lastSeenText}</span>}
                {visibleMaster.registeredText && <span>{visibleMaster.registeredText}</span>}
              </div>
            )}
            <p className="profile-short-description">{visibleMaster.description}</p>
            <div className="rating-row">
              <Star className="rating-star" size={17} />
              <strong>{visibleMaster.rating.toFixed(1)}</strong>
              <span>{visibleMaster.reviews} відгуків</span>
            </div>
          </div>
        </div>

        <div className="profile-action-card">
          <span>Вартість робіт</span>
          <strong>від {visibleMaster.priceFrom.toLocaleString("uk-UA")} грн</strong>
          <a href="#booking">Обрати вільну дату</a>
          <a className="profile-secondary-action" href="#message">
            Написати майстру
          </a>
        </div>
      </section>

      {ownerSource === "profile" && (
        <aside className="public-profile-owner-bar profile-owner-return">
          <span>Ви переглядаєте свій профіль очима клієнта</span>
          <div>
            <Link href={`/dashboard/profile?masterId=${visibleMaster.id}`}>
              <Pencil size={15} /> Редагувати профіль
            </Link>
            <Link href="/dashboard">
              <LayoutDashboard size={15} /> До кабінету
            </Link>
          </div>
        </aside>
      )}

      <div className="profile-sections-layout">
        <nav className="profile-section-nav" aria-label="Розділи профілю">
          <p>Розділи профілю</p>
          <a href="#about-master">Про майстра</a>
          <a href="#services">Послуги</a>
          <a href="#portfolio">Портфоліо</a>
          <a href="#message">Прямий звʼязок</a>
          <a href="#booking">Онлайн-заявка</a>
        </nav>

        <div className="profile-sections-stack">
          <details className="profile-collapse" id="about-master" open>
            <summary>
              <div>
                <span>Про майстра</span>
                <strong>Досвід і підхід до роботи</strong>
              </div>
              <small>Розгорнути / згорнути</small>
            </summary>
            <div className="profile-collapse-body profile-text-section">
              <p className="profile-about">{visibleMaster.fullDescription}</p>
            </div>
          </details>

          <details className="profile-collapse" id="services" open>
            <summary>
              <div>
                <span>Послуги</span>
                <strong>Що виконує майстер</strong>
              </div>
              <small>{visibleMaster.services.length} позиції</small>
            </summary>
            <div className="profile-collapse-body">
              <div className="services-list services-list-inline">
                {visibleMaster.services.map((service) => (
                  <div key={`${service.name}-${service.price}`}>
                    <span>{service.name}</span>
                    <strong>{service.price}</strong>
                  </div>
                ))}
              </div>
              <a className="request-button profile-collapse-action" href="#booking">
                Обрати дату для заявки
              </a>
            </div>
          </details>

          <details className="profile-collapse" id="portfolio" open>
            <summary>
              <div>
                <span>Портфоліо</span>
                <strong>Виконані роботи</strong>
              </div>
              <small>{portfolioItems.length || visibleMaster.works.length} проєкти</small>
            </summary>
            <div className="profile-collapse-body">
              <div className="work-gallery">
                {portfolioItems.map((item) => {
                  const photos = getPortfolioPhotos(item);
                  const activePhotoIndex = activePortfolioSlides[item.id] ?? 0;
                  const activePhoto = photos[activePhotoIndex] ?? photos[0];

                  return (
                  <article className="work-card editable-work-card" key={item.id}>
                    <div className="work-image portfolio-work-photo">
                      <img src={activePhoto} alt={item.title} />
                      {photos.length > 1 && (
                        <div className="profile-portfolio-slider">
                          <button
                            type="button"
                            aria-label="Попереднє фото"
                            onClick={() =>
                              setActivePortfolioSlides((current) => ({
                                ...current,
                                [item.id]: (activePhotoIndex - 1 + photos.length) % photos.length,
                              }))
                            }
                          >
                            <ChevronLeft size={17} />
                          </button>
                          <span>{activePhotoIndex + 1} / {photos.length}</span>
                          <button
                            type="button"
                            aria-label="Наступне фото"
                            onClick={() =>
                              setActivePortfolioSlides((current) => ({
                                ...current,
                                [item.id]: (activePhotoIndex + 1) % photos.length,
                              }))
                            }
                          >
                            <ChevronRight size={17} />
                          </button>
                        </div>
                      )}
                      {ownerSource === "profile" && (
                        <Link
                          className="portfolio-project-edit profile-portfolio-edit"
                          href={`/dashboard/portfolio/${item.id}/edit`}
                        >
                          <Pencil size={15} /> Редагувати
                        </Link>
                      )}
                    </div>
                    <div className="work-card-body">
                      <div className="work-meta-row">
                        <span>{item.objectType}</span>
                        <small>{item.city}</small>
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      <div className="work-total">
                        <span>Підсумкова вартість</span>
                        <strong>{formatUah(item.totalAmount)}</strong>
                      </div>
                      <div className="work-detail-list">
                        {item.workLines.map((line) => (
                          <div key={line.id}>
                            <span>{line.workType}</span>
                            <small>
                              {line.volume} {line.unit} × {formatUah(line.unitPrice)} = {formatUah(line.total)}
                            </small>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                  );
                })}
                {portfolioItems.length === 0 && visibleMaster.works.map((work, index) => {
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
                            name: visibleMaster.services[0]?.name ?? "Основна послуга",
                            quantity: "1 обʼєкт",
                            unitPrice: visibleMaster.services[0]?.price ?? "за кошторисом",
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
                {ownerSource === "profile" && (
                  <Link className="portfolio-add-card profile-portfolio-add" href="/dashboard/portfolio/new">
                    <span>+</span>
                    <strong>Додати роботу</strong>
                    <small>Фото, опис і кошторис зʼявляться в публічному профілі.</small>
                  </Link>
                )}
              </div>
            </div>
          </details>

          <details className="profile-collapse" open>
            <summary>
              <div>
                <span>Прямий звʼязок</span>
                <strong>Написати майстру без вибору дати</strong>
              </div>
              <small>Розгорнути / згорнути</small>
            </summary>
            <div className="profile-collapse-body profile-message-section">
              <DirectMessageForm masterId={visibleMaster.id} masterName={visibleMaster.name} />
            </div>
          </details>

          <details className="profile-collapse" open>
            <summary>
              <div>
                <span>Онлайн-заявка</span>
                <strong>Період, заявка та пряме повідомлення</strong>
              </div>
              <small>Розгорнути / згорнути</small>
            </summary>
            <div className="profile-collapse-body">
              <BookingForm
                masterId={visibleMaster.id}
                masterName={visibleMaster.name}
                busyDates={visibleMaster.busyDates}
                masterServices={bookingServices}
              />
            </div>
          </details>
        </div>
      </div>
    </main>
  );
}
