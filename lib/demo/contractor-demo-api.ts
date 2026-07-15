import { DemoClientApiError } from "@/lib/demo/client-demo-api";
import type { DemoContractorAction, DemoContractorState } from "@/lib/demo/types";

type Payload = { state?: DemoContractorState; error?: string; code?: string };
async function parse(response: Response) { const payload = await response.json().catch(() => null) as Payload | null; if (!response.ok || !payload?.state) throw new DemoClientApiError(payload?.error ?? "Не вдалося оновити демоверсію підрядника.", response.status, payload?.code); return payload.state; }
export async function patchDemoContractor(action: DemoContractorAction) { return parse(await fetch("/api/demo/contractor/state", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) })); }
export async function resetDemoContractorState() { return parse(await fetch("/api/demo/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "contractor" }) })); }
