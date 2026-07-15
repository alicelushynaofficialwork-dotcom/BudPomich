"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DemoAuthRequiredError, startDemoSession, type DemoRole } from "@/lib/demo/start-demo-session";
import styles from "./DemoCabinetSwitcher.module.css";

export type DemoCabinetRole = "client" | "master" | "contractor";
type DemoCabinetSwitcherProps = { currentRole: DemoCabinetRole };
const roles: { role: DemoCabinetRole; label: string }[] = [
  { role: "client", label: "Клієнт" },
  { role: "master", label: "Майстер" },
  { role: "contractor", label: "Підрядник" },
];

export function DemoCabinetSwitcher({ currentRole }: DemoCabinetSwitcherProps) {
  const router = useRouter();
  const [loadingRole, setLoadingRole] = useState<DemoRole>();
  const [error, setError] = useState<string>();

  async function select(role: DemoCabinetRole) {
    if (role === currentRole || loadingRole) return;
    setLoadingRole(role);
    setError(undefined);
    try {
      const session = await startDemoSession(role, { allowAnonymousSignIn: false });
      router.push(session.route);
    } catch (reason) {
      if (reason instanceof DemoAuthRequiredError) {
        router.replace("/demo");
        return;
      }
      console.error("Failed to switch demo cabinet:", reason);
      setError("Не вдалося відкрити демонстраційний кабінет. Спробуйте ще раз.");
      setLoadingRole(undefined);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.switcher} role="group" aria-label="Перемикання демонстраційного кабінету">
        {roles.map((item) => {
          const current = item.role === currentRole;
          return (
            <button
              aria-current={current ? "page" : undefined}
              className={current ? styles.current : undefined}
              disabled={current || Boolean(loadingRole)}
              key={item.role}
              onClick={() => select(item.role)}
              type="button"
            >
              {loadingRole === item.role ? "Відкриваємо…" : item.label}
            </button>
          );
        })}
      </div>
      {loadingRole && <p aria-live="polite" className={styles.status}>Відкриваємо кабінет…</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
