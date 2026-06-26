"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarCheck, Inbox, MessageCircle, Send } from "lucide-react";
import {
  emptyHeightWork,
  mockRequestMessages,
  mockRequests,
  requestMessagesStorageKey,
  requestsStorageKey,
  requestStatusLabels,
  requestStatusOptions,
  type MasterRequest,
  type RequestMessage,
  type RequestStatus,
} from "@/lib/requests";

const currentMasterId = "andrey-ponomarenko";

function mergeById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function formatHeightPresence(value: string) {
  if (value === "yes") return "Так";
  if (value === "unknown") return "Не знаю";
  return "Ні";
}

function formatCoefficientType(value: string) {
  if (value === "selected") return "Вибраний клієнтом";
  if (value === "custom") return "Індивідуальний розрахунок";
  return "Не знає / потрібно уточнити";
}

export function DashboardRequests() {
  const [requests, setRequests] = useState<MasterRequest[]>(mockRequests);
  const [messages, setMessages] = useState<RequestMessage[]>(mockRequestMessages);
  const [activeRequestId, setActiveRequestId] = useState("");
  const [replyText, setReplyText] = useState("");
  const [statusText, setStatusText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [hasPhotoFilter, setHasPhotoFilter] = useState(false);
  const [hasAdditionalWorkFilter, setHasAdditionalWorkFilter] = useState(false);
  const [incompleteFilter, setIncompleteFilter] = useState(false);

  useEffect(() => {
    const localRequests = JSON.parse(localStorage.getItem(requestsStorageKey) ?? "[]") as MasterRequest[];
    const localMessages = JSON.parse(localStorage.getItem(requestMessagesStorageKey) ?? "[]") as RequestMessage[];

    fetch(`/api/requests?masterId=${currentMasterId}`)
      .then((response) => response.json())
      .then((result: { requests?: MasterRequest[] }) => {
        setRequests(
          mergeById([...(result.requests ?? mockRequests), ...localRequests]).filter(
            (request) => request.masterId === currentMasterId,
          ),
        );
      })
      .catch(() => {
        setRequests(mergeById([...mockRequests, ...localRequests]));
      });

    fetch("/api/messages")
      .then((response) => response.json())
      .then((result: { messages?: RequestMessage[] }) => {
        setMessages(mergeById([...(result.messages ?? mockRequestMessages), ...localMessages]));
      })
      .catch(() => setMessages(mergeById([...mockRequestMessages, ...localMessages])));
  }, []);

  const sortedRequests = useMemo(
    () =>
      [...requests].sort(
        (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
      ),
    [requests],
  );
  const serviceOptions = useMemo(
    () => Array.from(new Set(requests.map((request) => request.selectedServiceTitle || request.workType).filter(Boolean))),
    [requests],
  );
  const filteredRequests = useMemo(
    () =>
      sortedRequests.filter((request) => {
        const isIncomplete =
          !request.clientName ||
          !request.clientPhone ||
          !request.description ||
          !request.cityArea ||
          !request.periods.length;

        if (statusFilter && request.status !== statusFilter) return false;
        if (serviceFilter && (request.selectedServiceTitle || request.workType) !== serviceFilter) return false;
        if (dateFilter && !request.desiredDate.includes(dateFilter)) return false;
        if (cityFilter && !request.cityArea.toLowerCase().includes(cityFilter.toLowerCase())) return false;
        if (hasPhotoFilter && request.files.length === 0) return false;
        if (hasAdditionalWorkFilter && request.additionalWorks.length === 0) return false;
        if (incompleteFilter && !isIncomplete) return false;

        return true;
      }),
    [
      cityFilter,
      dateFilter,
      hasAdditionalWorkFilter,
      hasPhotoFilter,
      incompleteFilter,
      serviceFilter,
      sortedRequests,
      statusFilter,
    ],
  );
  const activeRequest = filteredRequests.find((request) => request.id === activeRequestId) ?? filteredRequests[0];
  const activeHeightWork = activeRequest?.heightWork ?? emptyHeightWork;
  const requestMessages = messages.filter((message) => message.requestId === activeRequest?.id);
  const newRequests = requests.filter((request) => request.status === "new").length;
  const unreadMessages = messages.filter((message) => !message.isRead && message.senderRole === "client").length;
  const requestsWithFiles = requests.filter((request) => request.files.length > 0).length;
  const inProgressRequests = requests.filter((request) => request.status === "in_progress").length;
  const multiServiceRequests = requests.filter((request) =>
    (request.serviceDetails.selectedServices ?? "").split(",").filter((item) => item.trim()).length > 1,
  ).length;
  const incompleteRequests = requests.filter(
    (request) =>
      !request.clientName ||
      !request.clientPhone ||
      !request.description ||
      !request.cityArea ||
      !request.periods.length,
  ).length;

  function updateStatus(status: RequestStatus) {
    if (!activeRequest) return;

    setRequests((current) =>
      current.map((request) => (request.id === activeRequest.id ? { ...request, status, isRead: true } : request)),
    );
    setStatusText("Статус оновлено.");

    fetch("/api/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeRequest.id, status }),
    }).catch(() => undefined);
  }

  function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeRequest || !replyText.trim()) return;

    fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: activeRequest.id, senderRole: "master", body: replyText.trim() }),
    })
      .then((response) => response.json())
      .then((result: { message?: RequestMessage }) => {
        const message =
          result.message ??
          ({
            id: `message-${Date.now()}`,
            requestId: activeRequest.id,
            senderRole: "master",
            body: replyText.trim(),
            isRead: false,
            createdAt: new Date().toISOString(),
          } satisfies RequestMessage);
        const nextMessages = [...messages, message];
        setMessages(nextMessages);
        localStorage.setItem(requestMessagesStorageKey, JSON.stringify(nextMessages));
        setReplyText("");
        setStatusText("Відповідь клієнту надіслано.");
      });
  }

  return (
    <>
      <div className="dashboard-access-grid">
        <a href="#requests">
          <Inbox size={19} />
          <span>Нові заявки</span>
          <strong>{newRequests}</strong>
        </a>
        <a href="#request-messages">
          <MessageCircle size={19} />
          <span>Нові повідомлення</span>
          <strong>{unreadMessages}</strong>
        </a>
        <a href="#requests">
          <Inbox size={19} />
          <span>Заявки з фото</span>
          <strong>{requestsWithFiles}</strong>
        </a>
        <a href="#requests">
          <CalendarCheck size={19} />
          <span>Заявки з кількома послугами</span>
          <strong>{multiServiceRequests}</strong>
        </a>
        <a href="#requests">
          <Inbox size={19} />
          <span>Неповні заявки</span>
          <strong>{incompleteRequests}</strong>
        </a>
        <a href="#requests">
          <ArrowRight size={19} />
          <span>Заявки в роботі</span>
          <strong>{inProgressRequests}</strong>
        </a>
      </div>

      <div className="dashboard-request-filters" aria-label="Фільтри заявок">
        <label>
          Статус
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Усі статуси</option>
            {requestStatusOptions.map((status) => (
              <option key={status} value={status}>
                {requestStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Послуга
          <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}>
            <option value="">Усі послуги</option>
            {serviceOptions.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </label>
        <label>
          Дата
          <input value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} placeholder="2026-06" />
        </label>
        <label>
          Місто / район
          <input value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} placeholder="Київ" />
        </label>
        <label className="request-filter-check">
          <input checked={hasPhotoFilter} onChange={(event) => setHasPhotoFilter(event.target.checked)} type="checkbox" />
          Є фото
        </label>
        <label className="request-filter-check">
          <input
            checked={hasAdditionalWorkFilter}
            onChange={(event) => setHasAdditionalWorkFilter(event.target.checked)}
            type="checkbox"
          />
          Є додаткові роботи
        </label>
        <label className="request-filter-check">
          <input checked={incompleteFilter} onChange={(event) => setIncompleteFilter(event.target.checked)} type="checkbox" />
          Неповна заявка
        </label>
      </div>

      <article className="dashboard-panel master-requests-panel" id="requests">
        <div className="panel-title-row">
          <div>
            <p className="overline">Заявки</p>
            <h2>Звернення клієнтів</h2>
          </div>
          <span className="counter-badge">{newRequests} нових</span>
        </div>

        <div className="master-requests-layout">
          <div className="master-request-list">
            {filteredRequests.map((request) => (
              <button
                className={request.id === activeRequest?.id ? "active" : ""}
                key={request.id}
                onClick={() => {
                  setActiveRequestId(request.id);
                  setStatusText("");
                }}
                type="button"
              >
                <span>
                  <strong>{request.clientName}</strong>
                  <small>{request.selectedServiceTitle || request.workType} · {request.cityArea}</small>
                </span>
                <em>{requestStatusLabels[request.status]}</em>
                <ArrowRight size={16} />
              </button>
            ))}
            {!filteredRequests.length && (
              <div className="request-empty-state">За вибраними фільтрами заявок немає.</div>
            )}
          </div>

          {activeRequest && (
            <div className="master-request-detail" id="request-messages">
              <div className="request-detail-head">
                <div>
                  <p>{activeRequest.desiredDate}</p>
                  <h3>{activeRequest.clientName}</h3>
                  <span>{activeRequest.clientPhone} · {activeRequest.cityArea}</span>
                </div>
                <select
                  value={activeRequest.status}
                  onChange={(event) => updateStatus(event.target.value as RequestStatus)}
                >
                  {requestStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {requestStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>

              <dl className="request-detail-grid">
                <div>
                  <dt>Послуга</dt>
                  <dd>
                    {activeRequest.selectedServiceTitle || activeRequest.workType}
                    {activeRequest.isTurnkey ? " · под ключ" : " · обычная заявка"}
                  </dd>
                </div>
                <div>
                  <dt>Тип роботи</dt>
                  <dd>{activeRequest.workType}</dd>
                </div>
                <div>
                  <dt>Обʼєм і бюджет</dt>
                  <dd>
                    {activeRequest.mainVolume || "Обʼєм не вказаний"}
                    {activeRequest.budget ? ` · ${activeRequest.budget}` : ""}
                  </dd>
                </div>
                <div>
                  <dt>Опис</dt>
                  <dd>{activeRequest.description}</dd>
                </div>
                <div>
                  <dt>Деталі послуги</dt>
                  <dd>
                    {Object.keys(activeRequest.serviceDetails).length
                      ? Object.entries(activeRequest.serviceDetails)
                          .filter(([, value]) => value)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join("; ")
                      : "Деталі послуги не вказані"}
                  </dd>
                </div>
                <div>
                  <dt>Додаткові роботи</dt>
                  <dd>
                    {activeRequest.additionalWorks.length
                      ? activeRequest.additionalWorks
                          .map((work) =>
                            [work.title, work.volume, work.unit, work.pricePerUnit, work.totalPrice]
                              .filter(Boolean)
                              .join(" · "),
                          )
                          .join("; ")
                      : "Додаткові роботи не вказані"}
                  </dd>
                </div>
                <div>
                  <dt>Файли</dt>
                  <dd>
                    {activeRequest.files.length
                      ? activeRequest.files.map((file) => file.fileName).join(", ")
                      : "Файли не прикріплені"}
                  </dd>
                </div>
                <div>
                  <dt>Додаткова інформація</dt>
                  <dd>{activeRequest.additionalInfo || "Не вказано"}</dd>
                </div>
                <div>
                  <dt>Повідомлення</dt>
                  <dd>{activeRequest.message}</dd>
                </div>
              </dl>

              <div className="request-thread">
                {requestMessages.map((message) => (
                  <article className={message.senderRole === "master" ? "sent" : ""} key={message.id}>
                    <span>{message.senderRole === "master" ? "Майстер" : "Клієнт"}</span>
                    <p>{message.body}</p>
                  </article>
                ))}
              </div>

              <form className="request-reply-form" onSubmit={sendReply}>
                <textarea
                  placeholder="Напишіть відповідь клієнту"
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                />
                <button type="submit">
                  <Send size={16} /> Відповісти
                </button>
              </form>
              {statusText && <p className="booking-success">{statusText}</p>}
            </div>
          )}
        </div>
      </article>
    </>
  );
}
