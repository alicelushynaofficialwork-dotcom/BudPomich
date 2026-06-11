export type Availability = "available" | "soon" | "busy";

export type Master = {
  id: string;
  name: string;
  initials: string;
  specialty: string;
  city: string;
  experience: string;
  status: Availability;
  statusText: string;
  followers: number;
  works: number;
  promoted?: boolean;
};

export const masters: Master[] = [
  {
    id: "serhii-ivanenko",
    name: "Сергій Іваненко",
    initials: "СІ",
    specialty: "Плиточник",
    city: "Київ",
    experience: "9 років досвіду",
    status: "available",
    statusText: "Вільний для нових замовлень",
    followers: 238,
    works: 57,
  },
  {
    id: "andrii-koval",
    name: "Андрій Коваль",
    initials: "АК",
    specialty: "Електрик",
    city: "Київ",
    experience: "8 років досвіду",
    status: "soon",
    statusText: "Вільний з 15 липня",
    followers: 184,
    works: 43,
  },
  {
    id: "profi-bud",
    name: "Профі Буд",
    initials: "ПБ",
    specialty: "Ремонтна бригада",
    city: "Дніпро",
    experience: "12 років досвіду",
    status: "available",
    statusText: "Вільні для нового об'єкта",
    followers: 412,
    works: 96,
    promoted: true,
  },
];

export const portfolio = [
  {
    id: "bathroom",
    title: "Плитка у ванній кімнаті",
    category: "Плиточні роботи",
    city: "Київ",
    crop: "left",
    total: "22 440 грн",
    rows: [
      ["Плитка стіни", "600 грн/м²", "22 м²", "13 200 грн"],
      ["Плитка підлога", "700 грн/м²", "6 м²", "4 200 грн"],
      ["Підготовка", "180 грн/м²", "28 м²", "5 040 грн"],
    ],
  },
  {
    id: "electric",
    title: "Електрика у двокімнатній квартирі",
    category: "Електромонтаж",
    city: "Київ",
    crop: "center",
    total: "26 200 грн",
    rows: [
      ["Електроточка", "350 грн/шт", "62 шт", "21 700 грн"],
      ["Монтаж щитка", "4 500 грн", "1 шт", "4 500 грн"],
    ],
  },
  {
    id: "kitchen",
    title: "Оздоблення кухні",
    category: "Комплексний ремонт",
    city: "Львів",
    crop: "right",
    total: "34 800 грн",
    rows: [
      ["Шпаклівка", "220 грн/м²", "60 м²", "13 200 грн"],
      ["Фарбування", "160 грн/м²", "60 м²", "9 600 грн"],
      ["Монтаж кухні", "12 000 грн", "1 шт", "12 000 грн"],
    ],
  },
] as const;
