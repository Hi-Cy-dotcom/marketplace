import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const wholePriceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const centsPriceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPrice(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return "Free";
  return Number.isInteger(price)
    ? wholePriceFormatter.format(price)
    : centsPriceFormatter.format(price);
}

/** Keeps digits and a single decimal point (max 2 decimals) and adds thousands separators. */
export function formatPriceInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const [intPart = "", ...rest] = cleaned.split(".");
  const decimals = rest.join("").slice(0, 2);
  const normalizedInt = intPart.replace(/^0+(?=\d)/, "");
  const withCommas = normalizedInt.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return cleaned.includes(".") ? `${withCommas || "0"}.${decimals}` : withCommas;
}

export function parsePriceInput(formatted: string): number {
  const value = Number.parseFloat(formatted.replace(/,/g, ""));
  return Number.isFinite(value) ? value : Number.NaN;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (Number.isNaN(seconds)) return "";
  if (seconds < 60) return "just now";
  const units: [number, string][] = [
    [60 * 60 * 24 * 365, "year"],
    [60 * 60 * 24 * 30, "month"],
    [60 * 60 * 24 * 7, "week"],
    [60 * 60 * 24, "day"],
    [60 * 60, "hour"],
    [60, "minute"],
  ];
  for (const [unitSeconds, label] of units) {
    const value = Math.floor(seconds / unitSeconds);
    if (value >= 1) return `${value} ${label}${value > 1 ? "s" : ""} ago`;
  }
  return "just now";
}
