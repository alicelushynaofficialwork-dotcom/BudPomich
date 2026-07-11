"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type ContractorView = "overview" | "team" | "requests" | "objects" | "finance" | "analytics";

const contractorNav: { id: ContractorView; label: string; note: string; badge?: string }[] = [
  { id: "overview", label: "Огляд бізнесу", note: "Пульс компанії" },
  { id: "team", label: "Команда", note: "Зайнятість бригад" },
  { id: "requests", label: "Заявки", note: "CRM-воронка", badge: "5" },
  { id: "objects", label: "Об'єкти", note: "Етапи і задачі" },
  { id: "finance", label: "Фінанси", note: "Оплати і витрати" },
  { id: "analytics", label: "Аналітика", note: "Маржа і ризики" },
];

const contractorKpis = [
  { label: "Активні об'єкти", value: "7" },
  { label: "Нові заявки", value: "5" },
  { label: "Зайняті майстри", value: "9" },
  { label: "Вільні майстри", value: "3", tone: "good" },
  { label: "Задачі сьогодні", value: "18" },
  { label: "Прострочені задачі", value: "2", tone: "alert" },
  { label: "Очікувані оплати", value: "142 300 ₴", wide: true },
  { label: "Витрати за місяць", value: "68 900 ₴", wide: true },
  { label: "Прибуток за місяць", value: "94 500 ₴", tone: "good", wide: true },
  { label: "Об'єкти з ризиком", value: "2", tone: "alert" },
];

const attentionItems = [
  {
    title: "Кошторис по ЖК Французький квартал очікує погодження",
    detail: "Клієнт не відповідає 2 дні, потрібен дзвінок менеджера.",
    action: "Відкрити",
  },
  {
    title: "Етап плитки затримується на 1 день",
    detail: "Бригада просить перенести доставку матеріалів.",
    action: "Задачі",
  },
  {
    title: "2 майстри без задач на завтра",
    detail: "Можна перекинути на об'єкт у центрі Києва.",
    action: "Команда",
  },
];

const teamRows = [
  { initials: "АП", name: "Андрей Пономаренко", task: "Плитка · ЖК Central Park", status: "Зайнятий" },
  { initials: "АК", name: "Андрій Коваль", task: "Електрика · Оболонь", status: "Вільний", tone: "free" },
  { initials: "СІ", name: "Сергій Іваненко", task: "Сантехніка · Позняки", status: "Виїзд" },
  { initials: "ОМ", name: "Олена Марченко", task: "Дизайн-нагляд · Львів", status: "Поза графіком", tone: "off" },
];

const riskObjects = [
  { title: "Ванна кімната · Печерськ", detail: "Плитка очікує доставку", risk: "1 день" },
  { title: "Офіс · Поділ", detail: "Клієнт не погодив додаткові роботи", risk: "кошторис" },
];

const financeBars = [
  { month: "бер", value: "64к", height: "46%" },
  { month: "кві", value: "88к", height: "58%" },
  { month: "тра", value: "73к", height: "50%" },
  { month: "чер", value: "121к", height: "78%" },
  { month: "лип", value: "142к", height: "92%", current: true },
];

function PlaceholderView({ view }: { view: ContractorView }) {
  const item = contractorNav.find((nav) => nav.id === view);

  return (
    <section className="contractor-soon">
      <span>{String(contractorNav.findIndex((nav) => nav.id === view) + 1).padStart(2, "0")}</span>
      <h2>{item?.label}</h2>
      <p>{item?.note}. Розділ відкриватиметься у цьому кабінеті без переходу на іншу сторінку.</p>
      <button type="button">Налаштувати розділ</button>
    </section>
  );
}

