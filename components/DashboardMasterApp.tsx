"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Eye,
  FileCheck2,
  FileText,
  FolderKanban,
  History,
  ImagePlus,
  ListChecks,
  MessageSquare,
  Plus,
  ReceiptText,
  Settings,
  Star,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { ClientCabinetApp } from "@/components/ClientCabinetApp";
import { ContractorCabinetApp } from "@/components/ContractorCabinetApp";
import { DemoMasterCabinetApp } from "@/components/DemoMasterCabinetApp";
import { LogoutButton } from "@/components/LogoutButton";
import type { DemoMasterState } from "@/lib/demo/types";
import type { MasterProfile } from "@/lib/masters";
import type { PortfolioItem } from "@/lib/portfolio";
import { MasterReviewInbox } from "@/components/MasterReviewInbox";
import {
  bookingStorageKey,
  formatBookingDate,
  getAvailabilityStorageKey,
  getPeriodDateKeys,
  getPeriodDayCount,
  normalizeBookingRequest,
  type AvailabilitySlots,
  type BookingDatePeriod,
  type BookingRequest,
} from "@/lib/availability";
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

type RealDashboardMasterAppProps = {
  defaultRole?: DashboardRole;
  master: MasterProfile;
  masters: MasterProfile[];
  portfolioItems: PortfolioItem[];
};

type DashboardMasterAppProps =
  | (RealDashboardMasterAppProps & { mode?: "real" })
  | { mode: "demo"; initialData: DemoMasterState; stateWarning?: string };

type CalendarStatus = "free" | "busy" | "pending";
type DashboardPanelKey = "requests" | "objects" | "calendar" | "messages" | "clients" | "portfolio" | "reviews" | "finance";
type DashboardRole = "master" | "client" | "contractor";
type MasterWorkspaceContext = "personal" | "team";

const currentMasterId = "andrey-ponomarenko";

