import type { MasterProfile } from "@/lib/masters";

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
  priceLabel?: string;
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

function normalizeServiceName(value: string) {
  return value.trim().toLocaleLowerCase("uk-UA");
}

function inferServiceType(name: string): MasterServiceType {
  const normalized = normalizeServiceName(name);

  if (normalized.includes("плит")) return "tile";
  if (normalized.includes("гіпс") || normalized.includes("гипс")) return "drywall";
  if (normalized.includes("фарб") || normalized.includes("маляр") || normalized.includes("шпак")) return "painting";
  if (normalized.includes("сантех")) return "plumbing";
  if (normalized.includes("елект") || normalized.includes("элект")) return "electric";
  if (normalized.includes("ванн")) return "bathroom_turnkey";
  if (normalized.includes("кухн")) return "kitchen_turnkey";
  if (normalized.includes("ремонт") || normalized.includes("під ключ") || normalized.includes("под ключ")) return "renovation_turnkey";

  return "other";
}

export function getMasterRequestServices(master: MasterProfile) {
  const detailedServices = getMasterServices(master.id);
  const detailedByName = new Map(
    detailedServices.map((service) => [normalizeServiceName(service.serviceTitle), service]),
  );
  const usedDetailedIds = new Set<string>();

  const profileServices = master.services.map((service, index): MasterService => {
    const detailedService = detailedByName.get(normalizeServiceName(service.name));
    if (detailedService) usedDetailedIds.add(detailedService.id);

    return {
      id: detailedService?.id ?? `${master.id}-profile-service-${index}`,
      masterId: master.id,
      serviceType: detailedService?.serviceType ?? inferServiceType(service.name),
      serviceTitle: service.name,
      serviceDescription:
        detailedService?.serviceDescription || "Уточніть деталі задачі, обсяг робіт і бажаний результат.",
      priceLabel: service.price,
      isTurnkey: detailedService?.isTurnkey ?? inferServiceType(service.name).includes("turnkey"),
      createdAt: detailedService?.createdAt ?? new Date().toISOString(),
      updatedAt: detailedService?.updatedAt ?? new Date().toISOString(),
    };
  });

  const extraDetailedServices = detailedServices
    .filter((service) => !usedDetailedIds.has(service.id))
    .map((service) => ({
      ...service,
      priceLabel: service.priceLabel,
    }));

  return [...profileServices, ...extraDetailedServices];
}
