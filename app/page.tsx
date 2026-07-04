import Image from "next/image";
import Link from "next/link";
import "./home.css";
import { SiteHeader } from "@/components/SiteHeader";
import { masterProfiles } from "@/lib/masters";

export const metadata = {
  title: "БудПоміч — знайдіть перевіреного майстра",
  description:
    "БудПоміч допомагає знайти майстра для ремонту, переглянути послуги, ціни, портфоліо та швидко залишити заявку.",
};

const categories = [
  { code: "01 — GKL", name: "Гіпсокартон та стелі", count: "128 майстрів" },
  { code: "02 — TIL", name: "Плиточні роботи", count: "94 майстри" },
  { code: "03 — PNT", name: "Малярні роботи", count: "76 майстрів" },
  { code: "04 — PLB", name: "Сантехніка", count: "112 майстрів" },
  { code: "05 — ELC", name: "Електрика", count: "85 майстрів" },
  { code: "06 — FLR", name: "Підлога та ламінат", count: "61 майстер" },
  { code: "07 — FRN", name: "Меблі на замовлення", count: "47 майстрів" },
  { code: "08 — CLN", name: "Клінінг після ремонту", count: "39 майстрів" },
];

const steps = [
  {
    title: "Опишіть задачу",
    text: "Вкажіть послугу, район, дату та деталі робіт. Це займає кілька хвилин.",
  },
  {
    title: "Порівняйте майстрів",
    text: "Дивіться ціни, досвід, портфоліо та доступність перед вибором.",
  },
  {
    title: "Замовте онлайн",
    text: "Оберіть вільну дату в календарі майстра або напишіть напряму.",
  },
  {
    title: "Отримайте результат",
    text: "Майстер виконує роботу, ви узгоджуєте оплату напряму та залишаєте відгук.",
  },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat("uk-UA").format(price);
}

export default function HomePage() {
  const recommendedMasters = masterProfiles.slice(0, 3);

  return (
    <main className="home-page">
      <SiteHeader
        navItems={[
          { href: "/masters", label: "Майстри" },
          { href: "/#categories", label: "Категорії" },
          { href: "/#how-it-works", label: "Як це працює" },
          { href: "/about", label: "Про сервіс" },
        ]}
        showBecomeMaster
        showLogin
      />

      <section className="home-hero">
        <div>
          <p className="home-eyebrow">Будівельний помічник</p>
          <h1>Знайдіть перевіреного майстра для ремонту</h1>
          <p>
            Гіпсокартон, плитка, сантехніка, електрика та інші роботи. Майстри з
            Києва та області, з цінами, портфоліо і швидкою заявкою.
          </p>

          <form className="home-search" action="/masters">
            <label>
              <span>Послуга</span>
              <input name="service" placeholder="Наприклад, укладання плитки" />
            </label>
            <label>
              <span>Місто</span>
              <input name="city" defaultValue="Київ" />
            </label>
            <button type="submit">Знайти майстра</button>
          </form>

          <div className="home-hero-stats" aria-label="Показники БудПоміч">
            <span>
              <strong>{masterProfiles.length}+</strong>
              майстрів у каталозі
            </span>
            <span>
              <strong>340+</strong>
              виконаних заявок
            </span>
            <span>
              <strong>4.8</strong>
              середня оцінка
            </span>
          </div>
        </div>
      </section>

      <div className="home-ruler" aria-hidden="true" />

      <section className="home-section" id="categories">
        <div className="home-section-head">
          <div>
            <p className="home-section-kicker"><span>01</span> Категорії</p>
            <h2>Популярні послуги</h2>
          </div>
          <Link href="/masters">Усі категорії →</Link>
        </div>

        <div className="home-category-grid">
          {categories.map((category) => (
            <Link className="home-category-card" href="/masters" key={category.code}>
              <span>{category.code}</span>
              <strong>{category.name}</strong>
              <small>{category.count}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <div>
            <p className="home-section-kicker"><span>02</span> Рекомендації</p>
            <h2>Майстри поруч із вами</h2>
          </div>
          <Link href="/masters">Каталог майстрів →</Link>
        </div>

        <div className="home-master-grid">
          {recommendedMasters.map((master) => (
            <article className="home-master-card" key={master.id}>
              <div className="home-master-top">
                <div className={`home-master-avatar avatar-${master.accent}`}>
                  {master.avatarUrl ? (
                    <Image src={master.avatarUrl} alt={master.name} width={72} height={72} />
                  ) : (
                    master.initials
                  )}
                </div>
                <div>
                  <h3>{master.name}</h3>
                  <p>{master.profession} · {master.city}</p>
                </div>
                <span aria-label="Перевірений майстер">✓</span>
              </div>
              <div className="home-master-meta">
                <span>★ {master.rating.toFixed(1)} · {master.reviews} відгуків</span>
                <strong>від {formatPrice(master.priceFrom)} грн</strong>
              </div>
              <Link href={`/profile/${master.id}`}>Дивитись профіль</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section" id="how-it-works">
        <div className="home-section-head">
          <div>
            <p className="home-section-kicker"><span>03</span> Процес</p>
            <h2>Як це працює</h2>
          </div>
        </div>

        <div className="home-steps">
          {steps.map((step, index) => (
            <article className="home-step" key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-register" id="register">
        <div>
          <p className="home-eyebrow">Для майстрів</p>
          <h2>Приєднуйтесь до БудПоміч</h2>
          <p>
            Отримуйте заявки від клієнтів у своєму районі, ведіть портфоліо та
            керуйте зайнятістю через календар.
          </p>
          <ul>
            <li>Безкоштовна реєстрація та профіль</li>
            <li>Заявки від клієнтів, які вже обрали послугу</li>
            <li>Оплата напряму, без комісії з чека</li>
          </ul>
        </div>
        <div className="home-register-side">
          <Link href="/auth/register">Зареєструватися як майстер →</Link>
          <div>
            <span><strong>{masterProfiles.length}+</strong> майстрів</span>
            <span><strong>2–3</strong> заявки / тиждень</span>
          </div>
        </div>
      </section>

      <footer className="home-footer">© 2026 БудПоміч · будівельний помічник</footer>
    </main>
  );
}
