"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { DemoCabinetSwitcher } from "@/components/demo/DemoCabinetSwitcher";
import { DemoClientApiError } from "@/lib/demo/client-demo-api";
import {
  markDemoMasterNotificationRead,
  resetDemoMasterState,
  sendDemoMasterMessage,
  updateDemoMasterCalendarStatus,
  updateDemoMasterRequestStatus,
} from "@/lib/demo/master-demo-api";
import type {
  DemoMasterRequestStatus,
  DemoMasterState,
} from "@/lib/demo/types";

type MasterView = "overview" | "requests" | "calendar" | "messages" | "projects" | "notifications";

const navItems: Array<{ id: MasterView; label: string }> = [
  { id: "overview", label: "Огляд" },
  { id: "requests", label: "Заявки" },
  { id: "calendar", label: "Календар" },
  { id: "messages", label: "Повідомлення" },
  { id: "projects", label: "Проєкти" },
  { id: "notifications", label: "Сповіщення" },
];

const statusLabels: Record<string, string> = {
  new: "Нова",
  viewed: "Переглянута",
  in_discussion: "В обговоренні",
  accepted: "Прийнята",
  declined: "Відхилена",
  scheduled: "Запланована",
  in_progress: "В роботі",
  completed: "Завершена",
  cancelled: "Скасована",
};

const requestActions: Array<{ label: string; status: DemoMasterRequestStatus }> = [
  { label: "Переглянути", status: "viewed" },
  { label: "Прийняти", status: "accepted" },
  { label: "Відхилити", status: "declined" },
  { label: "Почати роботу", status: "in_progress" },
  { label: "Завершити", status: "completed" },
];

function money(value: number | null) {
  return value === null ? "Бюджет не вказано" : `${new Intl.NumberFormat("uk-UA").format(value)} грн`;
}

function date(value: string) {
  const parsed = new Date(value);
  return value && !Number.isNaN(parsed.getTime())
    ? new Intl.DateTimeFormat("uk-UA", { dateStyle: "long" }).format(parsed)
    : "Дату не вказано";
}

