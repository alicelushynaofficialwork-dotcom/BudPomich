"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Hammer,
  MapPin,
  MessageSquare,
  Phone,
  Star,
  UserRoundCheck,
  X,
} from "lucide-react";
import { BookingForm, DirectMessageForm } from "@/components/BookingForm";
import { FollowMasterButton } from "@/components/FollowMasterButton";
import { SiteHeader } from "@/components/SiteHeader";
import { getMasterServices } from "@/lib/master-services";
import type { MasterProfile } from "@/lib/masters";
import {
  type EditableMasterProfile,
  masterProfileStorageKey,
  mergeMasterProfile,
} from "@/lib/master-profile-edit";
import { formatPriceFromServices } from "@/lib/master-pricing";
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

type Review = {
  id: string;
  author: string;
  date?: string;
  rating: number;
  text: string;
};

const fallbackImage = "/images/portfolio-triptych.png";

const reviewTemplates: Omit<Review, "id">[] = [
  {
    author: "Олена К.",
    date: "червень 2026",
    rating: 5,
    text: "Майстер швидко відповів, пояснив кошторис і виконав роботу акуратно.",
  },
  {
    author: "Сергій М.",
    date: "червень 2026",
    rating: 5,
    text: "Сподобалось, що матеріали, строки та обсяг робіт були узгоджені до старту.",
  },
  {
    author: "Ірина В.",
    date: "травень 2026",
    rating: 4.8,
    text: "Робота виглядає охайно, після завершення майстер залишив чисте приміщення.",
  },
];

function getUnit(price: string) {
  if (price.includes("/м²") || price.includes("/мВІ")) return "грн/м²";
  if (price.toLowerCase().includes("день")) return "грн/день";
  return "грн/робота";
}

function buildReviews(totalReviews: number): Review[] {
  if (totalReviews <= 0) return [];

  return Array.from({ length: Math.min(totalReviews, 3) }, (_, index) => ({
    id: `review-${index}`,
    ...reviewTemplates[index % reviewTemplates.length],
  }));
}

function getPortfolioMeta(item: PortfolioItem) {
  const totalVolume = item.workLines.reduce((sum, line) => sum + line.volume, 0);
  const unit = item.workLines[0]?.unit ?? "м²";

  return {
    volume: totalVolume ? `${totalVolume} ${unit}` : "обсяг за кошторисом",
    term: item.workLines.length > 1 ? "5-7 днів" : "1-3 дні",
  };
}

function hasFilledContacts(contacts: MasterProfile["contacts"] | undefined) {
  return Boolean(contacts?.some((contact) => contact.value.trim()));
}

function normalizeVisibleBrand(value: string) {
  return value.replace(/BudPomich/g, "БудПомiч");
}

function getContactValue(
  contacts: MasterProfile["contacts"] | undefined,
  label: string | string[],
) {
  const labels = Array.isArray(label) ? label : [label];
  const contact = contacts?.find((item) => labels.includes(item.label) && item.value.trim());
  return contact ? { ...contact, value: normalizeVisibleBrand(contact.value) } : undefined;
}

function hasPhoneContact(master: MasterProfile) {
  return Boolean(getContactValue(master.contacts, "Телефон")?.value.trim());
}

function PublicContactsSection({ master }: { master: MasterProfile }) {
  const phone = getContactValue(master.contacts, "Телефон");
  const telegram = getContactValue(master.contacts, "Telegram");
  const messenger = getContactValue(master.contacts, ["WhatsApp / Viber", "WhatsApp", "Viber"]);
  const preferred = getContactValue(master.contacts, "Бажаний спосіб звʼязку");
  const contacts = [
    phone && { label: "Телефон", value: phone.value, href: phone.href, icon: Phone },
    telegram && { label: "Telegram", value: telegram.value, href: telegram.href, icon: MessageSquare },
    messenger && { label: "WhatsApp / Viber", value: messenger.value, href: messenger.href, icon: MessageSquare },
  ].filter(Boolean) as Array<{ label: string; value: string; href: string; icon: typeof Phone }>;

  if (!contacts.length && !preferred?.value) return null;

  return (
    <section className="bp-section bp-public-contacts" id="contacts">
      <div className="bp-section-head bp-section-head-row">
        <div>
          <p className="bp-eyebrow">Контакти</p>
          <h2>Способи звʼязку</h2>
        </div>
        {preferred?.value && <span>Зручно: {preferred.value}</span>}
      </div>
      <div className="bp-public-contacts-grid">
        {contacts.map(({ label, value, href, icon: Icon }) => (
          <a className="bp-public-contact-card" href={href || "#message"} key={label}>
            <span>
              <Icon size={18} />
            </span>
            <div>
              <small>{label}</small>
              <strong>{value}</strong>
            </div>
          </a>
        ))}
      </div>
      <p className="bp-public-contacts-note">
        Можете написати напряму або залишити заявку через БудПомiч, щоб узгодити послугу, дату та деталі задачі.
      </p>
    </section>
  );
}

