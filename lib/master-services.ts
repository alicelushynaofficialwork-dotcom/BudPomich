export type MasterServiceType =
  | "tile"
  | "drywall"
  | "painting"
  | "plumbing"
  | "electric"
  | "bathroom_turnkey"
  | "kitchen_turnkey"
  | "renovation_turnkey"
  | "other";

export type MasterService = {
  id: string;
  masterId: string;
  serviceType: MasterServiceType;
  serviceTitle: string;
  serviceDescription: string;
  isTurnkey: boolean;
  createdAt: string;
  updatedAt: string;
};

export const commonWorkTypes = [
  "Укладка плитки",
  "Шпаклевка",
  "Покраска стен",
  "Сантехника",
  "Электрика",
  "Гипсокартон",
  "Ремонт ванной",
  "Ремонт кухни",
  "Ремонт под ключ",
  "Другое",
];

export const masterServices: MasterService[] = [
  {
    id: "andrii-electric",
    masterId: "andrii-koval",
    serviceType: "electric",
    serviceTitle: "Электрика",
    serviceDescription: "Розетки, проводка, свет, щиток и диагностика неисправностей.",
    isTurnkey: false,
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "andrii-renovation-turnkey",
    masterId: "andrii-koval",
    serviceType: "renovation_turnkey",
    serviceTitle: "Ремонт под ключ",
    serviceDescription: "Комплекс работ: демонтаж, инженерия, подготовка и чистовая отделка.",
    isTurnkey: true,
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "serhii-tile",
    masterId: "serhii-ivanenko",
    serviceType: "tile",
    serviceTitle: "Укладка плитки",
    serviceDescription: "Плитка, керамогранит, фартуки, санузлы и гидроизоляция.",
    isTurnkey: false,
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "serhii-bathroom-turnkey",
    masterId: "serhii-ivanenko",
    serviceType: "bathroom_turnkey",
    serviceTitle: "Ремонт ванной под ключ",
    serviceDescription: "Демонтаж, подготовка основания, гидроизоляция, плитка и финальная отделка.",
    isTurnkey: true,
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "roman-painting",
    masterId: "roman-levchenko",
    serviceType: "painting",
    serviceTitle: "Покраска стен",
    serviceDescription: "Подготовка стен, грунтовка, шпаклевка и чистовая покраска.",
    isTurnkey: false,
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "maksym-plumbing",
    masterId: "maksym-bondar",
    serviceType: "plumbing",
    serviceTitle: "Сантехника",
    serviceDescription: "Монтаж, ремонт и замена сантехнических точек.",
    isTurnkey: false,
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "andrey-ponomarenko-drywall",
    masterId: "andrey-ponomarenko",
    serviceType: "drywall",
    serviceTitle: "Гіпсокартон",
    serviceDescription: "Перегородки, стелі, короби та підготовка під шпаклювання.",
    isTurnkey: false,
    createdAt: "2026-06-23T09:00:00.000Z",
    updatedAt: "2026-06-23T09:00:00.000Z",
  },
  {
    id: "andrey-ponomarenko-tile",
    masterId: "andrey-ponomarenko",
    serviceType: "tile",
    serviceTitle: "Укладка плитки",
    serviceDescription: "Плитка у ванній, кухні, коридорі, підлога та стіни.",
    isTurnkey: false,
    createdAt: "2026-06-23T09:00:00.000Z",
    updatedAt: "2026-06-23T09:00:00.000Z",
  },
];

export function getMasterServices(masterId: string) {
  const services = masterServices.filter((service) => service.masterId === masterId);

  if (services.length) return services;

  return [
    {
      id: `${masterId}-other`,
      masterId,
      serviceType: "other" as const,
      serviceTitle: "Другое",
      serviceDescription: "Опишите задачу своими словами.",
      isTurnkey: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}
