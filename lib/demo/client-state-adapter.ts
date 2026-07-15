import type {
  DemoClientMessage,
  DemoClientNotification,
  DemoClientProject,
  DemoClientRequest,
  NormalizedDemoClientState,
} from "@/lib/demo/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function number(value: unknown, fallback: number | null = null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function boolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeRequest(value: unknown, index: number): DemoClientRequest | null {
  const item = asRecord(value);
  if (!item) return null;

  return {
    id: text(item.id, `demo-request-${index + 1}`),
    title: text(item.title, "Заявка без назви"),
    status: text(item.status, "unknown"),
    masterName: text(item.masterName),
    desiredDate: text(item.desiredDate),
    budget: number(item.budget),
    updatedAt: text(item.updatedAt),
  };
}

function normalizeProject(value: unknown, index: number): DemoClientProject | null {
  const item = asRecord(value);
  if (!item) return null;

  const progress = number(item.progress, 0) ?? 0;
  return {
    id: text(item.id, `demo-project-${index + 1}`),
    title: text(item.title, "Проєкт без назви"),
    status: text(item.status, "unknown"),
    progress: Math.min(100, Math.max(0, progress)),
  };
}

function normalizeMessage(value: unknown, index: number): DemoClientMessage | null {
  const item = asRecord(value);
  if (!item) return null;

  return {
    id: text(item.id, `demo-message-${index + 1}`),
    body: text(item.body),
    sender: text(item.sender, "Учасник проєкту"),
    createdAt: text(item.createdAt),
    requestId: text(item.requestId),
    senderRole: text(item.senderRole) === "client" ? "client" : "master",
    isDemo: boolean(item.isDemo, true),
  };
}

function normalizeNotification(
  value: unknown,
  index: number,
): DemoClientNotification | null {
  const item = asRecord(value);
  if (!item) return null;

  return {
    id: text(item.id, `demo-notification-${index + 1}`),
    title: text(item.title, "Нове сповіщення"),
    isRead: boolean(item.isRead),
  };
}

export function normalizeDemoClientState(state: unknown): NormalizedDemoClientState {
  const root = asRecord(state);
  const profile = asRecord(root?.profile);
  const isDamaged = !root || !profile || text(profile.role) !== "client";

  return {
    data: {
      profile: {
        id: text(profile?.id, "demo-client"),
        name: text(profile?.name, "Демо-клієнт"),
        city: text(profile?.city, "Місто не вказано"),
        role: "client",
      },
      requests: asArray(root?.requests)
        .map(normalizeRequest)
        .filter((item): item is DemoClientRequest => item !== null),
      projects: asArray(root?.projects)
        .map(normalizeProject)
        .filter((item): item is DemoClientProject => item !== null),
      messages: asArray(root?.messages)
        .map(normalizeMessage)
        .filter((item): item is DemoClientMessage => item !== null),
      notifications: asArray(root?.notifications)
        .map(normalizeNotification)
        .filter((item): item is DemoClientNotification => item !== null),
    },
    isDamaged,
  };
}
