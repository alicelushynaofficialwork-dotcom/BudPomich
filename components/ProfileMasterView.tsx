"use client";

import Link from "next/link";
import { type ChangeEvent, type CSSProperties, type SyntheticEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Pause,
  Pencil,
  Phone,
  PhoneCall,
  Play,
  Send,
  Star,
  X,
} from "lucide-react";
import { BookingForm, DirectMessageForm } from "@/components/BookingForm";
import { SiteHeader } from "@/components/SiteHeader";
import { getMasterServices } from "@/lib/master-services";
import type { MasterProfile } from "@/lib/masters";
import {
  type EditableMasterProfile,
  masterProfileStorageKey,
  mergeMasterProfile,
  normalizeMasterServices,
} from "@/lib/master-profile-edit";
import { formatPriceFromServices } from "@/lib/master-pricing";
import {
  calculateLineTotal,
  calculatePortfolioTotal,
  defaultPortfolioItems,
  formatUah,
  type PortfolioWorkLine,
  type PortfolioItem,
  portfolioStorageKey,
} from "@/lib/portfolio";

type ProfileMasterViewProps = {
  master: MasterProfile;
  ownerSource?: "profile";
};

type SaveStatus = "idle" | "saving" | "success" | "error";

type ProfileSectionId = "about" | "location" | "services" | "portfolio" | "reviews" | "message" | "booking";

type LocationDraft = {
  city: string;
  district: string;
  serviceArea: string;
  travel: string;
  comment: string;
};

type AvatarDraft = {
  url: string;
  zoom: number;
  positionX: number;
  positionY: number;
};

type HeroDraft = {
  name: string;
  profession: string;
  city: string;
  district: string;
  experience: string;
  description: string;
};

type PortfolioReview = {
  id: string;
  itemId: string;
  itemTitle: string;
  author: string;
  date: string;
  rating: number;
  text: string;
};

const defaultServiceArea = "Київ та передмістя до 30 км";
const defaultTravelText = "По місту та за місто за домовленістю";
const locationDetailsStorageKey = "budpomich.profile-location-details";
const heroDescriptionMaxLength = 250;
const profileSectionFromHash: Record<string, ProfileSectionId> = {
  "#about-master": "about",
  "#location": "location",
  "#services": "services",
  "#portfolio": "portfolio",
  "#reviews": "reviews",
  "#message": "message",
  "#booking": "booking",
};

const portfolioReviewTemplates = [
  {
    author: "Олена К.",
    date: "червень 2026",
    text: "Роботу виконано акуратно, майстер пояснив кошторис і залишив після себе чисте приміщення.",
  },
  {
    author: "Сергій М.",
    date: "червень 2026",
    text: "Сподобалось, що матеріали і терміни були узгоджені до старту, без неприємних сюрпризів.",
  },
  {
    author: "Ірина В.",
    date: "травень 2026",
    text: "Плитка та гіпсокартон зроблені рівно, майстер швидко відповідав на питання під час ремонту.",
  },
  {
    author: "Максим П.",
    date: "травень 2026",
    text: "Кошторис збігся з фінальною оплатою, робота виглядає охайно і надійно.",
  },
];

function getPortfolioPhotos(item: PortfolioItem) {
  const photos = item.photoUrls?.length
    ? item.photoUrls
    : item.photoUrl
      ? [item.photoUrl]
      : [];

  const fallback = "/images/portfolio-triptych.png";
  return Array.from(new Set([...photos, fallback])).filter(Boolean);
}

function limitHeroDescription(description: string) {
  return description.trim().slice(0, heroDescriptionMaxLength);
}

function buildPortfolioReviews(items: PortfolioItem[], totalReviews: number): PortfolioReview[] {
  if (!items.length || totalReviews <= 0) return [];

  return Array.from({ length: totalReviews }, (_, index) => {
    const item = items[index % items.length];
    const template = portfolioReviewTemplates[index % portfolioReviewTemplates.length];

    return {
      id: `${item.id}-review-${index}`,
      itemId: item.id,
      itemTitle: item.title,
      rating: index % 5 === 4 ? 4.8 : 5,
      ...template,
    };
  });
}

