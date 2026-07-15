import type {
  DemoMasterCalendarItem,
  DemoMasterMessage,
  DemoMasterNotification,
  DemoMasterProject,
  DemoMasterRequest,
  NormalizedDemoMasterState,
} from "@/lib/demo/types";

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function array(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function number(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function boolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function request(value: unknown, index: number): DemoMasterRequest | null {
  const item = record(value);
  if (!item) return null;
  return {
    id: text(item.id, `demo-master-request-${index + 1}`),
    title: text(item.title, "Заявка без назви"),
    budget: typeof item.budget === "number" && Number.isFinite(item.budget) ? item.budget : null,
    status: text(item.status, "new"),
    clientName: text(item.clientName, "Клієнта не вказано"),
    desiredDate: text(item.desiredDate),
    updatedAt: text(item.updatedAt),
  };
}

function calendarItem(value: unknown, index: number): DemoMasterCalendarItem | null {
  const item = record(value);
  if (!item) return null;
  return {
    id: text(item.id, `demo-master-calendar-${index + 1}`),
    date: text(item.date),
    status: text(item.status) === "busy" ? "busy" : "available",
    clientName: text(item.clientName),
    projectTitle: text(item.projectTitle),
    requestId: text(item.requestId),
  };
}

function message(value: unknown, index: number): DemoMasterMessage | null {
  const item = record(value);
  if (!item) return null;
  return {
    id: text(item.id, `demo-master-message-${index + 1}`),
    requestId: text(item.requestId),
    sender: text(item.sender, "Клієнт"),
    senderRole: text(item.senderRole) === "master" ? "master" : "client",
    body: text(item.body),
    createdAt: text(item.createdAt),
    isDemo: boolean(item.isDemo, true),
  };
}

function notification(value: unknown, index: number): DemoMasterNotification | null {
  const item = record(value);
  if (!item) return null;
  return {
    id: text(item.id, `demo-master-notification-${index + 1}`),
    title: text(item.title, "Нове сповіщення"),
    isRead: boolean(item.isRead),
  };
}

function project(value: unknown, index: number): DemoMasterProject | null {
  const item = record(value);
  if (!item) return null;
  return {
    id: text(item.id, `demo-master-project-${index + 1}`),
    title: text(item.title, "Проєкт без назви"),
    status: text(item.status, "unknown"),
    progress: Math.min(100, Math.max(0, number(item.progress))),
    clientName: text(item.clientName),
  };
}

export function normalizeDemoMasterState(state: unknown): NormalizedDemoMasterState {
  const root = record(state);
  const profile = record(root?.profile);
  const statistics = record(root?.statistics);
  const isDamaged = !root || !profile || text(profile.role) !== "master";

  return {
    data: {
      profile: {
        id: text(profile?.id, "demo-master"),
        name: text(profile?.name, "Демо-майстер"),
        city: text(profile?.city, "Місто не вказано"),
        role: "master",
        rating: number(profile?.rating),
        profession: text(profile?.profession, "Майстер"),
      },
      requests: array(root?.requests).map(request).filter((item): item is DemoMasterRequest => item !== null),
      calendar: array(root?.calendar).map(calendarItem).filter((item): item is DemoMasterCalendarItem => item !== null),
      messages: array(root?.messages).map(message).filter((item): item is DemoMasterMessage => item !== null),
      statistics: {
        newRequests: number(statistics?.newRequests),
        activeProjects: number(statistics?.activeProjects),
        monthlyRevenue: number(statistics?.monthlyRevenue),
        completedProjects: number(statistics?.completedProjects),
      },
      notifications: array(root?.notifications).map(notification).filter((item): item is DemoMasterNotification => item !== null),
      projects: array(root?.projects).map(project).filter((item): item is DemoMasterProject => item !== null),
    },
    isDamaged,
  };
}
