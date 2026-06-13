import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BriefcaseBusiness,
  Images,
  Megaphone,
  Pencil,
  Plus,
  Star,
  Users,
} from "lucide-react";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { DashboardMessages } from "@/components/DashboardMessages";

export const metadata: Metadata = {
  title: "Кабінет майстра | БудПоміч",
  description: "Особистий кабінет майстра БудПоміч.",
};

const metrics = [
  { icon: Users, value: "184", label: "Підписники", trend: "+12 цього місяця" },
  {
    icon: BriefcaseBusiness,
    value: "43",
    label: "Публікації",
    trend: "3 нові роботи",
  },
  { icon: Images, value: "8", label: "Робіт у портфоліо", trend: "Ще 2 до цілі" },
];

export default function DashboardPage() {
  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link className="dashboard-brand" href="/masters">
          <Image
            className="dashboard-logo"
            src="/logo/budpomich-logo-v4.svg"
            alt="БудПоміч — будівельний помічник"
            width={820}
            height={380}
            priority
          />
        </Link>
        <nav aria-label="Основна навігація">
          <Link href="/masters">Майстри</Link>
          <Link href="/feed">Роботи</Link>
          <Link className="active" href="/dashboard">Кабінет</Link>
        </nav>
        <div className="dashboard-user">
          <span>АК</span>
          <div>
            <strong>Андрій Коваль</strong>
            <small>Електрик · Київ</small>
          </div>
        </div>
      </header>

      <section className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">Кабінет майстра</p>
          <h1>Вітаємо, Андрію</h1>
          <p>
            Ваш профіль заповнений на 72%. Додайте ще дві роботи, щоб
            підвищити довіру клієнтів.
          </p>
          <div className="profile-progress" aria-label="Профіль заповнений на 72%">
            <span style={{ width: "72%" }} />
          </div>
        </div>
        <Link
          className="dashboard-primary-button"
          href="/profile/andrii-koval?from=dashboard"
        >
          Переглянути профіль <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <p>Навігація</p>
          <nav aria-label="Навігація кабінету">
            <Link className="active" href="/dashboard">
              <BriefcaseBusiness size={18} /> Огляд
            </Link>
            <Link href="/dashboard/profile">
              <Pencil size={18} /> Редагувати профіль
            </Link>
            <Link href="/dashboard/portfolio">
              <Images size={18} /> Портфоліо
            </Link>
            <Link href="/dashboard/promotion">
              <Megaphone size={18} /> Просування
            </Link>
          </nav>
          <div className="sidebar-score">
            <span><Star size={16} fill="currentColor" /> 4.9</span>
            <strong>86 відгуків</strong>
            <small>Ваш рейтинг вище, ніж у 92% майстрів.</small>
          </div>
        </aside>

        <div className="dashboard-content">
          <section className="dashboard-metrics" aria-label="Статистика профілю">
            {metrics.map(({ icon: Icon, value, label, trend }) => (
              <article key={label}>
                <div className="metric-icon"><Icon size={21} /></div>
                <strong>{value}</strong>
                <span>{label}</span>
                <small>{trend}</small>
              </article>
            ))}
          </section>

          <section className="dashboard-panels">
            <AvailabilityCalendar />

            <article className="dashboard-panel quick-panel">
              <p className="dashboard-eyebrow">Швидкі дії</p>
              <h2>Розвивайте свій профіль</h2>
              <Link className="quick-action" href="/dashboard/portfolio/new">
                <span><Plus size={18} /> Додати нову роботу</span>
                <ArrowRight size={17} />
              </Link>
              <Link className="quick-action" href="/dashboard/promotion">
                <span><Megaphone size={18} /> Вивести профіль у ТОП</span>
                <ArrowRight size={17} />
              </Link>
            </article>
          </section>

          <section className="dashboard-panel requests-panel">
            <div className="panel-heading">
              <div>
                <p className="dashboard-eyebrow">Останні заявки</p>
                <h2>Нові звернення</h2>
              </div>
              <Link href="/dashboard">Переглянути всі</Link>
            </div>
            <article className="request-row">
              <div className="request-avatar">ОМ</div>
              <div className="request-copy">
                <strong>Олексій Мельник</strong>
                <p>Потрібна заміна проводки у двокімнатній квартирі.</p>
              </div>
              <div className="request-meta">
                <span>Нова заявка</span>
                <small>Сьогодні, 10:24</small>
              </div>
              <button type="button" aria-label="Відкрити заявку">
                <ArrowRight size={18} />
              </button>
            </article>
          </section>

          <DashboardMessages />
        </div>
      </div>
    </main>
  );
}