export function ProfileMasterView({ master, ownerSource }: ProfileMasterViewProps) {
  const [profileEdit, setProfileEdit] = useState<EditableMasterProfile | null>(null);
  const [activeProfileSection, setActiveProfileSection] = useState<ProfileSectionId>("about");
  const [isAboutEditing, setIsAboutEditing] = useState(false);
  const [aboutDraft, setAboutDraft] = useState(master.fullDescription);
  const [aboutStatus, setAboutStatus] = useState<SaveStatus>("idle");
  const [isHeroEditing, setIsHeroEditing] = useState(false);
  const [heroDraft, setHeroDraft] = useState<HeroDraft>({
    name: master.name,
    profession: master.profession,
    city: master.city,
    district: master.district ?? "",
    experience: master.experience,
    description: limitHeroDescription(master.description),
  });
  const [heroStatus, setHeroStatus] = useState<SaveStatus>("idle");
  const [avatarStatus, setAvatarStatus] = useState<SaveStatus>("idle");
  const [avatarDraft, setAvatarDraft] = useState<AvatarDraft | null>(null);
  const [isLocationEditing, setIsLocationEditing] = useState(false);
  const [locationDraft, setLocationDraft] = useState<LocationDraft>({
    city: master.city,
    district: master.district ?? "",
    serviceArea: "",
    travel: "",
    comment: "",
  });
  const [locationStatus, setLocationStatus] = useState<SaveStatus>("idle");
  const [locationError, setLocationError] = useState("");
  const [isServicesEditing, setIsServicesEditing] = useState(false);
  const [servicesDraft, setServicesDraft] = useState(master.services);
  const [servicesStatus, setServicesStatus] = useState<SaveStatus>("idle");
  const [isPortfolioEditing, setIsPortfolioEditing] = useState(false);
  const [portfolioDraft, setPortfolioDraft] = useState<PortfolioItem[]>([]);
  const [activePortfolioEditId, setActivePortfolioEditId] = useState<string | null>(null);
  const [savedPortfolioItems, setSavedPortfolioItems] = useState<PortfolioItem[]>([]);
  const [activePortfolioSlides, setActivePortfolioSlides] = useState<Record<string, number>>({});
  const [activePortfolioProjectIndex, setActivePortfolioProjectIndex] = useState(0);
  const [isPortfolioSlideshowPaused, setIsPortfolioSlideshowPaused] = useState(false);
  const visibleMaster = useMemo(() => mergeMasterProfile(master, profileEdit), [master, profileEdit]);
  const avatarInputId = `profile-avatar-upload-${visibleMaster.id}`;
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const heroEditorRef = useRef<HTMLDivElement | null>(null);
  const isOwnerView = ownerSource === "profile" || visibleMaster.id === "andrey-ponomarenko";
  const priceFromServices = formatPriceFromServices(visibleMaster.services, visibleMaster.priceFrom);
  const contactMethods = visibleMaster.contacts ?? [];
  const bookingServices = getMasterServices(visibleMaster.id);
  const portfolioItems = useMemo(() => {
    const defaults = defaultPortfolioItems.filter((item) => item.masterId === visibleMaster.id);
    const map = new Map(
      [...defaults, ...savedPortfolioItems].map((item) => [item.id, item]),
    );
    return Array.from(map.values());
  }, [savedPortfolioItems, visibleMaster.id]);
  const portfolioReviews = useMemo(
    () => buildPortfolioReviews(portfolioItems, visibleMaster.reviews),
    [portfolioItems, visibleMaster.reviews],
  );
  const portfolioSlideCount = portfolioItems.length || visibleMaster.works.length;
  const isServiceAreaPlaceholder = !locationDraft.serviceArea.trim();
  const isTravelPlaceholder = !locationDraft.travel.trim();
  const isLocationRequiredFilled = Boolean(
    locationDraft.city.trim() &&
      locationDraft.district.trim() &&
      locationDraft.serviceArea.trim() &&
      locationDraft.travel.trim(),
  );
  const avatarCropStyle = {
    objectPosition: `${visibleMaster.avatarPositionX ?? 50}% ${visibleMaster.avatarPositionY ?? 35}%`,
    transformOrigin: `${visibleMaster.avatarPositionX ?? 50}% ${visibleMaster.avatarPositionY ?? 35}%`,
    transform: `scale(${visibleMaster.avatarZoom ?? 1})`,
  };
  const avatarDraftStyle = avatarDraft
    ? {
        objectPosition: `${avatarDraft.positionX}% ${avatarDraft.positionY}%`,
        transformOrigin: `${avatarDraft.positionX}% ${avatarDraft.positionY}%`,
        transform: `scale(${avatarDraft.zoom})`,
      }
    : undefined;

  useEffect(() => {
    if (activePortfolioProjectIndex <= Math.max(portfolioSlideCount - 1, 0)) return;
    setActivePortfolioProjectIndex(Math.max(portfolioSlideCount - 1, 0));
  }, [activePortfolioProjectIndex, portfolioSlideCount]);

  useEffect(() => {
    if (isPortfolioSlideshowPaused || portfolioSlideCount < 2) return;

    const timer = window.setInterval(() => {
      setActivePortfolioProjectIndex((current) => (current + 1) % portfolioSlideCount);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [isPortfolioSlideshowPaused, portfolioSlideCount]);

  useEffect(() => {
    const initialSection = profileSectionFromHash[window.location.hash];
    if (initialSection) {
      setActiveProfileSection(initialSection);
    }

    function handleHashChange() {
      const nextSection = profileSectionFromHash[window.location.hash];
      if (nextSection) {
        setActiveProfileSection(nextSection);
      }
    }

    window.addEventListener("hashchange", handleHashChange);

    const localProfiles = JSON.parse(
      localStorage.getItem(masterProfileStorageKey) ?? "{}",
    ) as Record<string, EditableMasterProfile>;

    if (localProfiles[master.id]) {
      setProfileEdit(localProfiles[master.id]);
    }

    const localPortfolioItems = JSON.parse(
      localStorage.getItem(portfolioStorageKey) ?? "[]",
    ) as PortfolioItem[];
    setSavedPortfolioItems(
      localPortfolioItems.filter((item) => item.masterId === master.id),
    );

    const localLocationDetails = JSON.parse(
      localStorage.getItem(locationDetailsStorageKey) ?? "{}",
    ) as Record<string, Pick<LocationDraft, "serviceArea" | "travel" | "comment">>;

    if (localLocationDetails[master.id]) {
      setLocationDraft((current) => ({
        ...current,
        ...localLocationDetails[master.id],
      }));
    }

    fetch(`/api/profile?masterId=${encodeURIComponent(master.id)}`)
      .then((response) => response.json())
      .then((result: { profile?: EditableMasterProfile | null }) => {
        if (!result.profile) return;
        setProfileEdit((current) => ({
          ...current,
          ...result.profile!,
          avatarUrl: result.profile!.avatarUrl || current?.avatarUrl || "",
          coverImageUrl: result.profile!.coverImageUrl || current?.coverImageUrl || "",
          avatarZoom: result.profile!.avatarZoom ?? current?.avatarZoom ?? 1,
          avatarPositionX: result.profile!.avatarPositionX ?? current?.avatarPositionX ?? 50,
          avatarPositionY: result.profile!.avatarPositionY ?? current?.avatarPositionY ?? 35,
          coverZoom: result.profile!.coverZoom ?? current?.coverZoom ?? 1,
          coverPositionX: result.profile!.coverPositionX ?? current?.coverPositionX ?? 50,
          coverPositionY: result.profile!.coverPositionY ?? current?.coverPositionY ?? 50,
        }));
      })
      .catch(() => undefined);

    fetch(`/api/portfolio?masterId=${encodeURIComponent(master.id)}`)
      .then((response) => response.json())
      .then((result: { items?: PortfolioItem[] }) => {
        const remoteItems = result.items;
        if (!remoteItems?.length) return;
        setSavedPortfolioItems((current) => {
          const map = new Map(
            [...remoteItems, ...current].map((item) => [item.id, item]),
          );
          return Array.from(map.values());
        });
      })
      .catch(() => undefined);

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [master.id]);

  function persistLocalProfile(nextProfile: EditableMasterProfile) {
    const localProfiles = JSON.parse(
      localStorage.getItem(masterProfileStorageKey) ?? "{}",
    ) as Record<string, EditableMasterProfile>;

    localStorage.setItem(
      masterProfileStorageKey,
      JSON.stringify({ ...localProfiles, [master.id]: nextProfile }),
    );
  }

  function getEditableProfile(overrides: Partial<EditableMasterProfile> = {}): EditableMasterProfile {
    return {
      id: visibleMaster.id,
      name: visibleMaster.name,
      profession: visibleMaster.profession,
      city: visibleMaster.city,
      district: visibleMaster.district ?? "",
      description: visibleMaster.description,
      fullDescription: visibleMaster.fullDescription,
      avatarUrl: visibleMaster.avatarUrl ?? "",
      coverImageUrl: visibleMaster.coverImageUrl ?? "",
      avatarZoom: visibleMaster.avatarZoom ?? 1,
      avatarPositionX: visibleMaster.avatarPositionX ?? 50,
      avatarPositionY: visibleMaster.avatarPositionY ?? 35,
      coverZoom: visibleMaster.coverZoom ?? 1,
      coverPositionX: visibleMaster.coverPositionX ?? 50,
      coverPositionY: visibleMaster.coverPositionY ?? 50,
      priceFrom: visibleMaster.priceFrom,
      experience: visibleMaster.experience,
      services: visibleMaster.services,
      ...overrides,
    };
  }

  async function saveProfileSection(
    nextProfile: EditableMasterProfile,
    setStatus: (status: SaveStatus) => void,
  ) {
    setStatus("saving");
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextProfile),
      });
      const result = (await response.json()) as {
        profile?: EditableMasterProfile;
        error?: string;
      };

      if (!response.ok || !result.profile) {
        throw new Error(result.error ?? "Не вдалося зберегти опис.");
      }

      persistLocalProfile(result.profile);
      setProfileEdit(result.profile);
    } catch {
      persistLocalProfile(nextProfile);
      setProfileEdit(nextProfile);
    }

    setStatus("success");
  }

  async function saveAboutSection() {
    const nextProfile = getEditableProfile({ fullDescription: aboutDraft.trim() });
    await saveProfileSection(nextProfile, setAboutStatus);
    setIsAboutEditing(false);
  }

  async function saveHeroSection() {
    const nextProfile = getEditableProfile({
      name: heroDraft.name.trim(),
      profession: heroDraft.profession.trim(),
      city: heroDraft.city.trim(),
      district: heroDraft.district.trim(),
      experience: heroDraft.experience.trim(),
      description: limitHeroDescription(heroDraft.description),
    });
    await saveProfileSection(nextProfile, setHeroStatus);
    setIsHeroEditing(false);
  }

  function openAvatarPhotoPicker() {
    avatarInputRef.current?.click();
  }

  async function updateAvatarPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    let avatarUrl = "";

    try {
      avatarUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
    } catch {
      setAvatarStatus("error");
      return;
    }

    if (!avatarUrl) {
      setAvatarStatus("error");
      return;
    }

    setAvatarStatus("idle");
    setAvatarDraft({
      url: avatarUrl,
      zoom: visibleMaster.avatarZoom ?? 1,
      positionX: visibleMaster.avatarPositionX ?? 50,
      positionY: visibleMaster.avatarPositionY ?? 35,
    });
  }

  function updateAvatarDraft(field: keyof Omit<AvatarDraft, "url">, value: string) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return;

    setAvatarDraft((current) => (current ? { ...current, [field]: numberValue } : current));
  }

  async function saveAvatarPhoto() {
    if (!avatarDraft) return;

    const nextProfile = getEditableProfile({
      avatarUrl: avatarDraft.url,
      avatarZoom: avatarDraft.zoom,
      avatarPositionX: avatarDraft.positionX,
      avatarPositionY: avatarDraft.positionY,
    });
    await saveProfileSection(nextProfile, setAvatarStatus);
    setAvatarDraft(null);
  }

  function cancelAvatarPhoto() {
    setAvatarDraft(null);
    setAvatarStatus("idle");
  }

  async function saveLocationSection() {
    if (!isLocationRequiredFilled) {
      setLocationError("Заповніть місто, район, зону роботи та виїзд.");
      setLocationStatus("error");
      return;
    }

    const nextProfile = getEditableProfile({
      city: locationDraft.city.trim(),
      district: locationDraft.district.trim(),
    });
    persistLocationDetails(locationDraft);
    await saveProfileSection(nextProfile, setLocationStatus);
    setIsLocationEditing(false);
  }

  function persistLocationDetails(nextLocation: LocationDraft) {
    const localDetails = JSON.parse(
      localStorage.getItem(locationDetailsStorageKey) ?? "{}",
    ) as Record<string, Pick<LocationDraft, "serviceArea" | "travel" | "comment">>;

    localStorage.setItem(
      locationDetailsStorageKey,
      JSON.stringify({
        ...localDetails,
        [visibleMaster.id]: {
          serviceArea: nextLocation.serviceArea.trim(),
          travel: nextLocation.travel.trim(),
          comment: nextLocation.comment.trim(),
        },
      }),
    );
  }

  async function saveServicesSection() {
    const nextServices = normalizeMasterServices(
      servicesDraft.map((service) => ({
        name: service.name.trim(),
        price: service.price.trim(),
      })),
    );
    const nextProfile = getEditableProfile({ services: nextServices });
    await saveProfileSection(nextProfile, setServicesStatus);
    setIsServicesEditing(false);
  }

  function persistPortfolioItems(nextItems: PortfolioItem[]) {
    const localItems = JSON.parse(
      localStorage.getItem(portfolioStorageKey) ?? "[]",
    ) as PortfolioItem[];
    const otherItems = localItems.filter((item) => item.masterId !== visibleMaster.id);

    localStorage.setItem(portfolioStorageKey, JSON.stringify([...otherItems, ...nextItems]));
    setSavedPortfolioItems(nextItems);
  }

  function updatePortfolioDraft(
    itemId: string,
    field: "title" | "description" | "city" | "objectType" | "totalAmount",
    value: string | number,
  ) {
    setPortfolioDraft((current) =>
      current.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    );
  }

  function updatePortfolioLineDraft(
    itemId: string,
    lineId: string,
    field: keyof Pick<PortfolioWorkLine, "workType" | "unit" | "unitPrice" | "volume">,
    value: string,
  ) {
    setPortfolioDraft((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;

        const workLines = item.workLines.map((line) => {
          if (line.id !== lineId) return line;

          const nextLine = {
            ...line,
            [field]: field === "unitPrice" || field === "volume" ? Number(value) : value,
          };

          return {
            ...nextLine,
            total: calculateLineTotal(nextLine.unitPrice, nextLine.volume),
          };
        });

        return {
          ...item,
          workLines,
          totalAmount: calculatePortfolioTotal(workLines),
        };
      }),
    );
  }

  function addPortfolioLineDraft(itemId: string) {
    setPortfolioDraft((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;

        const workLines = [
          ...item.workLines,
          {
            id: `line-${Date.now()}`,
            workType: "",
            unit: "м²",
            unitPrice: 0,
            volume: 1,
            total: 0,
          },
        ];

        return { ...item, workLines };
      }),
    );
  }

  function removePortfolioLineDraft(itemId: string, lineId: string) {
    setPortfolioDraft((current) =>
      current.map((item) => {
        if (item.id !== itemId || item.workLines.length === 1) return item;

        const workLines = item.workLines.filter((line) => line.id !== lineId);
        return {
          ...item,
          workLines,
          totalAmount: calculatePortfolioTotal(workLines),
        };
      }),
    );
  }

  function updateServiceDraft(index: number, field: "name" | "price", value: string) {
    setServicesDraft((current) =>
      current.map((service, serviceIndex) =>
        serviceIndex === index ? { ...service, [field]: value } : service,
      ),
    );
  }

  function removeServiceDraft(index: number) {
    setServicesDraft((current) =>
      current.length === 1 ? current : current.filter((_, serviceIndex) => serviceIndex !== index),
    );
  }

  function scrollToHeroEditor() {
    requestAnimationFrame(() => {
      const editor = heroEditorRef.current;
      if (!editor) return;

      const topOffset = Math.min(320, Math.max(180, window.innerHeight * 0.32));
      window.scrollTo({
        top: Math.max(0, editor.getBoundingClientRect().top + window.scrollY - topOffset),
        behavior: "smooth",
      });
    });
  }

  function openAboutEditor() {
    setAboutDraft(visibleMaster.fullDescription);
    setAboutStatus("idle");
    setIsAboutEditing(true);
  }

  function openHeroEditor(shouldScroll = true) {
    setHeroDraft({
      name: visibleMaster.name,
      profession: visibleMaster.profession,
      city: visibleMaster.city,
      district: visibleMaster.district ?? "",
      experience: visibleMaster.experience,
      description: limitHeroDescription(visibleMaster.description),
    });
    setHeroStatus("idle");
    setIsHeroEditing(true);
    if (shouldScroll) {
      scrollToHeroEditor();
    }
  }

  function openFullProfileEditor() {
    openHeroEditor(false);
    openAboutEditor();
    openLocationEditor();
    openServicesEditor();
    openPortfolioEditor();
    setActiveProfileSection("about");
    scrollToHeroEditor();
  }

  function openLocationEditor() {
    setLocationDraft({
      city: "",
      district: visibleMaster.district ?? "",
      serviceArea: locationDraft.serviceArea,
      travel: locationDraft.travel,
      comment: locationDraft.comment,
    });
    setLocationStatus("idle");
    setLocationError("");
    setIsLocationEditing(true);
  }

  function openServicesEditor() {
    setServicesDraft(visibleMaster.services);
    setServicesStatus("idle");
    setIsServicesEditing(true);
  }

  function openPortfolioEditor(itemId?: string) {
    setPortfolioDraft(portfolioItems);
    setActivePortfolioEditId(itemId ?? portfolioItems[0]?.id ?? null);
    setIsPortfolioEditing(true);
  }

  function pausePortfolioSlideshow() {
    setIsPortfolioSlideshowPaused(true);
  }

  function showPreviousPortfolioProject() {
    pausePortfolioSlideshow();
    setActivePortfolioProjectIndex((current) =>
      (current - 1 + portfolioSlideCount) % portfolioSlideCount,
    );
  }

  function showNextPortfolioProject() {
    pausePortfolioSlideshow();
    setActivePortfolioProjectIndex((current) => (current + 1) % portfolioSlideCount);
  }

  function showPortfolioProject(index: number) {
    pausePortfolioSlideshow();
    setActivePortfolioProjectIndex(index);
  }

  function openPortfolioProject(itemId: string) {
    pausePortfolioSlideshow();
    if (isOwnerView) {
      openPortfolioEditor(itemId);
    }
  }

  function closePortfolioEditor() {
    setPortfolioDraft([]);
    setActivePortfolioEditId(null);
    setIsPortfolioEditing(false);
  }

  function savePortfolioSection() {
    persistPortfolioItems(portfolioDraft);
    setIsPortfolioEditing(false);
  }

  function cancelHeroEditor() {
    setHeroDraft({
      name: visibleMaster.name,
      profession: visibleMaster.profession,
      city: visibleMaster.city,
      district: visibleMaster.district ?? "",
      experience: visibleMaster.experience,
      description: limitHeroDescription(visibleMaster.description),
    });
    setHeroStatus("idle");
    setIsHeroEditing(false);
  }

  function cancelLocationEditor() {
    setLocationDraft({
      city: visibleMaster.city,
      district: visibleMaster.district ?? "",
      serviceArea: locationDraft.serviceArea,
      travel: locationDraft.travel,
      comment: locationDraft.comment,
    });
    setLocationStatus("idle");
    setLocationError("");
    setIsLocationEditing(false);
  }

  function cancelServicesEditor() {
    setServicesDraft(visibleMaster.services);
    setServicesStatus("idle");
    setIsServicesEditing(false);
  }

  function keepSectionOpen(event: SyntheticEvent<HTMLDetailsElement>) {
    if (!event.currentTarget.open) {
      event.currentTarget.open = true;
    }
  }

  function selectProfileSection(section: ProfileSectionId) {
    setActiveProfileSection(section);

    const hash = Object.entries(profileSectionFromHash).find(([, value]) => value === section)?.[0];
    if (hash && window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }

  function openReviewsSection() {
    selectProfileSection("reviews");
    window.setTimeout(() => {
      document.getElementById("reviews")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  return (
    <main className="masters-page profile-public-page">
      <SiteHeader active="masters" showMasterCard />

      <div className="profile-breadcrumb">
        <Link href="/masters">← Каталог майстрів</Link>
      </div>

      <section
        className={`public-profile-hero ${visibleMaster.coverImageUrl ? "has-cover-image" : ""}`}
        id="profile-top"
        style={
          visibleMaster.coverImageUrl
            ? ({
                "--profile-cover-image": `url(${visibleMaster.coverImageUrl})`,
                "--profile-cover-x": `${visibleMaster.coverPositionX ?? 50}%`,
                "--profile-cover-y": `${visibleMaster.coverPositionY ?? 50}%`,
                "--profile-cover-scale": `${visibleMaster.coverZoom ?? 1}`,
                "--profile-cover-zoom": `${Math.max(100, (visibleMaster.coverZoom ?? 1) * 100)}%`,
              } as CSSProperties)
            : undefined
        }
      >
        <div className="profile-person">
          <div className="profile-avatar-stack">
            <div className={`profile-directory-avatar avatar-${visibleMaster.accent}`}>
              {visibleMaster.avatarUrl ? (
                <img src={visibleMaster.avatarUrl} alt={`Фото ${visibleMaster.name}`} style={avatarCropStyle} />
              ) : (
                visibleMaster.initials
              )}
            </div>
            {isOwnerView && (
              <>
                <input
                  className="profile-avatar-file-input"
                  id={avatarInputId}
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  aria-hidden="true"
                  tabIndex={-1}
                  onChange={updateAvatarPhoto}
                />
                <button className="profile-avatar-edit-button" type="button" onClick={openAvatarPhotoPicker}>
                  <Pencil size={13} />
                  Редагувати фото
                </button>
                {avatarDraft && (
                  <div className="profile-avatar-crop-editor">
                    <div className="profile-avatar-crop-preview">
                      <img src={avatarDraft.url} alt="Превʼю фото" style={avatarDraftStyle} />
                    </div>
                    <label>
                      Збільшення
                      <input
                        type="range"
                        min="1"
                        max="2.4"
                        step="0.05"
                        value={avatarDraft.zoom}
                        onChange={(event) => updateAvatarDraft("zoom", event.target.value)}
                      />
                    </label>
                    <label>
                      Зсув по горизонталі
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={avatarDraft.positionX}
                        onChange={(event) => updateAvatarDraft("positionX", event.target.value)}
                      />
                    </label>
                    <label>
                      Зсув по вертикалі
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={avatarDraft.positionY}
                        onChange={(event) => updateAvatarDraft("positionY", event.target.value)}
                      />
                    </label>
                    <div className="profile-avatar-crop-actions">
                      <button type="button" onClick={cancelAvatarPhoto}>
                        <X size={14} /> Скасувати
                      </button>
                      <button type="button" onClick={saveAvatarPhoto}>
                        <Check size={14} /> Зберегти
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            {avatarStatus === "success" && (
              <p className="profile-avatar-status" role="status">
                Фото оновлено.
              </p>
            )}
            {avatarStatus === "error" && (
              <p className="profile-avatar-status" role="alert">
                Не вдалося відкрити фото.
              </p>
            )}
            {(visibleMaster.lastSeenText || visibleMaster.registeredText) && (
              <div className="profile-activity-row profile-activity-under-photo">
                {visibleMaster.lastSeenText && <span>{visibleMaster.lastSeenText}</span>}
                {visibleMaster.registeredText && <span>{visibleMaster.registeredText}</span>}
              </div>
            )}
          </div>
          <div className="profile-hero-main">
            {isOwnerView ? (
              <button className="eyebrow profile-profession-edit-trigger" type="button" onClick={() => openHeroEditor()}>
                {visibleMaster.profession}
              </button>
            ) : (
              <p className="eyebrow">{visibleMaster.profession}</p>
            )}
            <div
              className={`profile-hero-edit-panel ${isOwnerView ? "" : "profile-hero-public-panel"}`}
            >
              <h1>{visibleMaster.name}</h1>
              {isOwnerView && (
                <button className="profile-hero-edit-button" type="button" onClick={openFullProfileEditor}>
                  <Pencil size={13} /> Редагувати
                </button>
              )}
              {isOwnerView ? (
                <button
                  className="profile-location profile-hero-edit-trigger"
                  type="button"
                  onClick={() => openHeroEditor()}
                  aria-label="Редагувати локацію та досвід"
                >
                  <MapPin size={15} /> {visibleMaster.city}
                  {visibleMaster.district ? `, ${visibleMaster.district}` : ""} · {visibleMaster.experience}
                </button>
              ) : (
                <p className="profile-location">
                  <MapPin size={15} /> {visibleMaster.city}
                  {visibleMaster.district ? `, ${visibleMaster.district}` : ""} · {visibleMaster.experience}
                </p>
              )}
              {isOwnerView ? (
                <button
                  className="profile-short-description profile-hero-edit-trigger"
                  type="button"
                  onClick={() => openHeroEditor()}
                  aria-label="Редагувати короткий опис"
                >
                  {limitHeroDescription(visibleMaster.description)}
                </button>
              ) : (
                <p className="profile-short-description">
                  {limitHeroDescription(visibleMaster.description)}
                </p>
              )}
              {isOwnerView ? (
                <button
                  className="profile-hero-location-details profile-hero-edit-trigger"
                  type="button"
                  onClick={openLocationEditor}
                  aria-label="Редагувати повну локацію"
                >
                  <span className={isServiceAreaPlaceholder ? "is-placeholder" : undefined}>
                    <strong>Зона роботи</strong>
                    {locationDraft.serviceArea || defaultServiceArea}
                  </span>
                  <span className={isTravelPlaceholder ? "is-placeholder" : undefined}>
                    <strong>Виїзд</strong>
                    {locationDraft.travel || defaultTravelText}
                  </span>
                  {locationDraft.comment.trim() && (
                    <span>
                      <strong>Коментар</strong>
                      {locationDraft.comment}
                    </span>
                  )}
                </button>
              ) : (
                <div className="profile-hero-location-details">
                  <span className={isServiceAreaPlaceholder ? "is-placeholder" : undefined}>
                    <strong>Зона роботи</strong>
                    {locationDraft.serviceArea || defaultServiceArea}
                  </span>
                  <span className={isTravelPlaceholder ? "is-placeholder" : undefined}>
                    <strong>Виїзд</strong>
                    {locationDraft.travel || defaultTravelText}
                  </span>
                  {locationDraft.comment.trim() && (
                    <span>
                      <strong>Коментар</strong>
                      {locationDraft.comment}
                    </span>
                  )}
                </div>
              )}
              {isOwnerView ? (
                <button
                  className="profile-hero-services profile-hero-edit-trigger"
                  type="button"
                  onClick={openServicesEditor}
                  aria-label="Редагувати послуги"
                >
                  <span className="profile-hero-services-head">
                    <strong>Послуги</strong>
                    <small>{visibleMaster.services.length} позиції</small>
                  </span>
                  <span className="profile-hero-services-list">
                    {visibleMaster.services.map((service) => (
                      <span className="profile-hero-service-item" key={`${service.name}-${service.price}`}>
                        <span>{service.name}</span>
                        <strong>{service.price}</strong>
                      </span>
                    ))}
                  </span>
                </button>
              ) : (
                <div className="profile-hero-services">
                  <span className="profile-hero-services-head">
                    <strong>Послуги</strong>
                    <small>{visibleMaster.services.length} позиції</small>
                  </span>
                  <span className="profile-hero-services-list">
                    {visibleMaster.services.map((service) => (
                      <span className="profile-hero-service-item" key={`${service.name}-${service.price}`}>
                        <span>{service.name}</span>
                        <strong>{service.price}</strong>
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>
            <div className="rating-row">
              <Star className="rating-star" size={17} />
              <strong>{visibleMaster.rating.toFixed(1)}</strong>
              <button className="profile-reviews-link" type="button" onClick={openReviewsSection}>
                {visibleMaster.reviews} відгуків
              </button>
            </div>
          </div>
        </div>

        <div className="profile-hero-side">
          <div className="profile-action-card">
            <span>Вартість робіт</span>
            <strong>{priceFromServices}</strong>
            {isOwnerView && (
              <button className="profile-secondary-action" type="button" onClick={openFullProfileEditor}>
                <Pencil size={15} /> Редагувати профіль
              </button>
            )}
            <a href="#booking">
              Онлайн-заявка
              <small>(Домовитись на вільну дату майстра)</small>
            </a>
            <a className="profile-secondary-action" href="#message">
              Прямий звʼязок
              <small>(Написати майстру без вибору дати)</small>
            </a>
          </div>

          <div className="profile-contact-card">
            <span>Контакти</span>
            <strong>Звʼязок з майстром</strong>
            {contactMethods.length > 0 && (
              <div className="profile-contact-list" aria-label="Контакти майстра">
                {contactMethods.map((contact) => {
                  const contactLabel = contact.label.toLowerCase();

                  return (
                    <a className="profile-contact-method" href={contact.href} key={`${contact.label}-${contact.value}`}>
                      <span className={`profile-contact-icon profile-contact-icon-${contactLabel}`}>
                        {contactLabel === "telegram" ? (
                          <Send size={16} />
                        ) : contactLabel === "viber" ? (
                          <PhoneCall size={16} />
                        ) : contactLabel === "whatsapp" ? (
                          <MessageCircle size={16} />
                        ) : (
                          <Phone size={16} />
                        )}
                      </span>
                      <span className="profile-contact-label">{contact.label}</span>
                      <strong>{contact.value}</strong>
                    </a>
                  );
                })}
              </div>
            )}
            <a className="profile-contact-action" href="#message">Написати повідомлення</a>
          </div>
        </div>

        {isOwnerView && isHeroEditing && (
          <div className="profile-hero-inline-editor" ref={heroEditorRef}>
            <label>
              Імʼя
              <input
                value={heroDraft.name}
                onChange={(event) =>
                  setHeroDraft((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Спеціалізація
              <input
                value={heroDraft.profession}
                onChange={(event) =>
                  setHeroDraft((current) => ({ ...current, profession: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Місто
              <input
                value={heroDraft.city}
                onChange={(event) =>
                  setHeroDraft((current) => ({ ...current, city: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Район
              <input
                value={heroDraft.district}
                onChange={(event) =>
                  setHeroDraft((current) => ({ ...current, district: event.target.value }))
                }
              />
            </label>
            <label>
              Досвід
              <input
                value={heroDraft.experience}
                onChange={(event) =>
                  setHeroDraft((current) => ({ ...current, experience: event.target.value }))
                }
                required
              />
            </label>
            <label className="profile-edit-wide">
              Короткий опис
              <textarea
                rows={3}
                value={heroDraft.description}
                onChange={(event) =>
                  setHeroDraft((current) => ({
                    ...current,
                    description: event.target.value.slice(0, heroDescriptionMaxLength),
                  }))
                }
                maxLength={heroDescriptionMaxLength}
                required
              />
              <span>{heroDraft.description.length} / {heroDescriptionMaxLength}</span>
            </label>
            <div className="profile-about-inline-actions">
              <button type="button" onClick={cancelHeroEditor}>
                <X size={15} /> Скасувати
              </button>
              <button
                type="button"
                disabled={
                  heroStatus === "saving" ||
                  !heroDraft.name.trim() ||
                  !heroDraft.profession.trim() ||
                  !heroDraft.city.trim() ||
                  !heroDraft.experience.trim() ||
                  !heroDraft.description.trim()
                }
                onClick={saveHeroSection}
              >
                <Check size={15} />
                {heroStatus === "saving" ? "Зберігаємо..." : "Зберегти"}
              </button>
            </div>
          </div>
        )}
      </section>

      {isOwnerView && (
        <aside className="public-profile-owner-bar profile-owner-return">
          <span>Ви переглядаєте свій профіль очима клієнта</span>
          <div>
            <button type="button" onClick={openFullProfileEditor}>
              <Pencil size={15} /> Редагувати профіль
            </button>
            <Link href="/dashboard">
              <LayoutDashboard size={15} /> До кабінету
            </Link>
          </div>
        </aside>
      )}

      <div className="profile-sections-layout">
        <nav className="profile-section-nav" aria-label="Розділи профілю">
          <p>Розділи профілю</p>
          <button
            className={activeProfileSection === "about" ? "active" : ""}
            type="button"
            onClick={() => selectProfileSection("about")}
          >
            Про майстра
          </button>
          <button
            className={activeProfileSection === "location" ? "active" : ""}
            type="button"
            onClick={() => selectProfileSection("location")}
          >
            Локація
          </button>
          <button
            className={activeProfileSection === "services" ? "active" : ""}
            type="button"
            onClick={() => selectProfileSection("services")}
          >
            Послуги
          </button>
          <button
            className={activeProfileSection === "portfolio" ? "active" : ""}
            type="button"
            onClick={() => selectProfileSection("portfolio")}
          >
            Портфоліо
          </button>
          <button
            className={activeProfileSection === "reviews" ? "active" : ""}
            type="button"
            onClick={() => selectProfileSection("reviews")}
          >
            Відгуки
          </button>
          <button
            className={activeProfileSection === "message" ? "active" : ""}
            type="button"
            onClick={() => selectProfileSection("message")}
          >
            Прямий звʼязок
          </button>
          <button
            className={activeProfileSection === "booking" ? "active" : ""}
            type="button"
            onClick={() => selectProfileSection("booking")}
          >
            Онлайн-заявка
          </button>
        </nav>

        <div className="profile-sections-stack">
          {activeProfileSection === "about" && (
          <details className="profile-collapse" id="about-master" open onToggle={keepSectionOpen}>
            <summary>
              <div>
                <span>Про майстра</span>
                <strong>Досвід і підхід до роботи</strong>
              </div>
              {isOwnerView && (
                <button
                  className="profile-owner-edit-link"
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openAboutEditor();
                  }}
                >
                  <Pencil size={14} /> Редагувати
                </button>
              )}
            </summary>
            <div className="profile-collapse-body profile-text-section">
              {isAboutEditing ? (
                <div className="profile-about-inline-editor">
                  <label>
                    Повний опис
                    <textarea
                      rows={6}
                      value={aboutDraft}
                      onChange={(event) => {
                        setAboutDraft(event.target.value);
                        setAboutStatus("idle");
                      }}
                      required
                    />
                  </label>
                  <div className="profile-about-inline-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setAboutDraft(visibleMaster.fullDescription);
                        setAboutStatus("idle");
                        setIsAboutEditing(false);
                      }}
                    >
                      <X size={15} /> Скасувати
                    </button>
                    <button
                      type="button"
                      disabled={aboutStatus === "saving" || !aboutDraft.trim()}
                      onClick={saveAboutSection}
                    >
                      <Check size={15} />
                      {aboutStatus === "saving" ? "Зберігаємо..." : "Зберегти"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="profile-about">{visibleMaster.fullDescription}</p>
                  {aboutStatus === "success" && (
                    <p className="profile-about-inline-status" role="status">
                      Опис оновлено.
                    </p>
                  )}
                </>
              )}
            </div>
          </details>
          )}

          {activeProfileSection === "location" && (
          <details className="profile-collapse" id="location" open onToggle={keepSectionOpen}>
            <summary>
              <div>
                <span>Локація</span>
                <strong>Місцезнаходження та зона роботи</strong>
              </div>
              {isOwnerView && (
                <button
                  className="profile-owner-edit-link"
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openLocationEditor();
                  }}
                >
                  <Pencil size={14} /> Редагувати
                </button>
              )}
            </summary>
            <div className="profile-collapse-body">
              {isLocationEditing ? (
                <div className="profile-about-inline-editor">
                  <div className="profile-inline-grid">
                    <label>
                      Місто
                      <input
                        value={locationDraft.city}
                        placeholder="Київ"
                        onChange={(event) =>
                          {
                            setLocationDraft((current) => ({ ...current, city: event.target.value }));
                            setLocationError("");
                            setLocationStatus("idle");
                          }
                        }
                        required
                      />
                    </label>
                    <label>
                      Район
                      <input
                        value={locationDraft.district}
                        placeholder="Печерський район"
                        onChange={(event) =>
                          {
                            setLocationDraft((current) => ({ ...current, district: event.target.value }));
                            setLocationError("");
                            setLocationStatus("idle");
                          }
                        }
                        required
                      />
                    </label>
                    <label>
                      Зона роботи
                      <input
                        value={locationDraft.serviceArea}
                        placeholder={defaultServiceArea}
                        onChange={(event) =>
                          {
                            setLocationDraft((current) => ({ ...current, serviceArea: event.target.value }));
                            setLocationError("");
                            setLocationStatus("idle");
                          }
                        }
                        required
                      />
                    </label>
                    <label>
                      Виїзд
                      <input
                        value={locationDraft.travel}
                        placeholder={defaultTravelText}
                        onChange={(event) =>
                          {
                            setLocationDraft((current) => ({ ...current, travel: event.target.value }));
                            setLocationError("");
                            setLocationStatus("idle");
                          }
                        }
                        required
                      />
                    </label>
                    <label className="profile-edit-wide">
                      Коментар
                      <textarea
                        rows={3}
                        value={locationDraft.comment}
                        onChange={(event) =>
                          {
                            setLocationDraft((current) => ({ ...current, comment: event.target.value }));
                            setLocationError("");
                            setLocationStatus("idle");
                          }
                        }
                        placeholder="Наприклад, зручний час для виїзду або додаткові умови роботи"
                      />
                    </label>
                  </div>
                  {locationError && (
                    <p className="profile-about-inline-status profile-about-inline-error" role="alert">
                      {locationError}
                    </p>
                  )}
                  <div className="profile-about-inline-actions">
                    <button type="button" onClick={cancelLocationEditor}>
                      <X size={15} /> Скасувати
                    </button>
                    <button
                      type="button"
                      disabled={locationStatus === "saving" || !isLocationRequiredFilled}
                      onClick={saveLocationSection}
                    >
                      <Check size={15} />
                      {locationStatus === "saving" ? "Зберігаємо..." : "Зберегти"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="profile-location-grid">
                    <div>
                      <span>Місто</span>
                      <strong>{visibleMaster.city}</strong>
                    </div>
                    <div>
                      <span>Район</span>
                      <strong>{visibleMaster.district ?? "Інформація буде додана пізніше"}</strong>
                    </div>
                    <div>
                      <span>Зона роботи</span>
                      <strong>{locationDraft.serviceArea}</strong>
                    </div>
                    <div>
                      <span>Виїзд</span>
                      <strong>{locationDraft.travel}</strong>
                    </div>
                    {locationDraft.comment.trim() && (
                      <div className="profile-location-comment">
                        <span>Коментар</span>
                        <strong>{locationDraft.comment}</strong>
                      </div>
                    )}
                  </div>
                  {locationStatus === "success" && (
                    <p className="profile-about-inline-status" role="status">
                      Локацію оновлено.
                    </p>
                  )}
                </>
              )}
            </div>
          </details>
          )}

          {activeProfileSection === "services" && (
          <details className="profile-collapse" id="services" open onToggle={keepSectionOpen}>
            <summary>
              <div>
                <span>Послуги</span>
                <strong>Що виконує майстер</strong>
              </div>
              {isOwnerView && (
                <button
                  className="profile-owner-edit-link"
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openServicesEditor();
                  }}
                >
                  <Pencil size={14} /> Редагувати
                </button>
              )}
              <small>{visibleMaster.services.length} позиції</small>
            </summary>
            <div className="profile-collapse-body">
              {isServicesEditing ? (
                <div className="profile-about-inline-editor">
                  <div className="profile-inline-service-list">
                    {servicesDraft.map((service, index) => (
                      <div className="profile-inline-service-row" key={index}>
                        <label>
                          Послуга
                          <input
                            value={service.name}
                            onChange={(event) => updateServiceDraft(index, "name", event.target.value)}
                            required
                          />
                        </label>
                        <label>
                          Ціна
                          <input
                            value={service.price}
                            placeholder="від 350 грн/м²"
                            onChange={(event) => updateServiceDraft(index, "price", event.target.value)}
                            required
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeServiceDraft(index)}
                          disabled={servicesDraft.length === 1}
                          aria-label={`Видалити послугу ${index + 1}`}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    className="profile-inline-add-button"
                    type="button"
                    onClick={() =>
                      setServicesDraft((current) => [...current, { name: "", price: "" }])
                    }
                  >
                    + Додати послугу
                  </button>
                  <div className="profile-about-inline-actions">
                    <button type="button" onClick={cancelServicesEditor}>
                      <X size={15} /> Скасувати
                    </button>
                    <button
                      type="button"
                      disabled={
                        servicesStatus === "saving" ||
                        servicesDraft.some((service) => !service.name.trim() || !service.price.trim())
                      }
                      onClick={saveServicesSection}
                    >
                      <Check size={15} />
                      {servicesStatus === "saving" ? "Зберігаємо..." : "Зберегти"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="services-list services-list-inline">
                    {visibleMaster.services.map((service) => (
                      <div key={`${service.name}-${service.price}`}>
                        <span>{service.name}</span>
                        <strong>{service.price}</strong>
                      </div>
                    ))}
                  </div>
                  <a className="request-button profile-collapse-action" href="#booking">
                    Обрати дату для заявки
                  </a>
                  {servicesStatus === "success" && (
                    <p className="profile-about-inline-status" role="status">
                      Послуги оновлено.
                    </p>
                  )}
                </>
              )}
            </div>
          </details>
          )}

          {activeProfileSection === "portfolio" && (
          <details className="profile-collapse" id="portfolio" open onToggle={keepSectionOpen}>
            <summary>
              <div>
                <span>Портфоліо</span>
                <strong>Виконані роботи</strong>
              </div>
              {isOwnerView && (
                <button
                  className="profile-owner-edit-link"
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openPortfolioEditor();
                  }}
                >
                  <Pencil size={14} /> Редагувати
                </button>
              )}
              <small>{portfolioItems.length || visibleMaster.works.length} проєкти</small>
            </summary>
            <div className="profile-collapse-body">
              {isPortfolioEditing && activePortfolioEditId && (
                <div className="profile-about-inline-editor profile-portfolio-inline-editor">
                  {portfolioDraft
                    .filter((item) => item.id === activePortfolioEditId)
                    .map((item) => (
                    <div className="profile-inline-portfolio-row" key={item.id}>
                      <label>
                        Назва роботи
                        <input
                          value={item.title}
                          onChange={(event) =>
                            updatePortfolioDraft(item.id, "title", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Місто
                        <input
                          value={item.city}
                          onChange={(event) =>
                            updatePortfolioDraft(item.id, "city", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Тип обʼєкта
                        <input
                          value={item.objectType}
                          onChange={(event) =>
                            updatePortfolioDraft(item.id, "objectType", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Підсумкова вартість
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.totalAmount}
                          onChange={(event) =>
                            updatePortfolioDraft(item.id, "totalAmount", Number(event.target.value))
                          }
                        />
                      </label>
                      <label className="profile-edit-wide">
                        Опис
                        <textarea
                          rows={3}
                          value={item.description}
                          onChange={(event) =>
                            updatePortfolioDraft(item.id, "description", event.target.value)
                          }
                        />
                      </label>
                      <div className="profile-inline-work-lines">
                        <div className="profile-inline-work-lines-head">
                          <strong>Кошторис робіт</strong>
                          <button type="button" onClick={() => addPortfolioLineDraft(item.id)}>
                            + Додати рядок
                          </button>
                        </div>
                        {item.workLines.map((line) => (
                          <div className="profile-inline-work-line" key={line.id}>
                            <label>
                              Робота
                              <input
                                value={line.workType}
                                onChange={(event) =>
                                  updatePortfolioLineDraft(item.id, line.id, "workType", event.target.value)
                                }
                              />
                            </label>
                            <label>
                              Обсяг
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.volume}
                                onChange={(event) =>
                                  updatePortfolioLineDraft(item.id, line.id, "volume", event.target.value)
                                }
                              />
                            </label>
                            <label>
                              Одиниця
                              <input
                                value={line.unit}
                                onChange={(event) =>
                                  updatePortfolioLineDraft(item.id, line.id, "unit", event.target.value)
                                }
                              />
                            </label>
                            <label>
                              Ціна
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.unitPrice}
                                onChange={(event) =>
                                  updatePortfolioLineDraft(item.id, line.id, "unitPrice", event.target.value)
                                }
                              />
                            </label>
                            <div>
                              <span>Разом</span>
                              <strong>{formatUah(line.total)}</strong>
                            </div>
                            <button
                              type="button"
                              onClick={() => removePortfolioLineDraft(item.id, line.id)}
                              disabled={item.workLines.length === 1}
                              aria-label={`Видалити рядок ${line.workType || "кошторису"}`}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="profile-about-inline-actions">
                    <button type="button" onClick={closePortfolioEditor}>
                      <X size={15} /> Скасувати
                    </button>
                    <button type="button" onClick={savePortfolioSection}>
                      <Check size={15} /> Зберегти
                    </button>
                  </div>
                </div>
              )}
              <div
                className="portfolio-slideshow"
                onPointerDown={pausePortfolioSlideshow}
                onWheel={pausePortfolioSlideshow}
              >
                {portfolioSlideCount > 1 && (
                  <div className="portfolio-slideshow-controls">
                    <button type="button" onClick={showPreviousPortfolioProject} aria-label="Попередній проєкт">
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPortfolioSlideshowPaused((current) => !current)}
                      aria-label={isPortfolioSlideshowPaused ? "Запустити слайд-шоу" : "Зупинити слайд-шоу"}
                    >
                      {isPortfolioSlideshowPaused ? <Play size={16} /> : <Pause size={16} />}
                      {isPortfolioSlideshowPaused ? "Запустити" : "Пауза"}
                    </button>
                    <button type="button" onClick={showNextPortfolioProject} aria-label="Наступний проєкт">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
                <div className="portfolio-slideshow-viewport">
              <div
                className="work-gallery portfolio-slideshow-track"
                style={{ transform: `translateX(-${activePortfolioProjectIndex * 100}%)` }}
              >
                {portfolioItems.map((item) => {
                  const photos = getPortfolioPhotos(item);
                  const activePhotoIndex = activePortfolioSlides[item.id] ?? 0;
                  const activePhoto = photos[activePhotoIndex] ?? photos[0];
                  const itemReviews = portfolioReviews.filter((review) => review.itemId === item.id);

                  return (
                  <article
                    className={`work-card editable-work-card ${
                      portfolioItems[activePortfolioProjectIndex]?.id === item.id ? "is-active" : ""
                    }`}
                    key={item.id}
                    role={isOwnerView ? "button" : undefined}
                    tabIndex={isOwnerView ? 0 : undefined}
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest("button")) return;
                      openPortfolioProject(item.id);
                    }}
                    onKeyDown={(event) => {
                      if (!isOwnerView || event.key !== "Enter") return;
                      openPortfolioProject(item.id);
                    }}
                  >
                    <div className="work-image portfolio-work-photo">
                      <img src={activePhoto} alt={item.title} />
                      {photos.length > 1 && (
                        <div className="profile-portfolio-slider">
                          <button
                            type="button"
                            aria-label="Попереднє фото"
                            onClick={() =>
                              setActivePortfolioSlides((current) => ({
                                ...current,
                                [item.id]: (activePhotoIndex - 1 + photos.length) % photos.length,
                              }))
                            }
                          >
                            <ChevronLeft size={17} />
                          </button>
                          <span>{activePhotoIndex + 1} / {photos.length}</span>
                          <button
                            type="button"
                            aria-label="Наступне фото"
                            onClick={() =>
                              setActivePortfolioSlides((current) => ({
                                ...current,
                                [item.id]: (activePhotoIndex + 1) % photos.length,
                              }))
                            }
                          >
                            <ChevronRight size={17} />
                          </button>
                        </div>
                      )}
                      {isOwnerView && (
                        <button
                          className="portfolio-project-edit profile-portfolio-edit"
                          type="button"
                          onClick={() => openPortfolioEditor(item.id)}
                        >
                          <Pencil size={15} /> Редагувати
                        </button>
                      )}
                    </div>
                    <div className="work-card-body">
                      <div className="work-meta-row">
                        <span>{item.objectType}</span>
                        <small>{item.city}</small>
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      {itemReviews[0] && (
                        <div className="work-card-review">
                          <div>
                            <Star size={14} />
                            <strong>{itemReviews[0].rating.toFixed(1)}</strong>
                            <span>{itemReviews.length} відгуків</span>
                          </div>
                          <p>{itemReviews[0].text}</p>
                        </div>
                      )}
                      <div className="work-total">
                        <span>Підсумкова вартість</span>
                        <strong>{formatUah(item.totalAmount)}</strong>
                      </div>
                      <div className="work-detail-list">
                        {item.workLines.map((line) => (
                          <div key={line.id}>
                            <span>{line.workType}</span>
                            <small>
                              {line.volume} {line.unit} × {formatUah(line.unitPrice)} = {formatUah(line.total)}
                            </small>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                  );
                })}
                {portfolioItems.length === 0 && visibleMaster.works.map((work, index) => {
                  const details =
                    work.details ??
                    (index === 0
                      ? [
                          {
                            name: "Монтаж електрощита",
                            quantity: "1 шт",
                            unitPrice: "4 500 грн",
                            total: "4 500 грн",
                          },
                          {
                            name: "Монтаж електроточки",
                            quantity: "62 шт",
                            unitPrice: "350 грн",
                            total: "21 700 грн",
                          },
                        ]
                      : [
                          {
                            name: visibleMaster.services[0]?.name ?? "Основна послуга",
                            quantity: "1 обʼєкт",
                            unitPrice: visibleMaster.services[0]?.price ?? "за кошторисом",
                            total: work.total ?? "за кошторисом",
                          },
                        ]);

                  return (
                    <article
                      className={`work-card ${activePortfolioProjectIndex === index ? "is-active" : ""}`}
                      key={work.title}
                      onClick={pausePortfolioSlideshow}
                    >
                      <div className={`work-image work-crop-${work.crop}`} />
                      <div className="work-card-body">
                        <div className="work-meta-row">
                          <span>{work.category ?? "Квартира"}</span>
                          <small>{work.location}</small>
                        </div>
                        <h3>{work.title}</h3>
                        <p>
                          {work.description ??
                            "Комплекс робіт виконано під ключ з погодженим кошторисом і фінальною перевіркою якості."}
                        </p>
                        <div className="work-total">
                          <span>Підсумкова вартість</span>
                          <strong>{work.total ?? (index === 0 ? "26 200 грн" : "за кошторисом")}</strong>
                        </div>
                        <div className="work-detail-list">
                          {details.map((item) => (
                            <div key={`${work.title}-${item.name}`}>
                              <span>{item.name}</span>
                              <small>
                                {item.quantity} × {item.unitPrice} = {item.total}
                              </small>
                            </div>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
                </div>
                {portfolioSlideCount > 1 && (
                  <div className="portfolio-slideshow-dots" aria-label="Проєкти портфоліо">
                    {Array.from({ length: portfolioSlideCount }, (_, index) => (
                      <button
                        className={activePortfolioProjectIndex === index ? "active" : ""}
                        type="button"
                        key={index}
                        aria-label={`Показати проєкт ${index + 1}`}
                        onClick={() => showPortfolioProject(index)}
                      />
                    ))}
                  </div>
                )}
              </div>
              {isOwnerView && (
                <Link className="portfolio-add-card profile-portfolio-add" href="/dashboard/portfolio/new">
                  <span>+</span>
                  <strong>Додати роботу</strong>
                  <small>Фото, опис і кошторис зʼявляться в публічному профілі.</small>
                </Link>
              )}
            </div>
          </details>
          )}

          {activeProfileSection === "reviews" && (
          <details className="profile-collapse" id="reviews" open onToggle={keepSectionOpen}>
            <summary>
              <div>
                <span>Відгуки</span>
                <strong>Відгуки клієнтів</strong>
              </div>
              <small>{portfolioReviews.length} відгуків</small>
            </summary>
            <div className="profile-collapse-body">
              <section className="portfolio-reviews-block">
                <div className="portfolio-reviews-head">
                  <div>
                    <span>Відгуки до робіт</span>
                    <strong>Що кажуть клієнти про виконані проєкти</strong>
                  </div>
                  <small>{visibleMaster.rating.toFixed(1)} середня оцінка</small>
                </div>
                <div className="portfolio-reviews-list">
                  {portfolioReviews.map((review) => (
                    <article className="portfolio-review-card" key={review.id}>
                      <div className="portfolio-review-card-head">
                        <div>
                          <strong>{review.author}</strong>
                          <span>{review.date}</span>
                        </div>
                        <span>
                          <Star size={14} /> {review.rating.toFixed(1)}
                        </span>
                      </div>
                      <p>{review.text}</p>
                      <small>До роботи: {review.itemTitle}</small>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </details>
          )}

          {activeProfileSection === "message" && (
          <details className="profile-collapse" open onToggle={keepSectionOpen}>
            <summary>
              <div>
                <span>Прямий звʼязок</span>
                <strong>Написати майстру без вибору дати</strong>
              </div>
              {isOwnerView && (
                <Link className="profile-owner-edit-link" href={`/dashboard/profile?masterId=${visibleMaster.id}#profile-contacts`}>
                  <Pencil size={14} /> Контакти
                </Link>
              )}
            </summary>
            <div className="profile-collapse-body profile-message-section">
              <DirectMessageForm masterId={visibleMaster.id} masterName={visibleMaster.name} />
            </div>
          </details>
          )}

          {activeProfileSection === "booking" && (
          <details className="profile-collapse" open onToggle={keepSectionOpen}>
            <summary>
              <div>
                <span>Онлайн-заявка</span>
                <strong>Період, заявка та пряме повідомлення</strong>
              </div>
              {isOwnerView && (
                <Link className="profile-owner-edit-link" href={`/dashboard/profile?masterId=${visibleMaster.id}#profile-calendar`}>
                  <Pencil size={14} /> Календар
                </Link>
              )}
            </summary>
            <div className="profile-collapse-body">
              <BookingForm
                masterId={visibleMaster.id}
                masterName={visibleMaster.name}
                busyDates={visibleMaster.busyDates}
                masterServices={bookingServices}
              />
            </div>
          </details>
          )}
        </div>
      </div>
    </main>
  );
}
