import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ContractorCabinetApp } from "@/components/ContractorCabinetApp";
import { normalizeDemoContractorState } from "@/lib/demo/contractor-state-adapter";
import { loadCurrentDemoPageSession } from "@/lib/demo/demo-page-session-server";
import "../../dashboard/dashboard.css";

export const metadata = { title: "Демокабінет підрядника | BudPomich", description: "Заповнений демонстраційний кабінет підрядника BudPomich." };
function StateMessage({ title, message }: { title: string; message: string }) { return <main className="demo-contractor-page-state"><section><p>Демонстраційний режим</p><h1>{title}</h1><span>{message}</span><Link href="/demo">Повернутися до вибору ролі</Link></section></main>; }

export default async function DemoContractorPage() {
  let session;
  try { session = await loadCurrentDemoPageSession("contractor"); }
  catch (error) { unstable_rethrow(error); console.error("Demo contractor: failed to load demo session.", error instanceof Error ? error.message : "Unknown error"); return <StateMessage title="Не вдалося завантажити демосесію" message="Спробуйте ще раз пізніше." />; }
  if (!session) redirect("/demo");
  const normalized = normalizeDemoContractorState(session.state);
  return <ContractorCabinetApp mode="demo" initialData={normalized.data} stateWarning={normalized.isDamaged ? "Дані демосесії частково пошкоджені. Показано доступні розділи." : session.accessWarning ? "Кабінет відкрито, але час останнього доступу не вдалося оновити." : undefined} />;
}
