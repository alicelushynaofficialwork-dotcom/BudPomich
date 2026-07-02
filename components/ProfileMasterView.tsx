"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Hammer,
  MapPin,
  MessageSquare,
  Phone,
  Share2,
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
  defaultCompanyDocuments,
  defaultMasterQualifications,
  defaultPortfolioItems,
  formatUah,
  getPortfolioPeriod,
  getProjectPublicLocation,
  getProjectSlug,
  getPublicProjectDocuments,
  portfolioWorkCategories,
  companyDocumentsStorageKey,
  masterQualificationsStorageKey,
  type CompanyDocument,
  type MasterQualification,
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

type MasterActivityItem = {
  id: string;
  masterId: string;
  type:
    | "new_work"
    | "updated_work"
    | "new_photo"
    | "new_service"
    | "price_update"
    | "new_qualification"
    | "calendar_update"
    | "new_document"
    | "updated_document"
    | "new_project_comment";
  title: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  targetUrl?: string;
  workId?: string;
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
    <section className="bp-section bp-public-contacts" id="public-contacts">
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
  const profileQuickSections = [
    { href: "#services", label: "Послуги", note: "ціни", preview: "Перелік робіт, стартові ціни, одиниці виміру та швидкий вибір послуги.", icon: Hammer },
    { href: "#portfolio", label: "Роботи", note: "портфоліо", preview: "Фото виконаних проєктів, місто, обсяг, вартість і деталі кожної роботи.", icon: BriefcaseBusiness },
    { href: "#profile-panel-qualifications", label: "Кваліфікація", note: "досвід", preview: "Курси, сертифікати, навчальні центри, дати та фото документів майстра.", icon: BadgeCheck },
    { href: "#profile-panel-documents", label: "Документи", note: "публічні", preview: "Публічні файли профілю: гарантії, прайси, дозволи або презентації.", icon: FileText },
    { href: "#profile-panel-reviews", label: "Відгуки", note: "клієнти", preview: "Оцінки клієнтів, текст відгуків і дата, якщо вона вказана.", icon: Star },
  ];

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
        <nav className="bp-hero-section-rail" aria-label="Розділи профілю">
          <strong>Розділи</strong>
          {profileQuickSections.map(({ href, label, note, preview, icon: Icon }) => (
            <a href={href} key={href}>
              <Icon size={16} />
              <span>
                <b>{label}</b>
                <small>{note}</small>
              </span>
              <span className="bp-hero-section-preview" aria-hidden="true">
                <strong>{label}</strong>
                {preview}
              </span>
            </a>
          ))}
        </nav>
      </div>

      <div className="bp-hero-follow-corner">
        <FollowMasterButton masterId={master.id} masterName={master.name} />
      </div>

      <div className="bp-profile-hero-content">
        <p className="bp-eyebrow">{master.profession || "Майстер БудПомiч"}</p>
        <h1>{master.name || "Майстер БудПомiч"}</h1>
        <div className="bp-hero-specialization-card">
          <p className="bp-eyebrow">Спеціалізація</p>
          <p>
            {master.description ||
              "Гіпсокартонні конструкції, перегородки, стелі та укладання плитки у комерційних будівлях."}
          </p>
        </div>
        <div className="bp-hero-about-card">
          <p className="bp-eyebrow">Про майстра</p>
          <h2>Досвід і підхід до роботи</h2>
          <p className="bp-hero-description">
            {master.fullDescription ||
              master.description ||
              "Виконую роботи з гіпсокартону та плитки у Києві. Працюю акуратно, допомагаю оцінити обсяг робіт, матеріали та реальний бюджет до початку ремонту."}
          </p>
        </div>

        <div className="bp-hero-facts">
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
          <div className="bp-hero-contact-group">
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
          </div>
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

const monthNames = [
  "січень",
  "лютий",
  "березень",
  "квітень",
  "травень",
  "червень",
  "липень",
  "серпень",
  "вересень",
  "жовтень",
  "листопад",
  "грудень",
];

function getItemPhotoCount(item: PortfolioItem) {
  return [
    ...(item.photoUrls ?? []),
    ...(item.beforePhotoUrls ?? []),
    ...(item.progressPhotoUrls ?? []),
    ...(item.afterPhotoUrls ?? []),
    ...(item.beforePhotos ?? []).map((photo) => photo.url),
    ...(item.progressPhotos ?? []).map((photo) => photo.url),
    ...(item.afterPhotos ?? []).map((photo) => photo.url),
    item.mainPhoto?.url,
  ].filter(Boolean).length || (item.photoUrl ? 1 : 0);
}

function getItemUnitPrice(item: PortfolioItem) {
  const firstLine = item.workLines.find((line) => line.unitPrice > 0);
  return firstLine ? `${formatUah(firstLine.unitPrice)} / ${firstLine.unit}` : "за кошторисом";
}

function getItemVolume(item: PortfolioItem) {
  const meta = getPortfolioMeta(item);
  if (item.objectArea) return `${item.objectArea} м²`;
  return meta.volume;
}

function getItemTerm(item: PortfolioItem) {
  if (item.durationDays) return `${item.durationDays} днів`;
  return getPortfolioMeta(item).term;
}

function PortfolioJournalSection({ items, fallbackWorks }: { items: PortfolioItem[]; fallbackWorks: MasterProfile["works"] }) {
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("Усі роботи");
  const [objectFilter, setObjectFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(4);
  const [shareToast, setShareToast] = useState("");
  const hasPortfolio = items.length > 0;
  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const aDate = new Date(a.completedAt || a.createdAt).getTime();
        const bDate = new Date(b.completedAt || b.createdAt).getTime();
        return bDate - aDate;
      }),
    [items],
  );
  const years = Array.from(new Set(sortedItems.map((item) => getPortfolioPeriod(item).year))).sort((a, b) => b - a);
  const objectTypes = Array.from(new Set(sortedItems.map((item) => item.objectType || "Обʼєкт")));
  const filteredItems = sortedItems.filter((item) => {
    const period = getPortfolioPeriod(item);
    const category = item.workCategory || "Гіпсокартон";
    if (yearFilter !== "all" && String(period.year) !== yearFilter) return false;
    if (monthFilter !== "all" && String(period.month) !== monthFilter) return false;
    if (categoryFilter !== "Усі роботи" && category !== categoryFilter) return false;
    if (objectFilter !== "all" && (item.objectType || "Обʼєкт") !== objectFilter) return false;
    return true;
  });
  const visibleItems = filteredItems.slice(0, visibleCount);

  async function shareWork(item: PortfolioItem) {
    const slug = getProjectSlug(item);
    const url = `${window.location.origin}${window.location.pathname}#work-${slug}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, text: item.description, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareToast("Посилання на роботу скопійовано.");
      window.setTimeout(() => setShareToast(""), 2200);
    } catch {
      setShareToast("Не вдалося скопіювати посилання.");
      window.setTimeout(() => setShareToast(""), 2200);
    }
  }

  return (
    <div className="bp-portfolio-modal-content">
      <div className="bp-section-head bp-section-head-row">
        <div>
          <p className="bp-eyebrow">Портфоліо</p>
          <h2>Виконані роботи</h2>
          <small>Журнал робіт майстра з фото, обсягами, строками та вартістю.</small>
        </div>
        <span>{hasPortfolio ? `${items.length} робіт` : "приклади робіт"}</span>
      </div>

      {hasPortfolio && (
        <div className="bp-portfolio-filters" aria-label="Фільтри виконаних робіт">
          <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
            <option value="all">Усі роки</option>
            {years.map((year) => (
              <option value={year} key={year}>{year}</option>
            ))}
          </select>
          <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
            <option value="all">Усі місяці</option>
            {monthNames.map((month, index) => (
              <option value={index + 1} key={month}>{month}</option>
            ))}
          </select>
          <select value={objectFilter} onChange={(event) => setObjectFilter(event.target.value)}>
            <option value="all">Усі обʼєкти</option>
            {objectTypes.map((type) => (
              <option value={type} key={type}>{type}</option>
            ))}
          </select>
          <div className="bp-portfolio-category-scroll">
            {portfolioWorkCategories.map((category) => (
              <button
                className={categoryFilter === category ? "active" : ""}
                type="button"
                key={category}
                onClick={() => setCategoryFilter(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bp-portfolio-grid">
        {hasPortfolio
          ? visibleItems.map((item) => {
              const period = getPortfolioPeriod(item);
              const documents = getPublicProjectDocuments(item);
              const slug = getProjectSlug(item);
              const comment = item.clientVisibleComment || item.description || "Майстер додасть короткий коментар до цього проєкту.";
              return (
                <article className="bp-portfolio-card" id={`work-${slug}`} key={item.id}>
                  <div className="bp-portfolio-image">
                    {item.photoUrl ? (
                      <img src={item.photoUrl || fallbackImage} alt={item.title} />
                    ) : (
                      <div className="bp-image-placeholder">Фото роботи</div>
                    )}
                    <span>{getItemPhotoCount(item)} фото</span>
                  </div>
                  <div className="bp-portfolio-body">
                    <div className="bp-portfolio-card-head">
                      <span>{item.workCategory || "Гіпсокартон"}</span>
                      <small>{monthNames[period.month - 1]} {period.year}</small>
                    </div>
                    <h3>{item.title || "Робота майстра"}</h3>
                    <p className="bp-portfolio-comment">{comment}</p>
                    <div className="bp-portfolio-meta">
                      <small>{getProjectPublicLocation(item) || "Місто"}</small>
                      <small>{item.objectType || "Обʼєкт"}</small>
                      <small>{getItemTerm(item)}</small>
                      <small>{getItemVolume(item)}</small>
                      <small>{getItemUnitPrice(item)}</small>
                      <small>{formatUah(item.totalAmount || 0)}</small>
                    </div>
                    {documents.length > 0 && (
                      <span className="bp-document-badge">
                        <FileText size={14} /> Документи: {documents.length}
                      </span>
                    )}
                    <div className="bp-portfolio-actions">
                      <a href={`#work-detail-${slug}`}>Детальніше</a>
                      <button type="button" onClick={() => shareWork(item)}>
                        <Share2 size={15} /> Поділитися
                      </button>
                    </div>
                    <WorkDetailModal item={item} slug={slug} />
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
                  <span>{work.category ?? "Обʼєкт"}</span>
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

      {hasPortfolio && filteredItems.length > visibleItems.length && (
        <button className="bp-show-more-work" type="button" onClick={() => setVisibleCount((current) => current + 4)}>
          Показати більше
        </button>
      )}

      {hasPortfolio && filteredItems.length === 0 && (
        <div className="bp-empty-state">За цими фільтрами робіт поки немає.</div>
      )}

      {shareToast && <div className="bp-share-toast" role="status">{shareToast}</div>}
    </div>
  );
}

