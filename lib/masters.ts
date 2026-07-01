export type MasterProfile = {
  id: string;
  name: string;
  profession: string;
  city: string;
  district?: string;
  lastSeenText?: string;
  registeredText?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  avatarZoom?: number;
  avatarPositionX?: number;
  avatarPositionY?: number;
  coverZoom?: number;
  coverPositionX?: number;
  coverPositionY?: number;
  rating: number;
  reviews: number;
  description: string;
  fullDescription: string;
  priceFrom: number;
  experience: string;
  initials: string;
  accent: string;
  services: { name: string; price: string }[];
  contacts?: { label: string; value: string; href: string }[];
  isProfileActive?: boolean;
  acceptsBudPomichRequests?: boolean;
  works: {
    title: string;
    location: string;
    crop: "left" | "center" | "right";
    category?: string;
    description?: string;
    total?: string;
    details?: { name: string; quantity: string; unitPrice: string; total: string }[];
  }[];
  busyDates?: string[];
};

export const masterProfiles: MasterProfile[] = [
  {
    id: "andrii-koval",
    name: "Андрій Коваль",
    profession: "Електрик",
    city: "Київ",
    rating: 4.9,
    reviews: 86,
    description: "Монтаж проводки, щитів, освітлення та пошук несправностей.",
    fullDescription:
      "Виконую електромонтажні роботи у квартирах і приватних будинках. Працюю акуратно, пояснюю кошторис до початку робіт і допомагаю підібрати надійні матеріали.",
    priceFrom: 500,
    experience: "8 років досвіду",
    initials: "АК",
    accent: "blue",
    services: [
      { name: "Монтаж розетки або вимикача", price: "від 500 грн" },
      { name: "Заміна електрощита", price: "від 4 500 грн" },
      { name: "Нова проводка у квартирі", price: "від 18 000 грн" },
      { name: "Діагностика несправності", price: "від 700 грн" },
    ],
    works: [
      { title: "Електрощит у новобудові", location: "Київ", crop: "center" },
      { title: "Освітлення кухні", location: "Ірпінь", crop: "right" },
      { title: "Проводка у ванній", location: "Буча", crop: "left" },
    ],
  },
  {
    id: "serhii-ivanenko",
    name: "Сергій Іваненко",
    profession: "Плиточник",
    city: "Київ",
    rating: 4.8,
    reviews: 64,
    description: "Укладання плитки та керамограніту у ванних і кухнях.",
    fullDescription:
      "Спеціалізуюся на точному укладанні великоформатної плитки, підготовці основи та гідроізоляції. Після роботи залишаю чисте приміщення.",
    priceFrom: 650,
    experience: "9 років досвіду",
    initials: "Ѳ",
    accent: "orange",
    services: [
      { name: "Укладання плитки", price: "від 650 грн/м²" },
      { name: "Керамограніт", price: "від 850 грн/м²" },
      { name: "Гідроізоляція", price: "від 220 грн/м²" },
      { name: "Підготовка стін", price: "від 180 грн/м²" },
    ],
    works: [
      { title: "Ванна кімната під ключ", location: "Київ", crop: "left" },
      { title: "Фартух на кухні", location: "Вишневе", crop: "right" },
      { title: "Керамограніт у холі", location: "Київ", crop: "center" },
    ],
  },
  {
    id: "olena-marchenko",
    name: "Олена Марченко",
    profession: "Дизайнерка інтер'єру",
    city: "Львів",
    rating: 5,
    reviews: 41,
    description: "Продумані інтер'єри квартир: від планування до авторського нагляду.",
    fullDescription:
      "Створюю функціональні сучасні інтер'єри з реалістичним бюджетом. Готую креслення, візуалізації, специфікації та супроводжую реалізацію.",
    priceFrom: 900,
    experience: "7 років досвіду",
    initials: "ОМ",
    accent: "violet",
    services: [
      { name: "Планувальне рішення", price: "від 900 грн/м²" },
      { name: "Дизайн-проєкт", price: "від 1 500 грн/м²" },
      { name: "Авторський нагляд", price: "від 8 000 грн/міс" },
      { name: "Консультація", price: "від 1 200 грн" },
    ],
    works: [
      { title: "Світла квартира для родини", location: "Львів", crop: "right" },
      { title: "Студія у новобудові", location: "Львів", crop: "center" },
      { title: "Мінімалістична ванна", location: "Винники", crop: "left" },
    ],
  },
  {
    id: "maksym-bondar",
    name: "Максим Бондар",
    profession: "Сантехнік",
    city: "Дніпро",
    rating: 4.7,
    reviews: 73,
    description: "Монтаж сантехніки, водопостачання та систем опалення.",
    fullDescription:
      "Допомагаю з терміновими несправностями й повним монтажем систем у нових оселях. Надаю зрозумілий перелік робіт і гарантію.",
    priceFrom: 450,
    experience: "11 років досвіду",
    initials: "МБ",
    accent: "green",
    services: [
      { name: "Встановлення змішувача", price: "від 450 грн" },
      { name: "Монтаж унітаза", price: "від 1 200 грн" },
      { name: "Розведення води", price: "від 5 000 грн" },
      { name: "Монтаж радіатора", price: "від 1 800 грн" },
    ],
    works: [
      { title: "Сантехніка у ванній", location: "Дніпро", crop: "left" },
      { title: "Тепла кухня", location: "Дніпро", crop: "right" },
      { title: "Колекторний вузол", location: "Підгородне", crop: "center" },
    ],
  },
  {
    id: "roman-levchenko",
    name: "Роман Левченко",
    profession: "Маляр-штукатур",
    city: "Одеса",
    rating: 4.9,
    reviews: 58,
    description: "Рівні стіни, декоративне оздоблення та якісне фарбування.",
    fullDescription:
      "Готую стіни під фарбування, працюю з декоративними покриттями та безповітряним нанесенням. Дотримуюся строків і захищаю меблі та підлогу.",
    priceFrom: 230,
    experience: "10 років досвіду",
    initials: "РЛ",
    accent: "sand",
    services: [
      { name: "Шпаклювання стін", price: "від 230 грн/м²" },
      { name: "Фарбування", price: "від 170 грн/м²" },
      { name: "Декоративна штукатурка", price: "від 650 грн/м²" },
      { name: "Підготовка укосів", price: "від 350 грн/м.п." },
    ],
    works: [
      { title: "Оздоблення кухні", location: "Одеса", crop: "right" },
      { title: "Стіни у вітальні", location: "Одеса", crop: "center" },
      { title: "Вологостійке покриття", location: "Чорноморськ", crop: "left" },
    ],
  },
  {
    id: "profi-bud",
    name: "Команда «Профі Буд»",
    profession: "Комплексний ремонт",
    city: "Харків",
    rating: 4.8,
    reviews: 112,
    description: "Ремонт квартир під ключ з одним відповідальним виконробом.",
    fullDescription:
      "Беремо на себе весь цикл ремонту: демонтаж, інженерію, чорнові та оздоблювальні роботи. Формуємо поетапний кошторис і регулярно звітуємо.",
    priceFrom: 4500,
    experience: "12 років досвіду",
    initials: "ПБ",
    accent: "navy",
    services: [
      { name: "Косметичний ремонт", price: "від 4 500 грн/м²" },
      { name: "Капітальний ремонт", price: "від 8 500 грн/м²" },
      { name: "Ремонт за дизайн-проєктом", price: "за кошторисом" },
      { name: "Технічний нагляд", price: "від 10 000 грн/міс" },
    ],
    works: [
      { title: "Квартира під ключ", location: "Харків", crop: "right" },
      { title: "Інженерні роботи", location: "Харків", crop: "center" },
      { title: "Санвузол у новобудові", location: "Пісочин", crop: "left" },
    ],
  },
  {
    id: "andrey-ponomarenko",
    name: "Андрей Пономаренко",
    profession: "Гіпсокартонщик / плиточник",
    city: "Київ",
    district: "Печерський район",
    lastSeenText: "Був на сайті 2 години тому",
    registeredText: "Зареєстрований з червня 2026",
    avatarUrl: "/images/andrey-ponomarenko-avatar.jpg",
    rating: 5,
    reviews: 12,
    description:
      "Гіпсокартонні конструкції, перегородки, стелі та укладання плитки у комерцiйних будiвлях.",
    fullDescription:
      "Виконую роботи з гіпсокартону та плитки у Києві. Працюю акуратно, допомагаю оцінити обсяг робіт, матеріали та реальний бюджет до початку ремонту.",
    priceFrom: 500,
    experience: "2 роки досвіду",
    initials: "АП",
    accent: "green",
    services: [
      { name: "Гіпсокартон", price: "від 500 грн" },
      { name: "Укладка плитки", price: "від 500 грн/м²" },
      { name: "Короби та перегородки", price: "від 500 грн" },
      { name: "Підготовка основи під плитку", price: "від 350 грн/м²" },
    ],
    contacts: [
      { label: "Телефон", value: "+380 67 123 45 67", href: "tel:+380671234567" },
      { label: "Telegram", value: "@andrey_master", href: "https://t.me/andrey_master" },
      { label: "Viber", value: "+380 67 123 45 67", href: "viber://chat?number=%2B380671234567" },
      { label: "WhatsApp", value: "+380 67 123 45 67", href: "https://wa.me/380671234567" },
    ],
    works: [
      {
        title: "Перегородка з гіпсокартону",
        location: "Київ",
        crop: "center",
        category: "Квартира",
        description:
          "Монтаж рівної перегородки з підготовкою стиків під шпаклювання та фарбування.",
        total: "18 500 грн",
        details: [
          { name: "Монтаж гіпсокартону", quantity: "28 м²", unitPrice: "500 грн", total: "14 000 грн" },
          { name: "Підготовка стиків", quantity: "1 об'єкт", unitPrice: "4 500 грн", total: "4 500 грн" },
        ],
      },
      {
        title: "Плитка у ванній",
        location: "Київ",
        crop: "left",
        category: "Ванна",
        description:
          "Укладання плитки з вирівнюванням основи та акуратним заповненням швів.",
        total: "22 000 грн",
        details: [
          { name: "Укладка плитки", quantity: "24 м²", unitPrice: "650 грн", total: "15 600 грн" },
          { name: "Підготовка основи", quantity: "1 об'єкт", unitPrice: "6 400 грн", total: "6 400 грн" },
        ],
      },
    ],
    busyDates: ["2026-06-10", "2026-06-11", "2026-06-17"],
  },
];

export function getMasterById(id: string) {
  const numericIndex = Number(id);

  if (Number.isInteger(numericIndex) && numericIndex > 0) {
    return masterProfiles[numericIndex - 1];
  }

  return masterProfiles.find((master) => master.id === id);
}
