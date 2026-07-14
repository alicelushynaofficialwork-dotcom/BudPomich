import type { Metadata } from "next";

import { DemoRoleSelector } from "@/components/DemoRoleSelector";
import { SiteHeader } from "@/components/SiteHeader";

import styles from "./demo.module.css";

export const metadata: Metadata = {
  title: "Demo Mode — BudPomich",
  description: "Спробуйте заповнений приклад роботи BudPomich без реєстрації.",
};

export default function DemoPage() {
  return (
    <main className={styles.page}>
      <SiteHeader showLogin />
      <div className={styles.ruler} aria-hidden="true" />
      <section className={styles.shell}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Технічна перевірка · Demo Mode</p>
          <h1>Спробуйте BudPomich без реєстрації</h1>
          <p>Оберіть роль та перегляньте заповнений приклад роботи платформи.</p>
        </header>
        <DemoRoleSelector />
      </section>
    </main>
  );
}