function WorkDetailModal({ item, slug }: { item: PortfolioItem; slug: string }) {
  const documents = getPublicProjectDocuments(item);
  const photos = [
    ...(item.beforePhotos ?? []).map((photo) => photo.url),
    ...(item.beforePhotoUrls ?? []),
    ...(item.progressPhotos ?? []).map((photo) => photo.url),
    ...(item.progressPhotoUrls ?? []),
    item.mainPhoto?.url,
    item.photoUrl,
    ...(item.afterPhotos ?? []).map((photo) => photo.url),
    ...(item.afterPhotoUrls ?? []),
    ...(item.photoUrls ?? []),
  ].filter(Boolean);
  const period = getPortfolioPeriod(item);

  return (
    <div className="bp-booking-modal bp-work-detail-modal" id={`work-detail-${slug}`} role="dialog" aria-modal="true" aria-labelledby={`work-title-${slug}`}>
      <a className="bp-booking-modal-backdrop" href="#portfolio" aria-label="Закрити роботу" />
      <div className="bp-booking-modal-panel bp-work-detail-panel">
        <div className="bp-booking-modal-head">
          <div>
            <p className="bp-eyebrow">Деталі проєкту</p>
            <h2 id={`work-title-${slug}`}>{item.title}</h2>
          </div>
          <a className="bp-booking-modal-close" href="#portfolio" aria-label="Закрити">
            <X size={20} />
          </a>
        </div>
        <div className="bp-work-detail-body">
          <div className="bp-work-detail-gallery">
            {photos.length ? photos.slice(0, 6).map((photo, index) => (
              <img src={photo} alt={`${item.title} фото ${index + 1}`} key={`${photo}-${index}`} />
            )) : <div className="bp-image-placeholder">Фото проєкту</div>}
          </div>
          <div className="bp-work-detail-info">
            <div><span>Тип обʼєкта</span><strong>{item.objectType}</strong></div>
            <div><span>Локація</span><strong>{getProjectPublicLocation(item)}</strong></div>
            <div><span>Період</span><strong>{monthNames[period.month - 1]} {period.year}</strong></div>
            <div><span>Строк</span><strong>{getItemTerm(item)}</strong></div>
            <div><span>Статус</span><strong>{item.projectStatus === "in_progress" ? "В роботі" : item.projectStatus === "planned" ? "Заплановано" : "Завершено"}</strong></div>
            <div><span>Вартість</span><strong>{formatUah(item.totalAmount || 0)}</strong></div>
          </div>
          <section>
            <h3>Коментар майстра</h3>
            <p>{item.clientVisibleComment || item.description || "Майстер ще не додав публічний коментар."}</p>
          </section>
          <section>
            <h3>Виконані роботи</h3>
            <div className="bp-work-lines-table">
              {item.workLines.map((line) => (
                <div key={line.id}>
                  <span>{line.workType}</span>
                  <small>{line.volume} {line.unit} × {formatUah(line.unitPrice)}</small>
                  <strong>{formatUah(line.total)}</strong>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h3>Документи по обʼєкту</h3>
            {documents.length ? (
              <div className="bp-work-documents-list">
                {documents.map((document) => (
                  <a href={document.externalUrl || document.fileUrl || "#"} key={document.id}>
                    <FileText size={17} />
                    <span>{document.title}</span>
                    <small>{document.sourceType === "link" ? "посилання" : document.fileType || document.type}</small>
                  </a>
                ))}
              </div>
            ) : (
              <p>Документи по цьому проєкту не опубліковані.</p>
            )}
          </section>
          <div className="bp-work-detail-actions">
            <a href="#booking">Замовити схожу роботу</a>
            <a href="#portfolio">Закрити</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildMasterActivities(master: MasterProfile, items: PortfolioItem[]): MasterActivityItem[] {
  const workActivities = items.slice(0, 6).map((item) => ({
    id: `activity-${item.id}`,
    masterId: master.id,
    type: "new_work" as const,
    title: `Додав виконану роботу: ${item.title}`,
    description: item.clientVisibleComment || item.description,
    imageUrl: item.photoUrl,
    createdAt: item.completedAt || item.createdAt,
    targetUrl: `#work-${getProjectSlug(item)}`,
    workId: item.id,
  }));
  const serviceActivity = master.services.length
    ? [{
        id: `activity-services-${master.id}`,
        masterId: master.id,
        type: "price_update" as const,
        title: "Оновив послуги та ціни",
        description: `${master.services.length} позицій у профілі майстра.`,
        createdAt: new Date().toISOString(),
        targetUrl: "#services",
      }]
    : [];

  return [...workActivities, ...serviceActivity]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
}

function MasterActivitySection({ master, items }: { master: MasterProfile; items: PortfolioItem[] }) {
  const activities = buildMasterActivities(master, items);

  return (
    <section className="bp-section" id="activity">
      <div className="bp-section-head">
        <p className="bp-eyebrow">Активність</p>
        <h2>Активність майстра</h2>
        <small>Останні роботи, оновлення портфоліо та публікації майстра.</small>
      </div>
      {activities.length ? (
        <div className="bp-activity-list">
          {activities.map((activity) => (
            <a href={activity.targetUrl || "#profile-top"} className="bp-activity-item" key={activity.id}>
              {activity.imageUrl ? <img src={activity.imageUrl} alt="" /> : <span />}
              <div>
                <strong>{activity.title}</strong>
                {activity.description && <small>{activity.description}</small>}
              </div>
              <time>{new Date(activity.createdAt).toLocaleDateString("uk-UA")}</time>
            </a>
          ))}
        </div>
      ) : (
        <div className="bp-empty-state">Майстер поки не додавав оновлень.</div>
      )}
    </section>
  );
}

function QualificationsSection({ items }: { items: MasterQualification[] }) {
  const visibleItems = items.slice(0, 6);

  return (
    <section className="bp-section" id="qualifications">
      <div className="bp-section-head">
        <p className="bp-eyebrow">Кваліфікація</p>
        <h2>Підвищення кваліфікації</h2>
        <small>Курси, сертифікати, ліцензії та нагороди майстра.</small>
      </div>
      {visibleItems.length ? (
        <div className="bp-doc-card-grid">
          {visibleItems.map((item) => (
            <article className="bp-doc-card" key={item.id}>
              <span>{item.type === "license" ? "Ліцензія" : item.type === "course" ? "Курс" : item.type === "award" ? "Нагорода" : "Сертифікат"}</span>
              <h3>{item.title}</h3>
              {item.issuer && <p>{item.issuer}</p>}
              <small>{item.issuedAt ? new Date(item.issuedAt).toLocaleDateString("uk-UA") : item.category || "Будівельні роботи"}</small>
              {item.description && <em>{item.description}</em>}
              <a href={`#qualification-${item.id}`}>Детальніше</a>
              <div className="bp-booking-modal bp-doc-detail-modal" id={`qualification-${item.id}`} role="dialog" aria-modal="true">
                <a className="bp-booking-modal-backdrop" href="#qualifications" aria-label="Закрити документ" />
                <div className="bp-booking-modal-panel bp-doc-detail-panel">
                  <div className="bp-booking-modal-head">
                    <div>
                      <p className="bp-eyebrow">Підвищення кваліфікації</p>
                      <h2>{item.title}</h2>
                    </div>
                    <a className="bp-booking-modal-close" href="#qualifications" aria-label="Закрити">
                      <X size={20} />
                    </a>
                  </div>
                  <div className="bp-doc-detail-body">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.title} /> : <div className="bp-image-placeholder"><FileText size={28} /></div>}
                    <div>
                      <p>{item.description || "Майстер додав професійний документ до профілю."}</p>
                      <span>Тип: {item.type}</span>
                      {item.issuer && <span>Ким видано: {item.issuer}</span>}
                      {item.issuedAt && <span>Дата: {new Date(item.issuedAt).toLocaleDateString("uk-UA")}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="bp-empty-state">Майстер ще не додав курси, сертифікати або ліцензії.</div>
      )}
    </section>
  );
}

function CompanyDocumentsSection({ items }: { items: CompanyDocument[] }) {
  const publicDocuments = items.filter((item) => item.isPublic === true);

  return (
    <section className="bp-section" id="company-documents">
      <div className="bp-section-head">
        <p className="bp-eyebrow">Документи</p>
        <h2>Документи компанії</h2>
        <small>Публічні документи профілю: гарантії, прайси, дозволи або презентації.</small>
      </div>
      {publicDocuments.length ? (
        <div className="bp-doc-list">
          {publicDocuments.map((document) => (
            <a href={document.fileUrl || "#company-documents"} className="bp-doc-list-row" key={document.id}>
              <FileText size={18} />
              <span>
                <strong>{document.title}</strong>
                <small>{document.description || "Публічний документ майстра або компанії."}</small>
              </span>
              <em>{document.fileType?.toUpperCase() || "PDF"}</em>
            </a>
          ))}
        </div>
      ) : (
        <div className="bp-empty-state">Документи компанії ще не додані.</div>
      )}
    </section>
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

function ContactsModal({ master }: { master: MasterProfile }) {
  const phone = getContactValue(master.contacts, "Телефон");
  const telegram = getContactValue(master.contacts, "Telegram");
  const messenger = getContactValue(master.contacts, ["WhatsApp / Viber", "WhatsApp", "Viber"]);
  const preferred = getContactValue(master.contacts, "Бажаний спосіб звʼязку");
  const contacts = [
    phone && { label: "Телефон", value: phone.value, href: phone.href, icon: Phone },
    telegram && { label: "Telegram", value: telegram.value, href: telegram.href, icon: MessageSquare },
    messenger && { label: "WhatsApp / Viber", value: messenger.value, href: messenger.href, icon: MessageSquare },
  ].filter(Boolean) as Array<{ label: string; value: string; href: string; icon: typeof Phone }>;

  return (
    <div className="bp-booking-modal bp-contacts-modal" id="contacts" role="dialog" aria-modal="true" aria-labelledby="contacts-modal-title">
      <a className="bp-booking-modal-backdrop" href="#profile-top" aria-label="Закрити контакти" />
      <div className="bp-booking-modal-panel bp-contacts-modal-panel">
        <div className="bp-booking-modal-head">
          <div>
            <p className="bp-eyebrow">Контакти</p>
            <h2 id="contacts-modal-title">Контакти майстра</h2>
          </div>
          <a className="bp-booking-modal-close" href="#profile-top" aria-label="Закрити">
            <X size={20} />
          </a>
        </div>
        <div className="bp-contacts-modal-body">
          <p className="bp-contacts-modal-note">
            Можете звʼязатися напряму або залишити заявку через БудПомiч.
          </p>
          {contacts.length ? (
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
          ) : (
            <div className="bp-empty-state">Майстер ще не додав прямі контакти.</div>
          )}
          {preferred?.value && (
            <div className="bp-preferred-contact">
              <span>Бажаний спосіб звʼязку</span>
              <strong>{preferred.value}</strong>
            </div>
          )}
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
          <PortfolioJournalSection items={items} fallbackWorks={fallbackWorks} />
        </div>
      </div>
    </div>
  );
}

function ProfilePanelDrawer({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="bp-booking-modal bp-profile-drawer" id={id} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
      <a className="bp-booking-modal-backdrop" href="#profile-top" aria-label="Закрити розділ" />
      <div className="bp-booking-modal-panel bp-profile-drawer-panel">
        <div className="bp-booking-modal-head">
          <div>
            <p className="bp-eyebrow">{eyebrow}</p>
            <h2 id={`${id}-title`}>{title}</h2>
          </div>
          <a className="bp-booking-modal-close" href="#profile-top" aria-label="Закрити">
            <X size={20} />
          </a>
        </div>
        <div className="bp-profile-drawer-body">{children}</div>
      </div>
    </div>
  );
}

function ProfileQuickPanelModals({
  reviews,
  qualifications,
  companyDocuments,
}: {
  reviews: Review[];
  qualifications: MasterQualification[];
  companyDocuments: CompanyDocument[];
}) {
  const publicDocuments = companyDocuments.filter((item) => item.isPublic === true);

  return (
    <>
      <ProfilePanelDrawer id="profile-panel-qualifications" eyebrow="Кваліфікація" title="Навчання і сертифікати">
        {qualifications.length ? (
          <div className="bp-qualification-drawer-grid">
            {qualifications.slice(0, 6).map((item) => (
              <a className="bp-qualification-drawer-card" href={`#qualification-${item.id}`} key={item.id}>
                <div className="bp-qualification-drawer-media">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} />
                  ) : (
                    <span>
                      <FileText size={28} />
                    </span>
                  )}
                </div>
                <div className="bp-qualification-drawer-copy">
                  <div>
                    <small>{item.type === "license" ? "Ліцензія" : item.type === "course" ? "Курс" : item.type === "award" ? "Нагорода" : "Сертифікат"}</small>
                    <em>{item.issuedAt ? new Date(item.issuedAt).toLocaleDateString("uk-UA") : item.category || "Будівельні роботи"}</em>
                  </div>
                  <strong>{item.title}</strong>
                  <p>{item.description || "Документ підтверджує професійний досвід майстра. Фото або скан можна додати в редагуванні профілю."}</p>
                  <span>{item.issuer || item.category || "Професійний документ"}</span>
                  <b>Детальніше</b>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="bp-empty-state">Майстер ще не додав курси, сертифікати або ліцензії.</div>
        )}
      </ProfilePanelDrawer>

      <ProfilePanelDrawer id="profile-panel-documents" eyebrow="Документи" title="Публічні документи">
        {publicDocuments.length ? (
          <div className="bp-profile-drawer-list">
            {publicDocuments.map((item) => (
              <a href={item.fileUrl || "#profile-panel-documents"} key={item.id}>
                <FileText size={18} />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.description || "Публічний документ профілю."}</small>
                </span>
                <em>{item.fileType?.toUpperCase() || "PDF"}</em>
              </a>
            ))}
          </div>
        ) : (
          <div className="bp-empty-state">Публічні документи ще не додані.</div>
        )}
      </ProfilePanelDrawer>

      <ProfilePanelDrawer id="profile-panel-reviews" eyebrow="Відгуки" title="Що кажуть клієнти">
        {reviews.length ? (
          <div className="bp-profile-drawer-reviews">
            {reviews.map((review) => (
              <article key={review.id}>
                <div>
                  <strong>{review.author}</strong>
                  {review.date && <time>{review.date}</time>}
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
          <div className="bp-empty-state">Відгуків поки немає. Будьте першим клієнтом, який залишить відгук.</div>
        )}
      </ProfilePanelDrawer>
    </>
  );
}

export function ProfileMasterView({ master, ownerSource }: ProfileMasterViewProps) {
  const [profileEdit, setProfileEdit] = useState<EditableMasterProfile | null>(null);
  const [savedPortfolioItems, setSavedPortfolioItems] = useState<PortfolioItem[]>([]);
  const [companyDocuments, setCompanyDocuments] = useState<CompanyDocument[]>(defaultCompanyDocuments);
  const [qualifications, setQualifications] = useState<MasterQualification[]>(defaultMasterQualifications);
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
    const localCompanyDocuments = JSON.parse(
      localStorage.getItem(companyDocumentsStorageKey) ?? "[]",
    ) as CompanyDocument[];
    const localQualifications = JSON.parse(
      localStorage.getItem(masterQualificationsStorageKey) ?? "[]",
    ) as MasterQualification[];
    setCompanyDocuments(Array.from(new Map([...localCompanyDocuments, ...defaultCompanyDocuments].map((item) => [item.id, item])).values()));
    setQualifications(Array.from(new Map([...localQualifications, ...defaultMasterQualifications].map((item) => [item.id, item])).values()));

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

  useEffect(() => {
    function closeModalOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const hash = window.location.hash;
      const isProfilePanel = [
        "#profile-panel-qualifications",
        "#profile-panel-documents",
        "#profile-panel-reviews",
      ].includes(hash);
      const isKnownModal = ["#booking", "#message", "#services", "#portfolio", "#contacts"].includes(hash);
      if (!isKnownModal && !isProfilePanel && !hash.startsWith("#work-detail-") && !hash.startsWith("#qualification-")) return;
      window.location.hash = hash.startsWith("#work-detail-")
        ? "portfolio"
        : hash.startsWith("#qualification-")
          ? "qualifications"
          : "profile-top";
    }

    window.addEventListener("keydown", closeModalOnEscape);
    return () => window.removeEventListener("keydown", closeModalOnEscape);
  }, []);

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
            <div className="bp-about-profile-grid">
              <article className="bp-about-profile-card bp-about-profile-wide">
                <span>Короткий опис</span>
                <p>
                  {visibleMaster.description ||
                    "Гіпсокартонні конструкції, перегородки, стелі та укладання плитки у комерційних будівлях."}
                </p>
              </article>
              <article className="bp-about-profile-card bp-about-profile-wide">
                <span>Повний опис</span>
                <p>
                  {visibleMaster.fullDescription ||
                    "Майстер працює акуратно, допомагає сформувати обсяг робіт і погодити зрозумілий бюджет до старту."}
                </p>
              </article>
              <article className="bp-about-profile-card">
                <span>З якими обʼєктами працює</span>
                <strong>Квартири, офіси, комерційні приміщення</strong>
              </article>
              <article className="bp-about-profile-card">
                <span>Мови спілкування</span>
                <strong>Українська, російська</strong>
              </article>
            </div>
          </section>

          <MasterActivitySection master={visibleMaster} items={portfolioItems} />
          <QualificationsSection items={qualifications} />
          <CompanyDocumentsSection items={companyDocuments} />
          <ReviewsSection reviews={reviews} />

        </div>

        <BookingCard master={visibleMaster} />
      </div>

      <MobileBookingBar master={visibleMaster} />
      <BookingModal master={visibleMaster} masterServices={masterServices} />
      <MessageModal master={visibleMaster} />
      <ContactsModal master={visibleMaster} />
      <ServicesModal services={visibleMaster.services} />
      <PortfolioModal items={portfolioItems} fallbackWorks={visibleMaster.works} />
      <ProfileQuickPanelModals
        reviews={reviews}
        qualifications={qualifications}
        companyDocuments={companyDocuments}
      />
    </main>
  );
}
