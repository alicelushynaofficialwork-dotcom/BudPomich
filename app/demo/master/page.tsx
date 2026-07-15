import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { DashboardMasterApp } from "@/components/DashboardMasterApp";
import { normalizeDemoMasterState } from "@/lib/demo/master-state-adapter";
import { loadCurrentDemoPageSession } from "@/lib/demo/demo-page-session-server";
import "../../dashboard/dashboard.css";

export const metadata = {
  title: "Демокабінет майстра | BudPomich",
  description: "Заповнений демонстраційний кабінет самостійного майстра BudPomich.",
};

function StateMessage({ title, message }: { title: string; message: string }) {
  return (
    <main className="demo-master-page-state">
      <section>
        <p>Демонстраційний режим</p>
        <h1>{title}</h1>
        <span>{message}</span>
        <Link href="/demo">Повернутися до вибору ролі</Link>
      </section>
    </main>
  );
}

export default async function DemoMasterPage() {
  let session;
  try { session = await loadCurrentDemoPageSession("master"); }
  catch (error) { unstable_rethrow(error); console.error("Demo master: failed to load demo session.", error instanceof Error ? error.message : "Unknown error"); return <StateMessage title="Не вдалося завантажити демосесію" message="Спробуйте ще раз пізніше." />; }
  if (!session) redirect("/demo");
  const normalized = normalizeDemoMasterState(session.state);
  return (
    <DashboardMasterApp
      initialData={normalized.data}
      mode="demo"
      stateWarning={
        normalized.isDamaged
          ? "Дані демосесії частково пошкоджені. Показано доступні розділи."
          : session.accessWarning
            ? "Кабінет відкрито, але час останнього доступу не вдалося оновити."
            : undefined
      }
    />
  );
}
