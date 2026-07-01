"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  CreditCard,
  Eye,
  FileText,
  ImagePlus,
  LayoutDashboard,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Settings,
  SlidersHorizontal,
  Star,
  UserRound,
  X,
} from "lucide-react";
import {
  mockRequestMessages,
  mockRequests,
  requestMessagesStorageKey,
  requestsStorageKey,
  requestStatusLabels,
  type MasterRequest,
  type RequestMessage,
  type RequestStatus,
} from "@/lib/requests";
import {
  portfolioStorageKey,
  type PortfolioItem,
} from "@/lib/portfolio";
import type { MasterProfile } from "@/lib/masters";

type DashboardMasterAppProps = {
  master: MasterProfile;
  portfolioItems: PortfolioItem[];
};

const currentMasterId = "andrey-ponomarenko";

const sidebarItems = [
  { label: "Огляд", href: "#overview", icon: LayoutDashboard },
  { label: "Заявки", href: "#requests", icon: ClipboardList },
  { label: "Календар", href: "#calendar", icon: CalendarDays },
  { label: "Повідомлення", href: "#messages", icon: MessageSquare },
  { label: "Мій профіль", href: "/dashboard/profile", icon: UserRound },
  { label: "Портфоліо", href: "#portfolio-manager", icon: ImagePlus },
  { label: "Послуги та ціни", href: "#services-manager", icon: CreditCard },
  { label: "Налаштування", href: "/dashboard/profile#profile-contacts", icon: Settings },
];

const statusClass: Record<RequestStatus, string> = {
  new: "new",
  accepted: "accepted",
  in_progress: "progress",
  completed: "completed",
  declined: "declined",
};

