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
  totalAmount: number;
  createdAt: string;
  workLines: PortfolioWorkLine[];
};

export const portfolioStorageKey = "budpomich.portfolio-items";

export const defaultPortfolioItems: PortfolioItem[] = [
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
