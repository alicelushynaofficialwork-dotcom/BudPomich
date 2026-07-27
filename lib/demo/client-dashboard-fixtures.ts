import type { DemoClientDashboard, DemoClientProfile } from "@/lib/demo/types";

export const demoClientProfileFixture: DemoClientProfile = {
  id: "demo-client-alisa",
  name: "Аліса",
  greetingName: "Алісо",
  city: "Київ",
  role: "client",
};

export const demoClientDashboardFixture: DemoClientDashboard = {
  dateIso: "2026-07-27",
  todaySchedule: [
    {
      id: "today-call-master",
      time: "10:00",
      title: "Дзвінок із майстром",
      project: "Ремонт ванної кімнати",
      masterName: "Андрій Пономаренко",
      action: "chat",
      actionLabel: "Відкрити чат",
    },
    {
      id: "today-master-visit",
      time: "14:00",
      title: "Приїзд майстра",
      project: "Монтаж сантехніки",
      masterName: "Андрій Пономаренко",
      action: "calendar",
      actionLabel: "Деталі",
    },
    {
      id: "today-confirm-date",
      time: "17:30",
      title: "Перевірити узгоджену дату",
      project: "Ремонт ванної кімнати",
      masterName: "Андрій Пономаренко",
      action: "requests",
      actionLabel: "Переглянути",
    },
  ],
  attentionItems: [
    {
      id: "attention-estimate",
      title: "Погодити оновлений кошторис",
      project: "Ремонт ванної кімнати",
      status: "Нове",
      action: "documents",
    },
    {
      id: "attention-message",
      title: "Відповісти майстру",
      project: "Монтаж сантехніки",
      status: "Сьогодні",
      action: "messages",
    },
    {
      id: "attention-stage",
      title: "Підтвердити завершення етапу",
      project: "Укладання плитки",
      status: "До 30 липня",
      action: "requests",
    },
  ],
  activeProject: {
    id: "demo-project-bathroom",
    title: "Ремонт ванної кімнати",
    status: "В роботі",
    address: "Київ · Позняки",
    progress: 55,
    nextStage: "Монтаж сантехніки",
    masterName: "Андрій Пономаренко",
    nextVisit: "29 липня · 09:00",
    documentsCount: 2,
    unreadMessages: 3,
  },
  upcomingDates: [
    {
      id: "upcoming-plumber",
      date: "29 липня",
      time: "09:00",
      title: "Приїзд сантехніка",
      detail: "Ремонт ванної кімнати",
      status: "Підтверджено",
    },
    {
      id: "upcoming-tile",
      date: "31 липня",
      title: "Завершення укладання плитки",
      detail: "Андрій Пономаренко",
      status: "Заплановано",
    },
    {
      id: "upcoming-payment",
      date: "2 серпня",
      title: "Оплата наступного етапу",
      detail: "Ремонт ванної кімнати",
      status: "Очікується",
    },
  ],
  documentsAndPayments: [
    {
      id: "document-estimate",
      title: "Оновлений кошторис",
      meta: "PDF · 26 липня",
      status: "Потребує погодження",
    },
    {
      id: "document-act",
      title: "Акт виконаного етапу",
      meta: "PDF · 25 липня",
      status: "Готовий",
    },
    {
      id: "payment-stage",
      title: "Оплата наступного етапу",
      meta: "До 2 серпня",
      status: "Очікується",
    },
  ],
  recentPhotos: [
    { id: "photo-before", label: "До", caption: "Підготовка приміщення", tone: "before" },
    { id: "photo-progress", label: "Процес", caption: "Монтаж комунікацій", tone: "progress" },
    { id: "photo-after", label: "Після", caption: "Зона укладання плитки", tone: "after" },
    { id: "photo-defect", label: "Дефекти", caption: "Позначки для перевірки", tone: "defect" },
  ],
};
