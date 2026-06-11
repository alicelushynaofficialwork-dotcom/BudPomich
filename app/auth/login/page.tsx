import Link from "next/link";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";

export const metadata = {
  title: "Вхід | БудПоміч",
};

export default function LoginPage() {
  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="overline">Раді бачити знову</p>
        <h1>Увійти в БудПоміч</h1>
        <p>Керуйте профілем, роботами та заявками з одного кабінету.</p>
        <form className="auth-form">
          <label>
            Email
            <span className="input-wrap">
              <Mail size={18} />
              <input type="email" placeholder="name@example.com" />
            </span>
          </label>
          <label>
            Пароль
            <span className="input-wrap">
              <LockKeyhole size={18} />
              <input type="password" placeholder="Ваш пароль" />
            </span>
          </label>
          <Link className="btn btn-primary btn-large" href="/dashboard">
            Увійти <ArrowRight size={18} />
          </Link>
        </form>
        <p className="auth-switch">
          Ще немає профілю? <Link href="/auth/register">Зареєструватися</Link>
        </p>
      </div>
    </section>
  );
}
