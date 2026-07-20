"use client";

import { Camera, ChevronLeft, ChevronRight, FileText, MessageSquare, Send, X } from "lucide-react";
import { type ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AvailabilitySlots,
  formatBookingDate,
  formatDateKey,
  getAvailabilityStorageKey,
  getDefaultAvailabilitySlots,
  getLocalDateKey,
  getMonthGrid,
  getNearestFreeDates,
  getPeriodDateKeys,
  getPeriodDayCount,
  groupConsecutiveDates,
  legacyAvailabilityStorageKey,
  masterMessageStorageKey,
  monthLabels,
  type MasterMessage,
} from "@/lib/availability";

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
const shortWeekdays = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const shortMonths = ["січ", "лют", "бер", "кві", "тра", "чер", "лип", "сер", "вер", "жов", "лис", "гру"];
const monthGenitives = ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"];

function readStoredArray<T>(key: string): T[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value as T[] : [];
  } catch {
    return [];
  }
}

function parseSlots(value: string | null): AvailabilitySlots | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as AvailabilitySlots;
  } catch {
    return null;
  }
}

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatQuickDate(dateKey: string) {
  const date = dateFromKey(dateKey);
  return `${shortWeekdays[date.getDay()]}, ${date.getDate()} ${shortMonths[date.getMonth()]}`;
}

