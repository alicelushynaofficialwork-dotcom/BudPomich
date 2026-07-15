import type {
  DemoClientAction,
  DemoClientState,
  DemoRequestStatus,
} from "@/lib/demo/types";

type DemoApiResponse = {
  state?: DemoClientState;
  error?: string;
  code?: string;
};

export class DemoClientApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

async function parseResponse(response: Response): Promise<DemoClientState> {
  const payload = (await response.json().catch(() => null)) as DemoApiResponse | null;
  if (!response.ok || !payload?.state) {
    throw new DemoClientApiError(
      payload?.error ?? "Не вдалося оновити демоверсію.",
      response.status,
      payload?.code,
    );
  }
  return payload.state;
}

async function patchDemoClientState(action: DemoClientAction) {
  const response = await fetch("/api/demo/client/state", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
  return parseResponse(response);
}

export function updateDemoClientRequestStatus(
  requestId: string,
  status: DemoRequestStatus,
) {
  return patchDemoClientState({ type: "update_request_status", requestId, status });
}

export function sendDemoClientMessage(requestId: string, body: string) {
  return patchDemoClientState({ type: "send_message", requestId, body });
}

export function markDemoClientNotificationRead(notificationId: string) {
  return patchDemoClientState({ type: "mark_notification_read", notificationId });
}

export async function resetDemoClientState() {
  const response = await fetch("/api/demo/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "client" }),
  });
  return parseResponse(response);
}
