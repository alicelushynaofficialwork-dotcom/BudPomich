"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, Heart, Search } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { DemoCabinetSwitcher } from "@/components/demo/DemoCabinetSwitcher";
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
import type { MasterRequest, RequestMessage } from "@/lib/requests";
import { getProfileInitials } from "@/lib/profile";
import type { MasterReview } from "@/lib/reviews";

type ClientProfile = {
  fullName: string | null;
  city: string | null;
  email: string | null;
};

type ClientCabinetAppProps = {
  masters?: MasterProfile[];
  mode?: "real" | "demo";
  initialData?: DemoClientState;
  profile?: ClientProfile;
  stateWarning?: string;
};

type ClientView = "search" | "messages" | "requests" | "projects" | "favorites" | "notifications";

const realNavItems: { id: ClientView; label: string }[] = [
  { id: "search", label: "Пошук виконавців" },
  { id: "messages", label: "Повідомлення" },
  { id: "requests", label: "Мої заявки" },
  { id: "projects", label: "Мої проєкти" },
  { id: "favorites", label: "Обране" },
];

const demoNavItems: { id: ClientView; label: string }[] = [
  { id: "requests", label: "Мої заявки" },
  { id: "projects", label: "Мої проєкти" },
  { id: "messages", label: "Повідомлення" },
  { id: "notifications", label: "Сповіщення" },
];

type ClientTabsProps = {
  activeView: ClientView;
  isDemo: boolean;
  items: { id: ClientView; label: string }[];
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
        {items.map((item, index) => {
          const active = activeView === item.id;
          return (
            <button aria-current={active ? "page" : undefined} className={active ? "active" : ""} onClick={() => onChange(item.id)} type="button" key={item.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
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

function formatDemoBudget(value: number | null) {
  return value === null
    ? "Бюджет не вказано"
    : `${new Intl.NumberFormat("uk-UA").format(value)} грн`;
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
  const [activeView, setActiveView] = useState<ClientView>(isDemo ? "requests" : "messages");
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
  const [realRequests, setRealRequests] = useState<MasterRequest[]>([]);
  const [realMessages, setRealMessages] = useState<RequestMessage[]>([]);
  const [clientReviews, setClientReviews] = useState<MasterReview[]>([]);
  const [reviewBookingId, setReviewBookingId] = useState("");
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [requestsLoading, setRequestsLoading] = useState(true);
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
        date: formatDemoDate(request.desiredDate),
        budget: formatDemoBudget(request.budget),
        description: "Дані заявки завантажено з демонстраційної сесії.",
        periods: [],
        attachments: [],
      }))
    : realRequests.map((request) => ({
        id: request.id,
        title: request.selectedServiceTitle || request.workType || "Заявка",
        masterName: request.masterName,
        address: request.cityArea || profileCity,
        status: formatDemoStatus(request.status),
        statusValue: request.status,
        date: formatDemoDate(request.desiredDate),
        budget: request.budget ? request.budget : "Бюджет не вказано",
        description: request.description || request.workType || "Деталі заявки",
        periods: request.periods,
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
  }, [isDemo, activeRequestId]);

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
    <section className="client-cabinet">
      <aside className="client-side">
        <Link className="client-brand" href="/">
          <Image src="/logo/budpomich-logo-v4.svg" alt="БудПоміч" width={790} height={420} priority />
          <span>Кабінет клієнта</span>
        </Link>
        <ClientTabs
          activeView={activeView}
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

        <div className="client-ruler" aria-hidden="true" />

        {activeView === "search" && (
          <section className="client-view">
            <div className="client-view-head">
              <div>
                <span className="client-eyebrow">01 · Пошук</span>
                <h2>Знайти виконавця</h2>
              </div>
              <Link href="/masters">Відкрити каталог</Link>
            </div>
            <div className="client-search-panel">
              <label>
                <Search size={18} />
                <input placeholder="Послуга, майстер або місто" />
              </label>
              <button type="button">Підібрати</button>
            </div>
            <div className="client-master-grid">
              {visibleMasters.slice(0, 4).map((master) => (
                <article className="client-master-card" key={master.id}>
                  {master.avatarUrl ? (
                    <Image src={master.avatarUrl} alt={master.name} width={74} height={74} />
                  ) : (
                    <span>{master.initials}</span>
                  )}
                  <div>
                    <small>{master.profession}</small>
                    <h3>{master.name}</h3>
                    <p>{master.description}</p>
                    <div>
                      <em>{master.city}</em>
                      <em>{master.experience}</em>
                      <em>від {master.priceFrom} грн</em>
                    </div>
                  </div>
                  <Link href={`/profile/${master.id}`}>Профіль</Link>
                </article>
              ))}
              {visibleMasters.length === 0 && (
                <p className="client-empty">
                  {isDemo
                    ? "У демоверсії каталог майстрів у цьому розділі не завантажується."
                    : "Каталог виконавців поки недоступний."}
                </p>
              )}
            </div>
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

        {activeView === "requests" && (
          <section className="client-view">
            <div className="client-view-head">
              <div>
                <span className="client-eyebrow">03 · Заявки</span>
                <h2>Мої заявки</h2>
              </div>
              {!isDemo && <Link href="/masters">Нова заявка</Link>}
            </div>
            <div className="client-request-list">
              {requestRows.map((request) => (
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
                    <>{request.periods.length ? <div className="client-request-periods"><strong>Запропоновані періоди</strong>{request.periods.map((period, index) => <span key={`${period.dateFrom}-${period.dateTo}`}>{index + 1}. {period.dateFrom === period.dateTo ? period.dateFrom : `${period.dateFrom} — ${period.dateTo}`}</span>)}</div> : null}{request.attachments.length ? <div className="client-request-attachments"><strong>Вкладення</strong>{request.attachments.map((file) => <a href={file.url} target="_blank" rel="noreferrer" key={file.id}>{file.originalName} · {Math.ceil(file.sizeBytes / 1024)} КБ</a>)}</div> : null}
                    <div className="client-request-actions"><button onClick={() => setActiveView("messages")} type="button">Відкрити чат</button>{request.statusValue === "completed" && !clientReviews.some((review) => review.bookingId === request.id) ? <button type="button" onClick={() => setReviewBookingId((current) => current === request.id ? "" : request.id)}>Залишити відгук</button> : null}{clientReviews.some((review) => review.bookingId === request.id) ? <span>Відгук опубліковано</span> : null}</div>
                    </>
                  )}
                  {!isDemo && reviewBookingId === request.id ? <ReviewForm bookingId={request.id} onCreated={(review) => { setClientReviews((current) => [review, ...current]); setReviewBookingId(""); }} /> : null}
                </article>
              ))}
              {requestRows.length === 0 && (
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

        {activeView === "favorites" && (
          <section className="client-view">
            <div className="client-view-head">
              <div>
                <span className="client-eyebrow">05 · Обране</span>
                <h2>Збережені майстри</h2>
              </div>
            </div>
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
