import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/RegisterForm";

export const metadata: Metadata = {
  title: "Реєстрація | БудПомiч",
  description: "Реєстрація клієнта або майстра у сервісі БудПомiч.",
};

export default function RegisterPage() {
  return (
    <main className="auth-page register-page">
      <header className="register-topbar">
        <Link className="register-brand" href="/">
          <Image
            className="register-brand-logo"
            src="/logo/budpomich-logo-v4.svg"
            alt="БудПомiч — будівельний помічник"
            width={790}
            height={420}
            priority
          />
        </Link>

        <nav className="register-nav" aria-label="Головна навігація">
          <Link href="/masters">Майстри</Link>
          <Link href="/feed">Роботи</Link>
          <Link href="/dashboard">Кабінет</Link>
        </nav>

        <Link className="register-login-link" href="/auth/login">
          Вже є акаунт? <span>Увійти</span>
        </Link>
      </header>

      <div className="register-wrap">
        <Link className="register-crumb" href="/">
          ← На головну
        </Link>

        <p className="register-hero-eyebrow">
          <span>06</span>
          Реєстрація
        </p>
        <h1>Приєднуйтесь до БудПомiч</h1>
        <p className="register-lede">
          Створіть акаунт клієнта або майстра. Після реєстрації ви зможете залишати заявки,
          відповідати клієнтам і керувати профілем.
        </p>

        <RegisterForm />
      </div>
    </main>
  );
}
