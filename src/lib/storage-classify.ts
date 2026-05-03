// Auto-klassa varor till skafferi/kyl/frys baserat på kategori eller namn

export type Storage = "skafferi" | "kyl" | "frys";

export const STORAGE_LABEL: Record<Storage, string> = {
  skafferi: "Skafferi",
  kyl: "Kyl",
  frys: "Frys",
};

const FRYS_KEYWORDS = ["frys", "frozen", "glass", "djupfryst"];
const KYL_CATEGORIES = ["kött", "chark", "fisk", "mejeri", "frukt-grönt"];
const KYL_KEYWORDS = ["mjölk", "yoghurt", "ost", "smör", "ägg", "kyckling", "färs", "fil", "grädde", "crème", "lax", "kebab", "korv"];

export function classifyStorage(category: string | null, name: string | null): Storage {
  const cat = (category ?? "").toLowerCase();
  const n = (name ?? "").toLowerCase();

  if (FRYS_KEYWORDS.some((k) => cat.includes(k) || n.includes(k))) return "frys";
  if (KYL_CATEGORIES.includes(cat)) return "kyl";
  if (KYL_KEYWORDS.some((k) => n.includes(k))) return "kyl";
  return "skafferi";
}
