"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Hammer, Home, ShieldCheck, UsersRound, Wrench } from "lucide-react";
import { signUpWithEmail, type AuthActionState } from "@/app/auth/actions";
import type { UserRole } from "@/lib/auth";

type PublicRole = Exclude<UserRole, "admin">;

const initialState: AuthActionState = {};

const roleCards: Array<{
  role: PublicRole;
  title: string;
  description: string;
  icon: typeof Home;
}> = [
  {
    role: "client",
    title: "Я клієнт",
    description: "Шукаю перевіреного майстра та хочу вести заявку в BudPomich.",
    icon: Home,
  },
  {
    role: "master",
    title: "Я майстер",
    description: "Пропоную послуги та хочу отримувати заявки від клієнтів.",
    icon: Wrench,
  },
  {
    role: "contractor",
    title: "Я підрядник",
    description: "Керую командою, об'єктами, майстрами та заявками.",
    icon: Hammer,
  },
];

export function RegisterForm() {
  const [role, setRole] = useState<PublicRole | null>(null);
  const [state, action, pending] = useActionState(signUpWithEmail, initialState);

  return (
    <div className="register-flow">
      <section className="register-step" id="role">
        <div className="register-step-head">
          <span>01</span>
          <strong>Оберіть, хто ви</strong>
        </div>

        {!role ? (
          <div className="register-role-grid">
            {roleCards.map((item) => {
              const Icon = item.icon;
              return (
                <button className="register-role-card" key={item.role} onClick={() => setRole(item.role)} type="button">
                  <i className="register-role-check" />
                  <span>
                    <Icon size={22} />
                  </span>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="register-role-summary">
            <div>
              <span>{role === "client" ? <Home size={19} /> : role === "master" ? <Wrench size={19} /> : <UsersRound size={19} />}</span>
              <div>
                <strong>{roleCards.find((item) => item.role === role)?.title}</strong>
                <small>{roleCards.find((item) => item.role === role)?.description}</small>
              </div>
            </div>
            <button onClick={() => setRole(null)} type="button">
              Змінити
            </button>
          </div>
        )}
      </section>

      {role && (
        <section className="register-step">
          <div className="register-step-head">
            <span>02</span>
            <strong>Дані для входу</strong>
          </div>

          <form action={action} className="register-panel" noValidate>
            <input name="role" type="hidden" value={role} />
            <div className="register-row">
              <label>
                Ім&apos;я та прізвище
                <input name="fullName" placeholder="Олена Коваль" type="text" />
              </label>
              <label>
                Телефон
                <input name="phone" placeholder="+380 67 123 45 67" type="tel" />
              </label>
            </div>

            <div className="register-row">
              <label>
                Email
                <input name="email" placeholder="olena@mail.com" type="email" />
              </label>
              <label>
                Пароль
                <input name="password" placeholder="Мінімум 8 символів" type="password" />
              </label>
            </div>

            <label>
              Місто
              <select defaultValue="" name="city">
                <option disabled value="">
                  Оберіть місто
                </option>
                <option>Київ</option>
                <option>Дніпро</option>
                <option>Львів</option>
                <option>Одеса</option>
                <option>Харків</option>
              </select>
            </label>

            {role !== "client" && (
              <div className="register-note">
                <ShieldCheck size={18} />
                <span>
                  Після реєстрації ви зможете заповнити профіль, послуги, календар і портфоліо в кабінеті.
                </span>
              </div>
            )}

            <label className="register-checkbox">
              <input name="agree" required type="checkbox" />
              <span>
                Погоджуюсь з <Link href="/about">умовами користування</Link> та{" "}
                <Link href="/about">політикою конфіденційності</Link>
              </span>
            </label>

            {state.error && <p className="register-error">{state.error}</p>}
            {state.notice && (
              <section className="register-success" aria-live="polite">
                <div>
                  <Check size={28} />
                </div>
                <h2>Реєстрацію прийнято</h2>
                <p>{state.notice}</p>
                <Link className="register-submit-link" href="/auth/login">
                  Перейти до входу
                  <ArrowRight size={17} />
                </Link>
              </section>
            )}

            <button className="register-submit" disabled={pending} type="submit">
              {pending ? "Створюємо акаунт..." : "Зареєструватися"}
              <ArrowRight size={17} />
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
