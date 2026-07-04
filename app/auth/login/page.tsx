import Image from "next/image";
import Link from "next/link";
import { Check, Home } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";

export const metadata = {
  title: "Вхід | БудПомiч",
  description: "Вхід у кабінет клієнта або майстра БудПомiч.",
};

const benefits = [
  "Перевірені майстри з портфоліо",
  "Прозорі ціни та терміни",
  "Календар зайнятості онлайн",
];

export default function LoginPage() {
  return (
    <main className="auth-page login-page">
      <header className="login-site-header">
        <Link className="login-site-logo" href="/" aria-label="БудПомiч">
          <Image
            className="login-site-logo-image"
            src="/logo/budpomich-logo-v4.svg"
            alt="БудПомiч — будівельний помічник"
            width={790}
            height={420}
            priority
          />
        </Link>

        <nav className="login-main-nav" aria-label="Головна навігація">
          <Link href="/masters">Майстри</Link>
          <Link href="/feed">Роботи</Link>
          <Link href="/dashboard">Кабінет</Link>
        </nav>

        <div className="login-header-actions">
          <Link className="login-ghost-button active" href="/auth/login">
            Увійти
          </Link>
          <Link className="login-ghost-button" href="/auth/register">
            Реєстрація
          </Link>
        </div>
      </header>

      <section className="login-auth-wrap">
        <div className="login-auth-card">
          <aside className="login-brand-panel">
            <div className="login-brand-top">
              <div className="login-brand-mark">
                <Home size={30} />
              </div>
              <h1>З поверненням у БудПомiч</h1>
              <p>
                Увійдіть у кабінет, щоб замовляти перевірених майстрів і стежити за своїми
                заявками.
              </p>

              <ul className="login-brand-points">
                {benefits.map((benefit) => (
                  <li key={benefit}>
                    <span>
                      <Check size={12} />
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="login-brand-bottom">
              <div className="login-badge-circle">
                <Check size={16} />
                <span>2026</span>
              </div>
              <div>
                <strong>2 500+</strong>
                <small>перевірених майстрів</small>
              </div>
            </div>
          </aside>

          <section className="login-form-panel" aria-label="Вхід у БудПомiч">
            <LoginForm />
          </section>
        </div>
      </section>
    </main>
  );
}
