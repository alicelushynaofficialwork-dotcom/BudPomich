"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  Bell,
  BrickWall,
  CalendarDays,
  ClipboardList,
  FileClock,
  FileText,
  FolderKanban,
  Heart,
  Home,
  House,
  MessageCircle,
  Plus,
  Ruler,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { DemoCabinetSwitcher } from "@/components/demo/DemoCabinetSwitcher";
import { MastersCatalogView } from "@/components/MastersCatalogView";
import { ReviewForm } from "@/components/ReviewForm";
import { LogoutButton } from "@/components/LogoutButton";
import {
  DemoClientApiError,
  markDemoClientNotificationRead,
  resetDemoClientState,
  sendDemoClientMessage,
  updateDemoClientRequestStatus,
} from "@/lib/demo/client-demo-api";
import {
  demoRequestStatuses,
  type DemoClientState,
  type DemoRequestStatus,
} from "@/lib/demo/types";
import type { MasterProfile } from "@/lib/masters";
import type { MasterRequest, RequestMessage, RequestPeriod } from "@/lib/requests";
import { getProfileInitials } from "@/lib/profile";
import type { MasterReview } from "@/lib/reviews";

type ClientProfile = {
  fullName: string | null;
  city: string | null;
  email: string | null;
  registeredAt?: string | null;
};

type ClientCabinetAppProps = {
  masters?: MasterProfile[];
  mode?: "real" | "demo";
  initialData?: DemoClientState;
  profile?: ClientProfile;
  stateWarning?: string;
};

type ClientView =
  | "home"
  | "catalog"
  | "messages"
  | "calendar"
  | "cabinet"
  | "requests"
  | "projects"
  | "favorites"
  | "notifications"
  | "apartment"
  | "history"
  | "documents"
  | "settings";

type ClientNavItem = {
  id: ClientView;
  label: string;
  icon: LucideIcon;
};

const realNavItems: ClientNavItem[] = [
  { id: "home", label: "Головна", icon: Home },
  { id: "catalog", label: "Каталог", icon: Search },
  { id: "messages", label: "Чати", icon: MessageCircle },
  { id: "calendar", label: "Календар", icon: CalendarDays },
  { id: "cabinet", label: "Кабінет", icon: UserRound },
];

const demoNavItems: ClientNavItem[] = [
  { id: "home", label: "Головна", icon: Home },
  { id: "catalog", label: "Каталог", icon: Search },
  { id: "messages", label: "Чати", icon: MessageCircle },
  { id: "calendar", label: "Календар", icon: CalendarDays },
  { id: "cabinet", label: "Кабінет", icon: UserRound },
];

type ClientTabsProps = {
  activeView: ClientView;
  isDemo: boolean;
  items: ClientNavItem[];
  onChange: (view: ClientView) => void;
  unreadNotifications: number;
};

function ClientTabs({ activeView, isDemo, items, onChange, unreadNotifications }: ClientTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ visible: false, size: 100, offset: 0 });

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const updateIndicator = () => {
      const overflow = scroller.scrollWidth - scroller.clientWidth;
      const visible = overflow > 1;
      const size = visible ? Math.max(18, (scroller.clientWidth / scroller.scrollWidth) * 100) : 100;
      const offset = visible ? (scroller.scrollLeft / overflow) * (100 - size) : 0;
      setIndicator({ visible, size, offset });
    };

    updateIndicator();
    scroller.addEventListener("scroll", updateIndicator, { passive: true });
    const resizeObserver = new ResizeObserver(updateIndicator);
    resizeObserver.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", updateIndicator);
      resizeObserver.disconnect();
    };
  }, [items]);

  useEffect(() => {
    const activeTab = scrollRef.current?.querySelector<HTMLElement>("[aria-current='page']");
    activeTab?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeView]);

  return (
    <nav className="client-tabs" aria-label="Навігація кабінету клієнта">
      <div className="client-tabs-scroll" ref={scrollRef}>
        {items.map((item) => {
          const active = activeView === item.id;
          const Icon = item.icon;
          return (
            <button aria-current={active ? "page" : undefined} className={active ? "active" : ""} onClick={() => onChange(item.id)} type="button" key={item.id}>
              <Icon aria-hidden="true" size={19} strokeWidth={2} />
              {item.label}
              {isDemo && item.id === "notifications" && unreadNotifications > 0 ? ` (${unreadNotifications})` : ""}
            </button>
          );
        })}
      </div>
      <div className={`client-tabs-track${indicator.visible ? " is-visible" : ""}`} aria-hidden="true">
        <i style={{ left: `${indicator.offset}%`, width: `${indicator.size}%` }} />
      </div>
    </nav>
  );
}

const statusLabels: Record<string, string> = {
  new: "Нова",
  viewed: "Переглянута",
  in_discussion: "В обговоренні",
  accepted: "Прийнята",
  declined: "Відхилена",
  in_progress: "В роботі",
  completed: "Завершена",
  cancelled: "Скасована",
  unknown: "Статус не вказано",
};

function formatDemoStatus(status: string) {
  return statusLabels[status] ?? status.replaceAll("_", " ");
}

function formatDemoDate(value: string) {
  if (!value) return "Дату не вказано";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("uk-UA", { dateStyle: "long" }).format(date);
}

function formatDemoTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("uk-UA", { hour: "2-digit", minute: "2-digit" }).format(date);
}

const calendarWeekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

type ClientCalendarRequest = {
  id: string;
  title: string;
  masterName: string;
  address: string;
  status: string;
  statusValue: string;
  desiredDateRaw: string;
  periods: RequestPeriod[];
  confirmedPeriod?: RequestPeriod;
  hasProject?: boolean;
};

type CalendarDay = {
  date: string;
  day: number;
  isCurrentMonth: boolean;
};

function getIsoDate(value?: string | null) {
  return value?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "";
}

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function shiftCalendarMonth(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

function getCalendarDays(monthKey: string): CalendarDay[] {
  const [year, month] = monthKey.split("-").map(Number);
  const monthIndex = month - 1;
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
  const gridStart = new Date(Date.UTC(year, monthIndex, 1 - mondayOffset));

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      isCurrentMonth: date.getUTCMonth() === monthIndex,
    };
  });
}

function formatCalendarMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("uk-UA", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatCalendarDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function requestOccursOnDate(request: ClientCalendarRequest, date: string) {
  const periods = request.confirmedPeriod ? [request.confirmedPeriod] : request.periods;
  if (periods.length) {
    return periods.some((period) => {
      const from = getIsoDate(period.dateFrom);
      const to = getIsoDate(period.dateTo) || from;
      return Boolean(from && from <= date && date <= to);
    });
  }
  return getIsoDate(request.desiredDateRaw) === date;
}

function getCalendarRequestTone(request: ClientCalendarRequest) {
  if (request.confirmedPeriod && ["accepted", "in_progress"].includes(request.statusValue)) return "busy";
  if (!request.confirmedPeriod && request.periods.length > 0) return "pending";
  return "available";
}

function getUpcomingCalendarEntries(requests: ClientCalendarRequest[], today: string) {
  return requests
    .flatMap((request) => {
      const periods = request.confirmedPeriod
        ? [request.confirmedPeriod]
        : request.periods.length
          ? request.periods
          : [{
              dateFrom: getIsoDate(request.desiredDateRaw),
              dateTo: getIsoDate(request.desiredDateRaw),
              period: "Час уточнюється",
            }];

      return periods
        .map((period, index) => ({
          date: getIsoDate(period.dateFrom),
          dateTo: getIsoDate(period.dateTo) || getIsoDate(period.dateFrom),
          id: `${request.id}:${index}:${period.dateFrom}`,
          period: period.period || "Час уточнюється",
          request,
        }))
        .filter((entry) => Boolean(entry.date) && entry.dateTo >= today);
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function ClientCalendar({
  error,
  loading,
  onOpenChat,
  onOpenProject,
  onOpenRequest,
  onRetry,
  onViewRequests,
  requests,
}: {
  error: boolean;
  loading: boolean;
  onOpenChat: (requestId: string) => void;
  onOpenProject: (requestId: string) => void;
  onOpenRequest: (requestId: string) => void;
  onRetry: () => void;
  onViewRequests: () => void;
  requests: ClientCalendarRequest[];
}) {
  const today = getCurrentMonthKey() + `-${new Date().toISOString().slice(8, 10)}`;
  const [month, setMonth] = useState(getCurrentMonthKey);
  const [selectedDate, setSelectedDate] = useState(today);
  const detailsRef = useRef<HTMLElement>(null);
  const days = getCalendarDays(month);
  const selectedRequests = requests.filter((request) => requestOccursOnDate(request, selectedDate));
  const upcomingEntries = getUpcomingCalendarEntries(requests, today);

  const changeMonth = (offset: number) => {
    const nextMonth = shiftCalendarMonth(month, offset);
    setMonth(nextMonth);
    setSelectedDate(`${nextMonth}-01`);
  };

  if (loading) {
    return (
      <div className="client-calendar-loading" role="status" aria-label="Завантаження календаря">
        <div className="client-calendar-skeleton is-calendar" />
        <div className="client-calendar-skeleton is-details" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="client-calendar-error" role="alert">
        <CalendarDays aria-hidden="true" />
        <h3>Не вдалося завантажити календар. Спробуйте ще раз.</h3>
        <button onClick={onRetry} type="button">Спробувати ще раз</button>
      </div>
    );
  }

  return (
    <div className="client-calendar-shell">
      <div className="client-calendar-layout">
        <section className="client-calendar-board" aria-label={`Календар, ${formatCalendarMonth(month)}`}>
        <header>
          <div>
            <span>Поточний місяць</span>
            <h3>{formatCalendarMonth(month)}</h3>
          </div>
          <nav aria-label="Перемикання місяця">
            <button aria-label="Попередній місяць" onClick={() => changeMonth(-1)} type="button">
              <ArrowLeft aria-hidden="true" />
            </button>
            <button
              className="is-today"
              onClick={() => {
                const currentMonth = getCurrentMonthKey();
                setMonth(currentMonth);
                setSelectedDate(new Date().toISOString().slice(0, 10));
              }}
              type="button"
            >
              Сьогодні
            </button>
            <button aria-label="Наступний місяць" onClick={() => changeMonth(1)} type="button">
              <ArrowRight aria-hidden="true" />
            </button>
          </nav>
        </header>
        <div className="client-calendar-weekdays" aria-hidden="true">
          {calendarWeekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>
        <div className="client-calendar-grid">
          {days.map((day) => {
            const dayRequests = requests.filter((request) => requestOccursOnDate(request, day.date));
            const tones = dayRequests.map(getCalendarRequestTone);
            const tone = tones.includes("busy") ? "busy" : tones.includes("pending") ? "pending" : tones.includes("available") ? "available" : "";
            const selected = selectedDate === day.date;
            return (
              <button
                aria-label={`${day.day}, ${dayRequests.length ? `${dayRequests.length} подій` : "подій немає"}`}
                aria-pressed={selected}
                className={`${tone}${selected ? " is-selected" : ""}${day.isCurrentMonth ? "" : " is-outside"}`}
                key={day.date}
                onClick={() => {
                  setSelectedDate(day.date);
                  if (!day.isCurrentMonth) setMonth(day.date.slice(0, 7));
                }}
                type="button"
              >
                <span>{day.day}</span>
                {dayRequests.length > 0 ? <i aria-hidden="true">{dayRequests.length}</i> : null}
              </button>
            );
          })}
        </div>
        <footer>
          <span className="available">Заплановано</span>
          <span className="pending">Очікує підтвердження</span>
          <span className="busy">Підтверджено</span>
        </footer>
        </section>

        <aside className="client-calendar-details" ref={detailsRef}>
        <span>Обрана дата</span>
        <h3>{formatCalendarDate(selectedDate)}</h3>
        <div>
          {selectedRequests.map((request) => {
            const hasChat = Boolean(request.masterName);
            const hasProject = request.hasProject === true;
            const time = request.confirmedPeriod?.period || request.periods[0]?.period || "Час уточнюється";
            return (
              <article key={request.id}>
                <div className="client-calendar-event-head">
                  <strong>{time}</strong>
                  <span className={getCalendarRequestTone(request)}>{request.status}</span>
                </div>
                <h4>{request.title}</h4>
                <p>{request.masterName || "Майстра ще не обрано"}</p>
                {request.address ? <small>{request.address}</small> : null}
                <div className="client-calendar-event-actions">
                  <button onClick={() => onOpenRequest(request.id)} type="button">Відкрити</button>
                  {hasChat ? <button onClick={() => onOpenChat(request.id)} type="button">Відкрити чат</button> : null}
                  {hasProject ? <button onClick={() => onOpenProject(request.id)} type="button">Відкрити проєкт</button> : null}
                </div>
              </article>
            );
          })}
          {selectedRequests.length === 0 ? (
            <div className="client-calendar-empty">
              <CalendarDays aria-hidden="true" />
              <p>На цю дату запланованих зустрічей немає.</p>
              <button onClick={onViewRequests} type="button">Переглянути мої заявки</button>
            </div>
          ) : null}
        </div>
        </aside>
      </div>

      <section className="client-calendar-upcoming">
        <div className="client-calendar-upcoming-head">
          <div>
            <span>Розклад</span>
            <h3>Найближчі заплановані дати</h3>
          </div>
          <small>{upcomingEntries.length} подій</small>
        </div>
        <div className="client-calendar-upcoming-list">
          {upcomingEntries.map((entry) => {
            const request = entry.request;
            const hasChat = Boolean(request.masterName);
            return (
              <article className={selectedDate === entry.date ? "is-selected" : ""} key={entry.id}>
                <button
                  className="client-calendar-upcoming-select"
                  onClick={() => {
                    setMonth(entry.date.slice(0, 7));
                    setSelectedDate(entry.date);
                    requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
                  }}
                  type="button"
                >
                  <time dateTime={entry.date}>{formatCalendarDate(entry.date)}</time>
                  <span>{entry.period}</span>
                </button>
                <div className="client-calendar-upcoming-copy">
                  <span className={getCalendarRequestTone(request)}>{request.status}</span>
                  <h4>{request.title}</h4>
                  <p>{request.masterName || "Майстра ще не обрано"}{request.address ? ` · ${request.address}` : ""}</p>
                </div>
                <div className="client-calendar-upcoming-actions">
                  <button onClick={() => onOpenRequest(request.id)} type="button">Відкрити</button>
                  {hasChat ? <button onClick={() => onOpenChat(request.id)} type="button">Відкрити чат</button> : null}
                  {request.hasProject ? <button onClick={() => onOpenProject(request.id)} type="button">Відкрити проєкт</button> : null}
                </div>
              </article>
            );
          })}
          {upcomingEntries.length === 0 ? (
            <div className="client-calendar-upcoming-empty">
              <p>Запланованих дат поки немає.</p>
              <button onClick={onViewRequests} type="button">Переглянути мої заявки</button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function formatRegistrationDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("uk-UA", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDemoBudget(value: number | null) {
  return value === null
    ? "Бюджет не вказано"
    : `${new Intl.NumberFormat("uk-UA").format(value)} грн`;
}

const requestProgressByStatus: Record<string, number> = {
  new: 10,
  viewed: 20,
  in_discussion: 30,
  accepted: 40,
  in_progress: 70,
  completed: 100,
  declined: 0,
  cancelled: 0,
};

const requestNextStageByStatus: Record<string, string> = {
  new: "Очікуємо відповідь майстра",
  viewed: "Майстер переглядає заявку",
  in_discussion: "Узгодження деталей і кошторису",
  accepted: "Підготовка до початку робіт",
  in_progress: "Виконання погоджених робіт",
  completed: "Роботу завершено",
  declined: "Заявку відхилено",
  cancelled: "Заявку скасовано",
};

const aiLisaActions = [
  {
    title: "Знайти майстра",
    description: "За послугою, містом і датою",
    prompt: "Допоможи знайти сантехніка у моєму місті",
    icon: Search,
  },
  {
    title: "Створити заявку",
    description: "Допоможу описати проблему",
    prompt: "Допоможи правильно описати проблему для нової заявки",
    icon: ClipboardList,
  },
  {
    title: "Оцінити вартість",
    description: "Орієнтовний бюджет робіт",
    prompt: "Порахуй орієнтовну вартість заміни змішувача",
    icon: BadgeDollarSign,
  },
  {
    title: "Пояснити кошторис",
    description: "Поясню позиції та ціни",
    prompt: "Поясни цей кошторис простими словами",
    icon: Ruler,
  },
  {
    title: "Підібрати матеріали",
    description: "Складу список матеріалів",
    prompt: "Склади список матеріалів для ремонту ванної",
    icon: BrickWall,
  },
  {
    title: "Запланувати роботи",
    description: "Допоможу вибрати дату",
    prompt: "Допоможи вибрати дату для виконання робіт",
    icon: CalendarDays,
  },
  {
    title: "Мій поточний проєкт",
    description: "Статус і наступний крок",
    prompt: "Поясни статус мого поточного проєкту та наступний доступний крок",
    icon: FolderKanban,
  },
  {
    title: "Поставити своє запитання",
    description: "Опишіть ситуацію своїми словами",
    prompt: "",
    icon: MessageCircle,
  },
] satisfies Array<{
  title: string;
  description: string;
  prompt: string;
  icon: LucideIcon;
}>;

function AiLisaBrandMark({ large = false }: { large?: boolean }) {
  return (
    <span className={`client-ailisa-brand-mark${large ? " is-large" : ""}`} aria-hidden="true">
      <Image
        alt=""
        height={256}
        src="/ailisa/ailisa-icon-v3.png"
        width={256}
      />
    </span>
  );
}

function ClientPeriodConfirmation({
  confirmedPeriod,
  onConfirm,
  pending,
  periods,
}: {
  confirmedPeriod?: RequestPeriod;
  onConfirm: (period: RequestPeriod) => void;
  pending: boolean;
  periods: RequestPeriod[];
}) {
  if (!periods.length) return null;

  if (confirmedPeriod) {
    return (
      <div className="client-period-confirmation confirmed">
        <strong>Підтверджений період</strong>
        <span>
          {confirmedPeriod.dateFrom === confirmedPeriod.dateTo
            ? confirmedPeriod.dateFrom
            : `${confirmedPeriod.dateFrom} — ${confirmedPeriod.dateTo}`}
        </span>
      </div>
    );
  }

  return (
    <div className="client-period-confirmation">
      <strong>Оберіть і підтвердьте один період</strong>
      {periods.map((period, index) => (
        <button
          disabled={pending}
          key={`${period.dateFrom}-${period.dateTo}`}
          onClick={() => onConfirm(period)}
          type="button"
        >
          <span>{index + 1}.</span>
          {period.dateFrom === period.dateTo
            ? period.dateFrom
            : `${period.dateFrom} — ${period.dateTo}`}
        </button>
      ))}
    </div>
  );
}

export function ClientCabinetApp({
  masters = [],
  mode = "real",
  initialData,
  profile,
  stateWarning,
}: ClientCabinetAppProps) {
  const isDemo = mode === "demo";
  const navItems = isDemo ? demoNavItems : realNavItems;
  const [activeView, setActiveView] = useState<ClientView>("home");
  const [activeDialog, setActiveDialog] = useState(initialData?.messages[0]?.id ?? "");
  const [demoState, setDemoState] = useState(initialData);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [messageRequestId, setMessageRequestId] = useState(initialData?.requests[0]?.id ?? "");
  const [activeRequestId, setActiveRequestId] = useState<string>(initialData?.requests[0]?.id ?? "");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isAiLisaOpen, setIsAiLisaOpen] = useState(false);
  const [aiLisaDraft, setAiLisaDraft] = useState("");
  const [aiLisaUnavailable, setAiLisaUnavailable] = useState(false);
  const [showAiLisaExample, setShowAiLisaExample] = useState(false);
  const aiLisaTriggerRef = useRef<HTMLButtonElement>(null);

  const closeAiLisa = () => {
    setIsAiLisaOpen(false);
    requestAnimationFrame(() => aiLisaTriggerRef.current?.focus());
  };

  useEffect(() => {
    if (!isAiLisaOpen) return;

    const overlayQuery = window.matchMedia("(min-width: 761px) and (max-width: 1399px)");
    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;

    const syncBodyScroll = () => {
      if (overlayQuery.matches) {
        const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
        body.style.overflow = "hidden";
        body.style.paddingRight = scrollbarWidth > 0 ? `${scrollbarWidth}px` : previousPaddingRight;
      } else {
        body.style.overflow = previousOverflow;
        body.style.paddingRight = previousPaddingRight;
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsAiLisaOpen(false);
      requestAnimationFrame(() => aiLisaTriggerRef.current?.focus());
    };

    syncBodyScroll();
    overlayQuery.addEventListener("change", syncBodyScroll);
    document.addEventListener("keydown", handleEscape);

    return () => {
      overlayQuery.removeEventListener("change", syncBodyScroll);
      document.removeEventListener("keydown", handleEscape);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [isAiLisaOpen]);

  const [hasStartedAiLisaConversation, setHasStartedAiLisaConversation] = useState(false);
  const aiLisaInputRef = useRef<HTMLTextAreaElement>(null);
  const [realRequests, setRealRequests] = useState<MasterRequest[]>([]);
  const [realMessages, setRealMessages] = useState<RequestMessage[]>([]);
  const [clientReviews, setClientReviews] = useState<MasterReview[]>([]);
  const [reviewBookingId, setReviewBookingId] = useState("");
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [calendarReloadKey, setCalendarReloadKey] = useState(0);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const currentDemoState = demoState ?? initialData;
  const profileName = isDemo
    ? currentDemoState?.profile.name ?? "Демо клієнт"
    : profile?.fullName?.trim() || profile?.email?.split("@")[0] || "Клієнт";
  const profileCity = isDemo
    ? currentDemoState?.profile.city ?? "Місто не вказано"
    : profile?.city?.trim() || "Місто не вказано";
  const requestRows = isDemo
    ? (currentDemoState?.requests ?? []).map((request) => ({
        id: request.id,
        title: request.title,
        masterName: request.masterName || "Майстра ще не обрано",
        address: profileCity,
        status: formatDemoStatus(request.status),
        statusValue: request.status,
        desiredDateRaw: request.desiredDate,
        date: formatDemoDate(request.desiredDate),
        budget: formatDemoBudget(request.budget),
        description: "Дані заявки завантажено з демонстраційної сесії.",
        periods: [],
        confirmedPeriod: undefined,
        attachments: [],
      }))
    : realRequests.map((request) => ({
        id: request.id,
        title: request.selectedServiceTitle || request.workType || "Заявка",
        masterName: request.masterName,
        address: request.cityArea || profileCity,
        status: formatDemoStatus(request.status),
        statusValue: request.status,
        desiredDateRaw: request.desiredDate,
        date: formatDemoDate(request.desiredDate),
        budget: request.budget ? request.budget : "Бюджет не вказано",
        description: request.description || request.workType || "Деталі заявки",
        periods: request.periods,
        confirmedPeriod: request.confirmedPeriod,
        attachments: request.attachments ?? [],
      }));
  const messageRows = isDemo
    ? (currentDemoState?.messages ?? []).map((message) => ({
        id: message.id,
        requestId: message.requestId,
        name: message.sender,
        project: requestRows.find((request) => request.id === message.requestId)?.title ?? "Демопроєкт",
        status: "Демонстраційне повідомлення",
        last: message.body,
        time: formatDemoTime(message.createdAt),
      }))
    : realRequests.map((request) => ({
        id: request.id,
        requestId: request.id,
        name: request.masterName,
        project: request.selectedServiceTitle || request.workType,
        status: request.status ? formatDemoStatus(request.status) : "",
        last: request.description || request.selectedServiceTitle || "Нова заявка",
        time: formatDemoDate(request.desiredDate),
      }));
  const activeDialogRow = messageRows.find((dialog) => dialog.id === activeDialog) ?? messageRows[0];
  const currentRequest = isDemo
    ? null
    : realRequests.find((request) => request.id === activeRequestId || request.id === activeDialog);
  const currentMessages = isDemo ? [] : realMessages;

  const projectRows = isDemo
    ? (currentDemoState?.projects ?? []).map((project) => ({
        id: project.id,
        title: project.title,
        performer: "Демонстраційний майстер",
        address: profileCity,
        status: formatDemoStatus(project.status),
        stage: formatDemoStatus(project.status),
        progress: project.progress,
        next: "Наступний крок не вказано",
        cost: "Кошторис у заявці",
        paid: "Не вказано",
      }))
    : [];
  const favoriteMasters: MasterProfile[] = [];
  const visibleMasters = isDemo ? [] : masters;
  const profileInitials = getProfileInitials(profileName);
  const registrationDate = formatRegistrationDate(profile?.registeredAt);
  const documentRows = requestRows.flatMap((request) =>
    request.attachments
      .filter((attachment) => attachment.kind === "document")
      .map((attachment) => ({ ...attachment, requestTitle: request.title })),
  );
  const completedRequests = requestRows.filter((request) => request.statusValue === "completed");
  const primaryView: ClientView = [
    "requests",
    "projects",
    "favorites",
    "notifications",
    "apartment",
    "history",
    "documents",
    "settings",
  ].includes(activeView)
    ? "cabinet"
    : activeView;
  const firstName = profileName.split(/\s+/)[0] || profileName;
  const activeRequest =
    requestRows.find((request) =>
      ["accepted", "in_progress"].includes(request.statusValue),
    ) ?? requestRows[0];
  const activeProject = projectRows[0];
  const activeProgress = activeProject?.progress ??
    (activeRequest ? requestProgressByStatus[activeRequest.statusValue] : undefined);
  const activeNextStage = activeProject?.next ??
    (activeRequest ? requestNextStageByStatus[activeRequest.statusValue] : undefined);
  const activeAppointment = activeRequest?.confirmedPeriod?.period || activeRequest?.date;
  const activeDocumentCount = activeRequest?.attachments.filter(
    (attachment) => attachment.kind === "document",
  ).length ?? 0;
  const activeUnreadMessages = currentMessages.filter(
    (message) => message.senderRole === "master" && !message.isRead,
  ).length;
  const activeNotificationCount = isDemo
    ? currentDemoState?.notifications.filter((notification) => !notification.isRead).length ?? 0
    : activeUnreadMessages;
  const scheduledRequests = requestRows
    .filter(
      (request) =>
        Boolean(request.confirmedPeriod) ||
        request.periods.length > 0 ||
        Boolean(getIsoDate(request.desiredDateRaw)),
    )
    .map((request) => ({
      ...request,
      hasProject: projectRows.some((project) => project.id === request.id),
    }));

  useEffect(() => {
    if (isDemo) {
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setRequestsLoading(true);
      setRequestsError(null);

      try {
        const response = await fetch("/api/requests", { signal: controller.signal });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(result?.error ?? "Не вдалося завантажити заявки.");
        }

        const requests = (result as { requests?: MasterRequest[] }).requests ?? [];
        setRealRequests(requests);
        const reviewsResponse = await fetch("/api/reviews?mine=1", { signal: controller.signal });
        if (reviewsResponse.ok) {
          const reviewsResult = await reviewsResponse.json() as { reviews?: MasterReview[] };
          setClientReviews(reviewsResult.reviews ?? []);
        }

        if (!activeRequestId && requests.length) {
          setActiveDialog(requests[0].id);
          setActiveRequestId(requests[0].id);
          setMessageRequestId(requests[0].id);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setRequestsError(error instanceof Error ? error.message : "Не вдалося завантажити заявки.");
      } finally {
        if (!controller.signal.aborted) {
          setRequestsLoading(false);
        }
      }
    };

    Promise.resolve().then(() => void load());
    return () => controller.abort();
  }, [isDemo, activeRequestId, calendarReloadKey]);

  useEffect(() => {
    if (isDemo || !activeRequestId) {
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setMessagesLoading(true);
      setMessagesError(null);

      try {
        const response = await fetch(
          `/api/messages?requestId=${encodeURIComponent(activeRequestId)}`,
          { signal: controller.signal },
        );
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(result?.error ?? "Не вдалося завантажити повідомлення.");
        }

        setRealMessages((result as { messages?: RequestMessage[] }).messages ?? []);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setMessagesError(error instanceof Error ? error.message : "Не вдалося завантажити повідомлення.");
      } finally {
        if (!controller.signal.aborted) {
          setMessagesLoading(false);
        }
      }
    };

    Promise.resolve().then(() => void load());
    return () => controller.abort();
  }, [isDemo, activeRequestId]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isDemo || pendingAction || !activeRequestId || !messageBody.trim()) return;

    setPendingAction("message");
    setMessagesError(null);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: activeRequestId, body: messageBody.trim() }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error ?? "Не вдалося надіслати повідомлення.");
      }

      const nextMessage = result.message as RequestMessage;
      setRealMessages((current) => [...current, nextMessage]);
      setMessageBody("");
    } catch (error) {
      setMessagesError(error instanceof Error ? error.message : "Не вдалося надіслати повідомлення.");
    } finally {
      setPendingAction(null);
    }
  }

  async function confirmRequestPeriod(requestId: string, period: RequestPeriod) {
    if (isDemo || pendingAction) return;

    setPendingAction(`confirm-period:${requestId}`);
    setRequestsError(null);

    try {
      const response = await fetch("/api/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: requestId,
          status: "accepted",
          confirmedPeriod: period,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error ?? "Не вдалося підтвердити період.");
      }

      setRealRequests((current) =>
        current.map((request) =>
          request.id === requestId
            ? { ...request, status: "accepted", confirmedPeriod: period }
            : request,
        ),
      );
    } catch (error) {
      setRequestsError(
        error instanceof Error ? error.message : "Не вдалося підтвердити період.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  const unreadNotifications = currentDemoState?.notifications.filter(
    (notification) => !notification.isRead,
  ).length ?? 0;

  function handleDemoError(error: unknown, fallback: string) {
    console.error("Demo client action failed:", error instanceof Error ? error.message : "unknown error");
    if (error instanceof DemoClientApiError && error.status === 410) {
      setSessionExpired(true);
      setDemoError("Термін дії демосесії завершився. Створіть нову демоверсію.");
      return;
    }
    setDemoError(fallback);
  }

  async function changeDemoRequestStatus(requestId: string, status: DemoRequestStatus) {
    if (!isDemo || pendingAction) return;
    setPendingAction(`request:${requestId}`);
    setDemoError(null);
    setDemoNotice(null);
    try {
      setDemoState(await updateDemoClientRequestStatus(requestId, status));
    } catch (error) {
      handleDemoError(error, "Не вдалося оновити демонстраційну заявку.");
    } finally {
      setPendingAction(null);
    }
  }

  async function submitDemoMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isDemo || pendingAction || !messageRequestId || !messageBody.trim()) return;
    setPendingAction("message");
    setDemoError(null);
    setDemoNotice(null);
    try {
      const nextState = await sendDemoClientMessage(messageRequestId, messageBody);
      setDemoState(nextState);
      setMessageBody("");
      setActiveDialog(nextState.messages.at(-1)?.id ?? "");
    } catch (error) {
      handleDemoError(error, "Не вдалося надіслати повідомлення.");
    } finally {
      setPendingAction(null);
    }
  }

  async function readDemoNotification(notificationId: string) {
    if (!isDemo || pendingAction) return;
    setPendingAction(`notification:${notificationId}`);
    setDemoError(null);
    setDemoNotice(null);
    try {
      setDemoState(await markDemoClientNotificationRead(notificationId));
    } catch (error) {
      handleDemoError(error, "Не вдалося оновити сповіщення.");
    } finally {
      setPendingAction(null);
    }
  }

  async function confirmDemoReset() {
    if (!isDemo || pendingAction) return;
    setPendingAction("reset");
    setDemoError(null);
    setDemoNotice(null);
    try {
      const nextState = await resetDemoClientState();
      setDemoState(nextState);
      setMessageRequestId(nextState.requests[0]?.id ?? "");
      setActiveDialog(nextState.messages[0]?.id ?? "");
      setShowResetConfirm(false);
      setDemoNotice("Демонстраційні дані відновлено.");
    } catch (error) {
      handleDemoError(error, "Не вдалося скинути демоверсію.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className={`client-cabinet${isAiLisaOpen ? " is-ailisa-open" : ""}`}>
      <aside className="client-side">
        <Link className="client-brand" href="/">
          <Image src="/logo/budpomich-logo-v4.svg" alt="БудПоміч" width={790} height={420} priority />
          <span>Кабінет клієнта</span>
        </Link>
        <ClientTabs
          activeView={primaryView}
          isDemo={isDemo}
          items={navItems}
          onChange={setActiveView}
          unreadNotifications={unreadNotifications}
        />
        <div className="client-side-hint">
          <span>Підказка</span>
          <p>Усі заявки, домовленості, календар і чат залишаються в БудПоміч.</p>
        </div>
      </aside>

      <main className="client-main">
        <Link className="client-mobile-brand" href="/" aria-label="БудПоміч, головна">
          <Image src="/logo/budpomich-logo-v4.svg" alt="БудПоміч" width={790} height={420} priority />
        </Link>
        {isDemo && <DemoCabinetSwitcher currentRole="client" />}
        {isDemo && (
          <aside className="client-demo-banner" aria-label="Демонстраційний режим">
            <div>
              <strong>Демонстраційний режим</strong>
              <p>
                Ви переглядаєте заповнений приклад кабінету клієнта. Усі заявки,
                користувачі, повідомлення та проєкти є демонстраційними.
              </p>
              {stateWarning && <span role="status">{stateWarning}</span>}
            </div>
            <nav aria-label="Дії демоверсії">
              <Link href="/auth/register">Створити акаунт</Link>
              <button
                disabled={Boolean(pendingAction)}
                onClick={() => setShowResetConfirm(true)}
                type="button"
              >
                Скинути демоверсію
              </button>
              <Link href="/">Вийти з демоверсії</Link>
            </nav>
          </aside>
        )}

        {isDemo && (demoError || demoNotice) && (
          <div
            className={demoError ? "client-demo-feedback is-error" : "client-demo-feedback is-success"}
            role={demoError ? "alert" : "status"}
          >
            <span>{demoError ?? demoNotice}</span>
            {sessionExpired && <Link href="/demo">Повернутися до вибору ролі</Link>}
          </div>
        )}

        {activeView !== "home" && activeView !== "catalog" && activeView !== "cabinet" && (
          <header className="client-topbar">
            <div>
              <span className="client-eyebrow">Будівельний помічник</span>
              <h1>Кабінет клієнта</h1>
              <p>Шукайте майстрів, ведіть заявки, погоджуйте кошториси і приймайте роботи в одному місці.</p>
            </div>
            <div className="client-user">
              <span>{profileInitials}</span>
              <div>
                <strong>{profileName}</strong>
                <small>{profileCity}</small>
              </div>
              {!isDemo && <LogoutButton className="client-logout" />}
            </div>
          </header>
        )}

        {activeView !== "home" && activeView !== "catalog" && activeView !== "cabinet" && (
          <div className="client-ruler" aria-hidden="true" />
        )}

        {activeView === "home" && (
          <section className="client-home" aria-labelledby="client-home-title">
            <div className="client-home-welcome">
              <span className="client-eyebrow">Головна</span>
              <h2 id="client-home-title">Доброго дня, {firstName}</h2>
              <span className="client-home-wave" aria-hidden="true">👋</span>
              <p>Ось що відбувається зараз</p>
            </div>

            {requestsLoading && !isDemo ? (
              <div className="client-home-feature is-loading" role="status">
                Завантажуємо ваші заявки…
              </div>
            ) : activeProject || activeRequest ? (
              <article className="client-home-feature">
                <div className="client-home-feature-top">
                  <span>{activeProject?.status ?? activeRequest?.status}</span>
                  <small>{activeProject ? "Активний проєкт" : "Активна заявка"}</small>
                </div>
                <h3>{activeProject?.title ?? activeRequest?.title}</h3>
                <p>
                  {activeProject
                    ? `${activeProject.address} · ${activeProject.performer}`
                    : activeRequest?.description}
                </p>
                {typeof activeProgress === "number" ? (
                  <div className="client-home-progress">
                    <i style={{ width: `${activeProgress}%` }} />
                    <strong>{activeProgress}%</strong>
                  </div>
                ) : null}
                {activeNextStage ? (
                  <p className="client-home-next-stage">
                    Наступний етап: <strong>{activeNextStage}</strong>
                  </p>
                ) : null}
                <dl>
                  <div>
                    <dt>Майстер</dt>
                    <dd>{activeProject?.performer ?? activeRequest?.masterName}</dd>
                  </div>
                  <div>
                    <dt>Домовленість</dt>
                    <dd>{activeAppointment ?? activeProject?.next}</dd>
                  </div>
                  {!activeProject && activeRequest ? (
                    <div>
                      <dt>Документи</dt>
                      <dd>{activeDocumentCount}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Сповіщення</dt>
                    <dd>{activeNotificationCount}</dd>
                  </div>
                </dl>
              </article>
            ) : (
              <div className="client-home-feature is-empty">
                <span>Поки що тут спокійно</span>
                <h3>Створіть першу заявку</h3>
                <p>Оберіть майстра в каталозі та опишіть потрібну роботу.</p>
              </div>
            )}

            <div className="client-home-actions">
              {(activeProject || activeRequest) && (
                <button
                  className="primary"
                  onClick={() => setActiveView(activeProject ? "projects" : "requests")}
                  type="button"
                >
                  {activeProject ? "Відкрити проєкт" : "Відкрити заявку"}
                  <ArrowRight aria-hidden="true" size={18} />
                </button>
              )}
              <button onClick={() => setActiveView("catalog")} type="button">
                <Plus aria-hidden="true" size={18} />
                Нова заявка
              </button>
            </div>

            <div className="client-quick-grid" aria-label="Швидкі дії">
              <button onClick={() => setActiveView("catalog")} type="button">
                <ShieldCheck aria-hidden="true" />
                <span><strong>Перевірені майстри</strong><small>{visibleMasters.length} у каталозі</small></span>
              </button>
              <button onClick={() => setActiveView("calendar")} type="button">
                <CalendarDays aria-hidden="true" />
                <span><strong>Календар</strong><small>{scheduledRequests.length} подій</small></span>
              </button>
              <button onClick={() => setActiveView("messages")} type="button">
                <MessageCircle aria-hidden="true" />
                <span><strong>Чати</strong><small>{messageRows.length} діалогів</small></span>
              </button>
            </div>

            <section className="client-home-intent" aria-labelledby="client-home-intent-title">
              <div>
                <Sparkles aria-hidden="true" size={19} />
                <strong id="client-home-intent-title">Що ви хочете зробити?</strong>
              </div>
              <nav aria-label="Швидкий вибір дії">
                <button onClick={() => setActiveView("catalog")} type="button">Знайти майстра</button>
                <button onClick={() => setActiveView("catalog")} type="button">Створити заявку</button>
                <button onClick={() => setActiveView("messages")} type="button">Відкрити чати</button>
              </nav>
            </section>
          </section>
        )}

        {activeView === "catalog" && (
          <section className="client-catalog-view">
            <MastersCatalogView embedded masters={visibleMasters} />
          </section>
        )}

        {activeView === "messages" && (
          <section className="client-chat-shell">
            <aside className="client-dialogs">
              <div className="client-view-head compact">
                <div>
                  <span className="client-eyebrow">02 · Повідомлення</span>
                  <h2>Чати</h2>
                </div>
              </div>
              {messageRows.map((dialog) => (
                <button
                  className={activeDialog === dialog.id ? "active" : ""}
                  onClick={() => {
                    setActiveDialog(dialog.id);
                    if (dialog.requestId) {
                      setActiveRequestId(dialog.requestId);
                      setMessageRequestId(dialog.requestId);
                    }
                  }}
                  type="button"
                  key={dialog.id}
                >
                  <span>{dialog.name.slice(0, 1)}</span>
                  <div>
                    <strong>{dialog.name}</strong>
                    <small>{dialog.project}</small>
                    <p>{dialog.last}</p>
                  </div>
                  <time>{dialog.time}</time>
                </button>
              ))}
              {messageRows.length === 0 && (
                <p className="client-empty">
                  {isDemo ? "Повідомлень поки немає." : "У вас поки немає повідомлень"}
                </p>
              )}
            </aside>
            {activeDialogRow ? (
              <div className="client-chat">
              <header>
                <div>
                  <h2>{activeDialogRow.name}</h2>
                  <p>{activeDialogRow.project} · {activeDialogRow.status}</p>
                </div>
                <button onClick={() => setActiveView("projects")} type="button">Відкрити проєкт</button>
              </header>
              <div className="client-chat-summary">
                {currentRequest ? (
                  <dl>
                    <div><dt>Заявка</dt><dd>{currentRequest.selectedServiceTitle || currentRequest.workType}</dd></div>
                    <div><dt>Майстер</dt><dd>{currentRequest.masterName}</dd></div>
                    <div><dt>Дата</dt><dd>{formatDemoDate(currentRequest.desiredDate)}</dd></div>
                    <div><dt>Адреса</dt><dd>{currentRequest.cityArea || profileCity}</dd></div>
                  </dl>
                ) : null}
              </div>
              <div className="client-chat-feed">
                {currentRequest ? (
                  <ClientPeriodConfirmation
                    confirmedPeriod={currentRequest.confirmedPeriod}
                    onConfirm={(period) => confirmRequestPeriod(currentRequest.id, period)}
                    pending={pendingAction === `confirm-period:${currentRequest.id}`}
                    periods={currentRequest.periods}
                  />
                ) : null}
                {requestsError ? <p className="client-chat-error">{requestsError}</p> : null}
                {messagesLoading ? (
                  <p className="client-chat-loading">Завантаження повідомлень…</p>
                ) : messagesError ? (
                  <p className="client-chat-error">{messagesError}</p>
                ) : currentMessages.length > 0 ? (
                  currentMessages.map((message) => (
                    <article
                      key={message.id}
                      className={message.senderRole === "client" ? "client" : "master"}
                    >
                      <p>{message.body}</p>
                      <time>{formatDemoTime(message.createdAt)}</time>
                    </article>
                  ))
                ) : (
                  <p className="client-empty">Почніть чат, надіславши перше повідомлення.</p>
                )}
              </div>
              {isDemo ? (
                <form className="client-demo-composer" onSubmit={submitDemoMessage}>
                  <label>
                    Заявка
                    <select
                      disabled={Boolean(pendingAction)}
                      onChange={(event) => setMessageRequestId(event.target.value)}
                      value={messageRequestId}
                    >
                      {(currentDemoState?.requests ?? []).map((request) => (
                        <option key={request.id} value={request.id}>{request.title}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Повідомлення
                    <textarea
                      disabled={Boolean(pendingAction)}
                      maxLength={2000}
                      onChange={(event) => setMessageBody(event.target.value)}
                      placeholder="Напишіть демонстраційне повідомлення…"
                      rows={3}
                      value={messageBody}
                    />
                  </label>
                  <button
                    disabled={Boolean(pendingAction) || !messageRequestId || !messageBody.trim()}
                    type="submit"
                  >
                    {pendingAction === "message" ? "Надсилаємо…" : "Надіслати"}
                  </button>
                </form>
              ) : (
                <form className="client-chat-composer" onSubmit={submitMessage}>
                  <label>
                    Повідомлення
                    <textarea
                      disabled={Boolean(pendingAction)}
                      maxLength={2000}
                      onChange={(event) => setMessageBody(event.target.value)}
                      placeholder="Напишіть повідомлення майстру…"
                      rows={3}
                      value={messageBody}
                    />
                  </label>
                  <button
                    disabled={Boolean(pendingAction) || !activeRequestId || !messageBody.trim()}
                    type="submit"
                  >
                    {pendingAction === "message" ? "Надсилаємо…" : "Надіслати"}
                  </button>
                </form>
              )}
            </div>
            ) : (
              <div className="client-chat">
                <p className="client-empty">
                  {isDemo ? "Повідомлень поки немає." : "У вас поки немає повідомлень"}
                </p>
                {isDemo && (
                  <form className="client-demo-composer" onSubmit={submitDemoMessage}>
                    <label>
                      Заявка
                      <select
                        disabled={Boolean(pendingAction)}
                        onChange={(event) => setMessageRequestId(event.target.value)}
                        value={messageRequestId}
                      >
                        {(currentDemoState?.requests ?? []).map((request) => (
                          <option key={request.id} value={request.id}>{request.title}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Повідомлення
                      <textarea
                        disabled={Boolean(pendingAction)}
                        maxLength={2000}
                        onChange={(event) => setMessageBody(event.target.value)}
                        placeholder="Напишіть демонстраційне повідомлення…"
                        rows={3}
                        value={messageBody}
                      />
                    </label>
                    <button
                      disabled={Boolean(pendingAction) || !messageRequestId || !messageBody.trim()}
                      type="submit"
                    >
                      {pendingAction === "message" ? "Надсилаємо…" : "Надіслати"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </section>
        )}

        {activeView === "calendar" && (
          <section className="client-view client-calendar-view">
            <div className="client-view-head">
              <div>
                <span className="client-eyebrow">Календар</span>
                <h2>Заплановані дати</h2>
                <p>Підтверджені дати, запропоновані періоди та заплановані роботи.</p>
              </div>
            </div>
            <ClientCalendar
              error={Boolean(requestsError)}
              loading={requestsLoading && !isDemo}
              onOpenChat={(requestId) => {
                setActiveDialog(requestId);
                setActiveRequestId(requestId);
                setMessageRequestId(requestId);
                setActiveView("messages");
              }}
              onOpenProject={(requestId) => {
                setActiveRequestId(requestId);
                setActiveView("projects");
              }}
              onOpenRequest={(requestId) => {
                setActiveRequestId(requestId);
                setActiveView("requests");
              }}
              onRetry={() => setCalendarReloadKey((current) => current + 1)}
              onViewRequests={() => setActiveView("requests")}
              requests={scheduledRequests}
            />
          </section>
        )}

        {activeView === "cabinet" && (
          <section className="client-view client-account-view">
            <div className="client-view-head">
              <div>
                <span className="client-eyebrow">Кабінет</span>
                <h2>Кабінет</h2>
                <p>{profileName}</p>
              </div>
            </div>
            <article className="client-account-profile">
              <span>{profileInitials}</span>
              <div>
                <h3>{profileName}</h3>
                <p>
                  {profileCity}
                  {registrationDate ? ` · клієнт із ${registrationDate}` : ""}
                </p>
              </div>
            </article>
            <div className="client-account-grid">
              <button onClick={() => setActiveView("projects")} type="button">
                <FolderKanban aria-hidden="true" />
                <span><strong>Мої проєкти</strong><small>{projectRows.length} активних</small></span>
                <ArrowRight aria-hidden="true" size={18} />
              </button>
              <button onClick={() => setActiveView("requests")} type="button">
                <ClipboardList aria-hidden="true" />
                <span><strong>Мої заявки</strong><small>{requestRows.length} заявок</small></span>
                <ArrowRight aria-hidden="true" size={18} />
              </button>
              <button onClick={() => setActiveView("apartment")} type="button">
                <House aria-hidden="true" />
                <span><strong>Моя квартира</strong><small>{profileCity}</small></span>
                <ArrowRight aria-hidden="true" size={18} />
              </button>
              <button onClick={() => setActiveView("history")} type="button">
                <FileClock aria-hidden="true" />
                <span><strong>Історія ремонту</strong><small>{completedRequests.length} завершених</small></span>
                <ArrowRight aria-hidden="true" size={18} />
              </button>
              <button onClick={() => setActiveView("favorites")} type="button">
                <Heart aria-hidden="true" />
                <span><strong>Обрані майстри</strong><small>{favoriteMasters.length} майстрів</small></span>
                <ArrowRight aria-hidden="true" size={18} />
              </button>
              <button onClick={() => setActiveView("documents")} type="button">
                <FileText aria-hidden="true" />
                <span><strong>Документи</strong><small>{documentRows.length} файлів</small></span>
                <ArrowRight aria-hidden="true" size={18} />
              </button>
              <button onClick={() => setActiveView("settings")} type="button">
                <Settings aria-hidden="true" />
                <span><strong>Налаштування</strong><small>Профіль і вихід</small></span>
                <ArrowRight aria-hidden="true" size={18} />
              </button>
            </div>
          </section>
        )}

        {activeView === "requests" && (
          <section className="client-view">
            <div className="client-view-head">
              <div>
                <span className="client-eyebrow">03 · Заявки</span>
                <h2>Мої заявки</h2>
              </div>
              {!isDemo && <Link href="/masters">Нова заявка</Link>}
            </div>
            <button className="client-back-cabinet" onClick={() => setActiveView("cabinet")} type="button">
              <ArrowLeft aria-hidden="true" size={20} />
              Назад до кабінету
            </button>
            <div className="client-request-list">
              {!isDemo && requestsLoading ? (
                <p className="client-empty" role="status">Завантаження заявок…</p>
              ) : requestRows.map((request) => (
                <article key={request.id}>
                  <div>
                    <span>{request.status}</span>
                    <h3>{request.title}</h3>
                    <p>{request.description}</p>
                    {isDemo && (
                      <label className="client-demo-status-field">
                        <span>Змінити статус</span>
                        <select
                          disabled={Boolean(pendingAction)}
                          onChange={(event) =>
                            changeDemoRequestStatus(
                              request.id,
                              event.target.value as DemoRequestStatus,
                            )
                          }
                          value={request.statusValue}
                        >
                          {demoRequestStatuses.map((status) => (
                            <option key={status} value={status}>
                              {formatDemoStatus(status)}
                            </option>
                          ))}
                        </select>
                        {pendingAction === `request:${request.id}` && <small>Зберігаємо…</small>}
                      </label>
                    )}
                  </div>
                  <dl>
                    <div><dt>Майстер</dt><dd>{request.masterName}</dd></div>
                    <div><dt>Адреса</dt><dd>{request.address}</dd></div>
                    <div><dt>Дата</dt><dd>{request.date}</dd></div>
                    <div><dt>Бюджет</dt><dd>{request.budget}</dd></div>
                  </dl>
                  {!isDemo && (
                    <><ClientPeriodConfirmation
                      confirmedPeriod={request.confirmedPeriod}
                      onConfirm={(period) => confirmRequestPeriod(request.id, period)}
                      pending={pendingAction === `confirm-period:${request.id}`}
                      periods={request.periods}
                    />{request.attachments.length ? <div className="client-request-attachments"><strong>Вкладення</strong>{request.attachments.map((file) => <a href={file.url} target="_blank" rel="noreferrer" key={file.id}>{file.originalName} · {Math.ceil(file.sizeBytes / 1024)} КБ</a>)}</div> : null}
                    <div className="client-request-actions"><button onClick={() => setActiveView("messages")} type="button">Відкрити чат</button>{request.statusValue === "completed" && !clientReviews.some((review) => review.bookingId === request.id) ? <button type="button" onClick={() => setReviewBookingId((current) => current === request.id ? "" : request.id)}>Залишити відгук</button> : null}{clientReviews.some((review) => review.bookingId === request.id) ? <span>Відгук опубліковано</span> : null}</div>
                    {requestsError ? <p className="client-chat-error">{requestsError}</p> : null}
                    </>
                  )}
                  {!isDemo && reviewBookingId === request.id ? <ReviewForm bookingId={request.id} onCreated={(review) => { setClientReviews((current) => [review, ...current]); setReviewBookingId(""); }} /> : null}
                </article>
              ))}
              {!requestsLoading && requestRows.length === 0 && (
                <p className="client-empty">
                  {isDemo ? "У демоверсії поки немає заявок." : "У вас поки немає заявок"}
                </p>
              )}
            </div>
          </section>
        )}

        {activeView === "projects" && (
          <section className="client-view">
            <div className="client-view-head">
              <div>
                <span className="client-eyebrow">04 · Проєкти</span>
                <h2>Мої проєкти</h2>
              </div>
            </div>
            <button className="client-back-cabinet" onClick={() => setActiveView("cabinet")} type="button">
              <ArrowLeft aria-hidden="true" size={20} />
              Назад до кабінету
            </button>
            <div className="client-project-list">
              {projectRows.map((project) => (
                <article key={project.id}>
                  <div className="client-project-row">
                    <div>
                      <span>{project.status}</span>
                      <h3>{project.title}</h3>
                      <p>{project.address} · {project.performer}</p>
                    </div>
                    <strong>{project.cost}</strong>
                  </div>
                  <div className="client-progress"><i style={{ width: `${project.progress}%` }} /></div>
                  <div className="client-project-meta">
                    <span>Етап: <b>{project.stage}</b></span>
                    <span>Оплачено: <b>{project.paid}</b></span>
                    <span>{project.next}</span>
                  </div>
                  {!isDemo && <div className="client-project-actions">
                    <button onClick={() => setActiveView("messages")} type="button">Чат</button>
                    <button type="button">Кошторис</button>
                    <button type="button">Фото процесу</button>
                    <button type="button">Прийняти роботу</button>
                  </div>}
                </article>
              ))}
              {projectRows.length === 0 && (
                <p className="client-empty">
                  {isDemo
                    ? "Активних проєктів поки немає."
                    : "У вас поки немає активних проєктів"}
                </p>
              )}
            </div>
          </section>
        )}

        {activeView === "notifications" && (
          <section className="client-view">
            <div className="client-view-head">
              <div>
                <span className="client-eyebrow">Сповіщення</span>
                <h2>Оновлення кабінету</h2>
              </div>
            </div>
            <button className="client-back-cabinet" onClick={() => setActiveView("cabinet")} type="button">
              <ArrowLeft aria-hidden="true" size={20} />
              Назад до кабінету
            </button>
            <div className="client-notification-list">
              {(currentDemoState?.notifications ?? []).map((notification) => (
                <article className={notification.isRead ? "is-read" : ""} key={notification.id}>
                  <Bell aria-hidden="true" size={18} />
                  <div>
                    <strong>{notification.title}</strong>
                    <small>{notification.isRead ? "Переглянуто" : "Нове сповіщення"}</small>
                  </div>
                  {!notification.isRead && (
                    <button
                      disabled={Boolean(pendingAction)}
                      onClick={() => readDemoNotification(notification.id)}
                      type="button"
                    >
                      {pendingAction === `notification:${notification.id}`
                        ? "Оновлюємо…"
                        : "Позначити прочитаним"}
                    </button>
                  )}
                </article>
              ))}
              {(currentDemoState?.notifications.length ?? 0) === 0 && (
                <p className="client-empty">Сповіщень поки немає.</p>
              )}
            </div>
          </section>
        )}

        {activeView === "apartment" && (
          <section className="client-view client-account-view">
            <div className="client-view-head">
              <div>
                <span className="client-eyebrow">Моя квартира</span>
                <h2>Дані об’єкта</h2>
              </div>
            </div>
            <button className="client-back-cabinet" onClick={() => setActiveView("cabinet")} type="button">
              <ArrowLeft aria-hidden="true" size={20} />
              Назад до кабінету
            </button>
            <article className="client-settings-card">
              <House aria-hidden="true" />
              <div>
                <strong>Місто або район</strong>
                <p>{profileCity}</p>
              </div>
            </article>
          </section>
        )}

        {activeView === "history" && (
          <section className="client-view">
            <div className="client-view-head">
              <div>
                <span className="client-eyebrow">Історія ремонту</span>
                <h2>Завершені роботи</h2>
              </div>
            </div>
            <button className="client-back-cabinet" onClick={() => setActiveView("cabinet")} type="button">
              <ArrowLeft aria-hidden="true" size={20} />
              Назад до кабінету
            </button>
            <div className="client-request-list">
              {completedRequests.map((request) => (
                <article key={request.id}>
                  <div>
                    <span>{request.status}</span>
                    <h3>{request.title}</h3>
                    <p>{request.masterName} · {request.address}</p>
                  </div>
                </article>
              ))}
              {completedRequests.length === 0 && (
                <p className="client-empty">Завершених ремонтів поки немає.</p>
              )}
            </div>
          </section>
        )}

        {activeView === "documents" && (
          <section className="client-view client-account-view">
            <div className="client-view-head">
              <div>
                <span className="client-eyebrow">Документи</span>
                <h2>Файли за заявками</h2>
              </div>
            </div>
            <button className="client-back-cabinet" onClick={() => setActiveView("cabinet")} type="button">
              <ArrowLeft aria-hidden="true" size={20} />
              Назад до кабінету
            </button>
            <div className="client-document-list">
              {documentRows.map((document) => (
                <article key={document.id}>
                  <FileText aria-hidden="true" />
                  <div>
                    <strong>{document.originalName}</strong>
                    <small>{document.requestTitle}</small>
                  </div>
                  {document.url && <a href={document.url} rel="noreferrer" target="_blank">Відкрити</a>}
                </article>
              ))}
              {documentRows.length === 0 && (
                <p className="client-empty">Документів поки немає.</p>
              )}
            </div>
          </section>
        )}

        {activeView === "settings" && (
          <section className="client-view client-account-view">
            <div className="client-view-head">
              <div>
                <span className="client-eyebrow">Налаштування</span>
                <h2>Профіль клієнта</h2>
              </div>
            </div>
            <button
              className="client-back-cabinet"
              onClick={() => setActiveView("cabinet")}
              type="button"
            >
              <ArrowLeft aria-hidden="true" size={20} />
              Назад до кабінету
            </button>
            <article className="client-settings-card">
              <Settings aria-hidden="true" />
              <div>
                <strong>{profileName}</strong>
                <p>{profile?.email || profileCity}</p>
              </div>
            </article>
            {!isDemo && <LogoutButton className="client-settings-logout" />}
          </section>
        )}

        {activeView === "favorites" && (
          <section className="client-view">
            <div className="client-view-head">
              <div>
                <span className="client-eyebrow">05 · Обране</span>
                <h2>Збережені майстри</h2>
              </div>
            </div>
            <button className="client-back-cabinet" onClick={() => setActiveView("cabinet")} type="button">
              <ArrowLeft aria-hidden="true" size={20} />
              Назад до кабінету
            </button>
            <div className="client-favorites">
              {favoriteMasters.map((master) => (
                <article key={master.id}>
                  <Heart size={18} />
                  <div>
                    <h3>{master.name}</h3>
                    <p>{master.profession} · {master.city} · {master.experience}</p>
                  </div>
                  <Link href={`/profile/${master.id}`}>Профіль</Link>
                </article>
              ))}
              {favoriteMasters.length === 0 && (
                <p className="client-empty">У вас поки немає збережених майстрів</p>
              )}
            </div>
          </section>
        )}
      </main>

      <span className="client-ailisa-label">AI-помічник БудПоміч</span>
      <button
        aria-label={isAiLisaOpen ? "Закрити AiLisa" : "Відкрити AiLisa"}
        aria-pressed={isAiLisaOpen}
        className={`client-ailisa-trigger${isAiLisaOpen ? " is-open" : ""}`}
        onClick={() => setIsAiLisaOpen((current) => !current)}
        ref={aiLisaTriggerRef}
        title="AiLisa"
        type="button"
      >
        <AiLisaBrandMark />
      </button>

      <button
        aria-label="Закрити AiLisa"
        className={`client-ailisa-backdrop${isAiLisaOpen ? " is-open" : ""}`}
        onClick={closeAiLisa}
        tabIndex={isAiLisaOpen ? 0 : -1}
        type="button"
      />

      <aside
        aria-hidden={!isAiLisaOpen}
        aria-labelledby="ailisa-title"
        aria-modal={isAiLisaOpen ? true : undefined}
        className={`client-ailisa-panel${isAiLisaOpen ? " is-open" : ""}`}
        role="dialog"
      >
          <header>
            <AiLisaBrandMark />
            <div>
              <strong id="ailisa-title">AiLisa</strong>
              <small>AI-помічник БудПоміч</small>
            </div>
            <button
              aria-label="Закрити AiLisa"
              onClick={closeAiLisa}
              title="Закрити"
              type="button"
            >
              <X aria-hidden="true" />
            </button>
          </header>
          <div className="client-ailisa-content">
            {showAiLisaExample ? (
              <section className="client-ailisa-example">
                <div className="client-ailisa-example-head">
                  <div>
                    <span>Демонстраційний діалог</span>
                    <h2>Приклад роботи AiLisa</h2>
                  </div>
                  <button onClick={() => setShowAiLisaExample(false)} type="button">
                    Закрити приклад
                  </button>
                </div>

                <div className="client-ailisa-demo-message is-ai">
                  👋 Опишіть проблему своїми словами — я визначу потрібного
                  фахівця, поставлю уточнювальні запитання та допоможу
                  зорієнтуватися у вартості.
                </div>
                <div className="client-ailisa-demo-chips">
                  <span>Знайти сантехніка</span>
                  <span>Порахувати вартість ремонту</span>
                  <span>Підібрати матеріали</span>
                  <span>Пояснити кошторис</span>
                </div>

                <div className="client-ailisa-demo-message is-client">
                  Потрібно замінити змішувач, тече вода.
                </div>
                <div className="client-ailisa-demo-message is-ai">
                  <p>Зрозуміла проблему.</p>
                  <strong>Категорія: Сантехніка</strong>
                  <p>
                    Орієнтовна вартість заміни змішувача — <b>600–1 200 ₴</b> за
                    роботу, залежно від моделі та складності підключення.
                  </p>
                  <p>
                    Уточніть, будь ласка: змішувач потрібен для кухні чи ванної?
                    Новий змішувач уже придбаний?
                  </p>
                  <small>
                    Це орієнтовна оцінка. Остаточну вартість підтверджує майстер
                    після уточнення обсягу робіт.
                  </small>
                </div>
                <div className="client-ailisa-demo-message is-client">
                  Для ванної. Нового змішувача ще немає.
                </div>
                <div className="client-ailisa-demo-message is-ai">
                  <p>
                    Добре. Я допоможу підібрати модель змішувача та знайти
                    сантехніка з вільною датою.
                  </p>
                  <p>
                    Для точнішого підбору уточніть:<br />
                    — потрібен змішувач для ванни чи душової кабіни;<br />
                    — чи потрібно демонтувати старий;<br />
                    — у якому місті знаходиться об’єкт.
                  </p>
                </div>

                <article className="client-ailisa-demo-master">
                  <span>Демонстраційний приклад</span>
                  <h3>Приклад рекомендованого майстра</h3>
                  <p>Сантехнік · ★ 4.9 · 128 відгуків</p>
                  <div>
                    <strong>Доступний для заявки</strong>
                    <b>Орієнтовно від 600 ₴</b>
                  </div>
                </article>

                <div className="client-ailisa-demo-actions">
                  <button
                    onClick={() => {
                      setShowAiLisaExample(false);
                      setIsAiLisaOpen(false);
                      setActiveView("catalog");
                    }}
                    type="button"
                  >
                    Перейти до каталогу
                  </button>
                  <button
                    onClick={() => {
                      setShowAiLisaExample(false);
                      setIsAiLisaOpen(false);
                      setActiveView("catalog");
                    }}
                    type="button"
                  >
                    Створити заявку
                  </button>
                  <button
                    onClick={() => {
                      setShowAiLisaExample(false);
                      setTimeout(() => aiLisaInputRef.current?.focus(), 0);
                    }}
                    type="button"
                  >
                    Поставити своє запитання
                  </button>
                </div>
              </section>
            ) : (
              <>
                <section className="client-ailisa-welcome">
                  <AiLisaBrandMark large />
                  <div>
                    <h2>
                      Вітаю, {firstName}! Я <span className="client-ailisa-name"><b>Ai</b>Lisa</span> ✨
                      <span className="client-ailisa-subtitle">AI-помічник БудПоміч</span>
                    </h2>
                    <p>
                      Допоможу знайти майстра, створити заявку, зорієнтуватися у
                      вартості та підказати наступний крок.
                    </p>
                  </div>
                </section>

                <div className="client-ailisa-actions">
                  {aiLisaActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.title}
                        onClick={() => {
                          setAiLisaDraft(action.prompt);
                          setAiLisaUnavailable(false);
                          setTimeout(() => aiLisaInputRef.current?.focus(), 0);
                        }}
                        type="button"
                      >
                        <Icon aria-hidden="true" />
                        <span>
                          <strong>{action.title}</strong>
                          <small>{action.description}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {!hasStartedAiLisaConversation ? (
                  <section className="client-ailisa-example-invite">
                    <div>
                      <strong>Приклад роботи AiLisa</strong>
                      <p>
                        Подивіться, як AiLisa допомагає від опису проблеми до
                        пошуку відповідного майстра.
                      </p>
                    </div>
                    <button onClick={() => setShowAiLisaExample(true)} type="button">
                      Переглянути приклад
                    </button>
                  </section>
                ) : (
                  <button
                    className="client-ailisa-example-link"
                    onClick={() => setShowAiLisaExample(true)}
                    type="button"
                  >
                    Показати приклад
                  </button>
                )}

                {aiLisaUnavailable && (
                  <div className="client-ailisa-error" role="alert">
                    <p>AiLisa тимчасово недоступна. Спробуйте ще раз трохи пізніше.</p>
                    <button onClick={() => setAiLisaUnavailable(false)} type="button">
                      Спробувати ще раз
                    </button>
                  </div>
                )}

                <form
                  className="client-ailisa-composer"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!aiLisaDraft.trim()) return;
                    setHasStartedAiLisaConversation(true);
                    setShowAiLisaExample(false);
                    setAiLisaUnavailable(true);
                  }}
                >
                  <label htmlFor="ailisa-question">Ваше запитання</label>
                  <div>
                    <textarea
                      id="ailisa-question"
                      onChange={(event) => {
                        setAiLisaDraft(event.target.value);
                        setAiLisaUnavailable(false);
                      }}
                      placeholder="Опишіть ситуацію своїми словами…"
                      ref={aiLisaInputRef}
                      rows={2}
                      value={aiLisaDraft}
                    />
                    <button
                      aria-label="Надіслати запитання AiLisa"
                      disabled={!aiLisaDraft.trim()}
                      title="Надіслати"
                      type="submit"
                    >
                      <Send aria-hidden="true" />
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
      </aside>

      {isDemo && showResetConfirm && (
        <div className="client-demo-modal" role="presentation">
          <section aria-labelledby="demo-reset-title" aria-modal="true" role="dialog">
            <span className="client-eyebrow">Демонстраційний режим</span>
            <h2 id="demo-reset-title">Скинути демоверсію?</h2>
            <p>
              Усі ваші зміни в демоверсії буде скасовано. Відновити початкові дані?
            </p>
            <div>
              <button
                disabled={Boolean(pendingAction)}
                onClick={() => setShowResetConfirm(false)}
                type="button"
              >
                Скасувати
              </button>
              <button
                disabled={Boolean(pendingAction)}
                onClick={confirmDemoReset}
                type="button"
              >
                {pendingAction === "reset" ? "Відновлюємо…" : "Скинути"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
