export type AvailabilityStatus = "free" | "busy";

export type AvailabilitySlots = Record<string, AvailabilityStatus>;

export type BookingDatePeriod = {
  startDate: string;
  endDate: string;
};

export type BookingRequest = {
  id: string;
  masterId: string;
  datePeriods: BookingDatePeriod[];
  confirmedPeriod?: BookingDatePeriod;
  date?: string;
  dateOptions?: string[];
  confirmedDate?: string;
  status?: "pending" | "confirmed" | "alternative_proposed" | "declined" | "cancelled";
  workType: string;
  description: string;
  createdAt: string;
};

export function normalizeBookingRequest(request: BookingRequest): BookingRequest {
  const datePeriods = Array.isArray(request.datePeriods) && request.datePeriods.length
    ? request.datePeriods
    : Array.isArray(request.dateOptions) && request.dateOptions.length
      ? groupConsecutiveDates(request.dateOptions)
      : request.date ? [{ startDate: request.date, endDate: request.date }] : [];
  const confirmedPeriod = request.confirmedPeriod ?? (request.confirmedDate
    ? { startDate: request.confirmedDate, endDate: request.confirmedDate }
    : undefined);
  return { ...request, datePeriods, confirmedPeriod, status: request.status ?? "pending" };
}

function parseDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { timestamp, year, month, day };
}

export function groupConsecutiveDates(selectedDates: string[]): BookingDatePeriod[] {
  const dates = Array.from(new Set(selectedDates))
    .map((dateKey) => ({ dateKey, parsed: parseDateKey(dateKey) }))
    .filter((item): item is { dateKey: string; parsed: NonNullable<ReturnType<typeof parseDateKey>> } => item.parsed !== null)
    .sort((a, b) => a.parsed.timestamp - b.parsed.timestamp);
  if (!dates.length) return [];

  const periods: BookingDatePeriod[] = [];
  let startDate = dates[0].dateKey;
  let endDate = dates[0].dateKey;
  let previousTimestamp = dates[0].parsed.timestamp;
  for (const item of dates.slice(1)) {
    if (item.parsed.timestamp - previousTimestamp === 86_400_000) {
      endDate = item.dateKey;
    } else {
      periods.push({ startDate, endDate });
      startDate = item.dateKey;
      endDate = item.dateKey;
    }
    previousTimestamp = item.parsed.timestamp;
  }
  periods.push({ startDate, endDate });
  return periods;
}

export function getPeriodDateKeys(period: BookingDatePeriod) {
  const start = parseDateKey(period.startDate);
  const end = parseDateKey(period.endDate);
  if (!start || !end || start.timestamp > end.timestamp) return [];
  const dates: string[] = [];
  for (let timestamp = start.timestamp; timestamp <= end.timestamp; timestamp += 86_400_000) {
    const date = new Date(timestamp);
    dates.push(formatDateKey(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
  return dates;
}

export function getPeriodDayCount(period: BookingDatePeriod) {
  return getPeriodDateKeys(period).length;
}

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
  const seed = Array.from(masterId).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  const slots: AvailabilitySlots = {};

  const today = new Date();
  for (let monthOffset = 0; monthOffset < 3; monthOffset += 1) {
    const target = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const daysInMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = formatDateKey(target.getFullYear(), target.getMonth(), day);
      const pattern = (day + target.getMonth() + seed) % 6;

      if (pattern === 0 || pattern === 1) {
        slots[dateKey] = "busy";
      } else if (pattern === 2 || pattern === 4 || day % 5 === 0) {
        slots[dateKey] = "free";
      }
    }
  }

  return masterId === "andrii-koval"
    ? { ...andriiAvailabilitySlots, ...slots }
    : slots;
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

export function getLocalDateKey(date: Date) {
  return formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getNearestFreeDates(
  slots: AvailabilitySlots,
  from = new Date(),
  limit = 4,
) {
  const fromKey = getLocalDateKey(from);
  return Object.entries(slots)
    .filter(([dateKey, status]) => status === "free" && dateKey >= fromKey)
    .map(([dateKey]) => dateKey)
    .sort()
    .slice(0, limit);
}

export function getMonthGrid(year: number, month: number) {
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
}
