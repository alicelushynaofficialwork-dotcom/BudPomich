"use client";

import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  MessageCircle,
  Plus,
} from "lucide-react";
import type { DemoClientState } from "@/lib/demo/types";
import { getProfileInitials } from "@/lib/profile";

type DemoClientDashboardHomeProps = {
  state: DemoClientState;
  onOpenCalendar: () => void;
  onOpenCabinet: () => void;
  onOpenDocuments: () => void;
  onOpenMessages: () => void;
  onOpenNotifications: () => void;
  onOpenProject: () => void;
  onOpenRequests: () => void;
  onStartRequest: () => void;
};

const actionIcons = {
  messages: MessageCircle,
  documents: FileText,
  requests: CheckCircle2,
};

function formatDashboardDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function DemoClientDashboardHome({
  state,
  onOpenCalendar,
  onOpenCabinet,
  onOpenDocuments,
  onOpenMessages,
  onOpenNotifications,
  onOpenProject,
  onOpenRequests,
  onStartRequest,
}: DemoClientDashboardHomeProps) {
  const { dashboard, messages, notifications, profile } = state;
  const project = dashboard.activeProject;
  const unreadNotifications = notifications.filter((item) => !item.isRead).length;
  const recentMessages = messages.slice(-3).reverse();

  const runEventAction = (action: "chat" | "calendar" | "requests") => {
    if (action === "chat") onOpenMessages();
    else if (action === "calendar") onOpenCalendar();
    else onOpenRequests();
  };

  const runAttentionAction = (action: "messages" | "documents" | "requests") => {
    if (action === "messages") onOpenMessages();
    else if (action === "documents") onOpenDocuments();
    else onOpenRequests();
  };

  return (
    <section className="demo-client-dashboard" aria-labelledby="demo-client-dashboard-title">
      <header className="demo-client-dashboard-header">
        <div>
          <h1 id="demo-client-dashboard-title">Добрий день, {profile.greetingName}! <span aria-hidden="true">👋</span></h1>
          <p>Ось що заплановано на сьогодні</p>
          <time dateTime={dashboard.dateIso}>{formatDashboardDate(dashboard.dateIso)}</time>
        </div>
        <div className="demo-client-dashboard-tools">
          <button className="is-primary" onClick={onStartRequest} type="button">
            <Plus aria-hidden="true" size={18} />
            Нова заявка
          </button>
          <button
            aria-label={`Сповіщення: ${unreadNotifications} непрочитаних`}
            className="demo-client-notification-button"
            onClick={onOpenNotifications}
            type="button"
          >
            <Bell aria-hidden="true" size={20} />
            {unreadNotifications > 0 ? <span>{unreadNotifications}</span> : null}
          </button>
          <button className="demo-client-profile-button" onClick={onOpenCabinet} type="button">
            <span>{getProfileInitials(profile.name)}</span>
            <div><strong>{profile.name}</strong><small>{profile.city}</small></div>
            <ChevronRight aria-hidden="true" size={17} />
          </button>
        </div>
      </header>

      <div className="demo-client-dashboard-grid is-top">
        <section className="demo-client-panel demo-client-today">
          <header>
            <div><span>Розклад</span><h2>Сьогодні</h2></div>
            <strong>{dashboard.todaySchedule.length} події</strong>
          </header>
          <div className="demo-client-timeline">
            {dashboard.todaySchedule.map((event) => (
              <article key={event.id}>
                <time>{event.time}</time>
                <i aria-hidden="true" />
                <div>
                  <strong>{event.title}</strong>
                  <p>{event.project}</p>
                  <small>{event.masterName}</small>
                </div>
                <button onClick={() => runEventAction(event.action)} type="button">
                  {event.actionLabel}<ArrowRight aria-hidden="true" size={15} />
                </button>
              </article>
            ))}
          </div>
          <button className="demo-client-text-action" onClick={onOpenCalendar} type="button">
            Відкрити весь календар <ArrowRight aria-hidden="true" size={16} />
          </button>
        </section>

        <section className="demo-client-panel demo-client-attention">
          <header>
            <div><span>Ваші дії</span><h2>Потребує вашої уваги</h2></div>
            <CircleAlert aria-hidden="true" size={21} />
          </header>
          <div>
            {dashboard.attentionItems.map((item) => {
              const Icon = actionIcons[item.action];
              return (
                <button key={item.id} onClick={() => runAttentionAction(item.action)} type="button">
                  <span><Icon aria-hidden="true" size={18} /></span>
                  <div><strong>{item.title}</strong><small>{item.project}</small></div>
                  <em>{item.status}</em>
                  <ChevronRight aria-hidden="true" size={17} />
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="demo-client-dashboard-grid is-project">
        <section className="demo-client-project-card">
          <div className="demo-client-project-card-head">
            <div><span>{project.status}</span><small>Активний проєкт</small></div>
            <label>
              Мої проєкти
              <select aria-label="Оберіть активний проєкт" defaultValue={project.id}>
                <option value={project.id}>{project.title}</option>
              </select>
            </label>
          </div>
          <h2>{project.title}</h2>
          <p>{project.address}</p>
          <div className="demo-client-project-progress">
            <div><span>Загальний прогрес</span><strong>{project.progress}%</strong></div>
            <i><b style={{ width: `${project.progress}%` }} /></i>
          </div>
          <div className="demo-client-next-stage">
            <span>Наступний етап</span>
            <strong>{project.nextStage}</strong>
          </div>
          <dl>
            <div><dt>Майстер</dt><dd>{project.masterName}</dd></div>
            <div><dt>Наступний візит</dt><dd>{project.nextVisit}</dd></div>
            <div><dt>Документи</dt><dd>{project.documentsCount}</dd></div>
            <div><dt>Нові повідомлення</dt><dd>{project.unreadMessages}</dd></div>
          </dl>
          <footer>
            <button onClick={onOpenProject} type="button">Відкрити проєкт</button>
            <button onClick={onOpenMessages} type="button"><MessageCircle aria-hidden="true" size={17} /> Написати майстру</button>
          </footer>
        </section>

        <section className="demo-client-panel demo-client-upcoming">
          <header><div><span>План</span><h2>Найближчі дати</h2></div><CalendarDays aria-hidden="true" size={21} /></header>
          <div>
            {dashboard.upcomingDates.map((item) => (
              <article key={item.id}>
                <time>{item.date}{item.time ? <small>{item.time}</small> : null}</time>
                <div><strong>{item.title}</strong><small>{item.detail}</small></div>
                <span>{item.status}</span>
              </article>
            ))}
          </div>
          <button className="demo-client-text-action" onClick={onOpenCalendar} type="button">
            Усі заплановані дати <ArrowRight aria-hidden="true" size={16} />
          </button>
        </section>
      </div>

      <div className="demo-client-dashboard-grid is-bottom">
        <section className="demo-client-panel demo-client-recent">
          <header><div><span>Зв’язок</span><h2>Останні повідомлення</h2></div><MessageCircle aria-hidden="true" size={20} /></header>
          <div>
            {recentMessages.map((message) => (
              <article key={message.id}>
                <span>{getProfileInitials(message.sender)}</span>
                <div><strong>{message.sender}</strong><p>{message.body}</p></div>
                <time>{new Intl.DateTimeFormat("uk-UA", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.createdAt))}</time>
              </article>
            ))}
          </div>
          <button className="demo-client-text-action" onClick={onOpenMessages} type="button">Відкрити чати <ArrowRight aria-hidden="true" size={16} /></button>
        </section>

        <section className="demo-client-panel demo-client-documents">
          <header><div><span>Файли</span><h2>Документи та оплати</h2></div><FileText aria-hidden="true" size={20} /></header>
          <div>
            {dashboard.documentsAndPayments.map((item) => (
              <button key={item.id} onClick={onOpenDocuments} type="button">
                <FileText aria-hidden="true" size={18} />
                <div><strong>{item.title}</strong><small>{item.meta}</small></div>
                <span>{item.status}</span>
              </button>
            ))}
          </div>
          <button className="demo-client-text-action" onClick={onOpenDocuments} type="button">Переглянути документи <ArrowRight aria-hidden="true" size={16} /></button>
        </section>

        <section className="demo-client-panel demo-client-photos">
          <header><div><span>Хід робіт</span><h2>Нові фото</h2></div><Clock3 aria-hidden="true" size={20} /></header>
          <div>
            {dashboard.recentPhotos.map((photo) => (
              <button className={`is-${photo.tone}`} key={photo.id} onClick={onOpenProject} type="button">
                <span>{photo.label}</span><small>{photo.caption}</small>
              </button>
            ))}
          </div>
          <button className="demo-client-text-action" onClick={onOpenProject} type="button">Усі фото <ArrowRight aria-hidden="true" size={16} /></button>
        </section>
      </div>
    </section>
  );
}
