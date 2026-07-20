export type RequestStatus = "new" | "accepted" | "in_progress" | "completed" | "declined";

export type RequestPeriod = {
  dateFrom: string;
  dateTo: string;
  period: string;
};

export type RequestAdditionalWork = {
  id: string;
  title: string;
  volume: string;
  unit: string;
  pricePerUnit: string;
  totalPrice: string;
  comment: string;
};

export type RequestFile = {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl?: string;
};

export type BookingAttachment = {
  id: string;
  bookingId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  kind: "image" | "document";
  url?: string;
};

export type HeightWorkPresence = "no" | "yes" | "unknown";

export type HeightCoefficientType = "unknown" | "selected" | "custom";

export type RequestHeightWork = {
  hasHeightWork: HeightWorkPresence;
  heightValue: string;
  heightUnit: string;
  heightWorkVolume: string;
  heightWorkVolumeUnit: string;
  heightAccessType: string;
  heightWorkLocation: string;
  heightCoefficient: string;
  heightCoefficientType: HeightCoefficientType;
  heightNormReference: string;
  heightComment: string;
};

export type MasterRequest = {
  id: string;
  masterId: string;
  masterName: string;
  clientId?: string;
  selectedServiceId: string;
  selectedServiceTitle: string;
  selectedServiceType: string;
  isTurnkey: boolean;
  clientName: string;
  clientPhone: string;
  workType: string;
  workSubtype: string;
  description: string;
  desiredDate: string;
  cityArea: string;
  budget: string;
  mainVolume: string;
  additionalInfo: string;
  message: string;
  periods: RequestPeriod[];
  serviceDetails: Record<string, string>;
  additionalWorks: RequestAdditionalWork[];
  files: RequestFile[];
  attachments?: BookingAttachment[];
  confirmedPeriod?: RequestPeriod;
  source?: string;
  heightWork: RequestHeightWork;
  status: RequestStatus;
  isRead: boolean;
  createdAt: string;
};

export type RequestMessage = {
  id: string;
  requestId: string;
  senderRole: "client" | "master";
  body: string;
  isRead: boolean;
  createdAt: string;
};

export const requestsStorageKey = "budpomich.requests";
export const requestMessagesStorageKey = "budpomich.request-messages";

export const requestStatusLabels: Record<RequestStatus, string> = {
  new: "Нова",
  accepted: "Прийнята",
  in_progress: "В роботі",
  completed: "Завершена",
  declined: "Відхилена",
};

export const requestStatusOptions: RequestStatus[] = [
  "new",
  "accepted",
  "in_progress",
  "completed",
  "declined",
];

export const emptyHeightWork: RequestHeightWork = {
  hasHeightWork: "no",
  heightValue: "",
  heightUnit: "м",
  heightWorkVolume: "",
  heightWorkVolumeUnit: "м²",
  heightAccessType: "",
  heightWorkLocation: "",
  heightCoefficient: "",
  heightCoefficientType: "unknown",
  heightNormReference: "",
  heightComment: "",
};

export const mockRequests: MasterRequest[] = [
  {
    id: "mock-request-1",
    masterId: "andrii-koval",
    masterName: "Андрій Коваль",
    clientId: "mock-client-1",
    selectedServiceId: "andrii-electric",
    selectedServiceTitle: "Електрика",
    selectedServiceType: "electric",
    isTurnkey: false,
    clientName: "Олексій Мельник",
    clientPhone: "+380 67 442 18 90",
    workType: "Електрика",
    workSubtype: "Проводка",
    description: "Потрібна заміна проводки у двокімнатній квартирі.",
    desiredDate: "2026-06-20 — 2026-06-21",
    cityArea: "Київ, Оболонь",
    budget: "до 25 000 грн",
    mainVolume: "2 кімнати",
    additionalInfo: "Матеріали частково куплені.",
    message: "Хочу узгодити кошторис і терміни до початку робіт.",
    periods: [{ dateFrom: "2026-06-20", dateTo: "2026-06-21", period: "2026-06-20 — 2026-06-21" }],
    serviceDetails: {
      electricTask: "Проводка",
      pointsCount: "18",
      hasMaterials: "Частково",
    },
    additionalWorks: [],
    files: [],
    heightWork: {
      ...emptyHeightWork,
      hasHeightWork: "unknown",
      heightNormReference: "ДБН / кошторисна логіка",
    },
    status: "new",
    isRead: false,
    createdAt: "2026-06-23T07:24:00.000Z",
  },
];

export const mockRequestMessages: RequestMessage[] = [
  {
    id: "mock-message-1",
    requestId: "mock-request-1",
    senderRole: "client",
    body: "Добрий день. Чи можете подивитися квартиру цього тижня?",
    isRead: false,
    createdAt: "2026-06-23T07:26:00.000Z",
  },
];

export function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
