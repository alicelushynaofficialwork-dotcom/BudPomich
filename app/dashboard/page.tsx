import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Images,
  Megaphone,
  Pencil,
  Plus,
  Users,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { masters } from "@/lib/data";

export const metadata = {
  title: "Кабінет майстра | БудПоміч",
};

export default function DashboardPage() {
  const master = masters[1];

  return (
    <section className="page-section dashboard-page">
      <div className="container">
        <div className="dashboard-heading">
          <div>
            <p className="overline">Кабінет майстра</p>
            <h1>Вітаємо, Андрію</h1>
            <p>Ваш профіль заповнений на 72%. Додайте ще дві роботи.</p>
          </div>
          <Link className="btn btn-primary" href="/profile/andrii-koval">
            Переглянути профіль <ArrowRight size={17} />
          </Link>
        </div>
        <div className="dashboard-layout">
          <aside className="dashboard-nav">
            <Link className="active" href="/dashboard">
              <BriefcaseBusiness size={18} /> Огляд
            </Link>
            <Link href="/dashboard">
              <Pencil size={18} /> Редагувати профіль
            </Link>
            <Link href="/dashboard">
              <Images size={18} /> Портфоліо
            </Link>
            <Link href="/dashboard">
              <Megaphone size={18} /> Реклама
            </Link>
          </aside>
          <div className="dashboard-content">
            <div className="dashboard-metrics">
              <div>
                <Users size={21} />
                <strong>{master.followers}</strong>
                <span>Підписників</span>
              </div>
              <div>
                <BriefcaseBusiness size={21} />
                <strong>{master.works}</strong>
                <span>Публікації</span>
              </div>
              <div>
                <Images size={21} />
                <strong>8</strong>
                <span>Робіт у портфоліо</span>
              </div>
            </div>
            <div className="dashboard-panels">
              <article className="dashboard-panel">
                <div>
                  <p className="overline">Статус зайнятості</p>
                  <h2>Коли ви готові до нової роботи?</h2>
                </div>
                <StatusBadge status="soon">Вільний з 15 липня</StatusBadge>
                <button className="btn btn-ghost" type="button">
                  Змінити статус
                </button>
              </article>
              <article className="dashboard-panel dashboard-quick">
                <p className="overline">Швидкі дії</p>
                <h2>Розвивайте свій профіль</h2>
                <Link className="quick-action" href="/dashboard">
                  <span>
                    <Plus size={18} /> Додати нову роботу
                  </span>
                  <ArrowRight size={17} />
                </Link>
                <Link className="quick-action" href="/dashboard">
                  <span>
                    <Megaphone size={18} /> Вивести профіль у ТОП
                  </span>
                  <ArrowRight size={17} />
                </Link>
              </article>
            </div>
            <article className="dashboard-panel requests-panel">
              <div>
                <p className="overline">Останні заявки</p>
                <h2>Нові звернення</h2>
              </div>
              <div className="request-row">
                <div className="avatar avatar-small">ОМ</div>
                <div>
                  <strong>Олексій Мельник</strong>
                  <p>Потрібна заміна проводки у двокімнатній квартирі.</p>
                </div>
                <span>Сьогодні, 10:24</span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
