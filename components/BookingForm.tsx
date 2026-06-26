"use client";

import { FormEvent, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MessageSquare, Send } from "lucide-react";
import { commonWorkTypes, type MasterService } from "@/lib/master-services";
import { emptyHeightWork, requestsStorageKey, type MasterRequest, type RequestHeightWork } from "@/lib/requests";

type BookingRequest = {
  masterId: string;
  masterName: string;
  date: string;
  dateFrom: string;
  dateTo: string;
  period: string;
  periods: BookingPeriod[];
  selectedServiceId: string;
  selectedServiceTitle: string;
  selectedServiceType: string;
  isTurnkey: boolean;
  clientName: string;
  clientPhone: string;
  desiredDate: string;
  cityArea: string;
  budget: string;
  mainVolume: string;
  additionalInfo: string;
  message: string;
  serviceDetails: Record<string, string>;
  additionalWorks: AdditionalWork[];
  files: RequestFileMeta[];
  heightWork: RequestHeightWork;
  workType: string;
  description: string;
  status: "new";
  createdAt: string;
};

type BookingPeriod = {
  dateFrom: string;
  dateTo: string;
  period: string;
};

type AdditionalWork = {
  id: string;
  title: string;
  volume: string;
  unit: string;
  pricePerUnit: string;
  totalPrice: string;
  comment: string;
};

type RequestFileMeta = {
  id: string;
  fileName: string;
  fileType: string;
};

type DirectMessage = {
  masterId: string;
  masterName: string;
  subject: string;
  message: string;
  createdAt: string;
};

type BookingFormProps = {
  masterId: string;
  masterName: string;
  busyDates?: string[];
  masterServices?: MasterService[];
};

type DirectMessageFormProps = {
  masterId: string;
  masterName: string;
};

