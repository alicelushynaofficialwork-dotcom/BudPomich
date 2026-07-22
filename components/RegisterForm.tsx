"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Check, Hammer, Home, ShieldCheck, UsersRound, Wrench } from "lucide-react";
import { signUpWithEmail, type AuthActionState } from "@/app/auth/actions";
import type { UserRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase";

type PublicRole = Exclude<UserRole, "admin">;

const initialState: AuthActionState = {};

const agreementErrorMessage =
  "Підтвердьте згоду з умовами використання та політикою конфіденційності.";

type RegisterValues = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  city: string;
  agree: boolean;
};

type RegisterField = "fullName" | "email" | "password" | "agree";

const initialValues: RegisterValues = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  city: "",
  agree: false,
};

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
  const [values, setValues] = useState<RegisterValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RegisterField, string>>>({});
  const [registrationEmail, setRegistrationEmail] = useState("");
  const [resendPending, setResendPending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendFeedback, setResendFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const agreementRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState(signUpWithEmail, initialState);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  function updateValue<K extends keyof RegisterValues>(key: K, value: RegisterValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    if (fieldErrors[key as RegisterField]) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[key as RegisterField];
        return next;
      });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors: Partial<Record<RegisterField, string>> = {};
    if (!values.fullName.trim()) errors.fullName = "Вкажіть ім’я та прізвище.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      errors.email = "Вкажіть коректний email.";
    }
    if (values.password.length < 8) {
      errors.password = "Пароль має містити щонайменше 8 символів.";
    }
    if (!values.agree) errors.agree = agreementErrorMessage;

    setFieldErrors(errors);
    const firstInvalidField = (Object.keys(errors) as RegisterField[])[0];
    if (firstInvalidField) {
      if (firstInvalidField === "agree") {
        agreementRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        agreementRef.current?.focus({ preventScroll: true });
      } else {
        const invalidElement = event.currentTarget.elements.namedItem(firstInvalidField);
        if (invalidElement instanceof HTMLElement) invalidElement.focus();
      }
      return;
    }

    const formData = new FormData(event.currentTarget);
    setRegistrationEmail(values.email.trim().toLowerCase());
    startTransition(() => action(formData));
  }

  async function handleResendConfirmation() {
    if (!registrationEmail || resendPending || resendCooldown > 0) return;

    setResendPending(true);
    setResendFeedback(null);

    const supabase = createClient();
    if (!supabase) {
      setResendFeedback({ type: "error", message: "Supabase не налаштований." });
      setResendPending(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: registrationEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) {
        setResendFeedback({ type: "error", message: error.message });
      } else {
        setResendFeedback({ type: "success", message: "Новий лист підтвердження надіслано." });
        setResendCooldown(60);
      }
    } catch (error) {
      setResendFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Не вдалося надіслати лист повторно.",
      });
    } finally {
      setResendPending(false);
    }
  }

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

          <form className="register-panel" noValidate onSubmit={handleSubmit}>
            <input name="role" type="hidden" value={role} />
            <div className="register-row">
              <label className={fieldErrors.fullName ? "register-field-error" : undefined}>
                Ім&apos;я та прізвище
                <input aria-describedby={fieldErrors.fullName ? "register-full-name-error" : undefined} aria-invalid={fieldErrors.fullName ? true : undefined} name="fullName" onChange={(event) => updateValue("fullName", event.target.value)} placeholder="Олена Коваль" type="text" value={values.fullName} />
                {fieldErrors.fullName && <span className="register-field-message" id="register-full-name-error" role="alert">{fieldErrors.fullName}</span>}
              </label>
              <label>
                Телефон
                <input name="phone" onChange={(event) => updateValue("phone", event.target.value)} placeholder="+380 67 123 45 67" type="tel" value={values.phone} />
              </label>
            </div>

            <div className="register-row">
              <label className={fieldErrors.email ? "register-field-error" : undefined}>
                Email
                <input aria-describedby={fieldErrors.email ? "register-email-error" : undefined} aria-invalid={fieldErrors.email ? true : undefined} name="email" onChange={(event) => updateValue("email", event.target.value)} placeholder="olena@mail.com" type="email" value={values.email} />
                {fieldErrors.email && <span className="register-field-message" id="register-email-error" role="alert">{fieldErrors.email}</span>}
              </label>
              <label className={fieldErrors.password ? "register-field-error" : undefined}>
                Пароль
                <input aria-describedby={fieldErrors.password ? "register-password-error" : undefined} aria-invalid={fieldErrors.password ? true : undefined} name="password" onChange={(event) => updateValue("password", event.target.value)} placeholder="Мінімум 8 символів" type="password" value={values.password} />
                {fieldErrors.password && <span className="register-field-message" id="register-password-error" role="alert">{fieldErrors.password}</span>}
              </label>
            </div>

            <label>
              Місто
              <select name="city" onChange={(event) => updateValue("city", event.target.value)} value={values.city}>
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

            <label className={`register-checkbox${fieldErrors.agree ? " register-checkbox-error" : ""}`}>
              <input aria-describedby={fieldErrors.agree ? "register-agreement-error" : undefined} aria-invalid={fieldErrors.agree ? true : undefined} checked={values.agree} name="agree" onChange={(event) => updateValue("agree", event.target.checked)} ref={agreementRef} type="checkbox" />
              <span>
                Погоджуюсь з <Link href="/about">умовами користування</Link> та{" "}
                <Link href="/about">політикою конфіденційності</Link>
              </span>
            </label>
            {fieldErrors.agree && <p className="register-field-message register-agreement-message" id="register-agreement-error" role="alert">{fieldErrors.agree}</p>}

            {state.error && <p className="register-error">{state.error}</p>}
            {state.notice && (
              <section className="register-success" aria-live="polite">
                <div>
                  <Check size={28} />
                </div>
                <h2>Реєстрацію прийнято</h2>
                <p>{state.notice}</p>
                <button
                  className="register-resend-button"
                  disabled={resendPending || resendCooldown > 0}
                  onClick={handleResendConfirmation}
                  type="button"
                >
                  {resendPending
                    ? "Надсилаємо…"
                    : resendCooldown > 0
                      ? `Надіслати повторно через ${resendCooldown} с`
                      : "Надіслати лист повторно"}
                </button>
                {resendFeedback && (
                  <p
                    className={resendFeedback.type === "error" ? "register-error" : "register-resend-success"}
                    role={resendFeedback.type === "error" ? "alert" : undefined}
                  >
                    {resendFeedback.message}
                  </p>
                )}
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
