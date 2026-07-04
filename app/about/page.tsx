import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Home,
  Mail,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  Wrench,
} from "lucide-react";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import "./about.css";

export const metadata = {
  title: "Про сервіс — БудПомiч",
  description:
    "БудПомiч допомагає клієнтам знаходити перевірених майстрів, переглядати роботи, ціни, календар і надсилати заявку онлайн.",
};

const clientBenefits = [
  "Пошук по послузі та місту",
  "Перегляд реальних робіт",
  "Порівняння майстрів",
  "Надсилання заявки",
  "Вибір зручної дати",
];

const masterBenefits = [
  "Публічний професійний профіль",
  "Послуги та ціни",
  "Портфоліо",
  "Отримання заявок",
  "Календар зайнятості",
];

const steps = [
  {
    icon: Search,
    title: "1. Знайдіть спеціаліста",
    text: "Оберіть потрібну послугу та місто. Перегляньте майстрів, які працюють у вашому районі.",
  },
  {
    icon: UserRound,
    title: "2. Перевірте профіль",
    text: "Подивіться опис, портфоліо, послуги, ціни, райони роботи, календар і відгуки.",
  },
  {
    icon: FileText,
    title: "3. Надішліть заявку",
    text: "Опишіть задачу, додайте фото, контакти і виберіть одну або кілька зручних дат.",
  },
  {
    icon: Wrench,
    title: "4. Узгодьте роботу",
    text: "Майстер звʼяжеться з вами, уточнить деталі, бюджет, матеріали та час виконання.",
  },
];

const advantages = [
  {
    icon: BadgeCheck,
    title: "Профілі з деталями",
    text: "У профілі майстра видно спеціалізацію, ціни, портфоліо, досвід і доступність.",
  },
  {
    icon: Search,
    title: "Швидкий пошук",
    text: "Фільтри допомагають знайти майстра за містом, послугою, рейтингом і ціною.",
  },
  {
    icon: FileText,
    title: "Заявка з контекстом",
    text: "Клієнт одразу передає опис задачі, дату, контакти і фото обʼєкта.",
  },
  {
    icon: CalendarDays,
    title: "Календар доступності",
    text: "Вільні, зайняті та очікуючі дні видно ще до відправки заявки.",
  },
  {
    icon: Clock3,
    title: "Менше зайвих дзвінків",
    text: "Майстер отримує структуровані дані і швидше розуміє, чи підходить задача.",
  },
  {
    icon: ShieldCheck,
    title: "Більше довіри",
    text: "Профілі, контакти, роботи і відгуки зібрані в одному зрозумілому місці.",
  },
];

const securityItems = [
  {
    icon: Mail,
    title: "Контакт через заявку",
    text: "Клієнт може залишити заявку без довгого пошуку контактів у різних каналах.",
  },
  {
    icon: CheckCircle2,
    title: "Перевірені дані",
    text: "Профіль може отримувати позначки довіри після заповнення важливих даних.",
  },
  {
    icon: ShieldCheck,
    title: "Контроль активності",
    text: "Майстер сам керує доступністю профілю і прийомом заявок через БудПомiч.",
  },
  {
    icon: BadgeCheck,
    title: "Прозорий вибір",
    text: "Ціни, портфоліо, райони роботи та календар допомагають ухвалювати рішення спокійніше.",
  },
];

const audiences = [
  ["01", "Власники квартир", "Коли потрібно знайти майстра для ремонту кімнати, ванної або кухні."],
  ["02", "Офіси та бізнес", "Для задач у комерційних приміщеннях, де важливі строки і зрозумілий кошторис."],
  ["03", "Майстри", "Щоб показати досвід, роботи, ціни та отримувати заявки в одному кабінеті."],
  ["04", "Бригади", "Для команд, які виконують комплексні ремонти і хочуть мати публічне портфоліо."],
  ["05", "Нові клієнти", "Коли потрібен швидкий спосіб порівняти спеціалістів без хаотичних пошуків."],
];

