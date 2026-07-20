"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, Camera, ChevronLeft, ChevronRight, Clock3, LayoutDashboard, MapPin, MessageSquare, Pencil, ShieldCheck, Star, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ClientBookingCalendar, NearestFreeDateText } from "@/components/ClientBookingCalendar";
import { FollowMasterButton } from "@/components/FollowMasterButton";
import { PublicReviews } from "@/components/PublicReviews";
import { getMasterById } from "@/lib/masters";
import { EditableMasterProfile, masterProfileStorageKey, mergeMasterProfile } from "@/lib/master-profile-edit";
import { defaultPortfolioItems, formatUah, PortfolioItem, portfolioStorageKey } from "@/lib/portfolio";
import type { ReviewAggregate } from "@/lib/reviews";

export type ProfileTab = "works" | "about" | "services" | "reviews" | "booking";

const verificationLabels = { identity: "Особу підтверджено", phone: "Телефон підтверджено", email: "Email підтверджено", documents: "Документи перевірено", business: "ФОП підтверджено" } as const;
const workConditionLabels = { contract: "Працює за договором", estimate: "Надає кошторис", warranty: "Гарантія на роботи", material_advice: "Допомагає з вибором матеріалів", material_purchase: "Може закупити матеріали", own_tools: "Має власний інструмент", cleanup: "Прибирає після завершення роботи", business_clients: "Працює з ФОП або юридичними особами", site_visit: "Виїжджає на огляд об’єкта" } as const;

const profileTabs: { value: ProfileTab; label: string }[] = [
  { value: "works", label: "Роботи" },
  { value: "about", label: "Про майстра" },
  { value: "services", label: "Послуги" },
  { value: "reviews", label: "Відгуки" },
  { value: "booking", label: "Вільні дати" },
];

function isProfileTab(value: string | null): value is ProfileTab {
  return profileTabs.some((tab) => tab.value === value);
}

type ProjectImageStage = "before" | "progress" | "after";
type PublicProjectImage = { url: string; stage?: ProjectImageStage; alt?: string };

function validImageUrl(value: string | undefined): value is string {
  return Boolean(value?.trim() && !value.startsWith("javascript:"));
}

function projectImages(item: PortfolioItem): PublicProjectImage[] {
  const seen = new Set<string>();
  const result: PublicProjectImage[] = [];
  const add = (url: string | undefined, stage?: ProjectImageStage, alt?: string) => {
    if (!validImageUrl(url) || seen.has(url)) return;
    seen.add(url);
    result.push({ url, stage, alt });
  };
  add(item.mainPhoto?.url, item.mainPhoto?.kind === "main" ? undefined : item.mainPhoto?.kind, item.mainPhoto?.caption);
  item.afterPhotos?.forEach((photo) => add(photo.url, "after", photo.caption));
  item.afterPhotoUrls?.forEach((url) => add(url, "after"));
  add(item.photoUrl);
  item.photoUrls?.forEach((url) => add(url));
  item.progressPhotos?.forEach((photo) => add(photo.url, "progress", photo.caption));
  item.progressPhotoUrls?.forEach((url) => add(url, "progress"));
  item.beforePhotos?.forEach((photo) => add(photo.url, "before", photo.caption));
  item.beforePhotoUrls?.forEach((url) => add(url, "before"));
  return result;
}

const stageLabels: Record<ProjectImageStage, string> = { before: "До", progress: "У процесі", after: "Після" };

