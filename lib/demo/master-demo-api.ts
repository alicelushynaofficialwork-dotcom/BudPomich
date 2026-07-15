import type {
  DemoMasterAction,
  DemoMasterRequestStatus,
  DemoMasterState,
} from "@/lib/demo/types";
import { DemoClientApiError } from "@/lib/demo/client-demo-api";

type ResponseBody = { state?: DemoMasterState; error?: string; code?: string };

async function parse(response: Response) {
  const payload = (await response.json().catch(() => null)) as ResponseBody | null;
  if (!response.ok || !payload?.state) {
    throw new DemoClientApiError(
      payload?.error ?? "Не вдалося оновити демоверсію майстра.",
      response.status,
      payload?.code,
    );
  }
  return payload.state;
}

async function patch(action: DemoMasterAction) {
  return parse(await fetch("/api/demo/master/state", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  }));
}

export function updateDemoMasterRequestStatus(requestId: string, status: DemoMasterRequestStatus) {
  return patch({ type: "update_request_status", requestId, status });
}

export function sendDemoMasterMessage(requestId: string, body: string) {
  return patch({ type: "send_message", requestId, body });
}

export function updateDemoMasterCalendarStatus(calendarItemId: string, status: "busy" | "available") {
  return patch({ type: "update_calendar_status", calendarItemId, status });
}

export function markDemoMasterNotificationRead(notificationId: string) {
  return patch({ type: "mark_notification_read", notificationId });
}

export async function resetDemoMasterState() {
  return parse(await fetch("/api/demo/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "master" }),
  }));
}
