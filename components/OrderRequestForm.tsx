"use client";

import { FormEvent, PointerEvent as ReactPointerEvent, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Send, UploadCloud, X } from "lucide-react";
import { type MasterService } from "@/lib/master-services";
import { emptyHeightWork, requestsStorageKey, type MasterRequest } from "@/lib/requests";

type OrderRequestFormProps = {
  masterId: string;
  masterName: string;
  busyDates?: string[];
  pendingDates?: string[];
  masterServices: MasterService[];
  priceFrom: number;
};

type RequestFileMeta = {
  id: string;
  fileName: string;
  fileType: string;
  previewUrl: string;
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

const monthShortNames = ["січ", "лют", "бер", "кві", "тра", "чер", "лип", "сер", "вер", "жов", "лис", "гру"];
const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

function toIsoDate(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getCalendarDays(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const mondayOffset = (firstDay.getDay() + 6) % 7;

  return [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
}

function formatDateLabel(date: string) {
  if (!date) return "Оберіть вільний день у календарі";
  const value = new Date(`${date}T00:00:00`);
  return value.toLocaleDateString("uk-UA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatSelectedDatesLabel(dates: string[]) {
  if (!dates.length) return "Оберіть вільний день у календарі";
  if (dates.length === 1) return formatDateLabel(dates[0]);

  const first = formatDateLabel(dates[0]);
  const last = formatDateLabel(dates[dates.length - 1]);
  return `${dates.length} ${formatDayCountLabel(dates.length)}: ${first} — ${last}`;
}

function formatDayCountLabel(count: number) {
  if (count === 1) return "день";
  if (count >= 2 && count <= 4) return "дні";
  return "днів";
}

function formatDateCountLabel(count: number) {
  if (count === 1) return "дата";
  if (count >= 2 && count <= 4) return "дати";
  return "дат";
}

export function OrderRequestForm({
  masterId,
  masterName,
  busyDates = [],
  pendingDates = [],
  masterServices,
  priceFrom,
}: OrderRequestFormProps) {
  const services = masterServices.length
    ? masterServices
    : [
        {
          id: `${masterId}-service`,
          masterId,
          serviceType: "other" as const,
          serviceTitle: "Ремонтні роботи",
          serviceDescription: "Опишіть задачу, і майстер уточнить деталі.",
          isTurnkey: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
  const defaultSelectedService = services.find((service) => service.serviceType === "tile") ?? services[0];
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([defaultSelectedService.id]);
  const [visibleMonth, setVisibleMonth] = useState({ year: 2026, monthIndex: 6 });
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [cityArea, setCityArea] = useState("");
  const [budget, setBudget] = useState("");
  const [files, setFiles] = useState<RequestFileMeta[]>([]);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<{ type: "idle" | "error" | "success"; text: string }>({
    type: "idle",
    text: "",
  });

  const busyDateSet = useMemo(() => new Set(busyDates), [busyDates]);
  const pendingDateSet = useMemo(() => new Set(pendingDates), [pendingDates]);
  const unavailableDateSet = useMemo(() => new Set([...busyDates, ...pendingDates]), [busyDates, pendingDates]);
  const calendarDays = useMemo(
    () => getCalendarDays(visibleMonth.year, visibleMonth.monthIndex),
    [visibleMonth],
  );
  const selectedServices = services.filter((service) => selectedServiceIds.includes(service.id));
  const selectedService = selectedServices[0] ?? services[0];
  const selectedServiceTitles = selectedServices.map((service) => service.serviceTitle);
  const selectedDate = selectedDates[0] ?? "";
  const selectedMonthDate = selectedDate ? new Date(`${selectedDate}T00:00:00`) : null;
  const isDraggingDatesRef = useRef(false);
  const dateDragModeRef = useRef<"select" | "remove" | "">("");

  function changeMonth(direction: -1 | 1) {
    setVisibleMonth((current) => {
      const next = new Date(current.year, current.monthIndex + direction, 1);
      return { year: next.getFullYear(), monthIndex: next.getMonth() };
    });
  }

  function toggleService(serviceId: string, checked: boolean) {
    setSelectedServiceIds((current) => {
      if (checked) {
        return current.includes(serviceId) ? current : [...current, serviceId];
      }

      return current.filter((id) => id !== serviceId);
    });
    setStatus({ type: "idle", text: "" });
  }

  function setDateChecked(iso: string, checked: boolean) {
    if (unavailableDateSet.has(iso)) return;
    setSelectedDates((current) => {
      if (checked) return current.includes(iso) ? current : [...current, iso].sort();
      return current.filter((date) => date !== iso);
    });
    setStatus({ type: "idle", text: "" });
  }

  function startDateSelection(iso: string) {
    if (unavailableDateSet.has(iso)) return;
    const shouldSelect = !selectedDates.includes(iso);
    isDraggingDatesRef.current = true;
    dateDragModeRef.current = shouldSelect ? "select" : "remove";
    setDateChecked(iso, shouldSelect);
  }

  function previewDateSelection(iso: string) {
    if (!isDraggingDatesRef.current || unavailableDateSet.has(iso) || !dateDragModeRef.current) return;
    setDateChecked(iso, dateDragModeRef.current === "select");
  }

  function finishDateSelection() {
    isDraggingDatesRef.current = false;
    dateDragModeRef.current = "";
  }

  function previewDateSelectionFromPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isDraggingDatesRef.current) return;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const dayCell = target?.closest<HTMLElement>("[data-calendar-date]");
    const iso = dayCell?.dataset.calendarDate;
    if (iso) previewDateSelection(iso);
  }

  function cancelDateSelection() {
    isDraggingDatesRef.current = false;
    dateDragModeRef.current = "";
  }

  function addFiles(fileList: FileList | null) {
    const nextFiles = Array.from(fileList ?? [])
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, Math.max(0, 5 - files.length))
      .map((file) => ({
        id: `file-${file.name}-${file.size}-${Date.now()}`,
        fileName: file.name,
        fileType: file.type,
        previewUrl: URL.createObjectURL(file),
      }));

    if (nextFiles.length) setFiles((current) => [...current, ...nextFiles].slice(0, 5));
  }

  function removeFile(id: string) {
    setFiles((current) => {
      const file = current.find((item) => item.id === id);
      if (file) URL.revokeObjectURL(file.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedDates.length || !selectedServices.length || !description.trim() || !clientName.trim() || !clientPhone.trim() || !cityArea.trim()) {
      setStatus({
        type: "error",
        text: "Заповніть послугу, дату, опис роботи, імʼя, телефон і район або адресу обʼєкта.",
      });
      return;
    }

    if (!consent) {
      setStatus({
        type: "error",
        text: "Потрібна згода на обробку даних, щоб надіслати заявку.",
      });
      return;
    }

    const request = {
      masterId,
      masterName,
      selectedServiceId: selectedServices.map((service) => service.id).join(","),
      selectedServiceTitle: selectedServiceTitles.join(", "),
      selectedServiceType: selectedService.serviceType,
      isTurnkey: selectedService.isTurnkey,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      workType: selectedServiceTitles.join(", "),
      workSubtype: "",
      description: description.trim(),
      desiredDate: selectedDates[0],
      cityArea: cityArea.trim(),
      budget: budget.trim(),
      mainVolume: "",
      additionalInfo: clientEmail.trim() ? `Email клієнта: ${clientEmail.trim()}` : "",
      message: description.trim(),
      periods: selectedDates.map((date) => ({ dateFrom: date, dateTo: date, period: date })),
      serviceDetails: {
        contactEmail: clientEmail.trim(),
        selectedServices: selectedServiceTitles.join(", "),
      },
      additionalWorks: [],
      files: files.map(({ id, fileName, fileType }) => ({ id, fileName, fileType })),
      heightWork: emptyHeightWork,
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

        setStatus({ type: "success", text: "Заявку надіслано. Майстер отримає деталі та звʼяжеться з вами." });
      })
      .catch((error: Error) => {
        setStatus({ type: "error", text: error.message });
      });
  }

  return (
    <>
      <form className="order-form" id="orderForm" onSubmit={submitOrder} noValidate>
        <section className="order-section">
          <div className="order-section-head">
            <span>02</span>
            <strong>Послуга</strong>
            <small>
              {selectedServiceIds.length
                ? `Обрано: ${selectedServiceIds.length}`
                : "Оберіть одну або кілька"}
            </small>
          </div>
          <div className="order-option-list">
            {services.map((service) => {
              const isSelected = selectedServiceIds.includes(service.id);

              return (
                <button
                  aria-checked={isSelected}
                  className={["order-option", isSelected ? "selected" : ""].filter(Boolean).join(" ")}
                  key={service.id}
                  onClick={() => toggleService(service.id, !isSelected)}
                  role="checkbox"
                  type="button"
                >
                  <span className="order-radio-dot" aria-hidden="true" />
                  <span className="order-option-copy">
                    <span className="order-option-name">{service.serviceTitle}</span>
                    {service.serviceDescription && <small>{service.serviceDescription}</small>}
                  </span>
                  <span className="order-option-price">
                    {service.priceLabel ?? `від ${priceFrom} грн`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="order-section">
          <div className="order-section-head">
            <span>03</span>
            <strong>Дата виконання</strong>
          </div>
          <details className="order-date-details">
            <summary className="order-date-card">
              <div className="order-date-icon">
                <span>{selectedMonthDate ? monthShortNames[selectedMonthDate.getMonth()] : monthShortNames[visibleMonth.monthIndex]}</span>
                <strong>{selectedMonthDate ? selectedMonthDate.getDate() : "?"}</strong>
              </div>
              <div>
                <small>Обрана дата</small>
                <strong>{formatSelectedDatesLabel(selectedDates)}</strong>
                <p>Клікніть день або затисніть і протягніть по календарю, щоб обрати кілька дат.</p>
              </div>
              <span className="order-change-link">
                {selectedDates.length ? "Змінити дати" : "Обрати дату"}
              </span>
            </summary>
            <div className="order-calendar-card">
              <div className="order-calendar-head">
                <button aria-label="Попередній місяць" onClick={() => changeMonth(-1)} type="button">
                  <ChevronLeft size={17} />
                </button>
                <strong>
                  {monthNames[visibleMonth.monthIndex]} {visibleMonth.year}
                </strong>
                {selectedDates.length > 0 && (
                  <span className="order-calendar-count">
                    {selectedDates.length} {formatDateCountLabel(selectedDates.length)}
                  </span>
                )}
                <button aria-label="Наступний місяць" onClick={() => changeMonth(1)} type="button">
                  <ChevronRight size={17} />
                </button>
              </div>
              <div className="order-weekdays">
                {weekdays.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div
                className="order-calendar-grid"
                onPointerCancel={cancelDateSelection}
                onPointerLeave={cancelDateSelection}
                onPointerMove={previewDateSelectionFromPointer}
                onPointerUp={finishDateSelection}
              >
                {calendarDays.map((day, index) => {
                  if (!day) return <span className="order-calendar-empty" key={`empty-${index}`} />;
                  const iso = toIsoDate(visibleMonth.year, visibleMonth.monthIndex, day);
                  const isBusy = busyDateSet.has(iso);
                  const isPending = pendingDateSet.has(iso);
                  const isSelected = selectedDates.includes(iso);
                  const statusClass = isBusy ? "busy" : isPending ? "pending" : "free";
                  return (
                    <button
                      aria-pressed={isSelected}
                      className={[
                        "order-calendar-day",
                        statusClass,
                        isSelected ? "selected" : "",
                      ].filter(Boolean).join(" ")}
                      data-calendar-date={iso}
                      disabled={isBusy || isPending}
                      key={iso}
                      onPointerDown={(event) => {
                        if (event.pointerType === "mouse" && event.button !== 0) return;
                        event.preventDefault();
                        startDateSelection(iso);
                      }}
                      onPointerEnter={() => {
                        if (isDraggingDatesRef.current) previewDateSelection(iso);
                      }}
                      onPointerUp={finishDateSelection}
                      type="button"
                    >
                      <span>{day}</span>
                      <small>{isBusy ? "зайнято" : isPending ? "очікує" : isSelected ? "обрано" : "вільно"}</small>
                    </button>
                  );
              })}
            </div>
              <div className="order-calendar-legend" aria-label="Позначення календаря">
                <span><i className="free" /> Вільно</span>
                <span><i className="pending" /> Очікує</span>
                <span><i className="busy" /> Зайнято</span>
                <span><i className="selected" /> Обрано</span>
              </div>
            </div>
          </details>
        </section>

        <section className="order-section">
          <div className="order-section-head">
            <span>04</span>
            <strong>Опис роботи</strong>
          </div>
          <div className="order-card">
            <label className="order-field">
              Що потрібно зробити
              <textarea
                maxLength={600}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setStatus({ type: "idle", text: "" });
                }}
                placeholder="Наприклад: укласти плитку у ванній кімнаті 4 м², є проєкт розкладки, потрібна порада щодо гідроізоляції."
                rows={5}
                value={description}
              />
            </label>
            <div className="order-char-count">{description.length}/600</div>
          </div>
        </section>

        <section className="order-section">
          <div className="order-section-head">
            <span>05</span>
            <strong>Фотографії обʼєкта</strong>
            <small>необовʼязково</small>
          </div>
          <div className="order-card">
            <label className="order-dropzone">
              <UploadCloud size={22} />
              <strong>Завантажте фото приміщення</strong>
              <span>Перетягніть файли сюди або натисніть, щоб обрати — до 5 фото, JPG/PNG</span>
              <input accept="image/*" multiple onChange={(event) => addFiles(event.target.files)} type="file" />
            </label>
            {files.length > 0 && (
              <div className="order-thumbs">
                {files.map((file) => (
                  <div className="order-thumb" key={file.id}>
                    <img src={file.previewUrl} alt={file.fileName} />
                    <button aria-label="Видалити фото" onClick={() => removeFile(file.id)} type="button">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="order-section">
          <div className="order-section-head">
            <span>06</span>
            <strong>Контактні дані</strong>
          </div>
          <div className="order-card order-contact-grid">
            <label className="order-field">
              Імʼя та прізвище
              <input onChange={(event) => setClientName(event.target.value)} placeholder="Олена Коваленко" value={clientName} />
            </label>
            <label className="order-field">
              Телефон
              <input onChange={(event) => setClientPhone(event.target.value)} placeholder="+380 __ ___ __ __" value={clientPhone} />
            </label>
            <label className="order-field">
              Email <span>(необовʼязково)</span>
              <input onChange={(event) => setClientEmail(event.target.value)} placeholder="olena@example.com" type="email" value={clientEmail} />
            </label>
            <label className="order-field">
              Район / адреса обʼєкта
              <input onChange={(event) => setCityArea(event.target.value)} placeholder="Печерський район, вул. ..." value={cityArea} />
            </label>
            <label className="order-field order-field-wide">
              Орієнтовний бюджет <span>(необовʼязково)</span>
              <input onChange={(event) => setBudget(event.target.value)} placeholder="Наприклад, до 30 000 грн" value={budget} />
            </label>
          </div>
        </section>

        <section className="order-section">
          <div className="order-section-head">
            <span>07</span>
            <strong>Згода на обробку даних</strong>
          </div>
          <label className="order-consent">
            <input checked={consent} onChange={(event) => setConsent(event.target.checked)} type="checkbox" />
            <span>
              <Check size={13} />
            </span>
            <em>
              Я даю згоду на обробку персональних даних відповідно до{" "}
              <a href="/privacy" onClick={(event) => event.stopPropagation()}>
                Політики конфіденційності
              </a>{" "}
              БудПомiч та погоджуюсь, що мої контакти будуть передані обраному майстру для звʼязку щодо цієї заявки.
            </em>
          </label>
          {status.type === "error" && (
            <p className={`order-status ${status.type}`} role="alert">
              {status.text}
            </p>
          )}
        </section>
      </form>

      <div className="order-submit-bar">
        <div className="order-submit-inner">
          <div>
            <span>Заявка</span>
            <strong>
              {masterName} · {selectedServiceTitles.join(", ")} · {selectedDates.length ? `${selectedDates.length} ${formatDateCountLabel(selectedDates.length)}` : "дата не обрана"}
            </strong>
          </div>
          <button form="orderForm" type="submit">
            <Send size={16} />
            Надіслати заявку
          </button>
        </div>
      </div>

      {status.type === "success" && (
        <div className="order-success-overlay show" role="dialog" aria-modal="true">
          <div className="order-success-card">
            <div className="order-success-icon">
              <Check size={28} />
            </div>
            <h3>Заявку надіслано</h3>
            <p>{masterName} отримав заявку та звʼяжеться з вами, щоб уточнити деталі й час роботи.</p>
            <button onClick={() => setStatus({ type: "idle", text: "" })} type="button">
              Зрозуміло
            </button>
          </div>
        </div>
      )}
    </>
  );
}

