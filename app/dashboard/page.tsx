import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Images,
  Megaphone,
  MessageCircle,
  Pencil,
  Plus,
  Star,
  Users,
} from "lucide-react";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { DashboardRequests } from "@/components/DashboardRequests";
import { SiteHeader } from "@/components/SiteHeader";
import { masters } from "@/lib/data";

export const metadata = {
  title: "Кабінет майстра | БудПоміч",
};

export default function DashboardPage() {
  const master = masters[1];

  return (
    <section className="page-section dashboard-page">
      <SiteHeader active="dashboard" showMasterCard />
      <div className="container">
        <div className="dashboard-heading">
          <div>
            <p className="overline">КАБІНЕТ МАЙСТРА</p>
            <h1>Вітаємо, Андрію</h1>
            <p>
              Ваш профіль заповнений на 72%. Додайте ще дві роботи, щоб
              підвищити довіру клієнтів.
            </p>
            <div className="dashboard-progress" aria-label="Заповненість профілю 72%">
              <span />
            </div>
          </div>
          <Link className="btn btn-primary" href="/profile/andrii-koval">
            Переглянути профіль <ArrowRight size={17} />
          </Link>
        </div>
        <div className="dashboard-layout">
          <aside className="dashboard-nav">
            <div className="dashboard-nav-card">
              <p className="overline">Навігація</p>
              <Link className="active" href="/dashboard#overview">
                <BriefcaseBusiness size={18} /> Огляд
              </Link>
              <Link href="/dashboard#profile-status">
                <Pencil size={18} /> Редагувати профіль
              </Link>
              <Link href="/dashboard#portfolio">
                <Images size={18} /> Портфоліо
              </Link>
              <Link href="/dashboard#promotion">
                <Megaphone size={18} /> Просування
              </Link>
            </div>
            <div className="dashboard-rating-card">
              <span>
                <Star size={17} /> 4.9
              </span>
              <strong>86 відгуків</strong>
              <p>Ваш рейтинг вищий, ніж у 92% майстрів.</p>
            </div>
          </aside>
          <div className="dashboard-content">
            <div className="dashboard-metrics" id="overview">
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
            <DashboardRequests />
            <div className="dashboard-panels">
              <article className="dashboard-panel" id="profile-status">
                <div>
                  <p className="overline">Статус зайнятості</p>
                  <h2>Календар доступності</h2>
                </div>
                <AvailabilityCalendar />
              </article>
              <article className="dashboard-panel dashboard-quick" id="portfolio">
                <p className="overline">Швидкі дії</p>
                <h2>Розвивайте свій профіль</h2>
                <Link className="quick-action" href="/dashboard#portfolio">
                  <span>
                    <Plus size={18} /> Додати нову роботу
                  </span>
                  <ArrowRight size={17} />
                </Link>
                <Link className="quick-action" href="/dashboard#promotion" id="promotion">
                  <span>
                    <Megaphone size={18} /> Вивести профіль у ТОП
                  </span>
                  <ArrowRight size={17} />
                </Link>
              </article>
            </div>
            <article className="dashboard-panel requests-panel">
              <div className="panel-title-row">
                <div>
                  <p className="overline">Останні заявки</p>
                  <h2>Нові звернення</h2>
                </div>
                <Link href="/dashboard#requests">Переглянути всі</Link>
              </div>
              <div className="request-row">
                <div className="avatar avatar-small">ОМ</div>
                <div>
                  <strong>Олексій Мельник</strong>
                  <p>Потрібна заміна проводки у двокімнатній квартирі.</p>
                </div>
                <div className="request-status">
                  <strong>Нова заявка</strong>
                  <span>Сьогодні, 10:24</span>
                </div>
                <Link className="request-open" href="/dashboard#messages" aria-label="Відкрити заявку">
                  <ArrowRight size={18} />
                </Link>
              </div>
            </article>

            <article className="dashboard-panel messages-panel" id="messages">
              <div className="panel-title-row">
                <div>
                  <p className="overline">Повідомлення</p>
                  <h2>Переписка з майстрами</h2>
                </div>
                <MessageCircle size={22} />
              </div>
              <div className="message-hint">
                <Users size={16} />
                <strong>Підписки</strong>
                <span>Підпишіться на майстра в його профілі.</span>
              </div>
              <div className="messages-layout">
                <div className="conversation-list">
                  <button className="conversation-item active" type="button">
                    <span className="avatar avatar-small">СІ</span>
                    <span>
                      <strong>Сергій Іваненко</strong>
                      <small>миття</small>
                    </span>
                  </button>
                </div>
                <div className="conversation-panel">
                  <div className="conversation-head">
                    <div>
                      <strong>Сергій Іваненко</strong>
                      <span>Плиточник</span>
                    </div>
                    <Link href="/profile/serhii-ivanenko">Відкрити профіль</Link>
                  </div>
                  <div className="message-bubble">
                    <span>Ви</span>
                    <strong>ММЯ</strong>
                    <p>Я ЧСЯМ</p>
                    <small>12 черв., 02:18</small>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
