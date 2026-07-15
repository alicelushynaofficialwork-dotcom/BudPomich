export type DemoClientProfile = {
  id: string;
  name: string;
  city: string;
  role: "client";
};

export type DemoClientRequest = {
  id: string;
  title: string;
  status: string;
  masterName: string;
  desiredDate: string;
  budget: number | null;
  updatedAt: string;
};

export const demoRequestStatuses = [
  "new",
  "viewed",
  "in_discussion",
  "accepted",
  "declined",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type DemoRequestStatus = (typeof demoRequestStatuses)[number];

export type DemoClientProject = {
  id: string;
  title: string;
  status: string;
  progress: number;
};

export type DemoClientMessage = {
  id: string;
  body: string;
  sender: string;
  createdAt: string;
  requestId: string;
  senderRole: "client" | "master";
  isDemo: boolean;
};

export type DemoClientNotification = {
  id: string;
  title: string;
  isRead: boolean;
};

export type DemoClientState = {
  profile: DemoClientProfile;
  requests: DemoClientRequest[];
  projects: DemoClientProject[];
  messages: DemoClientMessage[];
  notifications: DemoClientNotification[];
};

export type NormalizedDemoClientState = {
  data: DemoClientState;
  isDamaged: boolean;
};

export type DemoClientAction =
  | {
      type: "update_request_status";
      requestId: string;
      status: DemoRequestStatus;
    }
  | {
      type: "send_message";
      requestId: string;
      body: string;
    }
  | {
      type: "mark_notification_read";
      notificationId: string;
    };

export type DemoMasterProfile = {
  id: string;
  name: string;
  city: string;
  role: "master";
  rating: number;
  profession: string;
};

export const demoMasterRequestStatuses = [
  "new",
  "viewed",
  "in_discussion",
  "accepted",
  "declined",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type DemoMasterRequestStatus = (typeof demoMasterRequestStatuses)[number];

export type DemoMasterRequest = {
  id: string;
  title: string;
  budget: number | null;
  status: string;
  clientName: string;
  desiredDate: string;
  updatedAt: string;
};

export type DemoMasterCalendarItem = {
  id: string;
  date: string;
  status: "busy" | "available";
  clientName: string;
  projectTitle: string;
  requestId: string;
};

export type DemoMasterMessage = {
  id: string;
  requestId: string;
  sender: string;
  senderRole: "client" | "master";
  body: string;
  createdAt: string;
  isDemo: boolean;
};

export type DemoMasterStatistics = {
  newRequests: number;
  activeProjects: number;
  monthlyRevenue: number;
  completedProjects: number;
};

export type DemoMasterNotification = {
  id: string;
  title: string;
  isRead: boolean;
};

export type DemoMasterProject = {
  id: string;
  title: string;
  status: string;
  progress: number;
  clientName: string;
};

export type DemoMasterState = {
  profile: DemoMasterProfile;
  requests: DemoMasterRequest[];
  calendar: DemoMasterCalendarItem[];
  messages: DemoMasterMessage[];
  statistics: DemoMasterStatistics;
  notifications: DemoMasterNotification[];
  projects: DemoMasterProject[];
};

export type NormalizedDemoMasterState = {
  data: DemoMasterState;
  isDamaged: boolean;
};

export type DemoMasterAction =
  | {
      type: "update_request_status";
      requestId: string;
      status: DemoMasterRequestStatus;
    }
  | {
      type: "send_message";
      requestId: string;
      body: string;
    }
  | {
      type: "update_calendar_status";
      calendarItemId: string;
      status: "busy" | "available";
    }
  | {
      type: "mark_notification_read";
      notificationId: string;
    };

export const demoContractorProjectStatuses = [
  "new", "planned", "in_progress", "waiting_materials", "paused", "completed", "cancelled",
] as const;
export type DemoContractorProjectStatus = (typeof demoContractorProjectStatuses)[number];
export type DemoContractorTeamStatus = "available" | "busy" | "unavailable";
export type DemoContractorTaskStatus = "new" | "in_progress" | "completed";

export type DemoContractorProfile = { id: string; companyName: string; city: string; role: "contractor"; description: string };
export type DemoContractorTeamMember = { id: string; name: string; specialty: string; status: DemoContractorTeamStatus; projectId: string; workload: number };
export type DemoContractorProject = { id: string; title: string; status: DemoContractorProjectStatus; progress: number; budget: number | null; deadline: string; teamMemberId: string };
export type DemoContractorRequest = { id: string; title: string; clientName: string; status: string; budget: number | null };
export type DemoContractorTask = { id: string; projectId: string; title: string; status: DemoContractorTaskStatus; teamMemberId: string };
export type DemoContractorMessage = { id: string; projectId: string; sender: string; senderRole: "client" | "contractor" | "master"; body: string; createdAt: string; isDemo: boolean };
export type DemoContractorDocument = { id: string; projectId: string; title: string; kind: string };
export type DemoContractorStatistics = { activeProjects: number; teamMembers: number; availableMembers: number; monthlyRevenue: number; completedProjects: number };
export type DemoContractorNotification = { id: string; title: string; isRead: boolean };

export type DemoContractorState = {
  profile: DemoContractorProfile;
  team: DemoContractorTeamMember[];
  projects: DemoContractorProject[];
  requests?: DemoContractorRequest[];
  tasks?: DemoContractorTask[];
  messages?: DemoContractorMessage[];
  documents?: DemoContractorDocument[];
  statistics: DemoContractorStatistics;
  notifications?: DemoContractorNotification[];
};

export type NormalizedDemoContractorState = { data: DemoContractorState; isDamaged: boolean };

export type DemoContractorAction =
  | { type: "update_project_status"; projectId: string; status: DemoContractorProjectStatus }
  | { type: "update_project_progress"; projectId: string; progress: number }
  | { type: "assign_team_member"; projectId: string; teamMemberId: string }
  | { type: "update_team_member_status"; teamMemberId: string; status: DemoContractorTeamStatus }
  | { type: "update_task_status"; taskId: string; status: DemoContractorTaskStatus }
  | { type: "send_message"; projectId: string; body: string }
  | { type: "mark_notification_read"; notificationId: string };
