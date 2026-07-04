"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Heart, MessageSquare, Plus, Search, Send, UserRound, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import type { MasterProfile } from "@/lib/masters";

type ClientCabinetAppProps = {
  masters: MasterProfile[];
};

type ClientView = "search" | "messages" | "requests" | "projects" | "favorites";

const navItems: { id: ClientView; label: string }[] = [
  { id: "search", label: "Пошук виконавців" },
  { id: "messages", label: "Повідомлення" },
  { id: "requests", label: "Мої заявки" },
  { id: "projects", label: "Мої проєкти" },
  { id: "favorites", label: "Обране" },
];

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

export function ClientCabinetApp({ masters }: ClientCabinetAppProps) {
  const [activeView, setActiveView] = useState<ClientView>("messages");
  const [activeDialog, setActiveDialog] = useState(dialogRows[0]?.id ?? "");
  const activeDialogRow = dialogRows.find((dialog) => dialog.id === activeDialog) ?? dialogRows[0];
  const favoriteMasters = useMemo(() => masters.slice(0, 3), [masters]);

  return (
    <section className="client-cabinet">
      <aside className="client-side">
        <Link className="client-brand" href="/">
          <Image src="/logo/budpomich-logo-v4.svg" alt="БудПоміч" width={790} height={420} priority />
          <span>Кабінет клієнта</span>
        </Link>
        <nav aria-label="Навігація кабінету клієнта">
          {navItems.map((item, index) => (
            <button
              className={activeView === item.id ? "active" : ""}
              onClick={() => setActiveView(item.id)}
              type="button"
              key={item.id}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="client-side-hint">
          <span>Підказка</span>
          <p>Усі заявки, домовленості, календар і чат залишаються в БудПоміч.</p>
        </div>
      </aside>

      <main className="client-main">
        <header className="client-topbar">
          <div>
            <span className="client-eyebrow">Будівельний помічник</span>
            <h1>Кабінет клієнта</h1>
            <p>Шукайте майстрів, ведіть заявки, погоджуйте кошториси і приймайте роботи в одному місці.</p>
          </div>
          <div className="client-user">
            <span>ОК</span>
            <div>
              <strong>Олена К.</strong>
              <small>Київ</small>
            </div>
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
              {masters.slice(0, 4).map((master) => (
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
              {dialogRows.map((dialog) => (
                <button
                  className={activeDialog === dialog.id ? "active" : ""}
                  onClick={() => setActiveDialog(dialog.id)}
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
            </aside>
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
              </div>
              <form className="client-composer">
                <input placeholder="Напишіть повідомлення..." />
                <button type="button"><Send size={17} /> Надіслати</button>
              </form>
            </div>
            <aside className="client-project-summary">
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
            </aside>
          </section>
        )}

        {activeView === "requests" && (
          <section className="client-view">
            <div className="client-view-head">
              <div>
                <span className="client-eyebrow">03 · Заявки</span>
                <h2>Мої заявки</h2>
              </div>
              <Link href="/masters">Нова заявка</Link>
            </div>
            <div className="client-request-list">
              {clientRequests.map((request) => (
                <article key={request.id}>
                  <div>
                    <span>{request.status}</span>
                    <h3>{request.service}</h3>
                    <p>{request.text}</p>
                  </div>
                  <dl>
                    <div><dt>Майстер</dt><dd>{request.master}</dd></div>
                    <div><dt>Адреса</dt><dd>{request.address}</dd></div>
                    <div><dt>Дата</dt><dd>{request.date}</dd></div>
                  </dl>
                  <button onClick={() => setActiveView("messages")} type="button">Відкрити чат</button>
                </article>
              ))}
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
              {clientProjects.map((project) => (
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
                  <div className="client-project-actions">
                    <button onClick={() => setActiveView("messages")} type="button">Чат</button>
                    <button type="button">Кошторис</button>
                    <button type="button">Фото процесу</button>
                    <button type="button">Прийняти роботу</button>
                  </div>
                </article>
              ))}
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
    </section>
  );
}
