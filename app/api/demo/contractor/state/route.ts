import { normalizeDemoContractorState } from "@/lib/demo/contractor-state-adapter";
import { DemoApiError, demoErrorResponse, isRecord, updateCurrentDemoState } from "@/lib/demo/client-demo-server";
import { demoContractorProjectStatuses, type DemoContractorAction, type DemoContractorProjectStatus } from "@/lib/demo/types";

const teamStatuses = ["available", "busy", "unavailable"] as const;
const taskStatuses = ["new", "in_progress", "completed"] as const;
function id(value: unknown, field: string) { if (typeof value !== "string" || !value.trim()) throw new DemoApiError(`Поле ${field} є обов'язковим.`, 400, "invalid_action"); return value.trim(); }

function parseAction(value: unknown): DemoContractorAction {
  if (!isRecord(value) || typeof value.type !== "string") throw new DemoApiError("Некоректна дія демоверсії.", 400, "invalid_action");
  if (value.type === "update_project_status") {
    if (typeof value.status !== "string" || !demoContractorProjectStatuses.includes(value.status as DemoContractorProjectStatus)) throw new DemoApiError("Некоректний статус проєкту.", 400, "invalid_status");
    return { type: value.type, projectId: id(value.projectId, "projectId"), status: value.status as DemoContractorProjectStatus };
  }
  if (value.type === "update_project_progress") {
    if (typeof value.progress !== "number" || !Number.isInteger(value.progress) || value.progress < 0 || value.progress > 100) throw new DemoApiError("Прогрес має бути цілим числом від 0 до 100.", 400, "invalid_progress");
    return { type: value.type, projectId: id(value.projectId, "projectId"), progress: value.progress };
  }
  if (value.type === "assign_team_member") return { type: value.type, projectId: id(value.projectId, "projectId"), teamMemberId: id(value.teamMemberId, "teamMemberId") };
  if (value.type === "update_team_member_status") {
    if (typeof value.status !== "string" || !teamStatuses.includes(value.status as typeof teamStatuses[number])) throw new DemoApiError("Некоректний статус майстра.", 400, "invalid_status");
    return { type: value.type, teamMemberId: id(value.teamMemberId, "teamMemberId"), status: value.status as typeof teamStatuses[number] };
  }
  if (value.type === "update_task_status") {
    if (typeof value.status !== "string" || !taskStatuses.includes(value.status as typeof taskStatuses[number])) throw new DemoApiError("Некоректний статус завдання.", 400, "invalid_status");
    return { type: value.type, taskId: id(value.taskId, "taskId"), status: value.status as typeof taskStatuses[number] };
  }
  if (value.type === "send_message") {
    if (typeof value.body !== "string" || !value.body.trim() || value.body.trim().length > 2000) throw new DemoApiError("Повідомлення має містити від 1 до 2000 символів.", 400, "invalid_message");
    return { type: value.type, projectId: id(value.projectId, "projectId"), body: value.body.trim() };
  }
  if (value.type === "mark_notification_read") return { type: value.type, notificationId: id(value.notificationId, "notificationId") };
  throw new DemoApiError("Дія не підтримується.", 400, "unsupported_action");
}

function applyAction(state: unknown, action: DemoContractorAction, now: string): unknown {
  if (!isRecord(state)) throw new DemoApiError("Дані демосесії пошкоджені.", 422, "damaged_state");
  const updateItem = (key: string, targetId: string, changes: Record<string, unknown>, code: string) => {
    const items = Array.isArray(state[key]) ? state[key] : []; let found = false;
    const next = items.map((item) => { if (!isRecord(item) || item.id !== targetId) return item; found = true; return { ...item, ...changes, updatedAt: now }; });
    if (!found) throw new DemoApiError("Запис не знайдено.", 404, code); return { ...state, [key]: next };
  };
  if (action.type === "update_project_status") return updateItem("projects", action.projectId, { status: action.status }, "project_not_found");
  if (action.type === "update_project_progress") return updateItem("projects", action.projectId, { progress: action.progress }, "project_not_found");
  if (action.type === "update_team_member_status") return updateItem("team", action.teamMemberId, { status: action.status }, "team_member_not_found");
  if (action.type === "update_task_status") return updateItem("tasks", action.taskId, { status: action.status }, "task_not_found");
  if (action.type === "mark_notification_read") return updateItem("notifications", action.notificationId, { isRead: true }, "notification_not_found");
  const projects = Array.isArray(state.projects) ? state.projects : [];
  if (!projects.some((item) => isRecord(item) && item.id === action.projectId)) throw new DemoApiError("Проєкт не знайдено.", 404, "project_not_found");
  if (action.type === "assign_team_member") {
    const team = Array.isArray(state.team) ? state.team : [];
    if (!team.some((item) => isRecord(item) && item.id === action.teamMemberId)) throw new DemoApiError("Майстра не знайдено.", 404, "team_member_not_found");
    return updateItem("projects", action.projectId, { teamMemberId: action.teamMemberId }, "project_not_found");
  }
  const profile = isRecord(state.profile) ? state.profile : {};
  return { ...state, messages: [...(Array.isArray(state.messages) ? state.messages : []), { id: crypto.randomUUID(), projectId: action.projectId, sender: typeof profile.companyName === "string" ? profile.companyName : "Демо-компанія", senderRole: "contractor", body: action.body, createdAt: now, isDemo: true }] };
}

export async function PATCH(request: Request) {
  try {
    const action = parseAction(await request.json().catch(() => null));
    const state = await updateCurrentDemoState("contractor", (current, now) => applyAction(current, action, now));
    return Response.json({ state: normalizeDemoContractorState(state).data });
  } catch (error) { return demoErrorResponse(error); }
}