function ProfileHero({
  master,
  priceFromServices,
}: {
  master: MasterProfile;
  priceFromServices: string;
}) {
  const isProfileActive = master.isProfileActive !== false;
  const acceptsBudPomichRequests = master.acceptsBudPomichRequests !== false;
  const canBookOnline = isProfileActive && acceptsBudPomichRequests;

  return (
    <section className="bp-profile-hero" id="profile-top">
      <div className="bp-profile-photo-column">
        {hasPhoneContact(master) && (
          <span className="bp-verified-badge">
            <BadgeCheck size={16} />
            Перевірений майстер
          </span>
        )}
        <div className="bp-profile-photo">
          {master.avatarUrl ? (
            <img src={master.avatarUrl} alt={`Фото майстра ${master.name}`} />
          ) : (
            <span>{master.initials || "М"}</span>
          )}
        </div>
        <div className="bp-photo-status-list">
          <span className={canBookOnline ? "bp-status-badge" : "bp-status-badge bp-status-badge-inactive"}>
            <span />
            {canBookOnline ? "Доступний для заявок" : "Не доступний для заявок"}
          </span>
          {canBookOnline && (
            <span className="bp-budpomich-request-badge">
              <CheckCircle2 size={15} />
              Приймаю заявки через БудПомiч
            </span>
          )}
        </div>
      </div>

      <div className="bp-profile-hero-content">
        <p className="bp-eyebrow">{master.profession || "Майстер БудПомiч"}</p>
        <h1>{master.name || "Майстер БудПомiч"}</h1>
        <p className="bp-hero-description">
          {master.description ||
            "Допоможе оцінити задачу, підібрати матеріали та виконати роботу за узгодженим кошторисом."}
        </p>

        <div className="bp-hero-facts">
          <span>
            <MapPin size={17} />
            {master.city || "Ваше місто"}
          </span>
          <span>
            <Star size={17} fill="currentColor" />
            {master.rating?.toFixed(1) ?? "5.0"} · {master.reviews ?? 0} відгуків
          </span>
          <span>
            <BriefcaseBusiness size={17} />
            {master.experience || "Досвід підтверджено"}
          </span>
          <span>
            <Hammer size={17} />
            від {priceFromServices}
          </span>
        </div>

        <div className="bp-hero-details" aria-label="Додаткова інформація">
          <div className="bp-hero-detail-card bp-hero-detail-card-main">
            <MapPin size={18} />
            <span>Місто</span>
            <strong>{master.city || "Уточнюється"}</strong>
          </div>
          <div className="bp-hero-detail-card">
            <span>Район</span>
            <strong>{master.district || "За домовленістю"}</strong>
          </div>
          <div className="bp-hero-detail-card">
            <span>Активність</span>
            <strong>{master.lastSeenText || "Швидко відповідає"}</strong>
          </div>
          <div className="bp-hero-detail-card">
            <span>На БудПомiч</span>
            <strong>{master.registeredText || "Профіль перевірено"}</strong>
          </div>
        </div>

        <div className="bp-work-area-card" aria-label="Зона роботи та виїзд">
          <div>
            <span>Зона роботи</span>
            <strong>{master.city ? `${master.city} та передмістя до 30 км` : "Місто та передмістя до 30 км"}</strong>
          </div>
          <div>
            <span>Виїзд</span>
            <strong>По місту та за місто за домовленістю</strong>
          </div>
          <div>
            <span>Коментар</span>
            <strong>додаткові умови обговорюються перед стартом</strong>
          </div>
        </div>

        <div className="bp-hero-actions">
          {canBookOnline ? (
            <a className="bp-primary-button" href="#booking">
              Замовити майстра
            </a>
          ) : (
            <span className="bp-disabled-action">Онлайн заявки вимкнено</span>
          )}
          <a className="bp-secondary-button" href="#message">
            <MessageSquare size={17} />
            Прямий звʼязок
          </a>
          <FollowMasterButton masterId={master.id} masterName={master.name} />
        </div>
      </div>
    </section>
  );
}

