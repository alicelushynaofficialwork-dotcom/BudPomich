import type { MasterProfile } from "@/lib/masters";

export function getMinimumServicePrice(services: MasterProfile["services"], fallback: number) {
  const prices = services
    .map((service) => {
      const match = service.price.match(/[\d\s]+/);
      if (!match) return null;

      const value = Number(match[0].replace(/\s/g, ""));
      return Number.isFinite(value) ? value : null;
    })
    .filter((value): value is number => value !== null);

  if (!prices.length) return fallback;

  return Math.min(...prices);
}

export function formatPriceFromServices(services: MasterProfile["services"], fallback: number) {
  return `від ${getMinimumServicePrice(services, fallback).toLocaleString("uk-UA")} грн`;
}
