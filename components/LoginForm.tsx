"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Phone } from "lucide-react";

type LoginMode = "email" | "phone";
type LoginView = "login" | "reset";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("email");
  const [view, setView] = useState<LoginView>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [resetContact, setResetContact] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function changeMode(nextMode: LoginMode) {
    setMode(nextMode);
    setIdentifier("");
    setError("");
    setNotice("");
  }

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!identifier.trim() || !password.trim()) {
      setError("Заповніть email або телефон і пароль, щоб увійти.");
      setNotice("");
      return;
    }

    setError("");
    setNotice("");
    router.push("/dashboard");
  }

  function submitReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!resetContact.trim()) {
      setError("Вкажіть email або телефон для відновлення пароля.");
      setNotice("");
      return;
    }

    setError("");
    setNotice("Посилання для відновлення надіслано. Перевірте пошту або SMS.");
  }

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
          Вкажіть email або телефон, прив'язаний до акаунту. Ми надішлемо посилання для відновлення.
        </p>

        <form className="login-fields" onSubmit={submitReset} noValidate>
          <label className="login-field">
            Email або телефон
            <span className="login-input-wrap">
              <Mail className="login-leading-icon" size={18} />
              <input
                autoComplete="username"
                onChange={(event) => {
                  setResetContact(event.target.value);
                  setError("");
                  setNotice("");
                }}
                placeholder="you@example.com або +380 XX XXX XX XX"
                type="text"
                value={resetContact}
              />
            </span>
          </label>

          <div className="login-hint-box">
            Посилання для відновлення прийде протягом кількох хвилин. Перевірте також папку "Спам".
          </div>

          {error && <p className="login-form-error">{error}</p>}
          {notice && <p className="login-form-notice">{notice}</p>}

          <button className="login-primary-button" type="submit">
            Надіслати посилання
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
      <p className="login-sub">Раді бачити вас знову. Введіть дані, щоб продовжити.</p>

      <div className="login-id-tabs" role="tablist" aria-label="Спосіб входу">
        <button
          aria-selected={mode === "email"}
          className={mode === "email" ? "active" : ""}
          onClick={() => changeMode("email")}
          role="tab"
          type="button"
        >
          Email
        </button>
        <button
          aria-selected={mode === "phone"}
          className={mode === "phone" ? "active" : ""}
          onClick={() => changeMode("phone")}
          role="tab"
          type="button"
        >
          Телефон
        </button>
      </div>

      <form className="login-fields" onSubmit={submitLogin} noValidate>
        <label className="login-field">
          {mode === "email" ? "Email" : "Телефон"}
          <span className="login-input-wrap">
            {mode === "email" ? (
              <Mail className="login-leading-icon" size={18} />
            ) : (
              <Phone className="login-leading-icon" size={18} />
            )}
            <input
              autoComplete={mode === "email" ? "email" : "tel"}
              onChange={(event) => {
                setIdentifier(event.target.value);
                setError("");
              }}
              placeholder={mode === "email" ? "you@example.com" : "+380 XX XXX XX XX"}
              type={mode === "email" ? "email" : "tel"}
              value={identifier}
            />
          </span>
        </label>

        <label className="login-field">
          Пароль
          <span className="login-input-wrap">
            <LockKeyhole className="login-leading-icon" size={18} />
            <input
              autoComplete="current-password"
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              placeholder="Введіть пароль"
              type={showPassword ? "text" : "password"}
              value={password}
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
            Запам'ятати мене
          </label>
          <button className="login-link-orange" onClick={() => setView("reset")} type="button">
            Забули пароль?
          </button>
        </div>

        {error && <p className="login-form-error">{error}</p>}

        <button className="login-primary-button" type="submit">
          Увійти
          <ArrowRight size={17} />
        </button>
      </form>

      <div className="login-divider-row">
        <div />
        <span>або</span>
        <div />
      </div>

      <p className="login-bottom-note">
        Ще немає акаунту? <Link href="/auth/register">Зареєструватися →</Link>
      </p>
    </div>
  );
}
