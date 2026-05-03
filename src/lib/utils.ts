import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function startOfWeek(d = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay();
  // måndag = 1, söndag = 0
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatDateISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function weekdayName(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { weekday: "long" }).format(d);
}

export function shortDate(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
  }).format(d);
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o");
}
