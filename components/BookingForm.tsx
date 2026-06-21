"use client";

import { FormEvent, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MessageSquare, Send } from "lucide-react";

type BookingRequest = {
  masterId: string;
  masterName: string;
  date: string;
  dateFrom: string;
  dateTo: string;
  period: string;
  periods: BookingPeriod[];
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

const workTypes = [
  "Укладка плитки",
  "Штукатурка",
  "Покраска стен",
  "Электрика",
  "Сантехника",
  "Другое",
];

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

function buildCalendarDays(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const mondayOffset = (firstDay.getDay() + 6) % 7;

  return [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
}

export function BookingForm({
  masterId,
  masterName,
  busyDates = defaultBusyDates,
}: BookingFormProps) {
  const [visibleMonth, setVisibleMonth] = useState({ year: 2026, monthIndex: 5 });
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [hoverDate, setHoverDate] = useState("");
  const [selectedPeriods, setSelectedPeriods] = useState<BookingPeriod[]>([]);
  const [workType, setWorkType] = useState("");
  const [description, setDescription] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState("");
  const [messageSuccess, setMessageSuccess] = useState("");

  const busyDateSet = useMemo(() => new Set(busyDates), [busyDates]);
  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth.year, visibleMonth.monthIndex),
    [visibleMonth],
  );

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

    if (!selectedPeriods.length || !workType || !description.trim()) {
      setBookingSuccess("");
      setBookingError("Оберіть хоча б один вільний період, тип роботи та коротко опишіть задачу.");
      return;
    }

    const periods = selectedPeriods.map((period) => ({ ...period }));
    const period = periods.map((item) => item.period).join("; ");
    const request: BookingRequest = {
      masterId,
      masterName,
      date: period,
      dateFrom: periods[0].dateFrom,
      dateTo: periods[periods.length - 1].dateTo,
      period,
      periods,
      workType,
      description: description.trim(),
      status: "new",
      createdAt: new Date().toISOString(),
    };

    console.log("Booking request", request);
    setBookingError("");
    setBookingSuccess("Заявка надіслана майстру");
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
      </div>

      <form className="booking-side-form" onSubmit={submitBooking} noValidate>
        <h3>
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
    </section>
  );
}