function mergeById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function formatDate(value: string) {
  if (!value) return "Дата уточнюється";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function formatUah(value: number) {
  return `${Math.round(value).toLocaleString("uk-UA")} грн`;
}

function getServiceUnit(price: string) {
  if (price.includes("/м²") || price.includes("/м2") || price.includes("/мВІ")) return "грн/м²";
  if (price.toLowerCase().includes("день")) return "грн/день";
  return "грн/робота";
}

function requestMatchesMaster(request: MasterRequest) {
  return request.masterId === currentMasterId;
}

function getRequestPrimaryDate(request: MasterRequest) {
  return request.periods[0]?.period || request.desiredDate || "Дата уточнюється";
}

function getSectionIdFromHash(hash: string) {
  const normalized = hash.replace("#", "");
  return sidebarItems.some((item) => item.href === `#${normalized}`) ? normalized : "overview";
}

function getProfileCompletion(master: MasterProfile, portfolioCount: number) {
  const checks = [
    Boolean(master.avatarUrl),
    Boolean(master.fullDescription || master.description),
    master.services.length > 0,
    portfolioCount > 0 || master.works.length > 0,
    Boolean(master.city && master.district),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function getCalendarMonth(busyDates: string[] = []) {
  const firstBusyDate = busyDates.find((date) => !Number.isNaN(new Date(date).getTime()));
  const base = firstBusyDate ? new Date(`${firstBusyDate}T00:00:00`) : new Date();
  const year = base.getFullYear();
  const month = base.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const title = new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric" }).format(base);

  return { daysInMonth, month, title, year };
}

function getInitialCalendarDays(busyDates: string[] = []) {
  const { daysInMonth, month, year } = getCalendarMonth(busyDates);
  const busyDays = new Set(
    busyDates
      .map((date) => new Date(`${date}T00:00:00`))
      .filter((date) => !Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month)
      .map((date) => date.getDate()),
  );

  return Array.from({ length: daysInMonth }, (_, index) => index + 1).reduce<Record<number, CalendarStatus>>(
    (days, day) => {
      if (busyDays.has(day)) {
        days[day] = "busy";
      } else if (day === 8 || day === 21) {
        days[day] = "pending";
      } else {
        days[day] = "free";
      }

      return days;
    },
    {},
  );
}

function DashboardSidebar({ activeSection }: { activeSection: string }) {
  return (
    <aside className="dash-sidebar" aria-label="Навігація кабінету">
      <div className="dash-sidebar-brand">
        <span>BP</span>
        <div>
          <strong>БудПомiч</strong>
          <small>кабінет майстра</small>
        </div>
      </div>
      <nav>
        {sidebarItems.map(({ label, href, icon: Icon }) => (
          <Link className={href === `#${activeSection}` ? "active" : ""} href={href} key={label}>
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="dash-sidebar-score">
        <span>
          <Star size={16} fill="currentColor" />
          5.0
        </span>
        <strong>12 відгуків</strong>
        <p>Профіль виглядає активним. Додайте ще 1-2 роботи, щоб підсилити довіру.</p>
      </div>
    </aside>
  );
}

function DashboardHeader({ master }: { master: MasterProfile }) {
  return (
    <header className="dash-header" id="overview">
      <div>
        <p className="dash-eyebrow">Кабінет майстра</p>
        <h1>Вітаємо, Андрію 👋</h1>
        <p>Керуйте заявками, профілем, календарем та повідомленнями.</p>
      </div>
      <div className="dash-header-actions">
        <Link className="dash-button dash-button-light" href={`/profile/${master.id}`}>
          <Eye size={17} />
          Переглянути публічний профіль
        </Link>
        <Link className="dash-button dash-button-primary" href="/dashboard/profile">
          <Pencil size={17} />
          Редагувати профіль
        </Link>
      </div>
    </header>
  );
}

function StatsCards({
  requests,
  messages,
  profilePercent,
  freeDatesCount,
}: {
  requests: MasterRequest[];
  messages: RequestMessage[];
  profilePercent: number;
  freeDatesCount: number;
}) {
  const newRequests = requests.filter((request) => request.status === "new").length;
  const unreadMessages = messages.filter((message) => !message.isRead && message.senderRole === "client").length;

  const stats = [
    {
      label: "Нові заявки",
      value: newRequests,
      note: "потребують відповіді",
      icon: ClipboardList,
    },
    {
      label: "Повідомлення",
      value: unreadMessages,
      note: "непрочитані або нові",
      icon: MessageSquare,
    },
    {
      label: "Вільні дати",
      value: freeDatesCount,
      note: "днів у календарі",
      icon: CalendarDays,
    },
    {
      label: "Заповнення профілю",
      value: `${profilePercent}%`,
      note: "видимість для клієнтів",
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="dash-stats" aria-label="Статистика кабінету">
      {stats.map(({ label, value, note, icon: Icon }) => (
        <article className="dash-stat-card" key={label}>
          <span>
            <Icon size={20} />
          </span>
          <div>
            <strong>{value}</strong>
            <p>{label}</p>
            <small>{note}</small>
          </div>
        </article>
      ))}
    </section>
  );
}

function RequestsSection({
  requests,
  onStatusChange,
}: {
  requests: MasterRequest[];
  onStatusChange: (id: string, status: RequestStatus) => void;
}) {
  const visibleRequests = requests.slice(0, 4);

  return (
    <section className="dash-panel dash-requests" id="requests">
      <div className="dash-section-head">
        <div>
          <p className="dash-eyebrow">Заявки</p>
          <h2>Нові заявки</h2>
        </div>
        <Link href="#calendar">Календар <ChevronRight size={15} /></Link>
      </div>

      <div className="dash-request-list">
        {visibleRequests.length ? (
          visibleRequests.map((request) => (
            <article className="dash-request-card" key={request.id}>
              <div className="dash-request-top">
                <div>
                  <strong>{request.clientName || "Клієнт"}</strong>
                  <span>{request.selectedServiceTitle || request.workType || "Ремонтні роботи"}</span>
                </div>
                <em className={`dash-status dash-status-${statusClass[request.status]}`}>
                  {requestStatusLabels[request.status]}
                </em>
              </div>
              <div className="dash-request-meta">
                <span>{request.cityArea || "Місто уточнюється"}</span>
                <span>{getRequestPrimaryDate(request)}</span>
              </div>
              <p>{request.description || request.message || "Клієнт ще не додав детальний опис задачі."}</p>
              <div className="dash-request-actions">
                <button onClick={() => onStatusChange(request.id, "accepted")} type="button">
                  Прийняти
                </button>
                <a href="#messages">
                  <MessageSquare size={15} />
                  Написати
                </a>
                <button className="muted" onClick={() => onStatusChange(request.id, "declined")} type="button">
                  <X size={15} />
                  Відхилити
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="dash-empty">Нових заявок поки немає.</div>
        )}
      </div>
    </section>
  );
}

function UpcomingWork({ requests }: { requests: MasterRequest[] }) {
  const planned = requests.filter((request) => request.status === "accepted" || request.status === "in_progress");

  return (
    <section className="dash-panel">
      <div className="dash-section-head">
        <div>
          <p className="dash-eyebrow">План</p>
          <h2>Найближчі роботи</h2>
        </div>
        <Clock3 size={21} />
      </div>
      <div className="dash-work-list">
        {(planned.length ? planned : requests.slice(0, 2)).map((request) => (
          <article key={request.id}>
            <span>{getRequestPrimaryDate(request)}</span>
            <strong>{request.selectedServiceTitle || request.workType || "Робота клієнта"}</strong>
            <p>{request.cityArea || "Локація уточнюється"}</p>
          </article>
        ))}
        {!requests.length && (
          <div className="dash-empty">Найближчих робіт поки немає.</div>
        )}
      </div>
    </section>
  );
}

function MessagesSection({
  requests,
  messages,
}: {
  requests: MasterRequest[];
  messages: RequestMessage[];
}) {
  const latestMessages = [...messages]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  function getRequestName(requestId: string) {
    return requests.find((request) => request.id === requestId)?.clientName || "Клієнт";
  }

  return (
    <section className="dash-panel" id="messages">
      <div className="dash-section-head">
        <div>
          <p className="dash-eyebrow">Повідомлення</p>
          <h2>Останні повідомлення</h2>
        </div>
        <MessageSquare size={21} />
      </div>
      <div className="dash-message-list">
        {latestMessages.length ? (
          latestMessages.map((message) => (
            <article key={message.id}>
              <div>
                <strong>{message.senderRole === "master" ? "Ви" : getRequestName(message.requestId)}</strong>
                <span>{formatDate(message.createdAt)}</span>
              </div>
              <p>{message.body}</p>
              <a href="#requests">Відкрити чат</a>
            </article>
          ))
        ) : (
          <div className="dash-empty">Повідомлень поки немає.</div>
        )}
      </div>
    </section>
  );
}

function ProfileProgressCard({
  master,
  profilePercent,
}: {
  master: MasterProfile;
  profilePercent: number;
}) {
  const checklist = [
    { label: "Додати фото профілю", done: Boolean(master.avatarUrl) },
    { label: "Додати опис", done: Boolean(master.fullDescription || master.description) },
    { label: "Додати послуги та ціни", done: master.services.length > 0 },
    { label: "Додати портфоліо", done: master.works.length > 0 },
    { label: "Додати місто та райони роботи", done: Boolean(master.city && master.district) },
  ];

  return (
    <section className="dash-panel dash-progress-card">
      <div className="dash-section-head">
        <div>
          <p className="dash-eyebrow">Профіль</p>
          <h2>Ваш профіль заповнений на {profilePercent}%</h2>
        </div>
      </div>
      <div className="dash-progress-line" aria-label={`Заповнення профілю ${profilePercent}%`}>
        <span style={{ width: `${profilePercent}%` }} />
      </div>
      <ul>
        {checklist.map((item) => (
          <li className={item.done ? "done" : ""} key={item.label}>
            <CheckCircle2 size={16} />
            {item.label}
          </li>
        ))}
      </ul>
      <Link className="dash-button dash-button-primary" href="/dashboard/profile">
        Покращити профіль
      </Link>
    </section>
  );
}

function QuickActionsCard() {
  const actions = [
    { label: "Додати роботу в портфоліо", href: "/dashboard/portfolio/new", icon: ImagePlus },
    { label: "Додати послугу", href: "/dashboard/profile#profile-services", icon: Plus },
    { label: "Оновити календар", href: "#calendar", icon: CalendarDays },
    { label: "Переглянути профіль", href: "/profile/andrey-ponomarenko", icon: Eye },
  ];

  return (
    <section className="dash-panel dash-quick-card">
      <div className="dash-section-head">
        <div>
          <p className="dash-eyebrow">Дії</p>
          <h2>Швидкі дії</h2>
        </div>
      </div>
      <div>
        {actions.map(({ label, href, icon: Icon }) => (
          <Link href={href} key={label}>
            <span>
              <Icon size={17} />
              {label}
            </span>
            <ChevronRight size={16} />
          </Link>
        ))}
      </div>
    </section>
  );
}

type CalendarStatus = "free" | "busy" | "pending";

const calendarStatusLabels: Record<CalendarStatus, string> = {
  free: "вільний",
  busy: "зайнятий",
  pending: "очікує",
};

function DashboardCalendar({
  busyDates = [],
  onFreeDatesChange,
}: {
  busyDates?: string[];
  onFreeDatesChange: (count: number) => void;
}) {
  const [mode, setMode] = useState<CalendarStatus>("free");
  const calendarMonth = useMemo(() => getCalendarMonth(busyDates), [busyDates]);
  const [days, setDays] = useState<Record<number, CalendarStatus>>(() => getInitialCalendarDays(busyDates));

  useEffect(() => {
    setDays(getInitialCalendarDays(busyDates));
  }, [busyDates]);

  useEffect(() => {
    onFreeDatesChange(Object.values(days).filter((status) => status === "free").length);
  }, [days, onFreeDatesChange]);

  function markDay(day: number) {
    setDays((current) => ({ ...current, [day]: mode }));
  }

  return (
    <section className="dash-panel dash-calendar" id="calendar">
      <div className="dash-section-head">
        <div>
          <p className="dash-eyebrow">Календар</p>
          <h2>Календар доступності</h2>
          <span className="dash-calendar-month">{calendarMonth.title}</span>
        </div>
      </div>
      <div className="dash-calendar-actions">
        <button className={mode === "free" ? "active free" : ""} onClick={() => setMode("free")} type="button">
          Додати вільний день
        </button>
        <button className={mode === "busy" ? "active busy" : ""} onClick={() => setMode("busy")} type="button">
          Позначити зайнятим
        </button>
      </div>
      <div className="dash-calendar-legend">
        <span><i className="free" /> вільний день</span>
        <span><i className="busy" /> зайнятий день</span>
        <span><i className="pending" /> очікує підтвердження</span>
      </div>
      <div className="dash-calendar-weekdays">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="dash-calendar-grid">
        {Array.from({ length: calendarMonth.daysInMonth }, (_, index) => {
          const day = index + 1;
          const status = days[day] ?? "free";

          return (
            <button className={status} onClick={() => markDay(day)} type="button" key={day}>
              <strong>{day}</strong>
              <small>{calendarStatusLabels[status]}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PortfolioManager({ items }: { items: PortfolioItem[] }) {
  return (
    <section className="dash-panel dash-portfolio-manager" id="portfolio-manager">
      <div className="dash-section-head">
        <div>
          <p className="dash-eyebrow">Портфоліо</p>
          <h2>Роботи у профілі</h2>
        </div>
        <Link href="/dashboard/portfolio/new">
          <Plus size={16} />
          Додати роботу
        </Link>
      </div>
      <div className="dash-portfolio-grid">
        {items.length ? items.slice(0, 4).map((item) => {
          const volume = item.workLines.reduce((sum, line) => sum + line.volume, 0);
          const unit = item.workLines[0]?.unit || "м²";

          return (
            <article key={item.id}>
              <div className="dash-portfolio-image">
                {item.photoUrl ? <img src={item.photoUrl} alt={item.title} /> : <span>Фото роботи</span>}
              </div>
              <div>
                <span>{item.city || "Київ"}</span>
                <h3>{item.title || "Робота майстра"}</h3>
                <p>{item.description || "Опис роботи буде додано пізніше."}</p>
                <div className="dash-portfolio-meta">
                  <small>{formatUah(item.totalAmount || 0)}</small>
                  <small>{volume ? `${volume} ${unit}` : "обсяг уточнюється"}</small>
                  <small>1-7 днів</small>
                </div>
                <Link href={`/dashboard/portfolio/${item.id}/edit`}>
                  <Pencil size={15} />
                  Редагувати
                </Link>
              </div>
            </article>
          );
        }) : <div className="dash-empty">Портфоліо поки порожнє. Додайте першу роботу, щоб клієнти бачили приклади.</div>}
      </div>
    </section>
  );
}

function ServicesManager({ services }: { services: MasterProfile["services"] }) {
  const safeServices = services.length ? services : [{ name: "Ремонтні роботи", price: "за кошторисом" }];

  return (
    <section className="dash-panel dash-services-manager" id="services-manager">
      <div className="dash-section-head">
        <div>
          <p className="dash-eyebrow">Послуги</p>
          <h2>Послуги та ціни</h2>
        </div>
        <Link href="/dashboard/profile#profile-services">
          <Plus size={16} />
          Додати послугу
        </Link>
      </div>
      <div className="dash-services-grid">
        {safeServices.map((service) => (
          <article key={`${service.name}-${service.price}`}>
            <div>
              <h3>{service.name}</h3>
              <p>Акуратне виконання, попередня оцінка обсягу та зрозумілий кошторис перед стартом.</p>
            </div>
            <div>
              <strong>{service.price || "за домовленістю"}</strong>
              <span>{getServiceUnit(service.price || "")}</span>
            </div>
            <Link href="/dashboard/profile#profile-services">
              <Pencil size={15} />
              Редагувати
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function DashboardMasterApp({ master, portfolioItems }: DashboardMasterAppProps) {
  const [requests, setRequests] = useState<MasterRequest[]>(mockRequests.filter(requestMatchesMaster));
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [savedPortfolioItems, setSavedPortfolioItems] = useState<PortfolioItem[]>(portfolioItems);
  const [activeSection, setActiveSection] = useState("overview");
  const [freeDatesCount, setFreeDatesCount] = useState(() =>
    Object.values(getInitialCalendarDays(master.busyDates)).filter((status) => status === "free").length,
  );
  const requestIds = useMemo(() => new Set(requests.map((request) => request.id)), [requests]);
  const masterMessages = useMemo(
    () => messages.filter((message) => requestIds.has(message.requestId)),
    [messages, requestIds],
  );
  const profilePercent = getProfileCompletion(master, savedPortfolioItems.length);

  useEffect(() => {
    const localRequests = JSON.parse(localStorage.getItem(requestsStorageKey) ?? "[]") as MasterRequest[];
    const localMessages = JSON.parse(localStorage.getItem(requestMessagesStorageKey) ?? "[]") as RequestMessage[];
    const localPortfolio = JSON.parse(localStorage.getItem(portfolioStorageKey) ?? "[]") as PortfolioItem[];

    setSavedPortfolioItems(
      mergeById([...localPortfolio.filter((item) => item.masterId === currentMasterId), ...portfolioItems]),
    );

    fetch(`/api/requests?masterId=${currentMasterId}`)
      .then((response) => response.json())
      .then((result: { requests?: MasterRequest[] }) => {
        setRequests(
          mergeById([...(result.requests ?? []), ...localRequests, ...mockRequests])
            .filter(requestMatchesMaster)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        );
      })
      .catch(() => setRequests(mergeById([...localRequests, ...mockRequests]).filter(requestMatchesMaster)));

    fetch("/api/messages")
      .then((response) => response.json())
      .then((result: { messages?: RequestMessage[] }) => {
        setMessages(mergeById([...(result.messages ?? []), ...localMessages, ...mockRequestMessages]));
      })
      .catch(() => setMessages(mergeById([...localMessages, ...mockRequestMessages])));

    fetch(`/api/portfolio?masterId=${currentMasterId}`)
      .then((response) => response.json())
      .then((result: { items?: PortfolioItem[] }) => {
        if (!result.items?.length) return;
        setSavedPortfolioItems((current) => mergeById([...result.items!, ...current]));
      })
      .catch(() => undefined);
  }, [portfolioItems]);

  useEffect(() => {
    const handleHashChange = () => setActiveSection(getSectionIdFromHash(window.location.hash));
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function updateRequestStatus(id: string, status: RequestStatus) {
    setRequests((current) => {
      const next = current.map((request) => (request.id === id ? { ...request, status, isRead: true } : request));
      const stored = JSON.parse(localStorage.getItem(requestsStorageKey) ?? "[]") as MasterRequest[];
      const storedOtherMasters = stored.filter((request) => request.masterId !== currentMasterId);
      localStorage.setItem(requestsStorageKey, JSON.stringify([...storedOtherMasters, ...next]));
      return next;
    });

    fetch("/api/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => undefined);
  }

  return (
    <section className="dashboard-page dash-app">
      <DashboardSidebar activeSection={activeSection} />
      <main className="dash-main">
        <DashboardHeader master={master} />
        <StatsCards
          freeDatesCount={freeDatesCount}
          requests={requests}
          messages={masterMessages}
          profilePercent={profilePercent}
        />

        <div className="dash-overview-grid">
          <div className="dash-primary-column">
            <RequestsSection requests={requests} onStatusChange={updateRequestStatus} />
            <UpcomingWork requests={requests} />
            <MessagesSection requests={requests} messages={masterMessages} />
            <PortfolioManager items={savedPortfolioItems} />
            <ServicesManager services={master.services} />
          </div>
          <aside className="dash-side-column">
            <ProfileProgressCard master={master} profilePercent={profilePercent} />
            <QuickActionsCard />
            <DashboardCalendar busyDates={master.busyDates} onFreeDatesChange={setFreeDatesCount} />
          </aside>
        </div>
      </main>
    </section>
  );
}
