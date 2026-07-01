import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";

export const metadata = {
  title: "Вхід | БудПоміч",
};

const benefits = [
  "Зберігайте улюблених майстрів",
  "Стежте за своїми заявками",
  "Оновлюйте професійний профіль",
];

export default function LoginPage() {
  return (
    <main className="auth-page login-page">
      <header className="login-topbar">
        <Link className="app-logo" href="/masters" aria-label="БудПомiч">
          <Image
            src="/logo/budpomich-logo.svg"
            alt="БудПомiч"
            width={158}
            height={84}
            priority
          />
        </Link>
        <Link className="login-back-link" href="/masters">
          <ArrowLeft size={17} />
          Повернутися до майстрів
        </Link>
      </header>

      <section className="login-shell" aria-label="Вхід у БудПоміч">
        <aside className="login-promo-card">
          <div>
            <p className="overline">ОСОБИСТИЙ КАБІНЕТ</p>
            <h1>Усі ваші проєкти в одному місці</h1>
            <p>
              Керуйте профілем, роботами та заявками у простому кабінеті
              БудПоміч.
            </p>
          </div>

          <ol className="login-benefits">
            {benefits.map((benefit, index) => (
              <li key={benefit}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {benefit}
              </li>
            ))}
          </ol>
        </aside>

        <section className="auth-card login-card">
          <p className="overline">РАДІ БАЧИТИ ЗНОВУ</p>
          <h2>Увійти в БудПоміч</h2>
          <p>
            Увійдіть, щоб керувати профілем, роботами, заявками та
            повідомленнями в одному місці.
          </p>
          <LoginForm />
        </section>
      </section>
    </main>
  );
}
