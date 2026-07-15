import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ClientCabinetApp } from "@/components/ClientCabinetApp";
import { normalizeDemoClientState } from "@/lib/demo/client-state-adapter";
import { loadCurrentDemoPageSession } from "@/lib/demo/demo-page-session-server";
import "../../client/dashboard/client-dashboard.css";

export const metadata = {
  title: "Демокабінет клієнта | BudPomich",
  description: "Заповнений демонстраційний кабінет клієнта BudPomich.",
};

function DemoClientError({ message }: { message: string }) {
  return (
    <main className="demo-client-state">
      <section>
        <p>Демонстраційний режим</p>
        <h1>Не вдалося відкрити демокабінет</h1>
        <span>{message}</span>
        <Link href="/demo">Повернутися до вибору ролі</Link>
      </section>
    </main>
  );
}

export default async function DemoClientPage() {
  let session;
  try { session = await loadCurrentDemoPageSession("client"); }
  catch (error) { unstable_rethrow(error); console.error("Demo client: failed to load demo session.", error instanceof Error ? error.message : "Unknown error"); return <DemoClientError message="Не вдалося завантажити демосесію. Спробуйте ще раз." />; }
  if (!session) redirect("/demo");
  const normalizedState = normalizeDemoClientState(session.state);

  return (
    <ClientCabinetApp
      initialData={normalizedState.data}
      mode="demo"
      stateWarning={
        normalizedState.isDamaged
          ? "Дані демосесії частково пошкоджені. Доступні розділи показано з безпечними значеннями."
          : session.accessWarning
            ? "Кабінет відкрито, але час останнього доступу не вдалося оновити."
            : undefined
      }
    />
  );
}