export function DemoMasterCabinetApp({
  initialData,
  stateWarning,
}: {
  initialData: DemoMasterState;
  stateWarning?: string;
}) {
  const [state, setState] = useState(initialData);
  const [view, setView] = useState<MasterView>("overview");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [messageRequestId, setMessageRequestId] = useState(initialData.requests[0]?.id ?? "");
  const [selectedCalendarId, setSelectedCalendarId] = useState(initialData.calendar[0]?.id ?? "");
  const [resetOpen, setResetOpen] = useState(false);
  const selectedCalendar = state.calendar.find((item) => item.id === selectedCalendarId);
  const unread = state.notifications.filter((item) => !item.isRead).length;

  function fail(actionError: unknown, fallback: string) {
    console.error("Demo master action failed:", actionError instanceof Error ? actionError.message : "unknown error");
    if (actionError instanceof DemoClientApiError && actionError.status === 410) {
      setExpired(true);
      setError("Термін дії демосесії завершився. Створіть нову демоверсію.");
      return;
    }
    setError(fallback);
  }

  async function changeRequest(requestId: string, status: DemoMasterRequestStatus) {
    if (pending) return;
    setPending(`request:${requestId}:${status}`);
    setError(null);
    setNotice(null);
    try {
      setState(await updateDemoMasterRequestStatus(requestId, status));
    } catch (actionError) {
      fail(actionError, "Не вдалося оновити демонстраційну заявку.");
    } finally {
      setPending(null);
    }
  }

  async function toggleCalendar(itemId: string, status: "busy" | "available") {
    if (pending) return;
    setPending(`calendar:${itemId}`);
    setError(null);
    setNotice(null);
    try {
      setState(await updateDemoMasterCalendarStatus(itemId, status));
    } catch (actionError) {
      fail(actionError, "Не вдалося оновити демонстраційний календар.");
    } finally {
      setPending(null);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !messageRequestId || !messageBody.trim()) return;
    setPending("message");
    setError(null);
    setNotice(null);
    try {
      setState(await sendDemoMasterMessage(messageRequestId, messageBody));
      setMessageBody("");
    } catch (actionError) {
      fail(actionError, "Не вдалося надіслати повідомлення.");
    } finally {
      setPending(null);
    }
  }

  async function readNotification(notificationId: string) {
    if (pending) return;
    setPending(`notification:${notificationId}`);
    setError(null);
    try {
      setState(await markDemoMasterNotificationRead(notificationId));
    } catch (actionError) {
      fail(actionError, "Не вдалося оновити сповіщення.");
    } finally {
      setPending(null);
    }
  }

  async function resetDemo() {
    if (pending) return;
    setPending("reset");
    setError(null);
    setNotice(null);
    try {
      const restored = await resetDemoMasterState();
      setState(restored);
      setMessageRequestId(restored.requests[0]?.id ?? "");
      setSelectedCalendarId(restored.calendar[0]?.id ?? "");
      setResetOpen(false);
      setNotice("Демонстраційні дані майстра відновлено.");
    } catch (actionError) {
      fail(actionError, "Не вдалося скинути демоверсію майстра.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="demo-master-cabinet">
      <aside className="demo-master-side">
        <Link href="/" className="demo-master-brand">BudPomich <span>Кабінет майстра</span></Link>
        <nav aria-label="Розділи демокабінету майстра">
          {navItems.map((item, index) => (
            <button className={view === item.id ? "active" : ""} key={item.id} onClick={() => setView(item.id)} type="button">
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.label}{item.id === "notifications" && unread ? ` (${unread})` : ""}
            </button>
          ))}
        </nav>
      </aside>

      <main className="demo-master-main">
        <DemoCabinetSwitcher currentRole="master" />
        <aside className="demo-master-banner">
          <div>
            <strong>Демонстраційний режим</strong>
            <p>Ви переглядаєте заповнений приклад кабінету самостійного майстра. Усі клієнти, заявки, повідомлення та проєкти є демонстраційними.</p>
            {stateWarning && <small>{stateWarning}</small>}
          </div>
          <nav aria-label="Дії демоверсії майстра">
            <Link href="/auth/register">Створити акаунт</Link>
            <button disabled={Boolean(pending)} onClick={() => setResetOpen(true)} type="button">Скинути демоверсію</button>
            <Link href="/">Вийти</Link>
          </nav>
        </aside>

        {(error || notice) && (
          <div className={`demo-master-feedback ${error ? "error" : "success"}`} role={error ? "alert" : "status"}>
            <span>{error ?? notice}</span>
            {expired && <Link href="/demo">Повернутися до вибору ролі</Link>}
          </div>
        )}

        <header className="demo-master-header">
          <div>
            <span>Самостійний майстер</span>
            <h1>{state.profile.name}</h1>
            <p>{state.profile.profession} · {state.profile.city}</p>
          </div>
          <strong>★ {state.profile.rating.toFixed(1)}</strong>
        </header>

        {view === "overview" && (
          <section className="demo-master-section">
            <div className="demo-master-section-head"><div><span>Огляд</span><h2>Робочі показники</h2></div></div>
            <div className="demo-master-stats">
              <article><span>Нові заявки</span><strong>{state.statistics.newRequests}</strong></article>
              <article><span>Активні проєкти</span><strong>{state.statistics.activeProjects}</strong></article>
              <article><span>Дохід за місяць</span><strong>{money(state.statistics.monthlyRevenue)}</strong></article>
              <article><span>Завершені проєкти</span><strong>{state.statistics.completedProjects}</strong></article>
            </div>
          </section>
        )}

        {view === "requests" && (
          <section className="demo-master-section">
            <div className="demo-master-section-head"><div><span>Заявки</span><h2>Клієнтські запити</h2></div></div>
            <div className="demo-master-request-list">
              {state.requests.map((request) => (
                <article key={request.id}>
                  <div><span>{statusLabels[request.status] ?? request.status}</span><h3>{request.title}</h3><p>{request.clientName} · {date(request.desiredDate)}</p></div>
                  <strong>{money(request.budget)}</strong>
                  <div className="demo-master-request-actions">
                    {requestActions.map((action) => (
                      <button disabled={Boolean(pending)} key={action.status} onClick={() => changeRequest(request.id, action.status)} type="button">
                        {pending === `request:${request.id}:${action.status}` ? "Зберігаємо…" : action.label}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
              {!state.requests.length && <p className="demo-master-empty">У демоверсії поки немає заявок.</p>}
            </div>
          </section>
        )}

        {view === "calendar" && (
          <section className="demo-master-section">
            <div className="demo-master-section-head"><div><span>Календар</span><h2>Зайнятість майстра</h2></div></div>
            <div className="demo-master-calendar-layout">
              <div className="demo-master-calendar">
                {state.calendar.map((item) => (
                  <button className={`${item.status} ${selectedCalendarId === item.id ? "selected" : ""}`} key={item.id} onClick={() => setSelectedCalendarId(item.id)} type="button">
                    <span>{date(item.date)}</span><strong>{item.status === "busy" ? "Зайнято" : "Вільно"}</strong>
                  </button>
                ))}
                {!state.calendar.length && <p className="demo-master-empty">Календар поки порожній.</p>}
              </div>
              {selectedCalendar && (
                <article className="demo-master-calendar-detail">
                  <span>{selectedCalendar.status === "busy" ? "Зайнята дата" : "Вільна дата"}</span>
                  <h3>{selectedCalendar.projectTitle || "Проєкт не вказано"}</h3>
                  <p>{selectedCalendar.clientName || "Клієнта не вказано"}</p>
                  <time>{date(selectedCalendar.date)}</time>
                  <button disabled={Boolean(pending)} onClick={() => toggleCalendar(selectedCalendar.id, selectedCalendar.status === "busy" ? "available" : "busy")} type="button">
                    {pending === `calendar:${selectedCalendar.id}` ? "Зберігаємо…" : selectedCalendar.status === "busy" ? "Позначити вільною" : "Позначити зайнятою"}
                  </button>
                  <button className="secondary" onClick={() => setView(selectedCalendar.requestId ? "messages" : "requests")} type="button">Відкрити чат або заявку</button>
                </article>
              )}
            </div>
          </section>
        )}

        {view === "messages" && (
          <section className="demo-master-section">
            <div className="demo-master-section-head"><div><span>Повідомлення</span><h2>Чат із клієнтами</h2></div></div>
            <div className="demo-master-messages">
              {state.messages.map((message) => (
                <article className={message.senderRole === "master" ? "master" : "client"} key={message.id}>
                  <strong>{message.sender}</strong><p>{message.body}</p><time>{date(message.createdAt)}</time>
                </article>
              ))}
              {!state.messages.length && <p className="demo-master-empty">Повідомлень поки немає.</p>}
            </div>
            <form className="demo-master-composer" onSubmit={sendMessage}>
              <label>Заявка<select disabled={Boolean(pending)} onChange={(event) => setMessageRequestId(event.target.value)} value={messageRequestId}>{state.requests.map((request) => <option key={request.id} value={request.id}>{request.title} — {request.clientName}</option>)}</select></label>
              <label>Повідомлення<textarea disabled={Boolean(pending)} maxLength={2000} onChange={(event) => setMessageBody(event.target.value)} rows={3} value={messageBody} /></label>
              <button disabled={Boolean(pending) || !messageRequestId || !messageBody.trim()} type="submit">{pending === "message" ? "Надсилаємо…" : "Надіслати"}</button>
            </form>
          </section>
        )}

        {view === "projects" && (
          <section className="demo-master-section">
            <div className="demo-master-section-head"><div><span>Проєкти</span><h2>Активні роботи</h2></div></div>
            <div className="demo-master-projects">{state.projects.map((project) => <article key={project.id}><span>{project.status}</span><h3>{project.title}</h3><p>{project.clientName}</p><strong>{project.progress}%</strong></article>)}{!state.projects.length && <p className="demo-master-empty">Активних проєктів поки немає.</p>}</div>
          </section>
        )}

        {view === "notifications" && (
          <section className="demo-master-section">
            <div className="demo-master-section-head"><div><span>Сповіщення</span><h2>Оновлення кабінету</h2></div></div>
            <div className="demo-master-notifications">{state.notifications.map((notification) => <article key={notification.id}><div><strong>{notification.title}</strong><small>{notification.isRead ? "Переглянуто" : "Нове"}</small></div>{!notification.isRead && <button disabled={Boolean(pending)} onClick={() => readNotification(notification.id)} type="button">{pending === `notification:${notification.id}` ? "Оновлюємо…" : "Позначити прочитаним"}</button>}</article>)}{!state.notifications.length && <p className="demo-master-empty">Сповіщень поки немає.</p>}</div>
          </section>
        )}
      </main>

      {resetOpen && (
        <div className="demo-master-modal" role="presentation"><section aria-labelledby="master-reset-title" aria-modal="true" role="dialog"><span>Демонстраційний режим</span><h2 id="master-reset-title">Скинути демоверсію?</h2><p>Усі ваші зміни в демоверсії буде скасовано. Відновити початкові дані?</p><div><button disabled={Boolean(pending)} onClick={() => setResetOpen(false)} type="button">Скасувати</button><button disabled={Boolean(pending)} onClick={resetDemo} type="button">{pending === "reset" ? "Відновлюємо…" : "Скинути"}</button></div></section></div>
      )}
    </section>
  );
}