function ProjectCard({ item, masterName, onOpen }: { item: PortfolioItem; masterName: string; onOpen: (item: PortfolioItem, button: HTMLButtonElement) => void }) {
  const images = projectImages(item);
  const cover = images.find((image) => image.stage === "after") ?? images[0];
  const location = [item.city, item.district].filter(Boolean).join(" · ");
  const works = item.workLines.map((line) => line.workType).filter(Boolean);
  return (
    <article className="public-project-card">
      <div className="public-project-image">
        {cover ? <Image src={cover.url} alt={cover.alt || `${item.title}, виконаний майстром ${masterName}`} fill sizes="(max-width: 640px) calc(100vw - 48px), (max-width: 1100px) 46vw, 560px" unoptimized={cover.url.startsWith("data:")} /> : <div className="public-project-placeholder"><Camera aria-hidden="true" /><span>Фото проєкту ще не додано</span></div>}
        {cover?.stage ? <span>{stageLabels[cover.stage]}</span> : null}
        {images.length ? <small><Camera size={14} aria-hidden="true" /> {images.length} фото</small> : null}
      </div>
      <div className="public-project-body">
        <div className="public-project-heading"><div>{location ? <span><MapPin size={14} aria-hidden="true" /> {item.publicLocation || location}</span> : null}<h3>{item.title}</h3></div>{item.totalAmount > 0 ? <strong>{formatUah(item.totalAmount)}</strong> : null}</div>
        <div className="public-project-facts">{item.workCategory ? <span>{item.workCategory}</span> : null}{item.objectType ? <span>{item.objectType}</span> : null}{item.objectArea ? <span>{item.objectArea} м²</span> : null}{item.durationDays ? <span>{item.durationDays} днів</span> : null}</div>
        {item.description ? <p>{item.description}</p> : null}
        {works.length ? <ul className="public-project-work-list" aria-label="Виконані роботи">{works.slice(0, 5).map((work) => <li key={work}>{work}</li>)}</ul> : null}
        <div className="public-project-meta">
          <span>{item.projectStatus === "in_progress" ? "У роботі" : "Завершений проєкт"}</span>
        </div>
        <button className="public-project-open" type="button" onClick={(event) => onOpen(item, event.currentTarget)} aria-label={`Переглянути проєкт ${item.title}`}>Переглянути проєкт <ArrowUpRight size={16} /></button>
      </div>
    </article>
  );
}