export function ContractorCabinetApp() {
  const [activeView, setActiveView] = useState<ContractorView>("overview");

  return (
    <section className="contractor-cabinet">
      <aside className="contractor-side">
        <Link className="contractor-brand" href="/dashboard?role=contractor">
          <Image src="/logo/budpomich-logo-v4.svg" alt="БудПомiч" width={790} height={420} priority />
          <span>Кабінет підрядника</span>
        </Link>

        <div className="contractor-nav-group">Компанія</div>
        <nav aria-label="Навігація кабінету підрядника">
          {contractorNav.map((item, index) => (
            <button
              className={activeView === item.id ? "active" : ""}
              onClick={() => setActiveView(item.id)}
              type="button"
              key={item.id}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>{item.label}</b>
              {item.badge ? <em>{item.badge}</em> : null}
            </button>
          ))}
        </nav>

        <div className="contractor-side-foot">
          <strong>ТОВ «Укріплення»</strong>
          <p>12 майстрів · 7 активних об&apos;єктів · Київ</p>
        </div>
      </aside>

      <main className="contractor-main">
        <header className="contractor-head">
          <div>
            <span className="contractor-eyebrow">Підрядник · CRM · фінанси</span>
            <h1>Огляд бізнесу</h1>
            <p>Контролюйте заявки, об&apos;єкти, команду, кошториси, оплату та ризики в одному робочому просторі.</p>
          </div>
          <div className="contractor-user">
            <span>БП</span>
            <div>
              <strong>Керівник компанії</strong>
              <small>Укріплення · Київ</small>
            </div>
          </div>
        </header>

        <div className="contractor-ruler" aria-hidden="true" />

        {activeView === "overview" ? (
          <>
            <section className="contractor-company-strip">
              <span>УК</span>
              <div>
                <h2>ТОВ «Укріплення»</h2>
                <p>Гіпсокартон, плитка, електрика, комплексні ремонти квартир і комерційних приміщень.</p>
              </div>
              <div className="contractor-company-stats">
                <div><strong>12</strong><small>людей</small></div>
                <div><strong>7</strong><small>об&apos;єктів</small></div>
                <div><strong>94.5к</strong><small>прибуток</small></div>
              </div>
            </section>

            <section className="contractor-kpi-grid" aria-label="Ключові показники">
              {contractorKpis.map((item) => (
                <article className={`contractor-kpi ${item.tone ?? ""} ${item.wide ? "wide" : ""}`} key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </article>
              ))}
            </section>

            <div className="contractor-workgrid">
              <section className="contractor-panel">
                <div className="contractor-panel-head">
                  <h2>Потребує уваги</h2>
                  <span>3</span>
                </div>
                <div className="contractor-attention-list">
                  {attentionItems.map((item) => (
                    <article key={item.title}>
                      <i />
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                      </div>
                      <button type="button">{item.action}</button>
                    </article>
                  ))}
                </div>
              </section>

              <section className="contractor-panel">
                <div className="contractor-panel-head">
                  <h2>Команда сьогодні</h2>
                  <span>12</span>
                </div>
                <div className="contractor-team-list">
                  {teamRows.map((member) => (
                    <article key={member.name}>
                      <span>{member.initials}</span>
                      <div>
                        <strong>{member.name}</strong>
                        <p>{member.task}</p>
                      </div>
                      <em className={member.tone ?? ""}>{member.status}</em>
                    </article>
                  ))}
                </div>
              </section>

              <section className="contractor-panel">
                <div className="contractor-panel-head">
                  <h2>Об&apos;єкти з ризиком</h2>
                  <span>2</span>
                </div>
                <div className="contractor-risk-list">
                  {riskObjects.map((object) => (
                    <article key={object.title}>
                      <div>
                        <strong>{object.title}</strong>
                        <p>{object.detail}</p>
                      </div>
                      <em>{object.risk}</em>
                    </article>
                  ))}
                </div>
              </section>

              <section className="contractor-panel">
                <div className="contractor-panel-head">
                  <h2>Фінанси</h2>
                  <span>місяць</span>
                </div>
                <div className="contractor-chart">
                  {financeBars.map((bar) => (
                    <div className={bar.current ? "current" : ""} key={bar.month}>
                      <span>{bar.value}</span>
                      <i style={{ height: bar.height }} />
                      <small>{bar.month}</small>
                    </div>
                  ))}
                </div>
                <div className="contractor-finance-foot">
                  <span>Очікувані оплати <b>142 300 ₴</b></span>
                  <span>Прибуток <b>94 500 ₴</b></span>
                </div>
              </section>
            </div>
          </>
        ) : (
          <PlaceholderView view={activeView} />
        )}
      </main>
    </section>
  );
}
