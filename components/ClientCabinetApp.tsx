"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, Heart, Search } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { DemoCabinetSwitcher } from "@/components/demo/DemoCabinetSwitcher";
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

type ClientCabinetAppProps = {
  masters?: MasterProfile[];
  mode?: "real" | "demo";
  initialData?: DemoClientState;
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

const clientRequests = [
  {
    id: "req-1",
    master: "Андрей Пономаренко",
    service: "Укладка плитки",
    address: "Київ, Печерський район",
    status: "Очікує кошторис",
    date: "23 липня 2026",
    text: "Плитка у ванній кімнаті, потрібна порада щодо гідроізоляції.",
  },
  {
    id: "req-2",
    master: "Андрій Коваль",
    service: "Електрика",
    address: "Київ, Оболонь",
    status: "Дату запропоновано",
    date: "20 липня 2026",
    text: "Заміна проводки у двокімнатній квартирі.",
  },
];

const clientProjects = [
  {
    id: "project-1",
    title: "Ванна кімната",
    performer: "Андрей Пономаренко",
    address: "Київ, Печерський район",
    status: "В роботі",
    stage: "Плиткові роботи",
    progress: 62,
    next: "Наступний візит: 23 липня",
    cost: "22 000 грн",
    paid: "8 000 грн",
  },
  {
    id: "project-2",
    title: "Електрика у квартирі",
    performer: "Андрій Коваль",
    address: "Київ, Оболонь",
    status: "Очікує погодження",
    stage: "Кошторис на розгляді",
    progress: 18,
    next: "Потрібно погодити кошторис",
    cost: "25 000 грн",
    paid: "0 грн",
  },
];

const dialogRows = [
  {
    id: "chat-1",
    name: "Андрей Пономаренко",
    project: "Ванна кімната",
    status: "Потрібна відповідь",
    last: "Можу почати з демонтажу у вівторок. Підтверджуєте?",
    time: "10:42",
  },
  {
    id: "chat-2",
    name: "Андрій Коваль",
    project: "Електрика",
    status: "Кошторис надіслано",
    last: "Надіслав попередній кошторис по матеріалах і роботах.",
    time: "09:15",
  },
];

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
  stateWarning,
}: ClientCabinetAppProps) {
  const isDemo = mode === "demo";
  const navItems = isDemo ? demoNavItems : realNavItems;
  const [activeView, setActiveView] = useState<ClientView>(isDemo ? "requests" : "messages");
  const [activeDialog, setActiveDialog] = useState(dialogRows[0]?.id ?? "");
  const [demoState, setDemoState] = useState(initialData);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [messageRequestId, setMessageRequestId] = useState(initialData?.requests[0]?.id ?? "");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const currentDemoState = demoState ?? initialData;
  const profileName = currentDemoState?.profile.name ?? "Олена К.";
  const profileCity = currentDemoState?.profile.city ?? "Київ";
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
      }))
    : clientRequests.map((request) => ({
        id: request.id,
        title: request.service,
        masterName: request.master,
        address: request.address,
        status: request.status,
        statusValue: "new",
        date: request.date,
        budget: "Бюджет узгоджується",
        description: request.text,
      }));
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
    : clientProjects;
  const messageRows = useMemo(
    () =>
      isDemo
        ? (currentDemoState?.messages ?? []).map((message) => ({
            id: message.id,
            name: message.sender,
            project: requestRows.find((request) => request.id === message.requestId)?.title ?? "Демопроєкт",
            status: "Демонстраційне повідомлення",
            last: message.body,
            time: formatDemoTime(message.createdAt),
            requestId: message.requestId,
          }))
        : dialogRows.map((dialog) => ({ ...dialog, requestId: "" })),
    [currentDemoState?.messages, isDemo, requestRows],
  );
  const activeDialogRow = messageRows.find((dialog) => dialog.id === activeDialog) ?? messageRows[0];
  const favoriteMasters = useMemo(() => (isDemo ? [] : masters.slice(0, 3)), [isDemo, masters]);
  const visibleMasters = isDemo ? [] : masters;
  const profileInitials = profileName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
            <span>{isDemo ? profileInitials : "ОК"}</span>
            <div>
              <strong>{isDemo ? profileName : "Олена К."}</strong>
              <small>{isDemo ? profileCity : "Київ"}</small>
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
                <p className="client-empty">У демоверсії каталог майстрів у цьому розділі не завантажується.</p>
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
                    if (dialog.requestId) setMessageRequestId(dialog.requestId);
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
                <p className="client-empty">Повідомлень поки немає.</p>
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
              <div className="client-chat-feed">
                <article className="master">
                  <p>{activeDialogRow.last}</p>
                  <time>{activeDialogRow.time}</time>
                </article>
                {!isDemo && (
                  <>
                    <article className="client">
                      <p>Так, підходить. Давайте зафіксуємо дату і суму в проєкті.</p>
                      <time>10:48</time>
                    </article>
                    <article className="client-agreement">
                      <span>Картка погодження</span>
                      <strong>Дата і кошторис</strong>
                      <p>23 липня 2026 · орієнтовно 22 000 грн</p>
                      <div>
                        <button type="button">Погодити</button>
                        <button type="button">Обговорити</button>
                      </div>
                    </article>
                  </>
                )}
              </div>
              {!isDemo && (
                <form className="client-composer">
                  <input placeholder="Напишіть повідомлення..." />
                  <button type="button">Надіслати</button>
                </form>
              )}
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
            ) : (
              <div className="client-chat">
                <p className="client-empty">Повідомлень поки немає.</p>
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
            {!isDemo && <aside className="client-project-summary">
              <span className="client-eyebrow">Проєкт</span>
              <h2>Ванна кімната</h2>
              <p>Усі домовленості з майстром зберігаються тут: дата, чат, кошторис, фото і приймання роботи.</p>
              <dl>
                <div><dt>Статус</dt><dd>В роботі</dd></div>
                <div><dt>Вартість</dt><dd>22 000 грн</dd></div>
                <div><dt>Оплачено</dt><dd>8 000 грн</dd></div>
                <div><dt>Наступний крок</dt><dd>Плиткові роботи</dd></div>
              </dl>
              <button onClick={() => setActiveView("projects")} type="button">Деталі проєкту</button>
            </aside>}
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
                    <button onClick={() => setActiveView("messages")} type="button">Відкрити чат</button>
                  )}
                </article>
              ))}
              {requestRows.length === 0 && (
                <p className="client-empty">У демоверсії поки немає заявок.</p>
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
                <p className="client-empty">Активних проєктів поки немає.</p>
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