const monthNames = [
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

const defaultBusyDates = [
  "2026-06-01",
  "2026-06-02",
  "2026-06-06",
  "2026-06-07",
  "2026-06-08",
  "2026-06-13",
  "2026-06-14",
  "2026-06-15",
  "2026-06-16",
  "2026-06-17",
  "2026-06-18",
  "2026-06-19",
  "2026-06-26",
  "2026-06-27",
];

const workTypes = commonWorkTypes;

const heightAccessTypes = [
  "Стремянка",
  "Леса",
  "Подмости",
  "Автовышка",
  "Фасадный доступ",
  "Канатный доступ / промышленный альпинизм",
  "Другое",
  "Не знаю",
];

const heightWorkLocations = [
  "Внутри помещения",
  "Фасад",
  "Лестничный пролет",
  "Балкон",
  "Потолок",
  "Наружная стена",
  "Глухой фасад",
  "Сложный фасад с выступами",
  "Другое",
];

const heightCoefficientOptions = [
  { value: "unknown", label: "Не знаю", type: "unknown" as const },
  { value: "1.0", label: "1.0", type: "selected" as const },
  { value: "1.05", label: "1.05", type: "selected" as const },
  { value: "1.1", label: "1.1", type: "selected" as const },
  { value: "1.15", label: "1.15", type: "selected" as const },
  { value: "1.2", label: "1.2", type: "selected" as const },
  { value: "1.25", label: "1.25", type: "selected" as const },
  { value: "1.3", label: "1.3", type: "selected" as const },
  { value: "1.35", label: "1.35", type: "selected" as const },
  { value: "1.5", label: "1.5", type: "selected" as const },
  { value: "2.0", label: "2.0", type: "selected" as const },
  { value: "custom", label: "Индивидуальный расчет", type: "custom" as const },
];

const heightNormReference =
  "ДБН / кошторисна логіка: до 5 м - 1.0; 5-8 м - 1.05-1.1; 8-10 м - 1.15-1.2; 10-15 м - 1.25-1.35; канатний доступ / промисловий альпінізм - 1.5-2.0.";

function toIsoDate(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDateRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const dates: string[] = [];

  for (const current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    dates.push(
      `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(
        current.getDate(),
      ).padStart(2, "0")}`,
    );
  }

  return dates;
}

function formatPeriod(dateFrom: string, dateTo: string) {
  return dateFrom === dateTo ? dateFrom : `${dateFrom} — ${dateTo}`;
}

function isDateInsidePeriod(date: string, period: BookingPeriod) {
  return date >= period.dateFrom && date <= period.dateTo;
}

function createAdditionalWork(): AdditionalWork {
  return {
    id: `additional-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "",
    volume: "",
    unit: "м²",
    pricePerUnit: "",
    totalPrice: "",
    comment: "",
  };
}

function getServiceHint(serviceType: string) {
  if (serviceType === "tile") return "Покажите сорт плитки, размер, площадь и место укладки.";
  if (serviceType === "drywall") return "Укажите конструкцию, площадь/длину и нужны ли отделочные работы.";
  if (serviceType === "painting") return "Укажите помещение, площадь стен и подготовку основания.";
  if (serviceType === "plumbing") return "Укажите объект, количество точек и наличие материалов.";
  if (serviceType === "electric") return "Укажите розетки, проводку, свет, щиток и количество точек.";
  if (serviceType.includes("turnkey")) return "Опишите комплекс работ под ключ и желаемый результат.";
  return "Опишите задачу своими словами.";
}

function buildCalendarDays(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const mondayOffset = (firstDay.getDay() + 6) % 7;

  return [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
}

export function DirectMessageForm({ masterId, masterName }: DirectMessageFormProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState("");
  const [messageSuccess, setMessageSuccess] = useState("");

  function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!subject.trim() || !message.trim()) {
      setMessageSuccess("");
      setMessageError("Заповніть тему та повідомлення.");
      return;
    }

    const directMessage: DirectMessage = {
      masterId,
      masterName,
      subject: subject.trim(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };

    console.log("Direct message", directMessage);
    setMessageError("");
    setMessageSuccess("Повідомлення надіслано");
  }

  return (
    <form className="direct-message-form" id="message" onSubmit={submitMessage} noValidate>
      <div className="direct-message-title">
        <span>
          <MessageSquare size={18} />
        </span>
        <div>
          <p className="eyebrow">Прямий звʼязок</p>
          <h3>Написати майстру</h3>
          <small>Повідомлення не привʼязане до дати в календарі.</small>
        </div>
      </div>
      <label>
        Тема
        <input
          name="subject"
          onChange={(event) => {
            setSubject(event.target.value);
            setMessageError("");
          }}
          placeholder="Наприклад, спільний проект"
          required
          value={subject}
        />
      </label>
      <label>
        Повідомлення
        <textarea
          name="message"
          onChange={(event) => {
            setMessage(event.target.value);
            setMessageError("");
          }}
          placeholder={`Напишіть повідомлення для ${masterName}`}
          required
          rows={3}
          value={message}
        />
      </label>
      <button className="request-button direct-message-submit" type="submit">
        <Send size={16} />
        Надіслати повідомлення
      </button>
      {messageError && (
        <p className="booking-error" role="alert">
          {messageError}
        </p>
      )}
      {messageSuccess && (
        <p className="booking-success" role="status">
          {messageSuccess}
        </p>
      )}
    </form>
  );
}

export function BookingForm({
  masterId,
  masterName,
  busyDates = defaultBusyDates,
  masterServices = [],
}: BookingFormProps) {
  const [visibleMonth, setVisibleMonth] = useState({ year: 2026, monthIndex: 5 });
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [hoverDate, setHoverDate] = useState("");
  const [selectedPeriods, setSelectedPeriods] = useState<BookingPeriod[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState(masterServices[0]?.id ?? "");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    masterServices[0]?.id ? [masterServices[0].id] : [],
  );
  const [activeServiceId, setActiveServiceId] = useState(masterServices[0]?.id ?? "");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [cityArea, setCityArea] = useState("");
  const [addressDistrict, setAddressDistrict] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressBuilding, setAddressBuilding] = useState("");
  const [addressApartment, setAddressApartment] = useState("");
  const [addressComment, setAddressComment] = useState("");
  const [budget, setBudget] = useState("");
  const [mainVolume, setMainVolume] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [serviceDetails, setServiceDetails] = useState<Record<string, string>>({});
  const [needsAdditionalWorks, setNeedsAdditionalWorks] = useState(false);
  const [additionalWorks, setAdditionalWorks] = useState<AdditionalWork[]>([]);
  const [requestFiles, setRequestFiles] = useState<RequestFileMeta[]>([]);
  const [heightWork, setHeightWork] = useState<RequestHeightWork>({
    ...emptyHeightWork,
    heightNormReference,
  });
  const [workType, setWorkType] = useState("");
  const [description, setDescription] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");

  const busyDateSet = useMemo(() => new Set(busyDates), [busyDates]);
  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth.year, visibleMonth.monthIndex),
    [visibleMonth],
  );
  const selectedServices = masterServices.filter((service) => selectedServiceIds.includes(service.id));
  const selectedService =
    masterServices.find((service) => service.id === activeServiceId) ??
    masterServices.find((service) => service.id === selectedServiceId) ??
    selectedServices[0] ??
    masterServices[0];

  function updateServiceDetail(key: string, value: string) {
    setServiceDetails((current) => ({ ...current, [key]: value }));
    setBookingError("");
  }

  function updateHeightWork(value: Partial<RequestHeightWork>) {
    setHeightWork((current) => ({ ...current, ...value }));
    setBookingError("");
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((current) => {
      const exists = current.includes(serviceId);
      const next = exists ? current.filter((id) => id !== serviceId) : [...current, serviceId];
      const normalized = next.length ? next : [serviceId];
      const activeId = normalized.includes(activeServiceId) ? activeServiceId : normalized[0];

      setActiveServiceId(activeId);
      setSelectedServiceId(activeId);
      return normalized;
    });
    setBookingError("");
  }

  function changeMonth(direction: -1 | 1) {
    setVisibleMonth((current) => {
      const next = new Date(current.year, current.monthIndex + direction, 1);
      return { year: next.getFullYear(), monthIndex: next.getMonth() };
    });
    setRangeStart("");
    setRangeEnd("");
    setHoverDate("");
    setBookingError("");
    setBookingSuccess("");
  }

  function chooseDate(day: number) {
    const isoDate = toIsoDate(visibleMonth.year, visibleMonth.monthIndex, day);

    if (busyDateSet.has(isoDate)) {
      return;
    }

    if (!rangeStart || rangeEnd || isoDate < rangeStart) {
      setRangeStart(isoDate);
      setRangeEnd("");
      setHoverDate("");
      setBookingError("");
      setBookingSuccess("");
      return;
    }

    const rangeDates = getDateRange(rangeStart, isoDate);
    const hasBusyDate = rangeDates.some((date) => busyDateSet.has(date));
    const hasSelectedDate = rangeDates.some((date) =>
      selectedPeriods.some((period) => isDateInsidePeriod(date, period)),
    );

    if (hasBusyDate || hasSelectedDate) {
      setRangeStart(isoDate);
      setRangeEnd("");
      setHoverDate(isoDate);
      setBookingSuccess("");
      setBookingError(
        hasBusyDate
          ? "У цьому періоді є зайняті дні. Оберіть інший вільний період."
          : "Цей період перетинається з уже вибраним. Оберіть інші дати.",
      );
      return;
    }

    const nextPeriod = {
      dateFrom: rangeStart,
      dateTo: isoDate,
      period: formatPeriod(rangeStart, isoDate),
    };

    setSelectedPeriods((current) =>
      [...current, nextPeriod].sort((first, second) => first.dateFrom.localeCompare(second.dateFrom)),
    );
    setRangeStart("");
    setRangeEnd("");
    setHoverDate("");
    setBookingError("");
    setBookingSuccess("");
  }

  function previewRangeSelection(day: number) {
    if (!rangeStart || rangeEnd) {
      return;
    }

    const isoDate = toIsoDate(visibleMonth.year, visibleMonth.monthIndex, day);

    if (!busyDateSet.has(isoDate)) {
      setHoverDate(isoDate);
    }
  }

  function cancelRangePreview() {
    if (!rangeStart || rangeEnd) {
      return;
    }

    setHoverDate("");
  }

  function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !selectedPeriods.length ||
      !selectedService ||
      !clientName.trim() ||
      !clientPhone.trim() ||
      !cityArea.trim() ||
      !workType ||
      !description.trim() ||
      !requestMessage.trim()
    ) {
      setBookingSuccess("");
      setBookingError("Заповніть контактні дані, послугу, період, тип роботи, район, опис і повідомлення майстру.");
      return;
    }

    const periods = selectedPeriods.map((period) => ({ ...period }));
    const period = periods.map((item) => item.period).join("; ");
    const selectedServiceTitles = selectedServices.length
      ? selectedServices.map((service) => service.serviceTitle)
      : selectedService
        ? [selectedService.serviceTitle]
        : [];
    const normalizedServiceDetails = {
      ...serviceDetails,
      selectedServices: selectedServiceTitles.join(", "),
      addressCity: cityArea.trim(),
      addressDistrict: addressDistrict.trim(),
      addressStreet: addressStreet.trim(),
      addressBuilding: addressBuilding.trim(),
      addressApartment: addressApartment.trim(),
      addressComment: addressComment.trim(),
    };
    const normalizedHeightWork: RequestHeightWork =
      heightWork.hasHeightWork === "yes"
        ? {
            ...heightWork,
            heightNormReference,
            heightCoefficient:
              heightWork.heightCoefficient === "unknown" || heightWork.heightCoefficient === "custom"
                ? ""
                : heightWork.heightCoefficient,
            heightCoefficientType: heightWork.heightCoefficientType,
          }
        : {
            ...emptyHeightWork,
            hasHeightWork: heightWork.hasHeightWork,
            heightNormReference,
          };
    const request: BookingRequest = {
      masterId,
      masterName,
      date: period,
      dateFrom: periods[0].dateFrom,
      dateTo: periods[periods.length - 1].dateTo,
      period,
      periods,
      selectedServiceId: selectedService.id,
      selectedServiceTitle: selectedService.serviceTitle,
      selectedServiceType: selectedService.serviceType,
      isTurnkey: selectedService.isTurnkey,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      desiredDate: period,
      cityArea: cityArea.trim(),
      budget: budget.trim(),
      mainVolume: mainVolume.trim(),
      additionalInfo: additionalInfo.trim(),
      message: requestMessage.trim(),
      serviceDetails: normalizedServiceDetails,
      additionalWorks: needsAdditionalWorks ? additionalWorks.filter((work) => work.title.trim()) : [],
      files: requestFiles,
      heightWork: normalizedHeightWork,
      workType,
      description: description.trim(),
      status: "new",
      createdAt: new Date().toISOString(),
    };

    fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          request?: MasterRequest;
          error?: string;
          persistence?: "supabase" | "browser";
        };

        if (!response.ok || result.error || !result.request) {
          throw new Error(result.error ?? "Не вдалося надіслати заявку.");
        }

        if (result.persistence === "browser") {
          const stored = JSON.parse(localStorage.getItem(requestsStorageKey) ?? "[]") as MasterRequest[];
          localStorage.setItem(requestsStorageKey, JSON.stringify([result.request, ...stored]));
        }

        console.log("Booking request", result.request);
        setBookingError("");
        setBookingSuccess("Заявка надіслана майстру");
        setSelectedPeriods([]);
        setRangeStart("");
        setRangeEnd("");
        setHoverDate("");
      })
      .catch((error: Error) => {
        setBookingSuccess("");
        setBookingError(error.message);
      });
  }

  function removeSelectedPeriod(periodToRemove: BookingPeriod) {
    setSelectedPeriods((current) =>
      current.filter(
        (period) =>
          period.dateFrom !== periodToRemove.dateFrom || period.dateTo !== periodToRemove.dateTo,
      ),
    );
    setBookingError("");
    setBookingSuccess("");
  }

    return (
    <section className="online-booking" id="booking">
      <div className="booking-intro">
        <p className="eyebrow">Онлайн-запис</p>
        <h2>Оберіть вільний період</h2>
        <p>
          Зелені дні доступні для заявки. Натисніть перший і останній день
          періоду. Червоні вже зайняті й не обираються.
        </p>
        <div className="booking-legend" aria-label="Позначення календаря">
          <span>
            <i className="legend-available" /> Вільно
          </span>
          <span>
            <i className="legend-busy" /> Зайнято
          </span>
        </div>
      </div>

      <div className="booking-calendar-card">
        <div className="booking-calendar-head">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Попередній місяць">
            <ChevronLeft size={17} />
          </button>
          <strong>
            {monthNames[visibleMonth.monthIndex]} {visibleMonth.year}
          </strong>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Наступний місяць">
            <ChevronRight size={17} />
          </button>
        </div>
        <div className="booking-weekdays" aria-hidden="true">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div
          className="booking-month-grid"
          aria-label="Календар доступності"
          onPointerLeave={cancelRangePreview}
        >
          {calendarDays.map((day, index) => {
            if (!day) {
              return <span className="booking-date-empty" key={`empty-${index}`} />;
            }

            const isoDate = toIsoDate(visibleMonth.year, visibleMonth.monthIndex, day);
            const isBusy = busyDateSet.has(isoDate);
            const previewStart =
              rangeStart && !rangeEnd && hoverDate
                ? hoverDate < rangeStart
                  ? hoverDate
                  : rangeStart
                : rangeStart;
            const previewEnd =
              rangeStart && !rangeEnd && hoverDate
                ? hoverDate < rangeStart
                  ? rangeStart
                  : hoverDate
                : rangeEnd;
            const previewDates = previewStart && previewEnd ? getDateRange(previewStart, previewEnd) : [];
            const hasBusyPreview = previewDates.some((date) => busyDateSet.has(date));
            const hasSelectedPreview = previewDates.some((date) =>
              selectedPeriods.some((period) => isDateInsidePeriod(date, period)),
            );
            const isPreviewing = Boolean(
              rangeStart && !rangeEnd && previewStart && previewEnd && !hasBusyPreview && !hasSelectedPreview,
            );
            const fixedPeriod = selectedPeriods.find((period) => isDateInsidePeriod(isoDate, period));
            const isFixedRangeStart = selectedPeriods.some((period) => period.dateFrom === isoDate);
            const isFixedRangeEnd = selectedPeriods.some((period) => period.dateTo === isoDate);
            const isFixedInRange = Boolean(
              fixedPeriod && isoDate > fixedPeriod.dateFrom && isoDate < fixedPeriod.dateTo,
            );
            const isRangeStart =
              isFixedRangeStart || rangeStart === isoDate || (isPreviewing && previewStart === isoDate);
            const isRangeEnd =
              isFixedRangeEnd || rangeEnd === isoDate || (isPreviewing && previewEnd === isoDate);
            const isInRange =
              isFixedInRange ||
              Boolean(rangeStart && rangeEnd && isoDate > rangeStart && isoDate < rangeEnd) ||
              Boolean(isPreviewing && isoDate > previewStart && isoDate < previewEnd);
            const isSelected = isRangeStart || isRangeEnd || isInRange;

            return (
              <button
                aria-pressed={isSelected}
                className={[
                  "booking-month-day",
                  isBusy ? "is-busy" : "is-free",
                  isSelected ? "is-selected" : "",
                  isRangeStart ? "is-range-start" : "",
                  isRangeEnd ? "is-range-end" : "",
                  isInRange ? "is-in-range" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={isBusy}
                key={isoDate}
                onClick={() => chooseDate(day)}
                onPointerEnter={() => previewRangeSelection(day)}
                type="button"
              >
                {day}
              </button>
            );
          })}
        </div>
        <h3 className="booking-period-status">
          {rangeStart
              ? `Початок періоду: ${rangeStart}. Оберіть останній день`
              : selectedPeriods.length
                ? `Обрано періодів: ${selectedPeriods.length}`
                : "Спочатку оберіть зелений день"}
        </h3>
        {selectedPeriods.length > 0 && (
          <div className="selected-periods" aria-label="Обрані періоди">
            {selectedPeriods.map((period) => (
              <button
                key={`${period.dateFrom}-${period.dateTo}`}
                onClick={() => removeSelectedPeriod(period)}
                type="button"
              >
                <span>{period.period}</span>
                <small>×</small>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="booking-client-card">
        <div className="booking-form-head">
          <span>Крок 1</span>
          <strong>Дані клієнта</strong>
        </div>
        <label>
          Імʼя клієнта
          <input
            name="clientName"
            onChange={(event) => {
              setClientName(event.target.value);
              setBookingError("");
            }}
            placeholder="Наприклад, Олексій Мельник"
            required
            value={clientName}
          />
        </label>
        <label>
          Телефон клієнта
          <input
            name="clientPhone"
            onChange={(event) => {
              setClientPhone(event.target.value);
              setBookingError("");
            }}
            placeholder="+380..."
            required
            value={clientPhone}
          />
        </label>
        <label>
          Загальний коментар
          <textarea
            name="requestMessage"
            onChange={(event) => {
              setRequestMessage(event.target.value);
              setBookingError("");
            }}
            placeholder={`Напишіть короткий коментар для ${masterName}`}
            required
            rows={3}
            value={requestMessage}
          />
        </label>
      </div>

      <fieldset className="booking-address-fields">
        <legend>Дані обʼєкта</legend>
        <label>
          Місто
          <input
            name="cityArea"
            onChange={(event) => {
              setCityArea(event.target.value);
              setBookingError("");
            }}
            placeholder="Наприклад, Київ"
            required
            value={cityArea}
          />
        </label>
        <label>
          Район
          <input
            value={addressDistrict}
            onChange={(event) => setAddressDistrict(event.target.value)}
            placeholder="Наприклад, Оболонь"
          />
        </label>
        <label>
          Вулиця
          <input
            value={addressStreet}
            onChange={(event) => setAddressStreet(event.target.value)}
            placeholder="Назва вулиці"
          />
        </label>
        <label>
          Дім
          <input
            value={addressBuilding}
            onChange={(event) => setAddressBuilding(event.target.value)}
            placeholder="№ будинку"
          />
        </label>
        <label>
          Квартира / приміщення
          <input
            value={addressApartment}
            onChange={(event) => setAddressApartment(event.target.value)}
            placeholder="Квартира, офіс, секція"
          />
        </label>
        <label className="booking-address-wide">
          Коментар по адресу
          <textarea
            value={addressComment}
            onChange={(event) => setAddressComment(event.target.value)}
            placeholder="Підʼїзд, код домофона, куди підʼїхати"
            rows={3}
          />
        </label>
      </fieldset>

      <form className="booking-side-form" onSubmit={submitBooking} noValidate>
        <div className="booking-form-section">
          <div className="booking-form-head">
            <span>Крок 2</span>
            <strong>Послуги майстра</strong>
          </div>
          <div className="booking-service-options" aria-label="Послуги майстра">
            {masterServices.map((service) => (
              <label className="service-checkbox" key={service.id}>
                <input
                  checked={selectedServiceIds.includes(service.id)}
                  onChange={() => toggleService(service.id)}
                  type="checkbox"
                />
                <span>
                  <strong>{service.serviceTitle}</strong>
                  <small>{service.isTurnkey ? "Під ключ" : "Окрема послуга"}</small>
                </span>
              </label>
            ))}
          </div>
          {selectedServices.length > 0 && (
            <div className="service-tabs" aria-label="Вибрані послуги">
              {selectedServices.map((service) => (
                <button
                  className={service.id === selectedService?.id ? "active" : ""}
                  key={service.id}
                  onClick={() => {
                    setActiveServiceId(service.id);
                    setSelectedServiceId(service.id);
                    setBookingError("");
                  }}
                  type="button"
                >
                  {service.serviceTitle}
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedService && (
          <div className="service-context">
            <strong>{selectedService.isTurnkey ? "Заявка под ключ" : "Обычная услуга"}</strong>
            <p>{selectedService.serviceDescription}</p>
            <small>{getServiceHint(selectedService.serviceType)}</small>
          </div>
        )}
        <div className="booking-form-head">
          <span>Крок 3</span>
          <strong>Параметри заявки</strong>
        </div>
        <label>
          Тип роботи
          <select
            name="workType"
            onChange={(event) => {
              setWorkType(event.target.value);
              setBookingError("");
            }}
            required
            value={workType}
          >
            <option value="">Наприклад, монтаж розеток</option>
            {workTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        {selectedService && (
          <div className="service-dynamic-fields">
            {selectedService.serviceType === "tile" && (
              <>
                <label>
                  Сорт плитки
                  <select value={serviceDetails.tileKind ?? ""} onChange={(event) => updateServiceDetail("tileKind", event.target.value)}>
                    <option value="">Выберите сорт</option>
                    <option>Керамическая плитка</option>
                    <option>Керамогранит</option>
                    <option>Мозаика</option>
                    <option>Крупноформатная плитка</option>
                    <option>Другое</option>
                  </select>
                </label>
                <label>
                  Размер плитки
                  <input value={serviceDetails.tileSize ?? ""} onChange={(event) => updateServiceDetail("tileSize", event.target.value)} placeholder="Например, 60×60" />
                </label>
                <label>
                  Площадь укладки
                  <input value={serviceDetails.tileArea ?? ""} onChange={(event) => updateServiceDetail("tileArea", event.target.value)} placeholder="Например, 25 м²" />
                </label>
                <label>
                  Где будет укладка
                  <input value={serviceDetails.tilePlace ?? ""} onChange={(event) => updateServiceDetail("tilePlace", event.target.value)} placeholder="Пол, стены, ванная, кухня" />
                </label>
              </>
            )}
            {selectedService.serviceType === "drywall" && (
              <>
                <label>
                  Тип конструкции
                  <input value={serviceDetails.constructionType ?? ""} onChange={(event) => updateServiceDetail("constructionType", event.target.value)} placeholder="Стены, потолок, перегородка, короб" />
                </label>
                <label>
                  Площадь или длина
                  <input value={serviceDetails.drywallVolume ?? ""} onChange={(event) => updateServiceDetail("drywallVolume", event.target.value)} placeholder="Например, 18 м²" />
                </label>
                <label>
                  Нужна шпаклевка/покраска
                  <input value={serviceDetails.drywallFinish ?? ""} onChange={(event) => updateServiceDetail("drywallFinish", event.target.value)} placeholder="Да / нет / уточнить" />
                </label>
              </>
            )}
            {selectedService.serviceType === "painting" && (
              <>
                <label>
                  Тип помещения
                  <input value={serviceDetails.roomType ?? ""} onChange={(event) => updateServiceDetail("roomType", event.target.value)} placeholder="Квартира, офис, ванная..." />
                </label>
                <label>
                  Площадь стен
                  <input value={serviceDetails.wallArea ?? ""} onChange={(event) => updateServiceDetail("wallArea", event.target.value)} placeholder="Например, 45 м²" />
                </label>
                <label>
                  Подготовка стен
                  <input value={serviceDetails.wallPreparation ?? ""} onChange={(event) => updateServiceDetail("wallPreparation", event.target.value)} placeholder="Грунтовка, шпаклевка, уже готово" />
                </label>
              </>
            )}
            {selectedService.serviceType === "plumbing" && (
              <>
                <label>
                  Что нужно сделать
                  <input value={serviceDetails.plumbingAction ?? ""} onChange={(event) => updateServiceDetail("plumbingAction", event.target.value)} placeholder="Установка, ремонт, замена" />
                </label>
                <label>
                  Тип объекта
                  <input value={serviceDetails.plumbingObject ?? ""} onChange={(event) => updateServiceDetail("plumbingObject", event.target.value)} placeholder="Ванна, душ, унитаз, трубы" />
                </label>
                <label>
                  Количество объектов
                  <input value={serviceDetails.objectCount ?? ""} onChange={(event) => updateServiceDetail("objectCount", event.target.value)} placeholder="Например, 3 точки" />
                </label>
              </>
            )}
            {selectedService.serviceType === "electric" && (
              <>
                <label>
                  Что нужно сделать
                  <input value={serviceDetails.electricTask ?? ""} onChange={(event) => updateServiceDetail("electricTask", event.target.value)} placeholder="Розетки, проводка, свет, щиток" />
                </label>
                <label>
                  Количество точек
                  <input value={serviceDetails.pointsCount ?? ""} onChange={(event) => updateServiceDetail("pointsCount", event.target.value)} placeholder="Например, 18" />
                </label>
                <label>
                  Материалы
                  <input value={serviceDetails.hasMaterials ?? ""} onChange={(event) => updateServiceDetail("hasMaterials", event.target.value)} placeholder="Есть / нужно купить / частично" />
                </label>
              </>
            )}
            {selectedService.isTurnkey && (
              <>
                <label>
                  Комплекс работ под ключ
                  <textarea value={serviceDetails.turnkeyScope ?? ""} onChange={(event) => updateServiceDetail("turnkeyScope", event.target.value)} placeholder="Демонтаж, подготовка, материалы, чистовая отделка..." rows={3} />
                </label>
                <label>
                  Площадь / комнаты
                  <input value={serviceDetails.turnkeyArea ?? ""} onChange={(event) => updateServiceDetail("turnkeyArea", event.target.value)} placeholder="Например, ванная 6 м² или квартира 48 м²" />
                </label>
              </>
            )}
          </div>
        )}
        <label>
          Бюджет / ціна
          <input
            name="budget"
            onChange={(event) => setBudget(event.target.value)}
            placeholder="Например, до 30 000 грн"
            value={budget}
          />
        </label>
        <label>
          Основний обʼєм роботи
          <input
            name="mainVolume"
            onChange={(event) => setMainVolume(event.target.value)}
            placeholder="Например, 25 м², 18 точек, 2 комнаты"
            value={mainVolume}
          />
        </label>
        <label>
          Короткий опис
          <textarea
            name="description"
            onChange={(event) => {
              setDescription(event.target.value);
              setBookingError("");
            }}
            placeholder="Опишіть завдання та обʼєкт"
            required
            rows={5}
            value={description}
          />
        </label>
        <fieldset className="height-work-form">
          <legend>Висотні роботи</legend>
          <label>
            Є висотні роботи?
            <select
              value={heightWork.hasHeightWork}
              onChange={(event) => {
                const nextPresence = event.target.value as RequestHeightWork["hasHeightWork"];
                updateHeightWork(
                  nextPresence === "yes"
                    ? { hasHeightWork: nextPresence }
                    : { ...emptyHeightWork, hasHeightWork: nextPresence, heightNormReference },
                );
              }}
            >
              <option value="no">Ні</option>
              <option value="yes">Так</option>
              <option value="unknown">Не знаю</option>
            </select>
          </label>
          {heightWork.hasHeightWork === "unknown" && (
            <p className="height-work-note">
              Клієнт не знає, чи є висотні роботи. Майстер зможе уточнити це після перегляду заявки.
            </p>
          )}
          {heightWork.hasHeightWork === "yes" && (
            <>
              <div className="height-work-grid">
                <label>
                  Висота виконання роботи
                  <input
                    inputMode="decimal"
                    placeholder="Наприклад, 8"
                    value={heightWork.heightValue}
                    onChange={(event) => updateHeightWork({ heightValue: event.target.value })}
                  />
                </label>
                <label>
                  Одиниця висоти
                  <select
                    value={heightWork.heightUnit}
                    onChange={(event) => updateHeightWork({ heightUnit: event.target.value })}
                  >
                    <option>м</option>
                  </select>
                </label>
                <label>
                  Обʼєм висотної частини
                  <input
                    inputMode="decimal"
                    placeholder="Наприклад, 12"
                    value={heightWork.heightWorkVolume}
                    onChange={(event) => updateHeightWork({ heightWorkVolume: event.target.value })}
                  />
                </label>
                <label>
                  Одиниця обʼєму
                  <select
                    value={heightWork.heightWorkVolumeUnit}
                    onChange={(event) => updateHeightWork({ heightWorkVolumeUnit: event.target.value })}
                  >
                    <option>м²</option>
                    <option>м.п.</option>
                    <option>шт.</option>
                    <option>інше</option>
                  </select>
                </label>
                <label>
                  Тип доступу
                  <select
                    value={heightWork.heightAccessType}
                    onChange={(event) => updateHeightWork({ heightAccessType: event.target.value })}
                  >
                    <option value="">Оберіть тип доступу</option>
                    {heightAccessTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Місце висотної роботи
                  <select
                    value={heightWork.heightWorkLocation}
                    onChange={(event) => updateHeightWork({ heightWorkLocation: event.target.value })}
                  >
                    <option value="">Оберіть місце</option>
                    {heightWorkLocations.map((location) => (
                      <option key={location}>{location}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="height-coefficient-help">
                <strong>Коефіцієнт висотних робіт</strong>
                <p>
                  Це множник до базової ціни тільки для тієї частини роботи, яка виконується на висоті. Якщо ви
                  не знаєте коефіцієнт, залиште “Не знаю” — майстер уточнить його після перегляду фото, висоти та
                  умов доступу.
                </p>
                <small>{heightNormReference}</small>
              </div>
              <label>
                Коефіцієнт висотних робіт
                <select
                  value={heightWork.heightCoefficient || "unknown"}
                  onChange={(event) => {
                    const option = heightCoefficientOptions.find((item) => item.value === event.target.value);
                    updateHeightWork({
                      heightCoefficient: event.target.value,
                      heightCoefficientType: option?.type ?? "unknown",
                    });
                  }}
                >
                  {heightCoefficientOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {heightWork.heightCoefficientType === "custom"
                  ? "Коментар до індивідуального розрахунку"
                  : "Коментар клієнта"}
                <textarea
                  placeholder="Наприклад, робота на фасаді, є фото місця виконання"
                  rows={3}
                  value={heightWork.heightComment}
                  onChange={(event) => updateHeightWork({ heightComment: event.target.value })}
                />
              </label>
            </>
          )}
        </fieldset>
        <fieldset className="height-work-form additional-details-form">
          <legend>Додаткові роботи та інформація</legend>
          <label className="checkbox-line">
            <input
              checked={needsAdditionalWorks}
              onChange={(event) => {
                setNeedsAdditionalWorks(event.target.checked);
                if (event.target.checked && additionalWorks.length === 0) {
                  setAdditionalWorks([createAdditionalWork()]);
                }
              }}
              type="checkbox"
            />
            Потрібні додаткові роботи
          </label>
          {needsAdditionalWorks && (
            <div className="additional-works-form">
              {additionalWorks.map((work) => (
                <div className="additional-work-row" key={work.id}>
                  <input placeholder="Назва роботи" value={work.title} onChange={(event) => setAdditionalWorks((current) => current.map((item) => item.id === work.id ? { ...item, title: event.target.value } : item))} />
                  <input placeholder="Обʼєм" value={work.volume} onChange={(event) => setAdditionalWorks((current) => current.map((item) => item.id === work.id ? { ...item, volume: event.target.value } : item))} />
                  <input placeholder="Од." value={work.unit} onChange={(event) => setAdditionalWorks((current) => current.map((item) => item.id === work.id ? { ...item, unit: event.target.value } : item))} />
                  <input placeholder="Ціна/од." value={work.pricePerUnit} onChange={(event) => setAdditionalWorks((current) => current.map((item) => item.id === work.id ? { ...item, pricePerUnit: event.target.value } : item))} />
                  <input placeholder="Разом" value={work.totalPrice} onChange={(event) => setAdditionalWorks((current) => current.map((item) => item.id === work.id ? { ...item, totalPrice: event.target.value } : item))} />
                  <input placeholder="Коментар" value={work.comment} onChange={(event) => setAdditionalWorks((current) => current.map((item) => item.id === work.id ? { ...item, comment: event.target.value } : item))} />
                </div>
              ))}
              <button className="add-work-button" onClick={() => setAdditionalWorks((current) => [...current, createAdditionalWork()])} type="button">
                Додати роботу
              </button>
            </div>
          )}
          <label>
            Додаткова інформація
            <textarea
              name="additionalInfo"
              onChange={(event) => setAdditionalInfo(event.target.value)}
              placeholder="Материалы куплены, нужен демонтаж, особые условия..."
              rows={3}
              value={additionalInfo}
            />
          </label>
        </fieldset>
        <label>
          Фото або файли
          <input
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []).map((file) => ({
                id: `file-${file.name}-${file.size}`,
                fileName: file.name,
                fileType: file.type || "file",
              }));
              setRequestFiles(files);
            }}
            type="file"
          />
        </label>
        {requestFiles.length > 0 && (
          <div className="file-preview-list">
            {requestFiles.map((file) => (
              <span key={file.id}>{file.fileName}</span>
            ))}
          </div>
        )}

        {bookingError && (
          <p className="booking-error" role="alert">
            {bookingError}
          </p>
        )}
        <button className="request-button booking-submit" type="submit">
          <Send size={16} />
          Надіслати заявку
        </button>
        {bookingSuccess && (
          <p className="booking-success" role="status">
            {bookingSuccess}
          </p>
        )}
      </form>

    </section>
  );
}
