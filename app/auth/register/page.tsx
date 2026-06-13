import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, LockKeyhole, Mail, UserRound } from "lucide-react";

export const metadata: Metadata = {
  title: "Створити профіль | БудПоміч",
  description: "Реєстрація майстра або клієнта у БудПоміч.",
};

export default function RegisterPage() {
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

      <section className="auth-shell auth-shell-register">
        <div className="auth-promo">
          <div>
            <p className="auth-eyebrow">Для майстрів і клієнтів</p>
            <h1>Створіть профіль за кілька хвилин</h1>
            <p>
              Покажіть свої роботи або знаходьте перевірених фахівців для
              наступного проєкту.
            </p>
          </div>
          <ul>
            <li><span>01</span> Додайте послуги та портфоліо</li>
            <li><span>02</span> Отримуйте нові заявки</li>
            <li><span>03</span> Формуйте професійну репутацію</li>
          </ul>
        </div>

        <div className="auth-card auth-card-wide">
          <p className="auth-eyebrow">Початок роботи</p>
          <h2>Створити профіль</h2>
          <p className="auth-description">
            Портфоліо та детальний опис можна додати після реєстрації.
          </p>

          <form className="auth-form auth-form-grid">
            <label>
              Ім&apos;я або назва бригади
              <span className="auth-input-wrap">
                <UserRound size={18} aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Андрій Коваль"
                  autoComplete="name"
                />
              </span>
            </label>
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
              Тип профілю
              <select defaultValue="master">
                <option value="master">Майстер</option>
                <option value="team">Бригада</option>
                <option value="company">Компанія</option>
                <option value="client">Клієнт</option>
              </select>
            </label>
            <label>
              Пароль
              <span className="auth-input-wrap">
                <LockKeyhole size={18} aria-hidden="true" />
                <input
                  type="password"
                  placeholder="Мінімум 8 символів"
                  autoComplete="new-password"
                />
              </span>
            </label>
            <Link className="auth-submit auth-form-submit" href="/dashboard">
              Створити профіль <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </form>

          <p className="auth-switch">
            Вже зареєстровані? <Link href="/auth/login">Увійти</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
