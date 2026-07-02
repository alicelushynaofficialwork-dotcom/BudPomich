export type PortfolioWorkLine = {
  id: string;
  workType: string;
  unit: string;
  unitPrice: number;
  volume: number;
  total: number;
};

export type ProjectDocument = {
  id: string;
  title: string;
  type:
    | "estimate"
    | "contract"
    | "act"
    | "warranty"
    | "invoice"
    | "material_receipt"
    | "technical_plan"
    | "permit"
    | "photo_report"
    | "other";
  description?: string;
  sourceType: "file" | "image" | "link";
  fileUrl?: string;
  externalUrl?: string;
  fileName?: string;
  fileType?: "image" | "pdf" | "doc" | "xls" | "link" | "other";
  uploadedAt?: string;
  isPublic?: boolean;
  visibleAfterCompletion?: boolean;
};

export type ProjectPhoto = {
  id: string;
  url: string;
  fileName?: string;
  fileType?: string;
  size?: number;
  kind: "before" | "progress" | "after" | "main";
  uploadedAt?: string;
  caption?: string;
};

export type CompanyDocument = {
  id: string;
  title: string;
  type:
    | "registration"
    | "license"
    | "permit"
    | "insurance"
    | "warranty_terms"
    | "contract_template"
    | "price_list"
    | "presentation"
    | "other";
  description?: string;
  fileUrl: string;
  fileType?: "image" | "pdf" | "doc" | "xls" | "other";
  uploadedAt?: string;
  isPublic?: boolean;
};

export type MasterQualification = {
  id: string;
  type: "course" | "certificate" | "license" | "award" | "training" | "permit";
  title: string;
  issuer?: string;
  issuedAt?: string;
  expiresAt?: string;
  description?: string;
  imageUrl?: string;
  fileUrl?: string;
  fileType?: "image" | "pdf";
  category?: string;
};

export type FollowFeedItem = {
  id: string;
  followerId: string;
  masterId: string;
  masterName: string;
  masterAvatarUrl?: string;
  type:
    | "new_work"
    | "updated_work"
    | "new_photo"
    | "new_service"
    | "price_update"
    | "new_qualification"
    | "calendar_update"
    | "new_document"
    | "updated_document"
    | "new_project_comment";
  title: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  targetUrl?: string;
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
  slug?: string;
  startedAt?: string;
  completedAt?: string;
  year?: number;
  month?: number;
  district?: string;
  publicLocation?: string;
  privateAddress?: string;
  showExactAddress?: boolean;
  workCategory?: string;
  objectArea?: number;
  durationDays?: number;
  materialsStores?: string[];
  projectStatus?: "completed" | "in_progress" | "planned";
  beforePhotoUrls?: string[];
  afterPhotoUrls?: string[];
  progressPhotoUrls?: string[];
  beforePhotos?: ProjectPhoto[];
  progressPhotos?: ProjectPhoto[];
  afterPhotos?: ProjectPhoto[];
  mainPhoto?: ProjectPhoto;
  masterComment?: string;
  projectNotes?: string;
  clientVisibleComment?: string;
  documents?: ProjectDocument[];
};

export const portfolioWorkCategories = [
  "Усі роботи",
  "Ремонт квартир",
  "Ремонт ванної",
  "Плитка",
  "Стіни",
  "Штукатурка",
  "Шпаклівка",
  "Малярні роботи",
  "Гіпсокартон",
  "Підлога",
  "Демонтаж",
  "Кухня",
  "Фасад",
  "Покрівля",
  "Бетонні роботи",
  "Кладка",
  "Інше",
];

export const portfolioUnits = ["м²", "м.п.", "шт", "кімната", "точка", "день", "година", "комплект", "робота"];

export const portfolioStorageKey = "budpomich.portfolio-items";
export const companyDocumentsStorageKey = "budpomich.company-documents";
export const masterQualificationsStorageKey = "budpomich.master-qualifications";
export const followFeedStorageKey = "budpomich.follow-feed";

export const defaultCompanyDocuments: CompanyDocument[] = [
  {
    id: "ponomarenko-warranty-terms",
    title: "Гарантійні умови на виконані роботи",
    type: "warranty_terms",
    description: "Короткі умови гарантії та порядок погодження додаткових робіт.",
    fileUrl: "#",
    fileType: "pdf",
    uploadedAt: "2026-06-20T10:00:00.000Z",
    isPublic: true,
  },
  {
    id: "ponomarenko-price-list",
    title: "Орієнтовний прайс-лист",
    type: "price_list",
    description: "Базові ціни для гіпсокартону, плитки та підготовчих робіт.",
    fileUrl: "#",
    fileType: "pdf",
    uploadedAt: "2026-06-21T10:00:00.000Z",
    isPublic: true,
  },
];

export const defaultMasterQualifications: MasterQualification[] = [
  {
    id: "ponomarenko-drywall-training",
    type: "training",
    title: "Практичний курс з монтажу гіпсокартонних систем",
    issuer: "Навчальний центр будівельних технологій",
    issuedAt: "2025-11-12",
    description: "Каркасні конструкції, перегородки, стелі та вузли примикання.",
    category: "Гіпсокартон",
  },
  {
    id: "ponomarenko-tile-certificate",
    type: "certificate",
    title: "Сертифікат з підготовки основи під плитку",
    issuer: "Будівельна школа майстрів",
    issuedAt: "2026-02-08",
    description: "Гідроізоляція, рівність основи, підбір клею та затирки.",
    category: "Плитка",
  },
];

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

export function slugifyPortfolioTitle(title: string, fallback: string) {
  const slug = title
    .toLowerCase()
    .replace(/['’ʼ]/g, "")
    .replace(/[^a-zа-яіїєґ0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

export function getPortfolioPeriod(item: PortfolioItem) {
  const date = item.completedAt || item.createdAt;
  const parsed = date ? new Date(date) : new Date();
  const year = item.year || parsed.getFullYear();
  const month = item.month || parsed.getMonth() + 1;

  return { year, month };
}

export function getPublicProjectDocuments(item: PortfolioItem) {
  return (item.documents ?? []).filter((document) => {
    if (!document.isPublic) return false;
    if (document.visibleAfterCompletion && item.projectStatus !== "completed") return false;
    return true;
  });
}

export function getProjectPublicLocation(item: PortfolioItem) {
  if (item.showExactAddress && item.privateAddress) return item.privateAddress;
  return item.publicLocation || [item.city, item.district].filter(Boolean).join(", ") || item.city;
}

export function getProjectSlug(item: PortfolioItem) {
  return item.slug || slugifyPortfolioTitle(item.title, item.id);
}

export function formatUah(value: number, fractionDigits = 0) {
  const [integer, fraction] = value.toFixed(fractionDigits).split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  return `${grouped}${fraction ? `,${fraction}` : ""} грн`;
}
