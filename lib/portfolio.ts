export type PortfolioWorkLine = {
  id: string;
  workType: string;
  unit: string;
  unitPrice: number;
  volume: number;
  total: number;
};

export type PortfolioItem = {
  id: string;
  masterId: string;
  title: string;
  description: string;
  city: string;
  objectType: string;
  photoUrl: string;
  photoUrls?: string[];
  totalAmount: number;
  createdAt: string;
  workLines: PortfolioWorkLine[];
};

export const portfolioStorageKey = "budpomich.portfolio-items";

export const defaultPortfolioItems: PortfolioItem[] = [
  {
    id: "ponomarenko-drywall-partition",
    masterId: "andrey-ponomarenko",
    title: "Перегородка з гіпсокартону",
    description:
      "Змонтовано каркас, шумоізоляцію та обшивку гіпсокартоном у комерційному приміщенні.",
    city: "Київ",
    objectType: "Комерційне приміщення",
    photoUrl: "/images/portfolio-triptych.png",
    totalAmount: 18500,
    createdAt: "2026-06-15T10:00:00.000Z",
    workLines: [
      {
        id: "drywall-line-1",
        workType: "Монтаж перегородки",
        unit: "м²",
        unitPrice: 500,
        volume: 25,
        total: 12500,
      },
      {
        id: "drywall-line-2",
        workType: "Шумоізоляція",
        unit: "м²",
        unitPrice: 240,
        volume: 25,
        total: 6000,
      },
    ],
  },
  {
    id: "ponomarenko-tile-bathroom",
    masterId: "andrey-ponomarenko",
    title: "Плитка у ванній",
    description:
      "Підготовка основи, гідроізоляція та укладання плитки з акуратним підрізанням.",
    city: "Київ",
    objectType: "Квартира",
    photoUrl: "/images/portfolio-triptych.png",
    totalAmount: 22000,
    createdAt: "2026-06-18T10:00:00.000Z",
    workLines: [
      {
        id: "tile-line-1",
        workType: "Укладання плитки",
        unit: "м²",
        unitPrice: 500,
        volume: 32,
        total: 16000,
      },
      {
        id: "tile-line-2",
        workType: "Підготовка поверхні",
        unit: "м²",
        unitPrice: 187.5,
        volume: 32,
        total: 6000,
      },
    ],
  },
  {
    id: "electric-panel",
    masterId: "andrii-koval",
    title: "Електрощит у новобудові",
    description:
      "Зібрано та підписано електрощит, встановлено автомати захисту й реле напруги.",
    city: "Київ",
    objectType: "Квартира",
    photoUrl: "/images/portfolio-triptych.png",
    totalAmount: 26200,
    createdAt: "2026-06-10T10:00:00.000Z",
    workLines: [
      {
        id: "panel-line-1",
        workType: "Монтаж електрощита",
        unit: "шт",
        unitPrice: 4500,
        volume: 1,
        total: 4500,
      },
      {
        id: "panel-line-2",
        workType: "Монтаж електроточки",
        unit: "шт",
        unitPrice: 350,
        volume: 62,
        total: 21700,
      },
    ],
  },
];

export function calculateLineTotal(unitPrice: number, volume: number) {
  return Math.round(unitPrice * volume * 100) / 100;
}

export function calculatePortfolioTotal(lines: PortfolioWorkLine[]) {
  return Math.round(
    lines.reduce((sum, line) => sum + calculateLineTotal(line.unitPrice, line.volume), 0) *
      100,
  ) / 100;
}

export function formatUah(value: number, fractionDigits = 0) {
  const [integer, fraction] = value.toFixed(fractionDigits).split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  return `${grouped}${fraction ? `,${fraction}` : ""} грн`;
}
