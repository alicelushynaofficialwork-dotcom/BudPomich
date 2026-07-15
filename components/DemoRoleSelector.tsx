"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DemoTurnstile, type DemoTurnstileHandle } from "@/components/demo/DemoTurnstile";
import { createClient } from "@/lib/supabase";

import {
  startDemoSession,
  type DemoRole,
  type DemoSessionResult,
} from "@/lib/demo/start-demo-session";

import styles from "@/app/demo/demo.module.css";

const roleOptions: Array<{ role: DemoRole; label: string; number: string }> = [
  { role: "client", label: "Я клієнт", number: "01" },
  { role: "master", label: "Я майстер", number: "02" },
  { role: "contractor", label: "Я підрядник", number: "03" },
];

export function DemoRoleSelector() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DemoSessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasAuthSession, setHasAuthSession] = useState<boolean | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaState, setCaptchaState] = useState<"loading" | "ready" | "expired" | "error">("loading");
  const turnstileRef = useRef<DemoTurnstileHandle>(null);
  const siteKeyAvailable = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const handleCaptchaToken = useCallback((token: string | null) => setCaptchaToken(token), []);
  const handleCaptchaState = useCallback((state: "loading" | "ready" | "expired" | "error") => setCaptchaState(state), []);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    if (!supabase) {
      console.error("Demo Mode security check: Supabase browser client is not configured.");
      queueMicrotask(() => { if (active) setHasAuthSession(false); });
      return;
    }
    supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!active) return;
      if (authError) console.error("Demo Mode security check: unable to read the current Auth session.");
      setHasAuthSession(Boolean(data.user));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!siteKeyAvailable) {
      console.error("Demo Mode security check: NEXT_PUBLIC_TURNSTILE_SITE_KEY is not configured.");
    }
  }, [siteKeyAvailable]);

  async function selectRole(role: DemoRole) {
    setIsLoading(true);
    setError(null);

    try {
      const session = await startDemoSession(role, {
        captchaToken: hasAuthSession ? undefined : captchaToken ?? undefined,
      });
      setResult(session);
      router.push(session.route);
    } catch (demoError) {
      console.error("Не вдалося запустити Demo Mode:", demoError);
      setError("Не вдалося створити демоверсію. Будь ласка, спробуйте ще раз.");
      const supabase = createClient();
      const currentUser = supabase ? (await supabase.auth.getUser()).data.user : null;
      if (currentUser) {
        setHasAuthSession(true);
        setCaptchaToken(null);
      } else {
        turnstileRef.current?.reset();
      }
    } finally {
      setIsLoading(false);
    }
  }

  function resetSelection() {
    setResult(null);
    setError(null);
  }

  if (result) {
    return (
      <section className={styles.result} aria-live="polite">
        <p className={styles.resultEyebrow}>Demo Mode готовий</p>
        <h2>Демосесію створено</h2>
        <dl className={styles.details}>
          <div>
            <dt>Роль</dt>
            <dd>{result.role}</dd>
          </div>
          <div>
            <dt>Назва шаблону</dt>
            <dd>{result.templateName}</dd>
          </div>
          <div>
            <dt>Ідентифікатор демосесії</dt>
            <dd>{result.id}</dd>
          </div>
        </dl>
        <div className={styles.resultActions}>
          {result.role === "client" && (
            <Link className={styles.primaryButton} href="/client/dashboard">
              Відкрити кабінет клієнта
            </Link>
          )}
          <button className={styles.secondaryButton} onClick={resetSelection} type="button">
            Спробувати іншу роль
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Вибір ролі для демоверсії">
      {hasAuthSession === null && <p className={styles.securityStatus} aria-live="polite">Перевіряємо активну сесію…</p>}
      {hasAuthSession === false && !siteKeyAvailable && (
        <p className={styles.error} role="alert">Перевірка безпеки тимчасово недоступна.</p>
      )}
      {hasAuthSession === false && siteKeyAvailable && (
        <section className={styles.captchaPanel} aria-labelledby="demo-captcha-title">
          <h2 id="demo-captcha-title">Підтвердьте, що ви не робот, щоб відкрити демоверсію.</h2>
          <DemoTurnstile ref={turnstileRef} onState={handleCaptchaState} onToken={handleCaptchaToken} />
          {captchaState === "loading" && <p className={styles.securityStatus} aria-live="polite">Завантажуємо перевірку безпеки…</p>}
          {captchaState === "expired" && <p className={styles.error} role="alert">Перевірка завершилася. Підтвердьте її ще раз.</p>}
          {captchaState === "error" && <p className={styles.error} role="alert">Не вдалося пройти перевірку. Спробуйте ще раз.</p>}
        </section>
      )}
      <div className={styles.roleGrid}>
        {roleOptions.map((option) => (
          <button
            className={styles.roleButton}
            disabled={isLoading || hasAuthSession === null || (hasAuthSession === false && (!siteKeyAvailable || !captchaToken))}
            key={option.role}
            onClick={() => selectRole(option.role)}
            type="button"
          >
            <span>{option.number} — {option.role.toUpperCase()}</span>
            <strong>{option.label}</strong>
            <small>Запустити демоверсію →</small>
          </button>
        ))}
      </div>

      {isLoading && (
        <p className={styles.status} aria-live="polite">
          Створюємо демоверсію…
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