function ProjectDialog({ item, masterName, onClose, onBook, onMessage }: { item: PortfolioItem; masterName: string; onClose: () => void; onBook: () => void; onMessage: () => void }) {
  const allImages = useMemo(() => projectImages(item), [item]);
  const stages = useMemo(() => Array.from(new Set(allImages.map((image) => image.stage).filter((stage): stage is ProjectImageStage => Boolean(stage)))), [allImages]);
  const [stage, setStage] = useState<ProjectImageStage | "all">("all");
  const visibleImages = useMemo(() => stage === "all" ? allImages : allImages.filter((image) => image.stage === stage), [allImages, stage]);
  const [activeUrl, setActiveUrl] = useState(allImages[0]?.url ?? "");
  const dialogRef = useRef<HTMLDivElement>(null);
  const activeIndex = Math.max(0, visibleImages.findIndex((image) => image.url === activeUrl));
  const activeImage = visibleImages[activeIndex] ?? visibleImages[0];

  const chooseStage = (value: ProjectImageStage | "all") => {
    setStage(value);
    const first = value === "all" ? allImages[0] : allImages.find((image) => image.stage === value);
    setActiveUrl(first?.url ?? "");
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && visibleImages.length > 1) setActiveUrl(visibleImages[(activeIndex - 1 + visibleImages.length) % visibleImages.length].url);
      if (event.key === "ArrowRight" && visibleImages.length > 1) setActiveUrl(visibleImages[(activeIndex + 1) % visibleImages.length].url);
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute("disabled"));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); };
  }, [activeIndex, onClose, visibleImages]);

  const facts = [
    item.objectArea ? ["Площа", `${item.objectArea} м²`] : null,
    item.durationDays ? ["Термін", `${item.durationDays} днів`] : null,
    item.totalAmount > 0 ? ["Вартість робіт", formatUah(item.totalAmount)] : null,
    item.objectType ? ["Тип об’єкта", item.objectType] : null,
    item.publicLocation || item.city ? ["Місце", item.publicLocation || [item.city, item.district].filter(Boolean).join(" · ")] : null,
  ].filter((fact): fact is string[] => Boolean(fact));
  const works = item.workLines.map((line) => line.workType).filter(Boolean);

  return <div className="public-project-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="public-project-modal" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title" ref={dialogRef} tabIndex={-1}>
      <button className="public-project-modal-close" type="button" onClick={onClose} aria-label="Закрити проєкт"><X /></button>
      <header><span>{item.workCategory || "Виконаний проєкт"}</span><h2 id="project-dialog-title">{item.title}</h2></header>
      {stages.length ? <div className="public-project-gallery-filters" aria-label="Етапи робіт"><button type="button" className={stage === "all" ? "active" : ""} onClick={() => chooseStage("all")}>Усі фото</button>{stages.map((value) => <button type="button" className={stage === value ? "active" : ""} onClick={() => chooseStage(value)} key={value}>{stageLabels[value]}</button>)}</div> : null}
      <div className="public-project-gallery">
        <div className="public-project-gallery-main">
          {activeImage ? <Image src={activeImage.url} alt={activeImage.alt || `${item.title}, фото ${activeIndex + 1}`} fill sizes="(max-width: 700px) 100vw, 900px" unoptimized={activeImage.url.startsWith("data:")} /> : <div className="public-project-placeholder"><Camera aria-hidden="true" /><span>Фото проєкту ще не додано</span></div>}
          {visibleImages.length > 1 ? <><button className="previous" type="button" onClick={() => setActiveUrl(visibleImages[(activeIndex - 1 + visibleImages.length) % visibleImages.length].url)} aria-label="Попереднє фото"><ChevronLeft /></button><button className="next" type="button" onClick={() => setActiveUrl(visibleImages[(activeIndex + 1) % visibleImages.length].url)} aria-label="Наступне фото"><ChevronRight /></button><span className="counter">{activeIndex + 1} / {visibleImages.length}</span></> : null}
        </div>
        {visibleImages.length > 1 ? <div className="public-project-thumbnails" aria-label="Мініатюри проєкту">{visibleImages.map((image, index) => <button type="button" className={image.url === activeImage?.url ? "active" : ""} onClick={() => setActiveUrl(image.url)} aria-label={`Показати фото ${index + 1}`} key={image.url}><Image src={image.url} alt="" fill sizes="88px" unoptimized={image.url.startsWith("data:")} /></button>)}</div> : null}
      </div>
      {facts.length ? <dl className="public-project-dialog-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : null}
      {(item.description || works.length || item.masterComment || item.materialsStores?.length) ? <section className="public-project-dialog-about"><h3>Про проєкт</h3>{item.description ? <div><h4>Завдання та результат</h4><p>{item.description}</p></div> : null}{works.length ? <div><h4>Що було виконано</h4><ul>{works.map((work) => <li key={work}>{work}</li>)}</ul></div> : null}{item.materialsStores?.length ? <div><h4>Матеріали</h4><p>{item.materialsStores.join(" · ")}</p></div> : null}{item.masterComment ? <div><h4>Коментар майстра</h4><p>{item.masterComment}</p></div> : null}</section> : null}
      <footer><button type="button" onClick={onBook}>Обрати вільні дати</button><button type="button" className="secondary" onClick={onMessage}>Написати майстру</button></footer>
      <span className="sr-only">Проєкт виконав майстер {masterName}</span>
    </div>
  </div>;
}

