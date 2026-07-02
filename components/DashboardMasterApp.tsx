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
  companyDocumentsStorageKey,
  defaultCompanyDocuments,
  defaultMasterQualifications,
  followFeedStorageKey,
  getPortfolioPeriod,
  getProjectPublicLocation,
  getProjectSlug,
  masterQualificationsStorageKey,
  portfolioStorageKey,
  type CompanyDocument,
  type FollowFeedItem,
  type MasterQualification,
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

function getRequestDateIso(request: MasterRequest) {
  return request.periods[0]?.dateFrom || request.desiredDate.slice(0, 10) || request.createdAt.slice(0, 10);
}

function MessagesSection({
  requests,
  messages,
  onStatusChange,
}: {
  requests: MasterRequest[];
  messages: RequestMessage[];
  onStatusChange: (id: string, status: RequestStatus) => void;
}) {
  const [activeRequestId, setActiveRequestId] = useState(requests[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | RequestStatus | "waiting">("all");
  const [mobileTab, setMobileTab] = useState<"calendar" | "clients" | "chat">("clients");
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState<RequestMessage[]>(messages);
  const activeRequest = requests.find((request) => request.id === activeRequestId) ?? requests[0];
  const activeMessages = localMessages
    .filter((message) => message.requestId === activeRequest?.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRequests = requests.filter((request) => {
    const matchesQuery = [request.clientName, request.workType, request.selectedServiceTitle, request.cityArea]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
    const hasUnread = localMessages.some((message) => message.requestId === request.id && !message.isRead && message.senderRole === "client");
    const matchesFilter =
      filter === "all" ||
      request.status === filter ||
      (filter === "waiting" && hasUnread);

    return matchesQuery && matchesFilter;
  });
  const calendarMonth = getCalendarMonth(activeRequest?.periods.map((period) => period.dateFrom) ?? []);
  const requestsByDay = new Map<number, MasterRequest[]>();

  requests.forEach((request) => {
    const date = new Date(`${getRequestDateIso(request)}T00:00:00`);
    if (date.getFullYear() !== calendarMonth.year || date.getMonth() !== calendarMonth.month) return;
    const dayRequests = requestsByDay.get(date.getDate()) ?? [];
    dayRequests.push(request);
    requestsByDay.set(date.getDate(), dayRequests);
  });

  useEffect(() => setLocalMessages(messages), [messages]);

  useEffect(() => {
    if (!activeRequestId && requests[0]) setActiveRequestId(requests[0].id);
  }, [activeRequestId, requests]);

  function selectRequest(request: MasterRequest) {
    setActiveRequestId(request.id);
    setMobileTab("chat");
  }

  function sendMessage(text = draft) {
    if (!activeRequest || !text.trim()) return;
    const nextMessage: RequestMessage = {
      id: `local-message-${Date.now()}`,
      requestId: activeRequest.id,
      senderRole: "master",
      body: text.trim(),
      isRead: true,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...localMessages, nextMessage];
    setLocalMessages(nextMessages);
    localStorage.setItem(requestMessagesStorageKey, JSON.stringify(nextMessages));
    setDraft("");
  }

  return (
    <section className="dash-panel dash-message-center" id="messages">
      <div className="dash-section-head">
        <div>
          <p className="dash-eyebrow">Повідомлення</p>
          <h2>Клієнти, календар і чат</h2>
        </div>
        <MessageSquare size={21} />
      </div>

      <div className="dash-message-tabs">
        <button className={mobileTab === "calendar" ? "active" : ""} onClick={() => setMobileTab("calendar")} type="button">Календар</button>
        <button className={mobileTab === "clients" ? "active" : ""} onClick={() => setMobileTab("clients")} type="button">Клієнти</button>
        <button className={mobileTab === "chat" ? "active" : ""} onClick={() => setMobileTab("chat")} type="button">Чат</button>
      </div>

      <div className="dash-message-crm">
        <aside className={`dash-client-column ${mobileTab === "clients" ? "active" : ""}`}>
          <h3>Клієнти та заявки</h3>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Пошук клієнта або роботи" />
          <div className="dash-message-filters">
            {[
              ["all", "Усі"],
              ["new", "Нові"],
              ["in_progress", "В роботі"],
              ["waiting", "Очікують відповіді"],
              ["completed", "Завершені"],
            ].map(([value, label]) => (
              <button className={filter === value ? "active" : ""} onClick={() => setFilter(value as typeof filter)} type="button" key={value}>{label}</button>
            ))}
          </div>
          <div className="dash-client-list">
            {filteredRequests.length ? filteredRequests.map((request) => {
              const lastMessage = [...localMessages].reverse().find((message) => message.requestId === request.id);
              const unread = localMessages.filter((message) => message.requestId === request.id && !message.isRead && message.senderRole === "client").length;

              return (
                <button className={activeRequest?.id === request.id ? "active" : ""} onClick={() => selectRequest(request)} type="button" key={request.id}>
                  <span>{request.clientName?.slice(0, 1) || "К"}</span>
                  <div>
                    <strong>{request.clientName || "Клієнт"}</strong>
                    <small>{request.selectedServiceTitle || request.workType || "Робота"} · {getRequestPrimaryDate(request)}</small>
                    <p>{lastMessage?.body || request.description || "Немає повідомлень"}</p>
                  </div>
                  {unread ? <em>{unread}</em> : <i>{requestStatusLabels[request.status]}</i>}
                </button>
              );
            }) : <div className="dash-empty">Поки немає заявок від клієнтів.</div>}
          </div>
        </aside>

        <div className={`dash-work-calendar ${mobileTab === "calendar" ? "active" : ""}`}>
          <h3>Календар робіт</h3>
          <span>{calendarMonth.title}</span>
          <div className="dash-work-calendar-grid">
            {Array.from({ length: calendarMonth.daysInMonth }, (_, index) => {
              const day = index + 1;
              const dayRequests = requestsByDay.get(day) ?? [];
              const dayStatus = dayRequests.some((request) => request.status === "new")
                ? "request"
                : dayRequests.some((request) => request.status === "accepted" || request.status === "in_progress")
                  ? "busy"
                  : dayRequests.some((request) => request.status === "completed")
                    ? "pending"
                    : "free";

              return (
                <button
                  className={dayStatus}
                  onClick={() => dayRequests[0] ? selectRequest(dayRequests[0]) : undefined}
                  type="button"
                  key={day}
                >
                  <strong>{day}</strong>
                  {dayRequests.length ? <small>{dayRequests.length} заяв.</small> : <small>вільно</small>}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`dash-chat-column ${mobileTab === "chat" ? "active" : ""}`}>
          {activeRequest ? (
            <>
              <header>
                <div>
                  <button onClick={() => setMobileTab("clients")} type="button">←</button>
                  <strong>{activeRequest.clientName || "Клієнт"}</strong>
                  <span>{requestStatusLabels[activeRequest.status]} · {activeRequest.selectedServiceTitle || activeRequest.workType}</span>
                </div>
                <nav>
                  <a href="#request-details">Деталі заявки</a>
                  <a href="#request-documents">Документи</a>
                  <button onClick={() => setMobileTab("calendar")} type="button">Календар</button>
                </nav>
              </header>
              <article className="dash-request-side-card" id="request-details">
                <strong>Заявка клієнта</strong>
                <p>{activeRequest.description || activeRequest.message || "Клієнт ще не додав опис задачі."}</p>
                <div>
                  <span>{activeRequest.cityArea || "Локація уточнюється"}</span>
                  <span>{getRequestPrimaryDate(activeRequest)}</span>
                  <span>{activeRequest.budget || "Бюджет уточнюється"}</span>
                </div>
                <div className="dash-request-side-actions">
                  <button onClick={() => onStatusChange(activeRequest.id, "accepted")} type="button">Прийняти заявку</button>
                  <button onClick={() => onStatusChange(activeRequest.id, "in_progress")} type="button">В роботі</button>
                  <button onClick={() => onStatusChange(activeRequest.id, "completed")} type="button">Завершити</button>
                  <button onClick={() => onStatusChange(activeRequest.id, "declined")} type="button">Відхилити</button>
                  <Link href={`/dashboard/portfolio/new?requestId=${activeRequest.id}`}>Створити проєкт</Link>
                </div>
              </article>
              <div className="dash-chat-messages">
                <div className="system">Заявку створено. Чат повʼязаний з календарем і заявкою.</div>
                {activeMessages.map((message) => (
                  <div className={message.senderRole === "master" ? "master" : "client"} key={message.id}>
                    <p>{message.body}</p>
                    <time>{formatDate(message.createdAt)}</time>
                  </div>
                ))}
              </div>
              <div className="dash-chat-templates">
                {[
                  "Доброго дня, уточніть, будь ласка, деталі обʼєкта.",
                  "Можу приїхати на огляд у зручний для вас час.",
                  "Надішліть, будь ласка, фото приміщення.",
                  "Кошторис підготую після уточнення обсягу робіт.",
                ].map((template) => (
                  <button onClick={() => sendMessage(template)} type="button" key={template}>{template}</button>
                ))}
              </div>
              <form className="dash-chat-input" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
                <button type="button">+</button>
                <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Напишіть клієнту про деталі роботи..." />
                <button type="submit"><Send size={16} /></button>
              </form>
            </>
          ) : (
            <div className="dash-empty">Оберіть клієнта або день у календарі, щоб відкрити переписку.</div>
          )}
        </div>
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

function QualificationsManager({
  items,
  onAdd,
}: {
  items: MasterQualification[];
  onAdd: () => void;
}) {
  return (
    <section className="dash-panel dash-document-manager" id="qualifications-manager">
      <div className="dash-section-head">
        <div>
          <p className="dash-eyebrow">Кваліфікація</p>
          <h2>Підвищення кваліфікації</h2>
        </div>
        <button onClick={onAdd} type="button">
          <Plus size={16} />
          Додати сертифікат
        </button>
      </div>
      <div className="dash-doc-grid">
        {items.map((item) => (
          <article key={item.id}>
            <span>{item.type}</span>
            <strong>{item.title}</strong>
            <p>{item.issuer || item.description || "Професійний документ майстра."}</p>
            <small>{item.issuedAt ? new Date(item.issuedAt).toLocaleDateString("uk-UA") : item.category || "Будівельні роботи"}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function CompanyDocumentsManager({
  items,
  onAdd,
  onToggle,
}: {
  items: CompanyDocument[];
  onAdd: () => void;
  onToggle: (id: string) => void;
}) {
  return (
    <section className="dash-panel dash-document-manager" id="company-documents-manager">
      <div className="dash-section-head">
        <div>
          <p className="dash-eyebrow">Документи</p>
          <h2>Документи компанії</h2>
        </div>
        <button onClick={onAdd} type="button">
          <Plus size={16} />
          Додати документ
        </button>
      </div>
      <div className="dash-doc-grid">
        {items.map((document) => (
          <article key={document.id}>
            <span>{document.type}</span>
            <strong>{document.title}</strong>
            <p>{document.description || "Документ профілю майстра або компанії."}</p>
            <label>
              <input
                checked={document.isPublic === true}
                onChange={() => onToggle(document.id)}
                type="checkbox"
              />
              Публічний документ
            </label>
          </article>
        ))}
      </div>
    </section>
  );
}

function buildFollowFeed(master: MasterProfile, items: PortfolioItem[]): FollowFeedItem[] {
  return items.slice(0, 6).map((item) => ({
    id: `follow-${item.id}`,
    followerId: "local-client",
    masterId: master.id,
    masterName: master.name,
    masterAvatarUrl: master.avatarUrl,
    type: "new_work",
    title: `Нова робота: ${item.title}`,
    description: `${getProjectPublicLocation(item)} · ${getPortfolioPeriod(item).year}`,
    imageUrl: item.photoUrl,
    createdAt: item.completedAt || item.createdAt,
    targetUrl: `/profile/${master.id}#work-detail-${getProjectSlug(item)}`,
  }));
}

function FollowFeedCard({ items }: { items: FollowFeedItem[] }) {
  return (
    <section className="dash-panel dash-follow-feed">
      <div className="dash-section-head">
        <div>
          <p className="dash-eyebrow">Підписки</p>
          <h2>Новини від майстрів, на яких ви підписані</h2>
        </div>
      </div>
      <div className="dash-feed-list">
        {items.length ? items.map((item) => (
          <a href={item.targetUrl || "/feed"} key={item.id}>
            {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span />}
            <div>
              <strong>{item.title}</strong>
              <small>{item.masterName}</small>
              {item.description && <p>{item.description}</p>}
            </div>
          </a>
        )) : <div className="dash-empty">Новин підписок поки немає.</div>}
      </div>
    </section>
  );
}

export function DashboardMasterApp({ master, portfolioItems }: DashboardMasterAppProps) {
  const [requests, setRequests] = useState<MasterRequest[]>(mockRequests.filter(requestMatchesMaster));
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [savedPortfolioItems, setSavedPortfolioItems] = useState<PortfolioItem[]>(portfolioItems);
  const [qualifications, setQualifications] = useState<MasterQualification[]>(defaultMasterQualifications);
  const [companyDocuments, setCompanyDocuments] = useState<CompanyDocument[]>(defaultCompanyDocuments);
  const [followFeed, setFollowFeed] = useState<FollowFeedItem[]>([]);
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
    const localQualifications = JSON.parse(localStorage.getItem(masterQualificationsStorageKey) ?? "[]") as MasterQualification[];
    const localCompanyDocuments = JSON.parse(localStorage.getItem(companyDocumentsStorageKey) ?? "[]") as CompanyDocument[];
    const localFollowFeed = JSON.parse(localStorage.getItem(followFeedStorageKey) ?? "[]") as FollowFeedItem[];

    setQualifications(mergeById([...localQualifications, ...defaultMasterQualifications]));
    setCompanyDocuments(mergeById([...localCompanyDocuments, ...defaultCompanyDocuments]));
    setFollowFeed(mergeById([...localFollowFeed, ...buildFollowFeed(master, portfolioItems)]));

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
        setSavedPortfolioItems((current) => {
          const next = mergeById([...result.items!, ...current]);
          setFollowFeed((feed) => mergeById([...feed, ...buildFollowFeed(master, next)]));
          return next;
        });
      })
      .catch(() => undefined);
  }, [master, portfolioItems]);

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

  function addQualification() {
    setQualifications((current) => {
      const next = [
        {
          id: crypto.randomUUID(),
          type: "certificate" as const,
          title: "Новий сертифікат майстра",
          issuer: "Навчальний центр",
          issuedAt: new Date().toISOString().slice(0, 10),
          description: "Опишіть документ у наступній версії редактора.",
          category: "Будівельні роботи",
        },
        ...current,
      ];
      localStorage.setItem(masterQualificationsStorageKey, JSON.stringify(next));
      return next;
    });
  }

  function addCompanyDocument() {
    setCompanyDocuments((current) => {
      const next = [
        {
          id: crypto.randomUUID(),
          title: "Новий документ компанії",
          type: "other" as const,
          description: "Документ профілю, який можна зробити публічним.",
          fileUrl: "#",
          fileType: "pdf" as const,
          uploadedAt: new Date().toISOString(),
          isPublic: false,
        },
        ...current,
      ];
      localStorage.setItem(companyDocumentsStorageKey, JSON.stringify(next));
      return next;
    });
  }

  function toggleCompanyDocument(id: string) {
    setCompanyDocuments((current) => {
      const next = current.map((document) =>
        document.id === id ? { ...document, isPublic: document.isPublic !== true } : document,
      );
      localStorage.setItem(companyDocumentsStorageKey, JSON.stringify(next));
      return next;
    });
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
            <MessagesSection requests={requests} messages={masterMessages} onStatusChange={updateRequestStatus} />
            <PortfolioManager items={savedPortfolioItems} />
            <ServicesManager services={master.services} />
            <QualificationsManager items={qualifications} onAdd={addQualification} />
            <CompanyDocumentsManager
              items={companyDocuments}
              onAdd={addCompanyDocument}
              onToggle={toggleCompanyDocument}
            />
          </div>
          <aside className="dash-side-column">
            <ProfileProgressCard master={master} profilePercent={profilePercent} />
            <QuickActionsCard />
            <DashboardCalendar busyDates={master.busyDates} onFreeDatesChange={setFreeDatesCount} />
            <FollowFeedCard items={followFeed} />
          </aside>
        </div>
      </main>
    </section>
  );
}
