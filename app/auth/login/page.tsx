import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Увійти | БудПоміч",
  description: "Вхід до особистого кабінету БудПоміч.",
};

export default function LoginPage() {
  return (
    <main className="auth-page">
      <header className="auth-header">
        <Link className="auth-brand" href="/masters">
          <Image
            className="brand-logo-image"
            src="/logo/budpomich-logo-v4.svg"
            alt="БудПоміч — будівельний помічник"
            width={790}
            height={420}
            priority
          />
        </Link>
        <Link className="auth-back-link" href="/masters">
          Повернутися до майстрів
        </Link>
      </header>

      <section className="auth-shell">
        <div className="auth-promo">
          <div>
            <p className="auth-eyebrow">Особистий кабінет</p>
            <h1>Усі ваші проєкти в одному місці</h1>
            <p>
              Керуйте профілем, роботами та заявками у простому кабінеті
              БудПоміч.
            </p>
          </div>
          <ul>
            <li><span>01</span> Зберігайте улюблених майстрів</li>
            <li><span>02</span> Стежте за своїми заявками</li>
            <li><span>03</span> Оновлюйте професійний профіль</li>
          </ul>
        </div>

        <div className="auth-card">
          <p className="auth-eyebrow">Раді бачити знову</p>
          <h2>Увійти в БудПоміч</h2>
          <p className="auth-description">
            Введіть дані, які використовували під час реєстрації.
          </p>

          <form className="auth-form">
            <label>
              Email
              <span className="auth-input-wrap">
                <Mail size={18} aria-hidden="true" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </span>
            </label>
            <label>
              Пароль
              <span className="auth-input-wrap">
                <LockKeyhole size={18} aria-hidden="true" />
                <input
                  type="password"
                  placeholder="Ваш пароль"
                  autoComplete="current-password"
                />
              </span>
            </label>
            <Link className="auth-submit" href="/dashboard">
              Увійти <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </form>

          <p className="auth-switch">
            Ще немає профілю?{" "}
            <Link href="/auth/register">Зареєструватися</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
