"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { resetPassword, signInWithEmail, type AuthActionState } from "@/app/auth/actions";

type LoginView = "login" | "reset";

const initialState: AuthActionState = {};

export function LoginForm({ externalError }: { externalError?: string }) {
  const [view, setView] = useState<LoginView>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loginState, loginAction, loginPending] = useActionState(signInWithEmail, initialState);
  const [resetState, resetAction, resetPending] = useActionState(resetPassword, initialState);

  if (view === "reset") {
    return (
      <div className="login-form-view">
        <button className="login-back-row" onClick={() => setView("login")} type="button">
          <ArrowLeft size={16} />
          Назад до входу
        </button>

        <div className="login-eyebrow">
          <span>05</span>
          Відновлення пароля
        </div>
        <h2>Забули пароль?</h2>
        <p className="login-sub">
          Вкажіть email, прив&apos;язаний до акаунта. Ми надішлемо посилання для відновлення пароля.
        </p>

        <form action={resetAction} className="login-fields" noValidate>
          <label className="login-field">
            Email
            <span className="login-input-wrap">
              <Mail className="login-leading-icon" size={18} />
              <input autoComplete="email" name="email" placeholder="you@example.com" type="email" />
            </span>
          </label>

          <div className="login-hint-box">
            Посилання для відновлення прийде протягом кількох хвилин. Перевірте також папку &quot;Спам&quot;.
          </div>

          {resetState.error && <p className="login-form-error">{resetState.error}</p>}
          {resetState.notice && <p className="login-form-notice">{resetState.notice}</p>}

          <button className="login-primary-button" disabled={resetPending} type="submit">
            {resetPending ? "Надсилаємо..." : "Надіслати посилання"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="login-form-view">
      <div className="login-eyebrow">
        <span>05</span>
        Вхід
      </div>
      <h2>Увійти в кабінет</h2>
      <p className="login-sub">Введіть email і пароль, щоб продовжити роботу в BudPomich.</p>

      <form action={loginAction} className="login-fields" noValidate>
        <label className="login-field">
          Email
          <span className="login-input-wrap">
            <Mail className="login-leading-icon" size={18} />
            <input autoComplete="email" name="email" placeholder="you@example.com" type="email" />
          </span>
        </label>

        <label className="login-field">
          Пароль
          <span className="login-input-wrap">
            <LockKeyhole className="login-leading-icon" size={18} />
            <input
              autoComplete="current-password"
              name="password"
              placeholder="Введіть пароль"
              type={showPassword ? "text" : "password"}
            />
            <button
              aria-label={showPassword ? "Сховати пароль" : "Показати пароль"}
              className="login-toggle-eye"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>

        <div className="login-row-between">
          <label className="login-remember">
            <input type="checkbox" />
            Запам&apos;ятати мене
          </label>
          <button className="login-link-orange" onClick={() => setView("reset")} type="button">
            Забули пароль?
          </button>
        </div>

        {(loginState.error || externalError) && (
          <p className="login-form-error" role="alert">{loginState.error || externalError}</p>
        )}

        <button className="login-primary-button" disabled={loginPending} type="submit">
          {loginPending ? "Входимо..." : "Увійти"}
          <ArrowRight size={17} />
        </button>
      </form>

      <div className="login-divider-row">
        <div />
        <span>або</span>
        <div />
      </div>

      <p className="login-bottom-note">
        Ще немає акаунта? <Link href="/auth/register">Зареєструватися →</Link>
      </p>
    </div>
  );
}
