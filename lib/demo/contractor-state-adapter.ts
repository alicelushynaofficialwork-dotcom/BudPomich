import {
  demoContractorProjectStatuses,
  type DemoContractorDocument,
  type DemoContractorMessage,
  type DemoContractorNotification,
  type DemoContractorProject,
  type DemoContractorRequest,
  type DemoContractorTask,
  type DemoContractorTeamMember,
  type NormalizedDemoContractorState,
} from "@/lib/demo/types";

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown, fallback = "") => typeof value === "string" && value.trim() ? value.trim() : fallback;
const number = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const bool = (value: unknown) => typeof value === "boolean" ? value : false;
const clamp = (value: unknown) => Math.min(100, Math.max(0, number(value)));

function teamMember(value: unknown, index: number): DemoContractorTeamMember | null {
  const item = record(value); if (!item) return null;
  const status = item.status === "busy" || item.status === "unavailable" ? item.status : "available";
  return { id: text(item.id, `demo-team-${index + 1}`), name: text(item.name, "Майстер"), specialty: text(item.specialty, text(item.profession, "Спеціальність не вказана")), status, projectId: text(item.projectId), workload: clamp(item.workload) };
}

function project(value: unknown, index: number): DemoContractorProject | null {
  const item = record(value); if (!item) return null;
  const status = typeof item.status === "string" && demoContractorProjectStatuses.includes(item.status as DemoContractorProject["status"]) ? item.status as DemoContractorProject["status"] : "new";
  return { id: text(item.id, `demo-project-${index + 1}`), title: text(item.title, text(item.name, "Проєкт без назви")), status, progress: clamp(item.progress), budget: typeof item.budget === "number" && Number.isFinite(item.budget) ? item.budget : null, deadline: text(item.deadline, text(item.dueDate)), teamMemberId: text(item.teamMemberId, text(item.assignedMasterId)) };
}

function request(value: unknown, index: number): DemoContractorRequest | null { const item = record(value); return item ? { id: text(item.id, `demo-request-${index + 1}`), title: text(item.title, "Заявка без назви"), clientName: text(item.clientName, "Клієнт"), status: text(item.status, "new"), budget: typeof item.budget === "number" ? item.budget : null } : null; }
function task(value: unknown, index: number): DemoContractorTask | null { const item = record(value); if (!item) return null; const status = item.status === "in_progress" || item.status === "completed" ? item.status : "new"; return { id: text(item.id, `demo-task-${index + 1}`), projectId: text(item.projectId), title: text(item.title, "Завдання"), status, teamMemberId: text(item.teamMemberId) }; }
function message(value: unknown, index: number): DemoContractorMessage | null { const item = record(value); if (!item) return null; const role = item.senderRole === "contractor" || item.senderRole === "master" ? item.senderRole : "client"; return { id: text(item.id, `demo-message-${index + 1}`), projectId: text(item.projectId), sender: text(item.sender, "Користувач"), senderRole: role, body: text(item.body), createdAt: text(item.createdAt), isDemo: true }; }
function document(value: unknown, index: number): DemoContractorDocument | null { const item = record(value); return item ? { id: text(item.id, `demo-document-${index + 1}`), projectId: text(item.projectId), title: text(item.title, "Документ"), kind: text(item.kind, text(item.type, "Файл")) } : null; }
function notification(value: unknown, index: number): DemoContractorNotification | null { const item = record(value); return item ? { id: text(item.id, `demo-notification-${index + 1}`), title: text(item.title, "Нове сповіщення"), isRead: bool(item.isRead) } : null; }

export function normalizeDemoContractorState(state: unknown): NormalizedDemoContractorState {
  const root = record(state); const profile = record(root?.profile); const statistics = record(root?.statistics);
  const team = list(root?.team).map(teamMember).filter((item): item is DemoContractorTeamMember => item !== null);
  const projects = list(root?.projects).map(project).filter((item): item is DemoContractorProject => item !== null);
  return { data: {
    profile: { id: text(profile?.id, "demo-contractor"), companyName: text(profile?.companyName, text(profile?.name, "Демо-компанія")), city: text(profile?.city, "Місто не вказано"), role: "contractor", description: text(profile?.description) },
    team, projects,
    requests: list(root?.requests).map(request).filter((item): item is DemoContractorRequest => item !== null),
    tasks: list(root?.tasks).map(task).filter((item): item is DemoContractorTask => item !== null),
    messages: list(root?.messages).map(message).filter((item): item is DemoContractorMessage => item !== null),
    documents: list(root?.documents).map(document).filter((item): item is DemoContractorDocument => item !== null),
    statistics: { activeProjects: number(statistics?.activeProjects, projects.filter((item) => !["completed", "cancelled"].includes(item.status)).length), teamMembers: number(statistics?.teamMembers, team.length), availableMembers: number(statistics?.availableMembers, team.filter((item) => item.status === "available").length), monthlyRevenue: number(statistics?.monthlyRevenue), completedProjects: number(statistics?.completedProjects, projects.filter((item) => item.status === "completed").length) },
    notifications: list(root?.notifications).map(notification).filter((item): item is DemoContractorNotification => item !== null),
  }, isDamaged: !root || !profile || text(profile.role) !== "contractor" };
}
