"use client";

import { useState } from "react";

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
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DemoSessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function selectRole(role: DemoRole) {
    setIsLoading(true);
    setError(null);

    try {
      setResult(await startDemoSession(role));
    } catch (demoError) {
      console.error("Не вдалося запустити Demo Mode:", demoError);
      setError("Не вдалося створити демоверсію. Будь ласка, спробуйте ще раз.");
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
        <button className={styles.secondaryButton} onClick={resetSelection} type="button">
          Спробувати іншу роль
        </button>
      </section>
    );
  }

  return (
    <section aria-label="Вибір ролі для демоверсії">
      <div className={styles.roleGrid}>
        {roleOptions.map((option) => (
          <button
            className={styles.roleButton}
            disabled={isLoading}
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
