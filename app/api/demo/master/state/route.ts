import {
  demoMasterRequestStatuses,
  type DemoMasterAction,
  type DemoMasterRequestStatus,
} from "@/lib/demo/types";
import { normalizeDemoMasterState } from "@/lib/demo/master-state-adapter";
import {
  DemoApiError,
  demoErrorResponse,
  isRecord,
  updateCurrentDemoState,
} from "@/lib/demo/client-demo-server";

function id(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new DemoApiError(`Поле ${field} є обовʼязковим.`, 400, "invalid_action");
  }
  return value.trim();
}

function parseAction(value: unknown): DemoMasterAction {
  if (!isRecord(value) || typeof value.type !== "string") {
    throw new DemoApiError("Некоректна дія демоверсії.", 400, "invalid_action");
  }

  if (value.type === "update_request_status") {
    if (
      typeof value.status !== "string" ||
      !demoMasterRequestStatuses.includes(value.status as DemoMasterRequestStatus)
    ) {
      throw new DemoApiError("Некоректний статус заявки.", 400, "invalid_status");
    }
    return {
      type: value.type,
      requestId: id(value.requestId, "requestId"),
      status: value.status as DemoMasterRequestStatus,
    };
  }

  if (value.type === "send_message") {
    if (typeof value.body !== "string") {
      throw new DemoApiError("Повідомлення повинно бути текстом.", 400, "invalid_message");
    }
    const body = value.body.trim();
    if (!body || body.length > 2000) {
      throw new DemoApiError(
        body ? "Повідомлення не може перевищувати 2000 символів." : "Введіть повідомлення.",
        400,
        "invalid_message",
      );
    }
    return { type: value.type, requestId: id(value.requestId, "requestId"), body };
  }

  if (value.type === "update_calendar_status") {
    if (value.status !== "busy" && value.status !== "available") {
      throw new DemoApiError("Некоректний статус календаря.", 400, "invalid_calendar_status");
    }
    return {
      type: value.type,
      calendarItemId: id(value.calendarItemId, "calendarItemId"),
      status: value.status,
    };
  }

  if (value.type === "mark_notification_read") {
    return {
      type: value.type,
      notificationId: id(value.notificationId, "notificationId"),
    };
  }

  throw new DemoApiError("Дія не підтримується.", 400, "unsupported_action");
}

function applyAction(state: unknown, action: DemoMasterAction, now: string) {
  if (!isRecord(state)) {
    throw new DemoApiError("Дані демосесії пошкоджені.", 422, "damaged_state");
  }

  if (action.type === "update_request_status") {
    const requests = Array.isArray(state.requests) ? state.requests : [];
    let found = false;
    const next = requests.map((request) => {
      if (!isRecord(request) || request.id !== action.requestId) return request;
      found = true;
      return { ...request, status: action.status, updatedAt: now };
    });
    if (!found) throw new DemoApiError("Заявку не знайдено.", 404, "request_not_found");
    return { ...state, requests: next };
  }

  if (action.type === "send_message") {
    const requests = Array.isArray(state.requests) ? state.requests : [];
    if (!requests.some((request) => isRecord(request) && request.id === action.requestId)) {
      throw new DemoApiError("Заявку не знайдено.", 404, "request_not_found");
    }
    const profile = isRecord(state.profile) ? state.profile : {};
    const sender = typeof profile.name === "string" && profile.name.trim()
      ? profile.name.trim()
      : "Демо-майстер";
    const messages = Array.isArray(state.messages) ? state.messages : [];
    return {
      ...state,
      messages: [...messages, {
        id: crypto.randomUUID(),
        requestId: action.requestId,
        sender,
        senderRole: "master",
        body: action.body,
        createdAt: now,
        isDemo: true,
      }],
    };
  }

  if (action.type === "update_calendar_status") {
    const calendar = Array.isArray(state.calendar) ? state.calendar : [];
    let found = false;
    const next = calendar.map((item) => {
      if (!isRecord(item) || item.id !== action.calendarItemId) return item;
      found = true;
      return { ...item, status: action.status, updatedAt: now };
    });
    if (!found) {
      throw new DemoApiError("Дату календаря не знайдено.", 404, "calendar_item_not_found");
    }
    return { ...state, calendar: next };
  }

  const notifications = Array.isArray(state.notifications) ? state.notifications : [];
  let found = false;
  const next = notifications.map((notification) => {
    if (!isRecord(notification) || notification.id !== action.notificationId) return notification;
    found = true;
    return { ...notification, isRead: true };
  });
  if (!found) {
    throw new DemoApiError("Сповіщення не знайдено.", 404, "notification_not_found");
  }
  return { ...state, notifications: next };
}

export async function PATCH(request: Request) {
  try {
    const action = parseAction(await request.json().catch(() => null));
    const state = await updateCurrentDemoState("master", (currentState, now) =>
      applyAction(currentState, action, now),
    );
    return Response.json({ state: normalizeDemoMasterState(state).data });
  } catch (error) {
    return demoErrorResponse(error);
  }
}