const navItems = [
  { label: "Повідомлення", panel: "messages" as const, icon: MessageSquare, active: true },
  { label: "Заявки", panel: "requests" as const, icon: ClipboardList },
  { label: "Клієнти та проєкти", panel: "objects" as const, icon: FolderKanban },
  { label: "Календар", panel: "calendar" as const, icon: CalendarDays },
  { label: "Кошториси та оплати", panel: "finance" as const, icon: WalletCards },
  { label: "Портфоліо", panel: "portfolio" as const, icon: ImagePlus },
  { label: "Відгуки", panel: "reviews" as const, icon: Star },
  { label: "Публічний профіль", href: "/dashboard/profile", icon: UserRound },
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

function requestMatchesMaster(request: MasterRequest) {
  return request.masterId === currentMasterId;
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

function getCalendarStatus(master: MasterProfile, day: number): CalendarStatus {
  const date = `2026-07-${String(day).padStart(2, "0")}`;
  if (master.busyDates?.includes(date)) return "busy";
  if (master.pendingDates?.includes(date)) return "pending";
  return "free";
}

function getDateText(request?: MasterRequest) {
  return request?.periods[0]?.period || request?.desiredDate || "Дата уточнюється";
}

function getRequestCost(request: MasterRequest) {
  return request.budget || request.additionalWorks[0]?.totalPrice || "Кошторис після огляду";
}

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString("uk-UA")} грн`;
}

function getConversationStatus(request: MasterRequest, unread: number) {
  if (request.status === "completed") return "Завершено";
  if (request.status === "in_progress") return "Проєкт в роботі";
  if (request.status === "accepted") return "Дату запропоновано";
  if (request.status === "declined") return "Відхилена";
  if (unread > 0) return "Потрібна відповідь";
  return request.budget ? "Очікує кошторис" : "Нова заявка";
}

function getRequestService(master: MasterProfile, request?: MasterRequest) {
  if (!request) return master.services[0]?.name || "Ремонтні роботи";
  return request.selectedServiceTitle || request.workType || master.services[0]?.name || "Ремонтні роботи";
}

function getRequestAddress(request?: MasterRequest) {
  return request?.cityArea || "Адреса уточнюється у чаті";
}

function getRequestBudget(request?: MasterRequest) {
  return request?.budget || request?.additionalWorks[0]?.totalPrice || "Після огляду";
}

function MasterContextSwitch({
  value,
  onChange,
}: {
  value: MasterWorkspaceContext;
  onChange: (value: MasterWorkspaceContext) => void;
}) {
  return (
    <div className="dash-context-switch" aria-label="Режим роботи кабінету">
      <button className={value === "personal" ? "active" : ""} onClick={() => onChange("personal")} type="button">
        Особисті замовлення
      </button>
      <button className={value === "team" ? "active" : ""} onClick={() => onChange("team")} type="button">
        Команда «Укріплення»
      </button>
    </div>
  );
}

function DashboardRoleSwitch({
  value,
}: {
  value: DashboardRole;
}) {
  return (
    <div className="dash-role-switch" aria-label="Перемикання кабінету">
      <span>Роль</span>
      <Link className={value === "master" ? "active" : ""} href="/dashboard">
        Кабінет майстра
      </Link>
      <Link className={value === "client" ? "active" : ""} href="/dashboard?role=client">
        Кабінет клієнта
      </Link>
      <Link className={value === "contractor" ? "active" : ""} href="/dashboard?role=contractor">
        Кабінет підрядника
      </Link>
    </div>
  );
}

function DashboardSidebar({
  master,
  onOpenPanel,
  activePanel,
}: {
  master: MasterProfile;
  onOpenPanel: (panel: DashboardPanelKey) => void;
  activePanel: DashboardPanelKey | null;
}) {
  return (
    <aside className="dash-sidebar" aria-label="Навігація кабінету майстра">
      <Link className="dash-sidebar-brand" href="/dashboard">
        <Image
          src="/logo/budpomich-logo-v4.svg"
          alt="БудПомiч"
          width={790}
          height={420}
          priority
        />
        <span>Кабінет майстра</span>
      </Link>

      <nav className="dash-sidebar-nav">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const number = String(index + 1).padStart(2, "0");
          if ("panel" in item && item.panel) {
            return (
              <button
                className={(activePanel === item.panel || (!activePanel && item.active)) ? "active" : ""}
                onClick={() => onOpenPanel(item.panel)}
                type="button"
                key={item.label}
              >
                <span className="dash-nav-num">{number}</span>
                <Icon size={18} />
                {item.label}
              </button>
            );
          }

          if ("href" in item && item.href) {
            return (
              <Link href={item.href} key={item.label}>
                <span className="dash-nav-num">{number}</span>
                <Icon size={18} />
                {item.label}
              </Link>
            );
          }

          return (
            <button className="active" type="button" key={item.label}>
              <span className="dash-nav-num">{number}</span>
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="dash-sidebar-bottom">
        <Link className="dash-side-link" href={`/profile/${master.id}`}>
          <Eye size={16} />
          Публічний профіль
        </Link>
        <LogoutButton className="dash-side-link danger" />
        <div className="dash-mini-master">
          {master.avatarUrl ? (
            <Image src={master.avatarUrl} alt={master.name} width={42} height={42} />
          ) : (
            <span>{master.initials}</span>
          )}
          <div>
            <strong>{master.name}</strong>
            <small>{master.city}</small>
          </div>
        </div>
      </div>
    </aside>
  );
}

function DashboardTopbar({ master, unreadCount }: { master: MasterProfile; unreadCount: number }) {
  return (
    <header className="dash-topbar">
      <div>
        <p className="dash-platform-tag">Кабінет майстра</p>
        <h1>Добрий день, Андрію!</h1>
        <p>Керуйте заявками, обʼєктами, календарем, чатами та фінансами в одному місці.</p>
      </div>
      <div className="dash-topbar-actions">
        <button className="dash-icon-button" type="button" aria-label="Сповіщення">
          <Bell size={19} />
          {unreadCount > 0 && <span>{unreadCount}</span>}
        </button>
        <Link className="dash-account-chip" href="/dashboard/profile">
          {master.avatarUrl ? (
            <Image src={master.avatarUrl} alt="" width={34} height={34} />
          ) : (
            <span>{master.initials}</span>
          )}
          <strong>{master.name}</strong>
        </Link>
      </div>
    </header>
  );
}

function ProfileNotice({ percent }: { percent: number }) {
  if (percent >= 100) return null;

  return (
    <section className="dash-notice-card">
      <div className="dash-notice-ring" style={{ "--progress": `${percent}%` } as CSSProperties}>
        <strong>{percent}%</strong>
      </div>
      <div>
        <h2>Ваш профіль заповнений на {percent}%</h2>
        <p>Додайте ціни та ще кілька фотографій робіт, щоб клієнтам було легше обрати вас.</p>
      </div>
      <Link href="/dashboard/profile">Завершити профіль</Link>
    </section>
  );
}

function StatsCards({
  requests,
  messages,
  freeDatesCount,
  profilePercent,
  onOpenPanel,
}: {
  requests: MasterRequest[];
  messages: RequestMessage[];
  freeDatesCount: number;
  profilePercent: number;
  onOpenPanel: (panel: DashboardPanelKey) => void;
}) {
  const stats = [
    {
      label: "Нові заявки",
      value: requests.filter((request) => request.status === "new").length,
      note: "+2 за останні 7 днів",
      icon: ClipboardList,
      panel: "requests" as const,
    },
    {
      label: "У роботі",
      value: requests.filter((request) => request.status === "accepted" || request.status === "in_progress").length,
      note: "активні проєкти",
      icon: BriefcaseBusiness,
      panel: "objects" as const,
    },
    {
      label: "Цього тижня",
      value: Math.min(5, freeDatesCount),
      note: "вільних слотів",
      icon: CalendarDays,
      panel: "calendar" as const,
    },
    {
      label: "Повідомлення",
      value: messages.filter((message) => !message.isRead && message.senderRole === "client").length,
      note: "очікують відповіді",
      icon: MessageSquare,
      panel: "messages" as const,
    },
    {
      label: "Профіль",
      value: `${profilePercent}%`,
      note: "готовність",
      icon: CheckCircle2,
      href: "/dashboard/profile",
    },
  ];

  return (
    <section className="dash-stats" aria-label="Коротка статистика">
      {stats.map((item) => {
        const Icon = item.icon;
        const content = (
          <>
            <span>
              <Icon size={19} />
            </span>
            <div>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
              <p>{item.note}</p>
            </div>
          </>
        );

        if ("panel" in item && item.panel) {
          return (
            <button className="dash-stat-card" onClick={() => onOpenPanel(item.panel)} type="button" key={item.label}>
              {content}
            </button>
          );
        }

        return (
          <Link className="dash-stat-card" href={item.href} key={item.label}>
            {content}
          </Link>
        );
      })}
    </section>
  );
}

function ProjectCommandCenter({
  requests,
  portfolioItems,
  freeDatesCount,
}: {
  requests: MasterRequest[];
  portfolioItems: PortfolioItem[];
  freeDatesCount: number;
}) {
  const activeProjects = requests.filter((request) => request.status === "accepted" || request.status === "in_progress");
  const newRequests = requests.filter((request) => request.status === "new").length;
  const portfolioRevenue = portfolioItems.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const latestProject = activeProjects[0] || requests[0];

  const flow = [
    { label: "Заявки", value: newRequests, note: "нові", icon: ClipboardList },
    { label: "Обʼєкти", value: activeProjects.length, note: "в роботі", icon: FolderKanban },
    { label: "Календар", value: freeDatesCount, note: "вільних дат", icon: CalendarDays },
    { label: "Чати", value: requests.length, note: "діалогів", icon: MessageSquare },
    { label: "Фото", value: portfolioItems.length, note: "робіт", icon: Camera },
    { label: "Документи", value: "MVP", note: "чеки та акти", icon: FileCheck2 },
  ];

  return (
    <section className="dash-crm-hero" id="objects" aria-label="Центр керування ремонтом">
      <div className="dash-crm-copy">
        <span className="dash-platform-tag">Маркетплейс + календар + чат + CRM</span>
        <h2>Не тільки пошук майстра, а керування ремонтом</h2>
        <p>
          Кожна заявка переходить в обʼєкт ремонту: тут видно клієнта, етапи, календар, чат, фото,
          документи, кошторис і домовленості.
        </p>
      </div>

      <div className="dash-crm-active">
        <small>Активний обʼєкт</small>
        <strong>{latestProject?.selectedServiceTitle || latestProject?.workType || "Новий ремонтний обʼєкт"}</strong>
        <span>{latestProject?.clientName || "Клієнт уточнюється"} · {latestProject?.cityArea || "Київ"}</span>
        <div className="dash-crm-progress">
          <i style={{ width: activeProjects.length ? "65%" : "20%" }} />
        </div>
        <em>{activeProjects.length ? "Етап у роботі: узгодження строків і матеріалів" : "Очікує першого підтвердження"}</em>
      </div>

      <div className="dash-crm-flow">
        {flow.map(({ label, value, note, icon: Icon }) => (
          <article key={label}>
            <Icon size={18} />
            <strong>{value}</strong>
            <span>{label}</span>
            <small>{note}</small>
          </article>
        ))}
      </div>

      <div className="dash-crm-footer">
        <span>Портфоліо після завершення робіт: {formatMoney(portfolioRevenue || 0)}</span>
        <Link href="#requests">Перейти до заявок</Link>
      </div>
    </section>
  );
}

function MasterMessagesWorkspace({
  master,
  requests,
  messages,
  selectedRequestId,
  onSelectRequest,
  onOpenPanel,
}: {
  master: MasterProfile;
  requests: MasterRequest[];
  messages: RequestMessage[];
  selectedRequestId: string | null;
  onSelectRequest: (id: string) => void;
  onOpenPanel: (panel: DashboardPanelKey) => void;
}) {
  const requestById = new Map(requests.map((request) => [request.id, request]));
  const conversations = requests.map((request) => {
    const requestMessages = messages
      .filter((message) => message.requestId === request.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const lastMessage = requestMessages.at(-1);
    const unread = requestMessages.filter((message) => !message.isRead && message.senderRole === "client").length;

    return {
      request,
      lastMessage,
      unread,
      status: getConversationStatus(request, unread),
    };
  });

  const selectedRequest = selectedRequestId
    ? requestById.get(selectedRequestId) || conversations[0]?.request
    : conversations[0]?.request;
  const selectedMessages = selectedRequest
    ? messages
        .filter((message) => message.requestId === selectedRequest.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];
  const selectedStatus = selectedRequest
    ? getConversationStatus(
        selectedRequest,
        selectedMessages.filter((message) => !message.isRead && message.senderRole === "client").length,
      )
    : "Нова заявка";

  return (
    <section className="dash-inbox-shell" id="messages" aria-label="Повідомлення майстра">
      <aside className="dash-dialogs-column">
        <div className="dash-section-label">01 · Повідомлення</div>
        <div className="dash-dialogs-head">
          <div>
            <h2>Діалоги з клієнтами</h2>
            <p>Заявки, проєкти і погодження в одному місці.</p>
          </div>
          <button type="button" aria-label="Додати клієнта">
            <Plus size={18} />
          </button>
        </div>
        <label className="dash-dialog-search">
          <span>Пошук</span>
          <input placeholder="Клієнт, адреса або послуга" />
        </label>
        <div className="dash-dialog-tabs" aria-label="Фільтр діалогів">
          {["Усі", "Непрочитані", "Заявки", "Проєкти"].map((tab, index) => (
            <button className={index === 0 ? "active" : ""} type="button" key={tab}>
              {tab}
            </button>
          ))}
        </div>
        <div className="dash-dialog-list">
          {conversations.length ? (
            conversations.map(({ request, lastMessage, unread, status }) => (
              <button
                className={selectedRequest?.id === request.id ? "active" : ""}
                onClick={() => onSelectRequest(request.id)}
                type="button"
                key={request.id}
              >
                <span className="dash-dialog-avatar">{request.clientName?.slice(0, 1) || "К"}</span>
                <div>
                  <strong>{request.clientName || "Клієнт"}</strong>
                  <small>{getRequestService(master, request)}</small>
                  <p>{lastMessage?.body || request.description || "Нова заявка очікує відповіді."}</p>
                  <em>{status}</em>
                </div>
                <time>
                  {lastMessage
                    ? new Date(lastMessage.createdAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })
                    : "сьогодні"}
                </time>
                {unread > 0 && <b>{unread}</b>}
              </button>
            ))
          ) : (
            <div className="dash-empty">Діалогів поки немає. Нові заявки зʼявляться тут автоматично.</div>
          )}
        </div>
      </aside>

      <main className="dash-chat-column">
        <header className="dash-chat-head">
          <div>
            <span className="dash-section-label">Чат</span>
            <h2>{selectedRequest?.clientName || "Новий клієнт"}</h2>
            <p>{getRequestService(master, selectedRequest)} · {selectedStatus}</p>
          </div>
          <div>
            <a href={selectedRequest?.clientPhone ? `tel:${selectedRequest.clientPhone}` : "#"}>
              {selectedRequest?.clientPhone || "Телефон після заявки"}
            </a>
            <button onClick={() => onOpenPanel("objects")} type="button">
              Відкрити проєкт
            </button>
          </div>
        </header>

        <div className="dash-chat-actions" aria-label="Швидкі дії">
          <button type="button">Запропонувати дату</button>
          <button type="button">Створити кошторис</button>
          <button type="button">Запросити фото</button>
          <button onClick={() => onOpenPanel("objects")} type="button">Створити проєкт</button>
          <button onClick={() => onOpenPanel("finance")} type="button">Додати оплату</button>
        </div>

        <div className="dash-chat-feed">
          {selectedMessages.length ? (
            selectedMessages.map((message) => (
              <article className={`dash-chat-message ${message.senderRole}`} key={message.id}>
                <p>{message.body}</p>
                <time>{new Date(message.createdAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}</time>
              </article>
            ))
          ) : (
            <article className="dash-chat-message client">
              <p>{selectedRequest?.message || selectedRequest?.description || "Клієнт ще не написав повідомлення."}</p>
              <time>нова заявка</time>
            </article>
          )}

          <article className="dash-agreement-card date">
            <span>Пропозиція дати</span>
            <strong>{getDateText(selectedRequest || requests[0])}</strong>
            <p>Клієнт може підтвердити дату або запропонувати інший період.</p>
            <div>
              <button type="button">Підтвердити</button>
              <button type="button">Запропонувати іншу</button>
            </div>
          </article>

          <article className="dash-agreement-card estimate">
            <span>Кошторис</span>
            <strong>{getRequestBudget(selectedRequest)}</strong>
            <dl>
              <div><dt>Роботи</dt><dd>{getRequestService(master, selectedRequest)}</dd></div>
              <div><dt>Матеріали</dt><dd>після огляду</dd></div>
              <div><dt>Дійсний</dt><dd>3 дні</dd></div>
            </dl>
            <div>
              <button type="button">Погодити</button>
              <button type="button">Обговорити</button>
              <button type="button">Відхилити</button>
            </div>
          </article>

          <article className="dash-agreement-card payment">
            <span>Оплата</span>
            <strong>Очікує передплату</strong>
            <p>Після погодження кошторису можна додати оплату і привʼязати її до проєкту.</p>
            <div>
              <button onClick={() => onOpenPanel("finance")} type="button">Додати оплату</button>
              <button type="button">Написати коментар</button>
            </div>
          </article>
        </div>

        <form className="dash-chat-composer">
          <button type="button" aria-label="Додати файл">
            <FileText size={18} />
          </button>
          <input placeholder="Напишіть повідомлення клієнту..." />
          <button type="button">Надіслати</button>
        </form>
      </main>

      <aside className="dash-project-column">
        <div className="dash-section-label">Картка заявки</div>
        <h2>{getRequestService(master, selectedRequest)}</h2>
        <p>{selectedRequest?.description || selectedRequest?.message || "Опис задачі буде тут після заявки клієнта."}</p>
        <div className="dash-project-facts">
          <div><span>Клієнт</span><strong>{selectedRequest?.clientName || "Клієнт"}</strong></div>
          <div><span>Телефон</span><strong>{selectedRequest?.clientPhone || "не вказано"}</strong></div>
          <div><span>Адреса</span><strong>{getRequestAddress(selectedRequest)}</strong></div>
          <div><span>Бажана дата</span><strong>{getDateText(selectedRequest || requests[0])}</strong></div>
          <div><span>Бюджет</span><strong>{getRequestBudget(selectedRequest)}</strong></div>
          <div><span>Оплачено</span><strong>0 грн</strong></div>
          <div><span>Залишок</span><strong>{getRequestBudget(selectedRequest)}</strong></div>
          <div><span>Статус</span><strong>{selectedStatus}</strong></div>
        </div>
        <div className="dash-project-media">
          <span>
            <Camera size={18} />
            Фото обʼєкта
          </span>
          <span>
            <FileCheck2 size={18} />
            Документи
          </span>
        </div>
        <div className="dash-project-actions">
          <button type="button">Змінити статус</button>
          <button type="button">Запропонувати дату</button>
          <button type="button">Створити кошторис</button>
          <button onClick={() => onOpenPanel("calendar")} type="button">Додати в календар</button>
          <button onClick={() => onOpenPanel("objects")} type="button">Створити проєкт</button>
          <button onClick={() => onOpenPanel("finance")} type="button">Додати оплату</button>
          <button type="button">Завершити роботу</button>
        </div>
      </aside>
    </section>
  );
}

function BookingDateRequests() {
  const [bookings, setBookings] = useState<BookingRequest[]>([]);

  useEffect(() => {
    const loadBookings = window.setTimeout(() => {
      try {
        const parsed: unknown = JSON.parse(localStorage.getItem(bookingStorageKey) ?? "[]");
        if (Array.isArray(parsed)) {
          setBookings((parsed as BookingRequest[]).map(normalizeBookingRequest).filter((item) => item.masterId === currentMasterId));
        }
      } catch {
        setBookings([]);
      }
    }, 0);
    return () => window.clearTimeout(loadBookings);
  }, []);

  function save(next: BookingRequest[]) {
    let all: BookingRequest[] = [];
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(bookingStorageKey) ?? "[]");
      all = Array.isArray(parsed) ? (parsed as BookingRequest[]).map(normalizeBookingRequest) : [];
    } catch {
      all = [];
    }
    localStorage.setItem(bookingStorageKey, JSON.stringify([
      ...next,
      ...all.filter((item) => item.masterId !== currentMasterId),
    ]));
    setBookings(next);
  }

  function updateStatus(id: string, status: BookingRequest["status"], confirmedPeriod?: BookingDatePeriod) {
    const next = bookings.map((item) => item.id === id ? { ...item, status, confirmedPeriod } : item);
    save(next);
    if (status !== "confirmed" || !confirmedPeriod) return;

    const key = getAvailabilityStorageKey(currentMasterId);
    let slots: AvailabilitySlots = {};
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) slots = parsed as AvailabilitySlots;
    } catch {
      slots = {};
    }
    const confirmedSlots = getPeriodDateKeys(confirmedPeriod).reduce<AvailabilitySlots>((result, dateKey) => {
      result[dateKey] = "busy";
      return result;
    }, {});
    localStorage.setItem(key, JSON.stringify({ ...slots, ...confirmedSlots }));
  }

  if (!bookings.length) return null;

  return (
    <section className="dash-panel dash-booking-date-requests" aria-label="Заявки з варіантами дат">
      <div className="dash-panel-head"><div><h2>Заявки на вільні дати</h2><p>Підтвердіть один із запропонованих клієнтом варіантів</p></div></div>
      <div className="dash-booking-date-list">
        {bookings.map((booking) => (
          <article key={booking.id}>
            <header><div><strong>{booking.workType}</strong><p>{booking.description}</p></div><span>{booking.status === "confirmed" ? "Підтверджено" : booking.status === "declined" ? "Відхилено" : booking.status === "alternative_proposed" ? "Запропоновано іншу" : "Очікує рішення"}</span></header>
            <h3>Бажані періоди клієнта</h3>
            <div className="dash-booking-date-options">
              {booking.datePeriods.map((period, index) => <div key={`${period.startDate}-${period.endDate}`}><span><strong>{index + 1} період</strong>{period.startDate === period.endDate ? formatBookingDate(period.startDate) : `${formatBookingDate(period.startDate)} — ${formatBookingDate(period.endDate)}`}<small>{getPeriodDayCount(period)} дн.</small></span><button type="button" disabled={booking.status === "confirmed"} onClick={() => updateStatus(booking.id, "confirmed", period)}>{period.startDate === period.endDate ? "Підтвердити цю дату" : "Підтвердити цей період"}</button></div>)}
            </div>
            {booking.confirmedPeriod && <p className="dash-confirmed-date">Підтверджений період: <strong>{booking.confirmedPeriod.startDate === booking.confirmedPeriod.endDate ? formatBookingDate(booking.confirmedPeriod.startDate) : `${formatBookingDate(booking.confirmedPeriod.startDate)} — ${formatBookingDate(booking.confirmedPeriod.endDate)}`}</strong>. Узгодьте точний час у чаті.</p>}
            <footer><button type="button" onClick={() => updateStatus(booking.id, "alternative_proposed")}>Запропонувати іншу дату</button><a href="#messages">Написати клієнту</a><button className="danger" type="button" onClick={() => updateStatus(booking.id, "declined")}>Відхилити заявку</button></footer>
          </article>
        ))}
      </div>
    </section>
  );
}

function RequestsPanel({
  requests,
  onStatusChange,
}: {
  requests: MasterRequest[];
  onStatusChange: (id: string, status: RequestStatus) => void;
}) {
  const visible = requests.slice(0, 3);

  return (
    <section className="dash-panel" id="requests">
      <div className="dash-panel-head">
        <div>
          <h2>Нові заявки</h2>
          <p>Останні звернення клієнтів</p>
        </div>
        <Link href="/dashboard#requests">
          Переглянути всі
          <ChevronRight size={15} />
        </Link>
      </div>

      <div className="dash-request-list">
        {visible.length ? (
          visible.map((request) => (
            <article className="dash-request-card" key={request.id}>
              <div className="dash-request-client">
                <span>{request.clientName?.slice(0, 1) || "К"}</span>
                <div>
                  <strong>{request.clientName || "Клієнт"}</strong>
                  <small className={`dash-status ${statusClass[request.status]}`}>
                    {requestStatusLabels[request.status]}
                  </small>
                </div>
              </div>

              <div className="dash-request-body">
                <strong>{request.selectedServiceTitle || request.workType || "Ремонтні роботи"}</strong>
                <p>{request.description || request.message || "Клієнт ще не додав детальний опис задачі."}</p>
                <div>
                  <span>{request.cityArea || "Місто уточнюється"}</span>
                  <span>{getDateText(request)}</span>
                </div>
              </div>

              <div className="dash-request-aside">
                <strong>{getRequestCost(request)}</strong>
                <div>
                  <button onClick={() => onStatusChange(request.id, "accepted")} type="button">
                    Прийняти
                  </button>
                  <a href="#messages">Написати</a>
                  <button className="muted" onClick={() => onStatusChange(request.id, "declined")} type="button">
                    Відхилити
                  </button>
                </div>
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

function TodaySchedule({ requests }: { requests: MasterRequest[] }) {
  const active = requests.filter((request) => request.status === "accepted" || request.status === "in_progress").slice(0, 3);

  return (
    <section className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h2>Розклад на сьогодні</h2>
          <p>Короткий план робочого дня</p>
        </div>
      </div>
      <div className="dash-timeline">
        {(active.length ? active : requests.slice(0, 2)).map((request, index) => (
          <article key={request.id}>
            <time>{index === 0 ? "10:00" : "15:30"}</time>
            <div>
              <strong>{request.selectedServiceTitle || request.workType}</strong>
              <p>{request.cityArea || getDateText(request)}</p>
            </div>
          </article>
        ))}
        {!requests.length && <div className="dash-empty">На сьогодні робіт не заплановано.</div>}
      </div>
    </section>
  );
}

function MessagesPanel({
  requests,
  messages,
}: {
  requests: MasterRequest[];
  messages: RequestMessage[];
}) {
  const messageRows = messages.slice(0, 4);
  const requestById = new Map(requests.map((request) => [request.id, request]));

  return (
    <section className="dash-panel" id="messages">
      <div className="dash-panel-head">
        <div>
          <h2>Останні повідомлення</h2>
          <p>Швидко відповідайте клієнтам</p>
        </div>
        <Link href="#messages">
          Відкрити чат
          <ChevronRight size={15} />
        </Link>
      </div>
      <div className="dash-message-list">
        {messageRows.length ? (
          messageRows.map((message) => {
            const request = requestById.get(message.requestId);
            return (
              <article key={message.id}>
                <span>{request?.clientName?.slice(0, 1) || "К"}</span>
                <div>
                  <strong>{request?.clientName || "Клієнт"}</strong>
                  <p>{message.body}</p>
                </div>
                <time>{new Date(message.createdAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}</time>
              </article>
            );
          })
        ) : (
          <div className="dash-empty">Повідомлень поки немає.</div>
        )}
      </div>
    </section>
  );
}

function ClientsPanel({ requests }: { requests: MasterRequest[] }) {
  const clients = mergeById(
    requests.map((request) => ({
      id: request.clientPhone || request.clientName || request.id,
      name: request.clientName || "Клієнт",
      city: request.cityArea || "Локація уточнюється",
      phone: request.clientPhone || "Контакт після підтвердження",
      project: request.selectedServiceTitle || request.workType || "Ремонтний обʼєкт",
      status: requestStatusLabels[request.status],
      requestId: request.id,
    })),
  ).slice(0, 4);

  return (
    <section className="dash-panel" id="clients">
      <div className="dash-panel-head">
        <div>
          <h2>Клієнти та обʼєкти</h2>
          <p>CRM-список: контакт, заявка, чат і поточний ремонт</p>
        </div>
        <Link href="#messages">
          Відкрити чати
          <ChevronRight size={15} />
        </Link>
      </div>
      <div className="dash-client-list">
        {clients.length ? (
          clients.map((client) => (
            <article className="dash-client-card" key={client.id}>
              <span>{client.name.slice(0, 1)}</span>
              <div>
                <strong>{client.name}</strong>
                <p>{client.project}</p>
                <small>{client.city} · {client.phone}</small>
              </div>
              <em>{client.status}</em>
            </article>
          ))
        ) : (
          <div className="dash-empty">Клієнтів поки немає. Нові заявки зʼявляться тут автоматично.</div>
        )}
      </div>
    </section>
  );
}

function TasksPanel({ requests }: { requests: MasterRequest[] }) {
  const active = requests.filter((request) => request.status === "accepted" || request.status === "in_progress");
  const tasks = [
    {
      title: "Відповісти на нові заявки",
      detail: `${requests.filter((request) => request.status === "new").length} звернення очікують рішення`,
      icon: MessageSquare,
      tone: "orange",
    },
    {
      title: "Узгодити етапи ремонту",
      detail: active[0]?.selectedServiceTitle || active[0]?.workType || "Після прийняття заявки зʼявиться перший обʼєкт",
      icon: ListChecks,
      tone: "green",
    },
    {
      title: "Додати фото з обʼєкта",
      detail: "До початку, процес і результат для історії робіт",
      icon: Camera,
      tone: "blue",
    },
  ];

  return (
    <section className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h2>Задачі та етапи</h2>
          <p>Що потрібно зробити сьогодні по обʼєктах</p>
        </div>
      </div>
      <div className="dash-task-list">
        {tasks.map(({ title, detail, icon: Icon, tone }) => (
          <article className={`dash-task-card ${tone}`} key={title}>
            <Icon size={18} />
            <div>
              <strong>{title}</strong>
              <p>{detail}</p>
            </div>
            <button type="button">Відкрити</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function FinanceDocumentsPanel({
  requests,
  portfolioItems,
}: {
  requests: MasterRequest[];
  portfolioItems: PortfolioItem[];
}) {
  const portfolioRevenue = portfolioItems.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const pendingBudgets = requests.filter((request) => request.status === "new").length;
  const expenses = Math.round(portfolioRevenue * 0.28);

  const financeRows = [
    { label: "Погоджено робіт", value: formatMoney(portfolioRevenue || 0), icon: CircleDollarSign },
    { label: "Орієнтовні витрати", value: formatMoney(expenses || 0), icon: ReceiptText },
    { label: "Потрібно кошторисів", value: pendingBudgets, icon: ClipboardList },
  ];

  return (
    <section className="dash-panel dash-finance-card" id="finance">
      <div className="dash-panel-head compact">
        <div>
          <h2>Фінанси і документи</h2>
          <p>Простий облік без складної бухгалтерії</p>
        </div>
      </div>
      <div className="dash-finance-grid">
        {financeRows.map(({ label, value, icon: Icon }) => (
          <article key={label}>
            <Icon size={17} />
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="dash-document-stack">
        <button type="button">
          <FileCheck2 size={16} />
          Додати акт або чек
        </button>
        <button type="button">
          <History size={16} />
          Історія змін кошторису
        </button>
      </div>
    </section>
  );
}

function DashboardModuleGrid({
  requests,
  messages,
  portfolioItems,
  freeDatesCount,
  onOpenPanel,
}: {
  requests: MasterRequest[];
  messages: RequestMessage[];
  portfolioItems: PortfolioItem[];
  freeDatesCount: number;
  onOpenPanel: (panel: DashboardPanelKey) => void;
}) {
  const modules = [
    {
      panel: "requests" as const,
      title: "Заявки",
      text: "Нові звернення, статуси та швидкі дії",
      value: requests.filter((request) => request.status === "new").length,
      icon: ClipboardList,
    },
    {
      panel: "objects" as const,
      title: "Обʼєкти",
      text: "Ремонти в роботі, етапи та задачі",
      value: requests.filter((request) => request.status === "accepted" || request.status === "in_progress").length,
      icon: FolderKanban,
    },
    {
      panel: "calendar" as const,
      title: "Календар",
      text: "Вільні, зайняті та очікувані дати",
      value: freeDatesCount,
      icon: CalendarDays,
    },
    {
      panel: "messages" as const,
      title: "Чат",
      text: "Листування по заявках і обʼєктах",
      value: messages.filter((message) => !message.isRead && message.senderRole === "client").length,
      icon: MessageSquare,
    },
    {
      panel: "clients" as const,
      title: "Клієнти",
      text: "Контакти, історія заявок і співпраця",
      value: mergeById(requests.map((request) => ({ id: request.clientPhone || request.clientName || request.id }))).length,
      icon: UsersRound,
    },
    {
      panel: "portfolio" as const,
      title: "Портфоліо",
      text: "Роботи, фото і підготовка публічного профілю",
      value: portfolioItems.length,
      icon: ImagePlus,
    },
    {
      panel: "finance" as const,
      title: "Фінанси",
      text: "Кошториси, витрати, чеки та документи",
      value: portfolioItems.reduce((sum, item) => sum + (item.totalAmount || 0), 0) ? "грн" : 0,
      icon: WalletCards,
    },
  ];

  return (
    <section className="dash-module-grid" aria-label="Розділи кабінету">
      {modules.map(({ panel, title, text, value, icon: Icon }) => (
        <button className="dash-module-card" onClick={() => onOpenPanel(panel)} type="button" key={panel}>
          <span>
            <Icon size={20} />
          </span>
          <strong>{title}</strong>
          <p>{text}</p>
          <em>{value}</em>
        </button>
      ))}
    </section>
  );
}

function DashboardPanelModal({
  panel,
  master,
  requests,
  messages,
  portfolioItems,
  freeDatesCount,
  onClose,
  onStatusChange,
  onFreeDatesChange,
}: {
  panel: DashboardPanelKey | null;
  master: MasterProfile;
  requests: MasterRequest[];
  messages: RequestMessage[];
  portfolioItems: PortfolioItem[];
  freeDatesCount: number;
  onClose: () => void;
  onStatusChange: (id: string, status: RequestStatus) => void;
  onFreeDatesChange: (count: number) => void;
}) {
  if (!panel) return null;

  const titles: Record<DashboardPanelKey, { title: string; eyebrow: string }> = {
    requests: { title: "Заявки", eyebrow: "Нові звернення" },
    objects: { title: "Обʼєкти ремонту", eyebrow: "Етапи і задачі" },
    calendar: { title: "Календар майстра", eyebrow: "Доступність" },
    messages: { title: "Чат з клієнтами", eyebrow: "Повідомлення" },
    clients: { title: "Клієнти", eyebrow: "CRM" },
    portfolio: { title: "Портфоліо", eyebrow: "Публічний профіль" },
    reviews: { title: "Відгуки", eyebrow: "Довіра клієнтів" },
    finance: { title: "Фінанси і документи", eyebrow: "Облік" },
  };

  return (
    <div className="dash-panel-modal" role="dialog" aria-modal="true" aria-labelledby="dash-panel-modal-title">
      <button className="dash-panel-backdrop" onClick={onClose} type="button" aria-label="Закрити панель" />
      <div className="dash-panel-drawer">
        <header className="dash-panel-drawer-head">
          <div>
            <span>{titles[panel].eyebrow}</span>
            <h2 id="dash-panel-modal-title">{titles[panel].title}</h2>
          </div>
          <button onClick={onClose} type="button" aria-label="Закрити">
            <X size={21} />
          </button>
        </header>

        <div className="dash-panel-drawer-body">
          {panel === "requests" && <RequestsPanel requests={requests} onStatusChange={onStatusChange} />}
          {panel === "objects" && (
            <>
              <ProjectCommandCenter
                freeDatesCount={freeDatesCount}
                portfolioItems={portfolioItems}
                requests={requests}
              />
              <TasksPanel requests={requests} />
              <TodaySchedule requests={requests} />
            </>
          )}
          {panel === "calendar" && <DashboardCalendar master={master} onFreeDatesChange={onFreeDatesChange} />}
          {panel === "messages" && <MessagesPanel messages={messages} requests={requests} />}
          {panel === "clients" && <ClientsPanel requests={requests} />}
          {panel === "portfolio" && <PortfolioPreview items={portfolioItems} />}
          {panel === "reviews" && <MasterReviewInbox masterId={master.id} />}
          {panel === "finance" && <FinanceDocumentsPanel portfolioItems={portfolioItems} requests={requests} />}
        </div>
      </div>
    </div>
  );
}

function ProfileProgressCard({ percent }: { percent: number }) {
  const checklist = [
    "Додати фото профілю",
    "Додати опис",
    "Додати послуги та ціни",
    "Додати портфоліо",
    "Додати місто та райони роботи",
  ];

  return (
    <section className="dash-panel dash-progress-card">
      <div className="dash-panel-head compact">
        <div>
          <h2>Заповнення профілю</h2>
          <p>Ваш профіль заповнений на {percent}%</p>
        </div>
      </div>
      <div className="dash-progress-line" aria-label={`Профіль заповнений на ${percent}%`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <ul>
        {checklist.map((item, index) => (
          <li key={item} className={index < Math.round((percent / 100) * checklist.length) ? "done" : ""}>
            <CheckCircle2 size={16} />
            {item}
          </li>
        ))}
      </ul>
      <Link className="dash-primary-link" href="/dashboard/profile">
        Покращити профіль
      </Link>
    </section>
  );
}

function QuickActionsCard({ master }: { master: MasterProfile }) {
  const actions = [
    { label: "Додати роботу в портфоліо", href: "/dashboard/portfolio/new", icon: ImagePlus },
    { label: "Додати послугу", href: "/dashboard/profile#profile-services", icon: Plus },
    { label: "Оновити календар", href: "#calendar", icon: CalendarDays },
    { label: "Переглянути профіль", href: `/profile/${master.id}`, icon: Eye },
  ];

  return (
    <section className="dash-panel dash-quick-card">
      <div className="dash-panel-head compact">
        <div>
          <h2>Швидкі дії</h2>
          <p>Часті задачі в один клік</p>
        </div>
      </div>
      <div>
        {actions.map(({ label, href, icon: Icon }) => (
          <Link href={href} key={label}>
            <Icon size={17} />
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function DashboardCalendar({
  master,
  onFreeDatesChange,
}: {
  master: MasterProfile;
  onFreeDatesChange: (count: number) => void;
}) {
  const days = Array.from({ length: 31 }, (_, index) => index + 1);

  useEffect(() => {
    onFreeDatesChange(days.filter((day) => getCalendarStatus(master, day) === "free").length);
  }, [days, master, onFreeDatesChange]);

  return (
    <section className="dash-panel dash-calendar-card" id="calendar">
      <div className="dash-panel-head compact">
        <div>
          <h2>Календар доступності</h2>
          <p>Липень 2026</p>
        </div>
      </div>
      <div className="dash-calendar-legend">
        <span className="free">Вільно</span>
        <span className="pending">Очікує</span>
        <span className="busy">Зайнято</span>
      </div>
      <div className="dash-calendar-grid">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((day) => (
          <strong key={day}>{day}</strong>
        ))}
        <i />
        <i />
        {days.map((day) => {
          const status = getCalendarStatus(master, day);
          return (
            <button className={status} key={day} type="button">
              {day}
            </button>
          );
        })}
      </div>
      <div className="dash-calendar-actions">
        <button type="button">Додати вільний день</button>
        <button type="button">Позначити зайнятим</button>
      </div>
    </section>
  );
}

function PortfolioPreview({ items }: { items: PortfolioItem[] }) {
  return (
    <section className="dash-panel">
      <div className="dash-panel-head">
        <div>
          <h2>Портфоліо</h2>
          <p>Останні виконані роботи</p>
        </div>
        <Link href="/dashboard/portfolio">
          Додати роботу
          <ChevronRight size={15} />
        </Link>
      </div>
      <div className="dash-portfolio-preview">
        {items.slice(0, 2).map((item) => (
          <article key={item.id}>
            <Image src={item.photoUrl} alt={item.title} width={160} height={110} />
            <div>
              <strong>{item.title}</strong>
              <p>{item.city} · {item.objectArea ? `${item.objectArea} м²` : "обсяг уточнюється"}</p>
              <span>{formatMoney(item.totalAmount)}</span>
            </div>
            <Link href={`/dashboard/portfolio/${item.id}/edit`}>Редагувати</Link>
          </article>
        ))}
        {!items.length && <div className="dash-empty">Портфоліо поки порожнє.</div>}
      </div>
    </section>
  );
}

function RealDashboardMasterApp({ defaultRole = "master", master, masters, portfolioItems }: RealDashboardMasterAppProps) {
  const dashboardRole = defaultRole;
  const [requests, setRequests] = useState<MasterRequest[]>(mockRequests.filter(requestMatchesMaster));
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [savedPortfolioItems, setSavedPortfolioItems] = useState<PortfolioItem[]>(portfolioItems);
  const [workspaceContext, setWorkspaceContext] = useState<MasterWorkspaceContext>("personal");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [freeDatesCount, setFreeDatesCount] = useState(() =>
    Array.from({ length: 31 }, (_, index) => index + 1).filter((day) => getCalendarStatus(master, day) === "free").length,
  );
  const [activePanel, setActivePanel] = useState<DashboardPanelKey | null>(null);

  useEffect(() => {
    const localRequests = JSON.parse(localStorage.getItem(requestsStorageKey) ?? "[]") as MasterRequest[];
    const localMessages = JSON.parse(localStorage.getItem(requestMessagesStorageKey) ?? "[]") as RequestMessage[];

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
        if (result.items?.length) {
          setSavedPortfolioItems(mergeById([...result.items, ...portfolioItems]));
        }
      })
      .catch(() => undefined);
  }, [portfolioItems]);

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

  const requestIds = useMemo(() => new Set(requests.map((request) => request.id)), [requests]);
  const masterMessages = useMemo(
    () => messages.filter((message) => requestIds.has(message.requestId)),
    [messages, requestIds],
  );
  const unreadCount = masterMessages.filter((message) => !message.isRead && message.senderRole === "client").length;
  const profilePercent = getProfileCompletion(master, savedPortfolioItems.length);
  const defaultSelectedRequestId = selectedRequestId || requests[0]?.id || null;

  if (dashboardRole === "client") {
    return (
      <section className="dash-role-host">
        <DashboardRoleSwitch value={dashboardRole} />
        <ClientCabinetApp masters={masters} />
      </section>
    );
  }

  if (dashboardRole === "contractor") {
    return (
      <section className="dash-role-host">
        <DashboardRoleSwitch value={dashboardRole} />
        <ContractorCabinetApp />
      </section>
    );
  }

  return (
    <section className="dash-role-host">
      <DashboardRoleSwitch value={dashboardRole} />
      <section className="dashboard-page dash-app">
      <DashboardSidebar activePanel={activePanel} master={master} onOpenPanel={setActivePanel} />
      <main className="dash-main">
        <DashboardTopbar master={master} unreadCount={unreadCount} />
        <MasterContextSwitch onChange={setWorkspaceContext} value={workspaceContext} />
        {workspaceContext === "team" && (
          <section className="dash-team-mode-note">
            <span className="dash-platform-tag">Командний режим</span>
            <h2>Робота в команді «Укріплення»</h2>
            <p>
              Тут залишиться сценарій задач підрядника: обʼєкти команди, внутрішні повідомлення,
              звіти та синхронізація календаря. Особисті замовлення відкриті як основний режим.
            </p>
          </section>
        )}
        {workspaceContext === "personal" && (
          <MasterMessagesWorkspace
            master={master}
            messages={masterMessages}
            onOpenPanel={setActivePanel}
            onSelectRequest={setSelectedRequestId}
            requests={requests}
            selectedRequestId={defaultSelectedRequestId}
          />
        )}
        <StatsCards
          freeDatesCount={freeDatesCount}
          messages={masterMessages}
          onOpenPanel={setActivePanel}
          profilePercent={profilePercent}
          requests={requests}
        />
        <ProfileNotice percent={profilePercent} />
        <BookingDateRequests />

        <div className="dash-clean-workspace">
          <DashboardModuleGrid
            freeDatesCount={freeDatesCount}
            messages={masterMessages}
            onOpenPanel={setActivePanel}
            portfolioItems={savedPortfolioItems}
            requests={requests}
          />
          <aside className="dash-clean-aside">
            <FinanceDocumentsPanel portfolioItems={savedPortfolioItems} requests={requests} />
            <ProfileProgressCard percent={profilePercent} />
            <QuickActionsCard master={master} />
          </aside>
        </div>
      </main>
      <DashboardPanelModal
        freeDatesCount={freeDatesCount}
        master={master}
        messages={masterMessages}
        onClose={() => setActivePanel(null)}
        onFreeDatesChange={setFreeDatesCount}
        onStatusChange={updateRequestStatus}
        panel={activePanel}
        portfolioItems={savedPortfolioItems}
        requests={requests}
      />
      </section>
    </section>
  );
}

export function DashboardMasterApp(props: DashboardMasterAppProps) {
  if (props.mode === "demo") {
    return (
      <DemoMasterCabinetApp
        initialData={props.initialData}
        stateWarning={props.stateWarning}
      />
    );
  }

  return (
    <RealDashboardMasterApp
      defaultRole={props.defaultRole}
      master={props.master}
      masters={props.masters}
      portfolioItems={props.portfolioItems}
    />
  );
}