export function PublicMasterProfile({ masterId, ownerSource }: { masterId: string; ownerSource?: "dashboard" | "profile" | "portfolio" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab: ProfileTab = isProfileTab(requestedTab) ? requestedTab : "works";
  const tabsRef = useRef<HTMLDivElement>(null);
  const projectTriggerRef = useRef<HTMLButtonElement | null>(null);
  const baseMaster = getMasterById(masterId);
  const [savedItems, setSavedItems] = useState<PortfolioItem[]>([]);
  const [profileEdit, setProfileEdit] = useState<EditableMasterProfile | null>(null);
  const [portfolioFilter, setPortfolioFilter] = useState("all");
  const [selectedProject, setSelectedProject] = useState<PortfolioItem | null>(null);
  const [reviewAggregate, setReviewAggregate] = useState<ReviewAggregate>({ average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, criteria: {} });

  useEffect(() => {
    const readLocalItems = window.setTimeout(() => {
      try {
        const parsed: unknown = JSON.parse(localStorage.getItem(portfolioStorageKey) ?? "[]");
        setSavedItems(Array.isArray(parsed) ? (parsed as PortfolioItem[]).filter((item) => item.masterId === masterId) : []);
      } catch { setSavedItems([]); }
      try {
        const parsed: unknown = JSON.parse(localStorage.getItem(masterProfileStorageKey) ?? "{}");
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) setProfileEdit((parsed as Record<string, EditableMasterProfile>)[masterId] ?? null);
      } catch { setProfileEdit(null); }
    }, 0);
    fetch(`/api/portfolio?masterId=${encodeURIComponent(masterId)}`).then((response) => response.json()).then((result: { items?: PortfolioItem[] }) => {
      if (result.items?.length) setSavedItems((current) => Array.from(new Map([...result.items!, ...current].map((item) => [item.id, item])).values()));
    }).catch(() => undefined);
    fetch(`/api/profile?masterId=${encodeURIComponent(masterId)}`).then((response) => response.json()).then((result: { profile?: EditableMasterProfile | null }) => { if (result.profile) setProfileEdit(result.profile); }).catch(() => undefined);
    return () => window.clearTimeout(readLocalItems);
  }, [masterId]);

  const master = useMemo(() => baseMaster ? mergeMasterProfile(baseMaster, profileEdit) : null, [baseMaster, profileEdit]);
  const portfolioItems = useMemo(() => Array.from(new Map([...defaultPortfolioItems.filter((item) => item.masterId === masterId), ...savedItems].map((item) => [item.id, item])).values()), [masterId, savedItems]);
  const portfolioCategories = useMemo(() => Array.from(new Set(portfolioItems.map((item) => item.workCategory || item.objectType).filter((category): category is string => Boolean(category)))), [portfolioItems]);
  const visiblePortfolioItems = useMemo(() => portfolioFilter === "all" ? portfolioItems : portfolioItems.filter((item) => (item.workCategory || item.objectType) === portfolioFilter), [portfolioFilter, portfolioItems]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const tabs = tabsRef.current;
      const button = document.getElementById(`profile-tab-${activeTab}`);
      const panel = document.getElementById(`profile-panel-${activeTab}`);
      if (!tabs || !button || !panel) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const left = button.offsetLeft;
      const right = left + button.offsetWidth;
      if (left < tabs.scrollLeft || right > tabs.scrollLeft + tabs.clientWidth) {
        tabs.scrollTo({ left: Math.max(0, left - 12), behavior: reducedMotion ? "auto" : "smooth" });
      }

      const tabsBounds = tabs.getBoundingClientRect();
      const panelBounds = panel.getBoundingClientRect();
      if (window.scrollY > panel.offsetTop && panelBounds.bottom < tabsBounds.bottom + 24) {
        window.scrollTo({
          top: Math.max(0, window.scrollY + panelBounds.top - tabsBounds.bottom - 16),
          behavior: reducedMotion ? "auto" : "smooth",
        });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab]);

  if (!master) return <main className="public-profile-page public-profile-empty"><h1>Майстра не знайдено</h1><Link href="/masters">Повернутися до каталогу</Link></main>;

  const coverStyle = master.coverImageUrl ? {
    "--profile-cover-image": `url(${JSON.stringify(master.coverImageUrl)})`,
    "--profile-cover-x": `${master.coverPositionX ?? 50}%`,
    "--profile-cover-y": `${master.coverPositionY ?? 50}%`,
    "--profile-cover-scale": master.coverZoom ?? 1,
  } as CSSProperties : undefined;
  const isPersonVerified = master.verification?.identity === true;
  const areDocumentsVerified = master.verification?.documents === true;

  function openTab(tab: ProfileTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function closeProject() {
    setSelectedProject(null);
    window.requestAnimationFrame(() => projectTriggerRef.current?.focus());
  }

  function openProject(item: PortfolioItem, button: HTMLButtonElement) {
    projectTriggerRef.current = button;
    setSelectedProject(item);
  }

  function openReviewedProject(projectId: string) {
    const project = portfolioItems.find((item) => item.id === projectId);
    if (project) setSelectedProject(project);
  }

  function openProjectAction(tab: ProfileTab) {
    setSelectedProject(null);
    openTab(tab);
  }

  function openMessageFromProject() {
    setSelectedProject(null);
    openTab("booking");
    window.setTimeout(() => document.getElementById("message-master")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" }), 0);
  }

  return (
    <main className="public-profile-page">
      {ownerSource && <aside className="public-profile-owner-bar"><span>Ви переглядаєте профіль очима клієнта</span><div>{masterId === "andrii-koval" ? <Link href="/dashboard/profile"><Pencil size={15} /> Редагувати профіль</Link> : <a href="#message-master"><MessageSquare size={15} /> Написати майстру</a>}<Link href="/dashboard"><LayoutDashboard size={15} /> До кабінету</Link></div></aside>}
      <header className="public-profile-header"><Link className="public-profile-brand" href="/masters"><Image className="public-profile-logo" src="/logo/budpomich-logo-v4.svg" alt="БудПоміч" width={820} height={380} priority /></Link><nav><Link href="/masters">Майстри</Link><Link href="/feed">Роботи</Link>{ownerSource && <Link href="/dashboard">Кабінет</Link>}</nav></header>
      <div className="public-profile-breadcrumb"><Link href={ownerSource ? "/dashboard" : "/masters"}><ArrowLeft size={15} /> {ownerSource ? "Повернутися до кабінету" : "Каталог майстрів"}</Link></div>

      <section className={`public-profile-hero public-pro-hero ${master.coverImageUrl ? "has-cover-image" : ""}`} style={coverStyle}>
        <div className="public-pro-cover" aria-hidden="true" />
        <div className="public-pro-person">
          <div className={`public-profile-avatar public-pro-avatar avatar-${master.accent}`}>
            {master.avatarUrl ? <Image src={master.avatarUrl} alt={`Фото майстра ${master.name}`} fill sizes="(max-width: 640px) 120px, (max-width: 900px) 148px, 176px" style={{ objectFit: "cover", objectPosition: `${master.avatarPositionX ?? 50}% ${master.avatarPositionY ?? 50}%`, transform: `scale(${master.avatarZoom ?? 1})` }} /> : master.initials}
          </div>
          <div className="public-profile-intro">
            <p>{master.profession}</p><h1>{master.name}</h1>
            <div className="public-pro-location"><MapPin size={15} /> {master.city}{master.district ? ` · ${master.district}` : ""}</div>
            <div className="public-pro-badges">{isPersonVerified && <span><ShieldCheck size={15} /> Особу перевірено</span>}{areDocumentsVerified && <span><ShieldCheck size={15} /> Документи перевірено</span>}{master.isProfileActive !== false && <span className="active">Профіль активний</span>}</div>
          </div>
        </div>
        <dl className="public-pro-stats">
          <div><dt><Star size={16} fill="currentColor" /> Рейтинг</dt><dd>{reviewAggregate.count ? reviewAggregate.average.toFixed(1) : "—"} <small>{reviewAggregate.count} відгуків</small></dd></div>
          <div><dt><BriefcaseBusiness size={16} /> Виконано робіт</dt><dd>{portfolioItems.length}</dd></div>
          <div><dt><Clock3 size={16} /> Середній час відповіді</dt><dd><small>Не вказано</small></dd></div>
          <div><dt>Досвід</dt><dd>{master.experience}</dd></div>
        </dl>
        <aside className="public-profile-action public-pro-action"><span>Вартість робіт</span><strong>від {formatUah(master.priceFrom)}</strong><NearestFreeDateText masterId={masterId} /><button type="button" onClick={() => openTab("booking")}>Обрати вільні дати</button><button className="public-profile-message-link" type="button" onClick={() => openTab("booking")}>Написати</button><FollowMasterButton masterId={masterId} masterName={master.name} /></aside>
      </section>

      <div className="public-profile-tabs" role="tablist" aria-label="Розділи профілю" ref={tabsRef}>{profileTabs.map((tab) => <button type="button" role="tab" id={`profile-tab-${tab.value}`} aria-controls={`profile-panel-${tab.value}`} aria-selected={activeTab === tab.value} tabIndex={activeTab === tab.value ? 0 : -1} onClick={() => openTab(tab.value)} key={tab.value}>{tab.label}</button>)}</div>

      <div className="public-profile-content">
        <section className="public-profile-section public-portfolio-section" id="profile-panel-works" role="tabpanel" aria-labelledby="profile-tab-works" hidden={activeTab !== "works"}>
          <div className="public-profile-title-row"><div><span className="public-section-kicker">Портфоліо майстра</span><h2>Виконані проєкти</h2></div><span>{portfolioItems.length} робіт</span></div>
          {portfolioItems.length ? <>
            <div className="public-portfolio-filters" aria-label="Фільтри портфоліо"><button type="button" className={portfolioFilter === "all" ? "active" : ""} aria-pressed={portfolioFilter === "all"} onClick={() => setPortfolioFilter("all")}>Усі роботи</button>{portfolioCategories.map((category) => <button type="button" className={portfolioFilter === category ? "active" : ""} aria-pressed={portfolioFilter === category} onClick={() => setPortfolioFilter(category)} key={category}>{category}</button>)}</div>
            {visiblePortfolioItems.length ? <div className="public-portfolio-grid">{visiblePortfolioItems.map((item) => <ProjectCard item={item} masterName={master.name} onOpen={openProject} key={item.id} />)}</div> : <p className="public-empty-state">У цій категорії майстер ще не додав робіт.</p>}
          </> : <div className="public-empty-state"><p>Майстер ще не додав роботи до портфоліо.</p><small>Після завершення замовлень тут з’являться фото та описи проєктів.</small></div>}
        </section>

        <section className="public-profile-section public-about-section" id="profile-panel-about" role="tabpanel" aria-labelledby="profile-tab-about" hidden={activeTab !== "about"}><span className="public-section-kicker">Про майстра</span><h2>Досвід і підхід до роботи</h2><p>{master.fullDescription}</p><dl><div><dt>Місто</dt><dd>{master.city}</dd></div><div><dt>Райони роботи</dt><dd>{master.district || "Уточнюються з майстром"}</dd></div><div><dt>Досвід</dt><dd>{master.experience}</dd></div>{master.registeredText ? <div><dt>На платформі</dt><dd>{master.registeredText}</dd></div> : null}</dl><section className="public-trust-section"><h3>Перевірено та підтверджено</h3>{master.verification && Object.entries(master.verification).some(([, value]) => value) ? <ul>{Object.entries(master.verification).filter((entry): entry is [keyof typeof verificationLabels, true] => entry[1] === true).map(([key]) => <li key={key}><ShieldCheck size={18} />{verificationLabels[key]}</li>)}</ul> : <p>Підтверджені перевірки поки не опубліковані.</p>}</section>{master.workConditions?.length ? <section className="public-work-conditions"><h3>Умови роботи</h3><ul>{master.workConditions.map((condition) => <li key={condition}>{workConditionLabels[condition]}</li>)}</ul></section> : null}</section>

        <section className="public-profile-section public-services-section" id="profile-panel-services" role="tabpanel" aria-labelledby="profile-tab-services" hidden={activeTab !== "services"}><div className="public-profile-title-row"><div><span className="public-section-kicker">Послуги</span><h2>Що виконує майстер</h2></div></div><div className="public-services-grid">{master.services.map((service) => { const [price, unit] = service.price.split("/"); return <article key={service.name}><h3>{service.name}</h3><strong>{price.trim()}</strong>{unit && <span>за {unit}</span>}<p>Остаточна вартість залежить від обсягу та стану об’єкта.</p><button type="button" onClick={() => openTab("booking")}>Обрати дати</button></article>; })}</div></section>

        <section className="public-profile-section public-reviews-section" id="profile-panel-reviews" role="tabpanel" aria-labelledby="profile-tab-reviews" hidden={activeTab !== "reviews"}><div className="public-profile-title-row"><div><span className="public-section-kicker">Відгуки</span><h2>Досвід клієнтів</h2></div></div><PublicReviews masterId={masterId} onOpenProject={openReviewedProject} onAggregateChange={setReviewAggregate} /></section>
      </div>

      <section className="public-booking-tab-panel" id="profile-panel-booking" role="tabpanel" aria-labelledby="profile-tab-booking" hidden={activeTab !== "booking"}><ClientBookingCalendar masterId={masterId} masterName={master.name} /></section>
      <div className="public-mobile-actions"><button type="button" onClick={() => openTab("booking")}>Обрати дати</button><button type="button" onClick={() => openTab("booking")} aria-label="Написати майстру"><MessageSquare size={19} /></button></div>
      {selectedProject ? <ProjectDialog item={selectedProject} masterName={master.name} onClose={closeProject} onBook={() => openProjectAction("booking")} onMessage={openMessageFromProject} /> : null}
    </main>
  );
}
