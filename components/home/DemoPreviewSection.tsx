import Link from "next/link";

const demoRoles = [
  {
    title: "Для клієнта",
    description:
      "Пошук майстрів, заявки, активні ремонти, календар, чат, кошториси та документи.",
    linkLabel: "Переглянути кабінет клієнта",
  },
  {
    title: "Для майстра",
    description:
      "Нові заявки, клієнти, календар зайнятості, повідомлення, портфоліо та робочі проєкти.",
    linkLabel: "Переглянути кабінет майстра",
  },
  {
    title: "Для підрядника",
    description:
      "Команда майстрів, розподіл робіт, календар команди, проєкти, задачі та статистика.",
    linkLabel: "Переглянути кабінет підрядника",
  },
];

export function DemoPreviewSection() {
  return (
    <section className="home-demo home-section" aria-labelledby="home-demo-title">
      <div className="home-demo-intro">
        <span className="home-demo-badge">Демоверсія</span>
        <h2 id="home-demo-title">Спробуйте BudPomich без реєстрації</h2>
        <p>
          Перегляньте, як працює платформа для клієнта, самостійного майстра та
          підрядника. У демоверсії вже є заявки, проєкти, календар, повідомлення та
          приклади робочих процесів.
        </p>
      </div>

      <div className="home-demo-grid">
        {demoRoles.map((role) => (
          <article className="home-demo-card" key={role.title}>
            <h3>{role.title}</h3>
            <p>{role.description}</p>
            <Link href="/demo" aria-label={role.linkLabel}>
              Переглянути кабінет <span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
      </div>

      <p className="home-demo-note">
        Усі заявки, користувачі та проєкти в демоверсії є прикладами.
      </p>
    </section>
  );
}