function ProfileTrustStats({
  master,
  portfolioCount,
}: {
  master: MasterProfile;
  portfolioCount: number;
}) {
  const stats = [
    { icon: BriefcaseBusiness, label: "Досвід", value: master.experience || "є досвід" },
    { icon: Hammer, label: "Роботи", value: `${portfolioCount || master.works.length || 1}+` },
    { icon: MapPin, label: "Місто", value: master.city || "Україна" },
    { icon: Star, label: "Рейтинг", value: master.rating?.toFixed(1) ?? "5.0" },
    { icon: Clock3, label: "Відповідь", value: "швидко" },
    { icon: CheckCircle2, label: "Портфоліо", value: portfolioCount ? "є роботи" : "додається" },
  ];

  return (
    <section className="bp-section bp-trust-section">
      <div className="bp-section-head">
        <p className="bp-eyebrow">Довіра</p>
        <h2>Чому клієнти обирають цього майстра</h2>
      </div>
      <div className="bp-trust-grid">
        {stats.map(({ icon: Icon, label, value }) => (
          <div className="bp-trust-card" key={label}>
            <Icon size={20} />
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServicesSection({
  services,
  isModal = false,
}: {
  services: MasterProfile["services"];
  isModal?: boolean;
}) {
  const safeServices = services.length
    ? services
    : [{ name: "Ремонтні роботи", price: "за кошторисом" }];
  const Tag = isModal ? "div" : "section";

  return (
    <Tag className={isModal ? "bp-services-modal-content" : "bp-section"} id={isModal ? undefined : "services"}>
      {!isModal && (
        <div className="bp-section-head">
          <p className="bp-eyebrow">Послуги і ціни</p>
          <h2>Що виконує майстер</h2>
        </div>
      )}
      <div className="bp-services-grid">
        {safeServices.map((service) => (
          <article className="bp-service-card" key={`${service.name}-${service.price}`}>
            <div>
              <h3>{service.name || "Послуга майстра"}</h3>
              <p>
                Акуратне виконання, попередня оцінка обсягу та зрозумілий кошторис перед стартом.
              </p>
            </div>
            <div className="bp-service-price">
              <strong>{service.price || "за домовленістю"}</strong>
              <span>{getUnit(service.price || "")}</span>
            </div>
            <a href="#booking">Обрати</a>
          </article>
        ))}
      </div>
    </Tag>
  );
}

function PortfolioSection({
  items,
  fallbackWorks,
  isModal = false,
}: {
  items: PortfolioItem[];
  fallbackWorks: MasterProfile["works"];
  isModal?: boolean;
}) {
  const hasPortfolio = items.length > 0;
  const Tag = isModal ? "div" : "section";

  return (
    <Tag className={isModal ? "bp-portfolio-modal-content" : "bp-section"} id={isModal ? undefined : "portfolio"}>
      {!isModal && (
        <div className="bp-section-head bp-section-head-row">
          <div>
            <p className="bp-eyebrow">Портфоліо</p>
            <h2>Виконані роботи</h2>
          </div>
          <span>{hasPortfolio ? `${items.length} робіт` : "приклади робіт"}</span>
        </div>
      )}

      <div className="bp-portfolio-grid">
        {hasPortfolio
          ? items.map((item) => {
              const meta = getPortfolioMeta(item);
              return (
                <article className="bp-portfolio-card" key={item.id}>
                  <div className="bp-portfolio-image">
                    {item.photoUrl ? (
                      <img src={item.photoUrl || fallbackImage} alt={item.title} />
                    ) : (
                      <div className="bp-image-placeholder">Фото роботи</div>
                    )}
                  </div>
                  <div className="bp-portfolio-body">
                    <span>{item.objectType || "Об'єкт"}</span>
                    <h3>{item.title || "Робота майстра"}</h3>
                    <p>{item.description || "Короткий опис роботи буде додано майстром."}</p>
                    <div className="bp-portfolio-meta">
                      <small>{item.city || "Місто"}</small>
                      <small>{formatUah(item.totalAmount || 0)}</small>
                      <small>{meta.volume}</small>
                      <small>{meta.term}</small>
                    </div>
                  </div>
                </article>
              );
            })
          : fallbackWorks.map((work, index) => (
              <article className="bp-portfolio-card" key={`${work.title}-${index}`}>
                <div className="bp-portfolio-image">
                  <div className="bp-image-placeholder">Фото роботи</div>
                </div>
                <div className="bp-portfolio-body">
                  <span>{work.category ?? "Об'єкт"}</span>
                  <h3>{work.title}</h3>
                  <p>{work.description ?? "Комплекс робіт виконано за узгодженим кошторисом."}</p>
                  <div className="bp-portfolio-meta">
                    <small>{work.location}</small>
                    <small>{work.total ?? "за кошторисом"}</small>
                    <small>{work.details?.[0]?.quantity ?? "обсяг уточнюється"}</small>
                    <small>1-7 днів</small>
                  </div>
                </div>
              </article>
            ))}
      </div>
    </Tag>
  );
}

function ReviewsSection({ reviews }: { reviews: Review[] }) {
  return (
    <section className="bp-section" id="reviews">
      <div className="bp-section-head">
        <p className="bp-eyebrow">Відгуки</p>
        <h2>Що кажуть клієнти</h2>
      </div>

      {reviews.length ? (
        <div className="bp-reviews-grid">
          {reviews.map((review) => (
            <article className="bp-review-card" key={review.id}>
              <div>
                <strong>{review.author}</strong>
                {review.date && <span>{review.date}</span>}
              </div>
              <p>{review.text}</p>
              <small>
                <Star size={15} fill="currentColor" />
                {review.rating.toFixed(1)}
              </small>
            </article>
          ))}
        </div>
      ) : (
        <div className="bp-empty-state">
          Відгуків поки немає. Будьте першим клієнтом, який залишить відгук.
        </div>
      )}
    </section>
  );
}

function BookingCard({ master }: { master: MasterProfile }) {
  const contactCount = master.contacts?.filter((contact) => contact.value.trim()).length ?? 0;
  const canBookOnline = master.isProfileActive !== false && master.acceptsBudPomichRequests !== false;

  return (
    <aside className="bp-booking-card">
      <div className="bp-booking-card-head">
        <span>
          <CalendarDays size={18} />
        </span>
        <div>
          <p className="bp-eyebrow">Заявка</p>
          <h2>Замовити майстра</h2>
        </div>
      </div>
      {canBookOnline ? (
        <a className="bp-sticky-primary" href="#booking">
          Онлайн запис
        </a>
      ) : (
        <div className="bp-sticky-disabled">
          <strong>Онлайн заявки вимкнено</strong>
          <span>
            Звʼяжіться з майстром напряму через <strong>прямий звʼязок</strong>.
          </span>
        </div>
      )}
      <a className="bp-sticky-secondary" href="#services">
        <Hammer size={17} />
        Послуги і ціни
      </a>
      <a className="bp-sticky-secondary" href="#portfolio">
        <BriefcaseBusiness size={17} />
        Виконані роботи
      </a>
      <a className="bp-sticky-secondary" href="#message">
        <MessageSquare size={17} />
        Прямий звʼязок
      </a>
      {contactCount > 0 && (
        <a className="bp-sticky-secondary" href="#contacts">
          <Phone size={17} />
          Контакти майстра
        </a>
      )}
    </aside>
  );
}

function MobileBookingBar({ master }: { master: MasterProfile }) {
  const canBookOnline = master.isProfileActive !== false && master.acceptsBudPomichRequests !== false;

  return (
    <div className="bp-mobile-booking-bar">
      <a href={canBookOnline ? "#booking" : "#message"}>
        {canBookOnline ? "Онлайн запис" : "Прямий звʼязок"}
      </a>
    </div>
  );
}

function BookingModal({
  master,
  masterServices,
}: {
  master: MasterProfile;
  masterServices: ReturnType<typeof getMasterServices>;
}) {
  return (
    <div className="bp-booking-modal" id="booking" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
      <a className="bp-booking-modal-backdrop" href="#profile-top" aria-label="Закрити онлайн запис" />
      <div className="bp-booking-modal-panel">
        <div className="bp-booking-modal-head">
          <div>
            <p className="bp-eyebrow">Онлайн запис</p>
            <h2 id="booking-modal-title">Замовити майстра</h2>
          </div>
          <a className="bp-booking-modal-close" href="#profile-top" aria-label="Закрити">
            <X size={20} />
          </a>
        </div>
        <div className="bp-booking-modal-body bp-booking-section">
          <BookingForm
            masterId={master.id}
            masterName={master.name}
            busyDates={master.busyDates}
            masterServices={masterServices}
            sectionId="booking-form"
          />
        </div>
      </div>
    </div>
  );
}

function MessageModal({
  master,
}: {
  master: MasterProfile;
}) {
  return (
    <div className="bp-booking-modal bp-message-modal" id="message" role="dialog" aria-modal="true" aria-labelledby="message-modal-title">
      <a className="bp-booking-modal-backdrop" href="#profile-top" aria-label="Закрити повідомлення" />
      <div className="bp-booking-modal-panel bp-message-modal-panel">
        <div className="bp-booking-modal-head">
          <div>
            <p className="bp-eyebrow">Прямий звʼязок</p>
            <h2 id="message-modal-title">Написати майстру</h2>
          </div>
          <a className="bp-booking-modal-close" href="#profile-top" aria-label="Закрити">
            <X size={20} />
          </a>
        </div>
        <div className="bp-message-modal-body">
          <div className="bp-message-modal-note">
            <MessageSquare size={18} />
            <p>Повідомлення не привʼязане до дати в календарі. Опишіть задачу, і майстер зможе відповісти напряму.</p>
          </div>
          <DirectMessageForm
            masterId={master.id}
            masterName={master.name}
            formId="message-form"
          />
        </div>
      </div>
    </div>
  );
}

function ServicesModal({
  services,
}: {
  services: MasterProfile["services"];
}) {
  return (
    <div className="bp-booking-modal bp-services-modal" id="services" role="dialog" aria-modal="true" aria-labelledby="services-modal-title">
      <a className="bp-booking-modal-backdrop" href="#profile-top" aria-label="Закрити послуги і ціни" />
      <div className="bp-booking-modal-panel bp-services-modal-panel">
        <div className="bp-booking-modal-head">
          <div>
            <p className="bp-eyebrow">Послуги і ціни</p>
            <h2 id="services-modal-title">Що виконує майстер</h2>
          </div>
          <a className="bp-booking-modal-close" href="#profile-top" aria-label="Закрити">
            <X size={20} />
          </a>
        </div>
        <div className="bp-services-modal-body">
          <ServicesSection services={services} isModal />
        </div>
      </div>
    </div>
  );
}

function PortfolioModal({
  items,
  fallbackWorks,
}: {
  items: PortfolioItem[];
  fallbackWorks: MasterProfile["works"];
}) {
  const hasPortfolio = items.length > 0;

  return (
    <div className="bp-booking-modal bp-portfolio-modal" id="portfolio" role="dialog" aria-modal="true" aria-labelledby="portfolio-modal-title">
      <a className="bp-booking-modal-backdrop" href="#profile-top" aria-label="Закрити виконані роботи" />
      <div className="bp-booking-modal-panel bp-portfolio-modal-panel">
        <div className="bp-booking-modal-head">
          <div>
            <p className="bp-eyebrow">Портфоліо</p>
            <h2 id="portfolio-modal-title">Виконані роботи</h2>
          </div>
          <span className="bp-modal-count">{hasPortfolio ? `${items.length} робіт` : "приклади робіт"}</span>
          <a className="bp-booking-modal-close" href="#profile-top" aria-label="Закрити">
            <X size={20} />
          </a>
        </div>
        <div className="bp-portfolio-modal-body">
          <PortfolioSection items={items} fallbackWorks={fallbackWorks} isModal />
        </div>
      </div>
    </div>
  );
}

export function ProfileMasterView({ master, ownerSource }: ProfileMasterViewProps) {
  const [profileEdit, setProfileEdit] = useState<EditableMasterProfile | null>(null);
  const [savedPortfolioItems, setSavedPortfolioItems] = useState<PortfolioItem[]>([]);
  const visibleMaster = useMemo(() => mergeMasterProfile(master, profileEdit), [master, profileEdit]);
  const priceFromServices = formatPriceFromServices(visibleMaster.services, visibleMaster.priceFrom);
  const masterServices = useMemo(() => getMasterServices(visibleMaster.id), [visibleMaster.id]);

  const portfolioItems = useMemo(() => {
    const defaults = defaultPortfolioItems.filter((item) => item.masterId === visibleMaster.id);
    const map = new Map([...defaults, ...savedPortfolioItems].map((item) => [item.id, item]));
    return Array.from(map.values());
  }, [savedPortfolioItems, visibleMaster.id]);

  const reviews = useMemo(() => buildReviews(visibleMaster.reviews), [visibleMaster.reviews]);

  useEffect(() => {
    const localProfiles = JSON.parse(
      localStorage.getItem(masterProfileStorageKey) ?? "{}",
    ) as Record<string, EditableMasterProfile>;
    if (localProfiles[master.id]) setProfileEdit(localProfiles[master.id]);

    const localPortfolioItems = JSON.parse(
      localStorage.getItem(portfolioStorageKey) ?? "[]",
    ) as PortfolioItem[];
    setSavedPortfolioItems(localPortfolioItems.filter((item) => item.masterId === master.id));

    fetch(`/api/profile?masterId=${encodeURIComponent(master.id)}`)
      .then((response) => response.json())
      .then((result: { profile?: EditableMasterProfile | null }) => {
        if (result.profile) {
          setProfileEdit((current) => ({
            ...(current ?? result.profile!),
            ...result.profile!,
            contacts: hasFilledContacts(result.profile!.contacts)
              ? result.profile!.contacts
              : current?.contacts ?? master.contacts,
          }));
        }
      })
      .catch(() => undefined);

    fetch(`/api/portfolio?masterId=${encodeURIComponent(master.id)}`)
      .then((response) => response.json())
      .then((result: { items?: PortfolioItem[] }) => {
        if (!result.items?.length) return;
        setSavedPortfolioItems((current) => {
          const map = new Map([...result.items!, ...current].map((item) => [item.id, item]));
          return Array.from(map.values());
        });
      })
      .catch(() => undefined);
  }, [master.id]);

  return (
    <main className="masters-page bp-profile-page">
      <SiteHeader active="masters" showMasterCard />

      {ownerSource === "profile" && (
        <div className="bp-owner-note">
          <UserRoundCheck size={16} />
          Ви переглядаєте свій публічний профіль очима клієнта.
          <Link href="/dashboard/profile">Редагувати профіль</Link>
        </div>
      )}

      <div className="bp-profile-breadcrumb">
        <Link href="/masters">← Каталог майстрів</Link>
      </div>

      <ProfileHero master={visibleMaster} priceFromServices={priceFromServices} />

      <div className="bp-profile-layout">
        <div className="bp-profile-main">
          <section className="bp-section" id="about-master">
            <div className="bp-section-head">
              <p className="bp-eyebrow">Про майстра</p>
              <h2>Досвід і підхід до роботи</h2>
            </div>
            <p className="bp-about-text">
              {visibleMaster.fullDescription ||
                "Майстер працює акуратно, допомагає сформувати обсяг робіт і погодити зрозумілий бюджет до старту."}
            </p>
          </section>

          <PublicContactsSection master={visibleMaster} />
          <ProfileTrustStats master={visibleMaster} portfolioCount={portfolioItems.length} />
          <ReviewsSection reviews={reviews} />

        </div>

        <BookingCard master={visibleMaster} />
      </div>

      <MobileBookingBar master={visibleMaster} />
      <BookingModal master={visibleMaster} masterServices={masterServices} />
      <MessageModal master={visibleMaster} />
      <ServicesModal services={visibleMaster.services} />
      <PortfolioModal items={portfolioItems} fallbackWorks={visibleMaster.works} />
    </main>
  );
}