const faqs = [
  {
    question: "Як знайти майстра?",
    answer:
      "Оберіть потрібну послугу та місто, перегляньте каталог майстрів і відкрийте профіль спеціаліста, який вам підходить.",
  },
  {
    question: "Відправка заявки платна?",
    answer: "Для клієнта пошук майстра та надсилання заявки є безкоштовними.",
  },
  {
    question: "Чи можна вибрати кілька дат?",
    answer:
      "Так. На сторінці оформлення заявки можна обрати одну дату або кілька вільних дат у календарі майстра.",
  },
  {
    question: "Як майстер отримує заявку?",
    answer:
      "Заявка потрапляє в кабінет майстра з описом задачі, вибраними послугами, датами, контактами та фото, якщо клієнт їх додав.",
  },
  {
    question: "Чи можна написати майстру напряму?",
    answer:
      "Так. У профілі майстра є прямий звʼязок, якщо клієнт хоче уточнити деталі без вибору дати.",
  },
];

function SectionLabel({ number, children }: { number: string; children: string }) {
  return (
    <span className="about-eyebrow">
      <span>{number}</span>
      {children}
    </span>
  );
}

export default function AboutPage() {
  return (
    <main className="about-page">
      <SiteHeader
        navItems={[
          { href: "/masters", label: "Майстри" },
          { href: "/#categories", label: "Категорії" },
          { href: "/#how-it-works", label: "Як це працює" },
          { href: "/about", label: "Про сервіс", active: true },
        ]}
        showBecomeMaster
        showLogin
      />

      <section className="about-hero">
        <div className="about-wrap about-hero-grid">
          <div className="about-hero-content">
            <span className="about-hero-badge">
              <i />
              Пошук майстра — безкоштовно
            </span>
            <h1>Знайдіть надійного майстра для ремонту та будівництва</h1>
            <p>
              БудПомiч допомагає порівнювати майстрів, переглядати їхні роботи, послуги, ціни та
              надсилати заявку без довгих пошуків.
            </p>
            <div className="about-actions">
              <Link className="about-button about-button-primary" href="/masters">
                Знайти майстра
              </Link>
              <Link className="about-button about-button-secondary" href="/auth/register">
                Стати майстром
              </Link>
            </div>
            <div className="about-trust-line">
              <CheckCircle2 size={16} />
              Без реєстрації — щоб переглянути каталог майстрів
            </div>
          </div>

          <div className="about-hero-visual" aria-label="Приклад профілю майстра">
            <div className="about-floating-note about-floating-note-top">
              <CheckCircle2 size={16} />
              Заявку прийнято
            </div>
            <article className="about-master-preview">
              <div className="about-master-photo">
                <span>фото: майстер за роботою</span>
                <strong>Перевірений майстер</strong>
              </div>
              <div className="about-master-body">
                <small>Плиточник · Київ, Печерський район</small>
                <h2>Андрій Пономаренко</h2>
                <div className="about-master-rating">
                  <span>5.0</span>
                  <span>12 відгуків</span>
                </div>
                <div className="about-master-footer">
                  <span>
                    від <b>450 грн/м²</b>
                  </span>
                  <Link href="/profile/andrey-ponomarenko/request">Заявка</Link>
                </div>
              </div>
            </article>
            <div className="about-floating-note about-floating-note-bottom">
              <CalendarDays size={16} />
              Вільний з 5 липня
            </div>
          </div>
        </div>
      </section>

      <section className="about-section about-section-paper" id="service">
        <div className="about-wrap">
          <div className="about-section-head">
            <SectionLabel number="1">Про сервіс</SectionLabel>
            <h2>Що таке БудПомiч?</h2>
          </div>
          <div className="about-text-block">
            <p>
              БудПомiч — це онлайн-сервіс для пошуку майстрів у сфері ремонту та будівництва.
              Клієнти можуть переглядати профілі спеціалістів, порівнювати послуги, ціни та
              приклади робіт, а потім надсилати заявку обраному майстру.
            </p>
            <p>
              Майстри отримують професійний профіль, портфоліо, календар зайнятості та зручний
              кабінет для роботи із заявками клієнтів.
            </p>
          </div>

          <div className="about-role-grid">
            <article className="about-role-card about-role-client">
              <span className="about-role-icon">
                <UsersRound size={22} />
              </span>
              <h3>Для клієнтів</h3>
              <ul>
                {clientBenefits.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link className="about-button about-button-primary" href="/masters">
                Знайти майстра
              </Link>
            </article>

            <article className="about-role-card about-role-master">
              <span className="about-role-icon">
                <Home size={22} />
              </span>
              <h3>Для майстрів</h3>
              <ul>
                {masterBenefits.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link className="about-button about-button-secondary" href="/auth/register">
                Створити профіль
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="about-section" id="how">
        <div className="about-wrap">
          <div className="about-section-head">
            <SectionLabel number="2">Процес</SectionLabel>
            <h2>Як працює БудПомiч</h2>
          </div>
          <div className="about-steps">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <article className="about-step" key={step.title}>
                  <span>
                    <Icon size={22} />
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              );
            })}
          </div>
          <Link className="about-button about-button-primary about-section-cta" href="/masters">
            Перейти до каталогу майстрів
          </Link>
        </div>
      </section>

      <section className="about-section about-section-paper">
        <div className="about-wrap">
          <div className="about-section-head">
            <SectionLabel number="3">Переваги</SectionLabel>
            <h2>Чому зручно користуватися БудПомiч</h2>
            <p>Сервіс зводить важливі дані про майстра в один зрозумілий профіль.</p>
          </div>
          <div className="about-adv-grid">
            {advantages.map((item) => {
              const Icon = item.icon;
              return (
                <article className="about-adv-card" key={item.title}>
                  <span>
                    <Icon size={20} />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="about-section" id="security">
        <div className="about-wrap">
          <div className="about-section-head">
            <SectionLabel number="4">Довіра</SectionLabel>
            <h2>Безпека та довіра</h2>
            <p>
              Ми прагнемо зробити пошук майстра зрозумілішим і безпечнішим: профілі мають
              структуровані дані, а клієнт бачить, що саме пропонує майстер.
            </p>
          </div>

          <div className="about-security-grid">
            {securityItems.map((item) => {
              const Icon = item.icon;
              return (
                <article className="about-security-card" key={item.title}>
                  <span>
                    <Icon size={20} />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>

          <div className="about-disclaimer">
            <ShieldCheck size={22} />
            <p>
              БудПомiч допомагає організувати контакт між клієнтом і майстром. Умови робіт, бюджет,
              матеріали та оплату сторони узгоджують напряму перед початком виконання.
            </p>
          </div>
        </div>
      </section>

      <section className="about-section about-section-paper">
        <div className="about-wrap">
          <div className="about-section-head">
            <SectionLabel number="5">Аудиторія</SectionLabel>
            <h2>Для кого створений сервіс</h2>
          </div>
          <div className="about-audience-grid">
            {audiences.map(([number, title, text]) => (
              <article className="about-audience-card" key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section" id="faq">
        <div className="about-wrap">
          <div className="about-section-head">
            <SectionLabel number="6">Питання</SectionLabel>
            <h2>Часто задавані питання</h2>
          </div>
          <div className="about-faq-list">
            {faqs.map((item, index) => (
              <details className="about-faq-item" key={item.question} open={index === 0}>
                <summary>
                  <span>{item.question}</span>
                  <i />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section about-final-section">
        <div className="about-wrap">
          <div className="about-final-cta">
            <h2>Готові знайти майстра або показати свої роботи?</h2>
            <p>
              Перейдіть до каталогу майстрів або створіть профіль, щоб клієнти могли бачити ваші
              послуги, портфоліо, ціни та доступні дати.
            </p>
            <div>
              <Link className="about-button about-button-primary" href="/masters">
                Знайти майстра
              </Link>
              <Link className="about-button about-button-dark" href="/auth/register">
                Стати майстром
              </Link>
            </div>
            <span>
              <CheckCircle2 size={16} />
              Профіль майстра можна оновлювати в кабінеті
            </span>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
