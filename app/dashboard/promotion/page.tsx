import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  CircleHelp,
  Eye,
  Images,
  MapPin,
  Megaphone,
  Pencil,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Просування майстра | БудПоміч",
  description:
    "Все про рекламу та просування профілю майстра у сервісі БудПоміч.",
};

const formats = [
  {
    icon: TrendingUp,
    eyebrow: "Більше переглядів",
    title: "Профіль у ТОП",
    description:
      "Профіль показується вище у каталозі за вашою професією та містом.",
    features: [
      "Пріоритетне місце у каталозі",
      "Позначка «Просувається»",
      "Статистика переглядів",
    ],
    price: "від 199 грн",
    period: "на 7 днів",
    featured: true,
  },
  {
    icon: Sparkles,
    eyebrow: "Помітна подача",
    title: "Виділена картка",
    description:
      "Картка отримує кольоровий акцент і краще виділяється серед інших майстрів.",
    features: [
      "Акцентне оформлення картки",
      "Більше уваги до портфоліо",
      "Працює у каталозі й пошуку",
    ],
    price: "від 99 грн",
    period: "на 7 днів",
  },
  {
    icon: MapPin,
    eyebrow: "Локальна реклама",
    title: "Просування у місті",
    description:
      "Показуємо профіль клієнтам, які шукають вашу послугу у вибраному місті.",
    features: [
      "Таргетинг за містом",
      "Релевантна професія",
      "Звіт за результатами",
    ],
    price: "від 299 грн",
    period: "на 14 днів",
  },
];

const steps = [
  {
    icon: Pencil,
    number: "01",
    title: "Заповніть профіль",
    text: "Додайте опис, послуги, ціни та актуальне місто.",
  },
  {
    icon: Images,
    number: "02",
    title: "Покажіть роботи",
    text: "Профілі з портфоліо викликають більше довіри у клієнтів.",
  },
  {
    icon: Megaphone,
    number: "03",
    title: "Оберіть формат",
    text: "Визначте місто, тривалість і спосіб показу реклами.",
  },
  {
    icon: BarChart3,
    number: "04",
    title: "Стежте за результатом",
    text: "Переглядайте охоплення, переходи та нові заявки.",
  },
];

const questions = [
  {
    question: "Чи гарантує реклама нові заявки?",
    answer:
      "Реклама збільшує видимість профілю, але кількість звернень також залежить від рейтингу, портфоліо, цін і швидкості відповіді.",
  },
  {
    question: "Де буде показуватися мій профіль?",
    answer:
      "Залежно від формату — у каталозі майстрів, результатах пошуку та локальній добірці вашого міста.",
  },
  {
    question: "Чи можна зупинити просування?",
    answer:
      "Після запуску кампанію можна буде призупинити у кабінеті. Невикористаний період залишиться на балансі кампанії.",
  },
  {
    question: "Коли з'явиться оплата?",
    answer:
      "Онлайн-оплата ще не підключена. Зараз сторінка пояснює формати та допомагає підготувати профіль до запуску реклами.",
  },
];

export default function PromotionPage() {
  return (
    <main className="promotion-page">
      <header className="promotion-header">
        <Link className="promotion-brand" href="/dashboard">
          <Image
            className="promotion-logo"
            src="/logo/budpomich-logo-v4.svg"
            alt="БудПоміч — будівельний помічник"
            width={820}
            height={380}
            priority
          />
        </Link>
        <Link className="promotion-back" href="/dashboard">
          <ArrowLeft size={17} /> До кабінету
        </Link>
      </header>

      <section className="promotion-hero">
        <div>
          <p>Реклама для майстрів</p>
          <h1>Більше клієнтів для вашої справи</h1>
          <span>
            Просувайте профіль у каталозі БудПоміч, показуйте сильні роботи та
            отримуйте більше релевантних звернень у своєму місті.
          </span>
          <div className="promotion-hero-actions">
            <a href="#formats">Переглянути формати <ArrowRight size={17} /></a>
            <Link href="/dashboard/profile">Підготувати профіль</Link>
          </div>
        </div>
        <div className="promotion-preview">
          <div className="promotion-preview-label">
            <Megaphone size={16} /> Просувається
          </div>
          <div className="promotion-preview-avatar">АК</div>
          <p>Електрик</p>
          <h2>Андрій Коваль</h2>
          <span><MapPin size={14} /> Київ · 8 років досвіду</span>
          <strong><Star size={15} fill="currentColor" /> 4.9 <small>86 відгуків</small></strong>
          <div className="promotion-preview-result">
            <Eye size={18} />
            <span><b>+68%</b> більше переглядів</span>
          </div>
        </div>
      </section>

      <section className="promotion-trust">
        <span><ShieldCheck size={20} /> Без прихованих списань</span>
        <span><Search size={20} /> Релевантна аудиторія</span>
        <span><BarChart3 size={20} /> Зрозуміла статистика</span>
        <span><BadgeCheck size={20} /> Тільки перевірені профілі</span>
      </section>

      <section className="promotion-section" id="formats">
        <div className="promotion-section-heading">
          <div>
            <p>Формати просування</p>
            <h2>Оберіть, як показати себе клієнтам</h2>
          </div>
          <span>Оплата поки не підключена</span>
        </div>

        <div className="promotion-plans">
          {formats.map(({ icon: Icon, ...format }) => (
            <article
              className={format.featured ? "promotion-plan featured" : "promotion-plan"}
              key={format.title}
            >
              {format.featured && <div className="promotion-popular">Популярний формат</div>}
              <div className="promotion-plan-icon"><Icon size={23} /></div>
              <p>{format.eyebrow}</p>
              <h3>{format.title}</h3>
              <span>{format.description}</span>
              <ul>
                {format.features.map((feature) => (
                  <li key={feature}><Check size={15} /> {feature}</li>
                ))}
              </ul>
              <div className="promotion-price">
                <strong>{format.price}</strong>
                <small>{format.period}</small>
              </div>
              <button type="button" disabled>Скоро буде доступно</button>
            </article>
          ))}
        </div>
      </section>

      <section className="promotion-section promotion-how">
        <div className="promotion-section-heading">
          <div>
            <p>Як це працює</p>
            <h2>Від профілю до нових звернень</h2>
          </div>
        </div>
        <div className="promotion-steps">
          {steps.map(({ icon: Icon, ...step }) => (
            <article key={step.number}>
              <div><Icon size={20} /><span>{step.number}</span></div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="promotion-readiness">
        <div>
          <p>Перед запуском реклами</p>
          <h2>Сильний профіль працює краще</h2>
          <span>
            Заповніть ключові розділи, щоб клієнт одразу зрозумів ваш досвід,
            спеціалізацію та рівень цін.
          </span>
        </div>
        <div className="promotion-checklist">
          <span><Check size={16} /> Детальний опис майстра</span>
          <span><Check size={16} /> Щонайменше 3 роботи у портфоліо</span>
          <span><Check size={16} /> Актуальні послуги та ціни</span>
          <span><Check size={16} /> Місто та статус зайнятості</span>
        </div>
        <div className="promotion-readiness-actions">
          <Link href="/dashboard/profile">Редагувати профіль</Link>
          <Link href="/dashboard/portfolio">Перевірити портфоліо</Link>
        </div>
      </section>

      <section className="promotion-section promotion-faq">
        <div className="promotion-section-heading">
          <div>
            <p>Питання та відповіді</p>
            <h2>Все важливе про рекламу</h2>
          </div>
          <CircleHelp size={30} />
        </div>
        <div className="promotion-questions">
          {questions.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
