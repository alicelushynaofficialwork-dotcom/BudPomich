export type AvailabilityStatus = "free" | "busy";

export type AvailabilitySlots = Record<string, AvailabilityStatus>;

export type BookingRequest = {
  id: string;
  masterId: string;
  date: string;
  workType: string;
  description: string;
  createdAt: string;
};

export type MasterMessage = {
  id: string;
  senderMasterId: string;
  recipientMasterId: string;
  subject: string;
  message: string;
  createdAt: string;
};

export const legacyAvailabilityStorageKey = "budpomich.availability-slots";
export const bookingStorageKey = "budpomich.booking-requests";
export const masterMessageStorageKey = "budpomich.master-messages";
export const masterFollowStorageKey = "budpomich.master-follows";

export function getAvailabilityStorageKey(masterId: string) {
  return `budpomich.availability-slots.${masterId}`;
}

const andriiAvailabilitySlots: AvailabilitySlots = {
  "2026-06-15": "busy",
  "2026-06-16": "busy",
  "2026-06-17": "busy",
  "2026-06-18": "busy",
  "2026-06-19": "busy",
  "2026-06-20": "free",
  "2026-06-21": "free",
  "2026-06-22": "free",
  "2026-06-23": "free",
  "2026-06-24": "free",
  "2026-06-25": "free",
  "2026-06-28": "free",
  "2026-06-29": "free",
  "2026-06-30": "free",
};

export function getDefaultAvailabilitySlots(masterId: string): AvailabilitySlots {
  if (masterId === "andrii-koval") return { ...andriiAvailabilitySlots };

  const seed = Array.from(masterId).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  const slots: AvailabilitySlots = {};

  for (let day = 13; day <= 30; day += 1) {
    const dateKey = formatDateKey(2026, 5, day);
    const pattern = (day + seed) % 6;

    if (pattern === 0 || pattern === 1) {
      slots[dateKey] = "busy";
    } else if (pattern === 2 || pattern === 4 || day % 5 === 0) {
      slots[dateKey] = "free";
    }
  }

  return slots;
}

export const monthLabels = [
  "Січень",
  "Лютий",
  "Березень",
  "Квітень",
  "Травень",
  "Червень",
  "Липень",
  "Серпень",
  "Вересень",
  "Жовтень",
  "Листопад",
  "Грудень",
];

export function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatBookingDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return `${day} ${monthLabels[month - 1].toLowerCase()} ${year}`;
}

export function getMonthGrid(year: number, month: number) {
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
}