function formatPeriod(startDate: string, endDate: string) {
  const start = dateFromKey(startDate);
  const end = dateFromKey(endDate);
  if (startDate === endDate) return `${start.getDate()} ${monthGenitives[start.getMonth()]} ${start.getFullYear()}`;
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${monthGenitives[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${monthGenitives[start.getMonth()]} ${start.getFullYear()} — ${end.getDate()} ${monthGenitives[end.getMonth()]} ${end.getFullYear()}`;
}

function formatDayCount(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) return `${count} день`;
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return `${count} дні`;
  return `${count} днів`;
}

export function NearestFreeDateText({ masterId }: { masterId: string }) {
  const [slots, setSlots] = useState<AvailabilitySlots>(() => getDefaultAvailabilitySlots(masterId));
  useEffect(() => {
    const loadSlots = window.setTimeout(() => {
      const stored = localStorage.getItem(getAvailabilityStorageKey(masterId)) ??
        (masterId === "andrii-koval" ? localStorage.getItem(legacyAvailabilityStorageKey) : null);
      const parsed = parseSlots(stored);
      if (parsed) setSlots((defaults) => ({ ...defaults, ...parsed }));
    }, 0);
    return () => window.clearTimeout(loadSlots);
  }, [masterId]);
  const nearest = getNearestFreeDates(slots, new Date(), 1)[0];
  return nearest ? <small className="public-profile-nearest">Найближча вільна дата: {formatQuickDate(nearest)}</small> : null;
}

export function ClientBookingCalendar({ masterId, masterName }: { masterId: string; masterName: string }) {
  const initialToday = useMemo(() => new Date(), []);
  const todayKey = getLocalDateKey(initialToday);
  const [slots, setSlots] = useState<AvailabilitySlots>(() => getDefaultAvailabilitySlots(masterId));
  const [year, setYear] = useState(() => initialToday.getFullYear());
  const [month, setMonth] = useState(() => initialToday.getMonth());
  const [dateOptions, setDateOptions] = useState<string[]>([]);
  const [workType, setWorkType] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState("");
  const [messageStatus, setMessageStatus] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const loadSlots = window.setTimeout(() => {
      const stored = localStorage.getItem(getAvailabilityStorageKey(masterId)) ??
        (masterId === "andrii-koval" ? localStorage.getItem(legacyAvailabilityStorageKey) : null);
      const parsed = parseSlots(stored);
      if (parsed) setSlots((defaults) => ({ ...defaults, ...parsed }));
    }, 0);
    return () => window.clearTimeout(loadSlots);
  }, [masterId]);

  const days = useMemo(() => getMonthGrid(year, month), [year, month]);
  const nearestDates = useMemo(() => getNearestFreeDates(slots, initialToday), [initialToday, slots]);
  const datePeriods = useMemo(() => groupConsecutiveDates(dateOptions), [dateOptions]);
  const isCurrentMonth = year === initialToday.getFullYear() && month === initialToday.getMonth();

  function toggleDate(dateKey: string, scrollOnMobile = false) {
    const date = dateFromKey(dateKey);
    setYear(date.getFullYear());
    setMonth(date.getMonth());
    setBookingStatus("");
    setDateOptions((current) => {
      if (current.includes(dateKey)) {
        return current.filter((item) => item !== dateKey);
      }
      return [...current, dateKey];
    });
    if (scrollOnMobile && window.matchMedia("(max-width: 640px)").matches) {
      window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }

  function changeMonth(direction: -1 | 1) {
    if (direction === -1 && isCurrentMonth) return;
    const next = new Date(year, month + direction, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
    setBookingStatus("");
  }

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const next = [...files, ...selected].slice(0, 10);
    const invalid = next.find((file) => !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type) || file.size > 10 * 1024 * 1024);
    if (invalid || next.reduce((sum, file) => sum + file.size, 0) > 50 * 1024 * 1024) {
      setBookingError("Дозволено до 10 JPEG, PNG, WebP або PDF, до 10 МБ кожен і 50 МБ разом.");
      event.target.value = "";
      return;
    }
    setFiles(next); setBookingError(""); event.target.value = "";
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dateOptions.length || !workType.trim() || dateOptions.some((date) => slots[date] !== "free")) return;
    setSubmitting(true); setBookingError(""); setBookingStatus("");
    const formData = new FormData(event.currentTarget);
    let bookingId = pendingBookingId;
    if (!bookingId) {
    const response = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      masterId, masterName, source: "profile_calendar",
      periods: datePeriods.map((period) => ({ dateFrom: period.startDate, dateTo: period.endDate, period: `${period.startDate} — ${period.endDate}` })),
      workType: String(formData.get("workType") ?? ""),
      description: String(formData.get("description") ?? ""),
    }) });
    const result = await response.json().catch(() => null) as { request?: { id: string }; error?: string } | null;
    if (!response.ok || !result?.request) {
      if (response.status === 401) { window.location.assign(`/auth/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); return; }
      setBookingError(result?.error || "Не вдалося надіслати заявку."); setSubmitting(false); return;
    }
    bookingId = result.request.id;
    setPendingBookingId(bookingId);
    }
    if (files.length) {
      const uploadData = new FormData(); uploadData.set("bookingId", bookingId); files.forEach((file) => uploadData.append("files", file));
      const uploadResponse = await fetch("/api/requests/attachments", { method: "POST", body: uploadData });
      const uploadResult = await uploadResponse.json().catch(() => null) as { uploaded?: string[]; failed?: { name: string }[]; error?: string } | null;
      if (!uploadResponse.ok || uploadResult?.failed?.length) {
        const failedNames = new Set(uploadResult?.failed?.map((item) => item.name) ?? files.map((file) => file.name));
        setFiles((current) => current.filter((file) => failedNames.has(file.name)));
        setBookingError(`Заявку створено, але не всі файли завантажено: ${uploadResult?.failed?.map((item) => item.name).join(", ") || uploadResult?.error || "помилка сховища"}. Повторна відправка заявки не потрібна.`);
        setSubmitting(false); return;
      }
    }
    setBookingStatus(`Заявку надіслано майстру. Ви запропонували ${datePeriods.length} варіанти періоду. Майстер підтвердить один із них або запропонує інші дати. Точний час ви зможете узгодити в чаті.`);
    event.currentTarget.reset();
    setWorkType(""); setFiles([]); setPendingBookingId(""); setSubmitting(false);
  }

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const message: MasterMessage = {
      id: crypto.randomUUID(), senderMasterId: "andrii-koval", recipientMasterId: masterId,
      subject: String(formData.get("subject") ?? ""), message: String(formData.get("message") ?? ""), createdAt: new Date().toISOString(),
    };
    localStorage.setItem(masterMessageStorageKey, JSON.stringify([message, ...readStoredArray<MasterMessage>(masterMessageStorageKey)]));
    setMessageStatus(`Повідомлення для ${masterName} надіслано.`);
    event.currentTarget.reset();
  }

  return (
    <section className="client-booking-section" id="booking-calendar">
      <div className="client-booking-copy">
        <p className="public-profile-eyebrow">Онлайн-запис</p>
        <h2>Оберіть зручні дати або періоди</h2>
        <span>Можна обрати декілька окремих дат або кілька періодів. Майстер підтвердить один із варіантів. Точний час ви узгодите в чаті.</span>
        <div className="client-booking-legend" aria-label="Позначення календаря">
          <span><i className="free" /> Вільно</span><span><i className="busy" /> Зайнято</span><span><i className="unset" /> Неробочий день</span>
        </div>
      </div>

      <div className="client-booking-workflow">
        <div className="client-nearest-dates">
          <h3>Найближчі вільні дати</h3>
          <div>{nearestDates.map((dateKey) => <button type="button" key={dateKey} onClick={() => toggleDate(dateKey, true)} aria-pressed={dateOptions.includes(dateKey)}>{formatQuickDate(dateKey)}</button>)}</div>
          {!nearestDates.length && <p>Наразі вільних дат не позначено.</p>}
          <strong className="client-date-counter">Обрано дат: {dateOptions.length}</strong>
        </div>

        <div className="client-booking-columns">
          <div className="client-calendar-card">
            <div className="client-calendar-toolbar">
              <button type="button" onClick={() => changeMonth(-1)} disabled={isCurrentMonth} aria-label="Попередній місяць" title={isCurrentMonth ? "Раніші місяці недоступні" : "Попередній місяць"}><ChevronLeft size={17} /></button>
              <strong>{monthLabels[month]} {year}</strong>
              <button type="button" onClick={() => changeMonth(1)} aria-label="Наступний місяць" title="Наступний місяць"><ChevronRight size={17} /></button>
            </div>
            <div className="client-calendar-weekdays">{weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
            <div className="client-calendar-grid">
              {days.map((day, index) => {
                if (!day) return <span key={`empty-${index}`} />;
                const key = formatDateKey(year, month, day);
                const isPast = key < todayKey;
                const status = isPast ? "past" : slots[key] ?? "unset";
                const statusText = status === "free" ? "Вільно" : status === "busy" ? "Зайнято" : status === "past" ? "Минула дата" : "Неробочий день";
                const isToday = key === todayKey;
                const periodIndex = datePeriods.findIndex((period) => key >= period.startDate && key <= period.endDate);
                const period = periodIndex >= 0 ? datePeriods[periodIndex] : undefined;
                const periodPosition = period ? period.startDate === period.endDate ? "Обрано" : key === period.startDate ? "Початок" : key === period.endDate ? "Кінець" : `У періоді ${periodIndex + 1}` : "";
                return <button className={`${status} ${period ? "selected" : ""} ${isToday ? "today" : ""}`} type="button" key={day} disabled={status !== "free"} onClick={() => toggleDate(key)} aria-label={`${day} ${monthGenitives[month]} ${year}, ${period ? `${periodPosition.toLowerCase()} ${periodIndex + 1}-го обраного періоду` : statusText.toLowerCase()}`} title={`${statusText}${isToday ? " — Сьогодні" : ""}`} aria-pressed={Boolean(period)}>
                  <span>{day}</span>{period && <b className="client-date-order">{periodIndex + 1}</b>}<small>{periodPosition || (isToday ? "Сьогодні" : statusText)}</small>
                </button>;
              })}
            </div>
          </div>

          <form className="client-booking-form" onSubmit={submitBooking} ref={formRef}>
            <h3>{datePeriods.length ? "Обрані періоди" : "Спочатку оберіть вільну дату"}</h3>
            {datePeriods.length > 0 && <div className="client-selected-dates">{datePeriods.map((period, index) => <div key={`${period.startDate}-${period.endDate}`}><span><b>{index + 1} період</b><small>{formatPeriod(period.startDate, period.endDate)}</small><em>{formatDayCount(getPeriodDayCount(period))}</em></span><button type="button" onClick={() => { const keys = new Set(getPeriodDateKeys(period)); setDateOptions((current) => current.filter((date) => !keys.has(date))); setBookingStatus(""); }} aria-label={`Видалити період з ${formatBookingDate(period.startDate)} до ${formatBookingDate(period.endDate)}`}><X size={16} /> <span>Видалити період</span></button></div>)}<div className="client-period-summary"><strong>Обрано періодів: {datePeriods.length}</strong><span>Загальна кількість обраних дат: {dateOptions.length}</span></div><p>Точний час ви зможете узгодити з майстром у чаті.</p></div>}
            {dateOptions.length > 0 && <label>Тип роботи<input name="workType" value={workType} onChange={(event) => setWorkType(event.target.value)} placeholder="Наприклад, монтаж розеток" required /></label>}
            {dateOptions.length > 0 && <label>Короткий опис<textarea name="description" rows={4} placeholder="Опишіть завдання та об’єкт" required /></label>}
            {dateOptions.length > 0 && <div className="client-photo-placeholder" aria-label="Вкладення до заявки"><Camera size={18} aria-hidden="true" /><div><strong>Фото та PDF</strong><span>До 10 файлів, 10 МБ кожен, 50 МБ разом.</span></div><label className="client-attachment-picker">Додати файли<input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={chooseFiles} /></label>{files.length ? <ul>{files.map((file, index) => <li key={`${file.name}-${index}`}><FileText size={15} /><span>{file.name}</span><button type="button" aria-label={`Видалити ${file.name}`} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}><X size={14} /></button></li>)}</ul> : null}</div>}
            <button type="submit" disabled={!dateOptions.length || !workType.trim() || submitting}><Send size={17} /> {submitting ? "Надсилаємо…" : "Надіслати заявку"}</button>
            {bookingError && <p role="alert">{bookingError}</p>}
            {bookingStatus && <p role="status">{bookingStatus}</p>}
          </form>
        </div>
      </div>

      <details className="client-message-details" id="message-master">
        <summary><span><MessageSquare size={19} /></span><div><strong>Є запитання до майстра?</strong><small>Напишіть напряму, без прив’язки до календаря.</small></div><b>Написати майстру</b></summary>
        <form className="client-message-form" onSubmit={submitMessage}>
          <label>Тема<input name="subject" placeholder="Наприклад, запитання про матеріали" required /></label>
          <label>Повідомлення<textarea name="message" rows={3} placeholder={`Напишіть повідомлення для ${masterName}`} required /></label>
          <button type="submit"><Send size={17} /> Надіслати повідомлення</button>
          {messageStatus && <p role="status">{messageStatus}</p>}
        </form>
      </details>
    </section>
  );
}
