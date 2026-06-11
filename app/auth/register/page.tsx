import Link from "next/link";
import { ArrowRight, LockKeyhole, Mail, UserRound } from "lucide-react";

export const metadata = {
  title: "Створити профіль | БудПоміч",
};

export default function RegisterPage() {
  return (
    <section className="auth-page">
      <div className="auth-card auth-card-wide">
        <p className="overline">Початок професійного профілю</p>
        <h1>Створити профіль</h1>
        <p>Реєстрація займає хвилину. Портфоліо можна додати після входу.</p>
        <form className="auth-form auth-form-grid">
          <label>
            Ім&apos;я або назва бригади
            <span className="input-wrap">
              <UserRound size={18} />
              <input type="text" placeholder="Андрій Коваль" />
            </span>
          </label>
          <label>
            Email
            <span className="input-wrap">
              <Mail size={18} />
              <input type="email" placeholder="name@example.com" />
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
            <span className="input-wrap">
              <LockKeyhole size={18} />
              <input type="password" placeholder="Мінімум 8 символів" />
            </span>
          </label>
          <Link className="btn btn-primary btn-large form-submit" href="/dashboard">
            Створити профіль <ArrowRight size={18} />
          </Link>
        </form>
        <p className="auth-switch">
          Вже зареєстровані? <Link href="/auth/login">Увійти</Link>
        </p>
      </div>
    </section>
  );
}
