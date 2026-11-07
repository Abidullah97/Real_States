import { formatAmount } from "@/lib/format";

export const PROPERTY_TYPES = ["House", "Apartment", "Villa", "Townhouse", "Land"] as const;
export const BEDROOM_OPTIONS = ["1", "2", "3", "4", "5"] as const;

export type ListingMode = "all" | "sale" | "rent";

const SALE_BUDGETS = [5_000_000, 10_000_000, 20_000_000, 30_000_000, 50_000_000, 100_000_000, 200_000_000];
const RENT_BUDGETS = [50_000, 100_000, 150_000, 250_000, 400_000, 600_000, 1_000_000];

/** Normalises the many ways a listing type may arrive in a URL ("buy", "sale", "SALE"). */
export function normaliseMode(value: string | undefined | null): ListingMode {
  const v = (value || "").toLowerCase();
  if (v === "buy" || v === "sale") return "sale";
  if (v === "rent") return "rent";
  return "all";
}

/** Budget presets suited to the listing type. A custom URL value is kept as an extra option. */
export function budgetOptions(mode: ListingMode, current?: string) {
  const values = mode === "rent" ? RENT_BUDGETS : mode === "sale" ? SALE_BUDGETS : [...RENT_BUDGETS, ...SALE_BUDGETS];
  const list = [...new Set(values)];
  const custom = current ? Number(current) : NaN;
  if (Number.isFinite(custom) && custom > 0 && !list.includes(custom)) list.push(custom);
  return list.sort((a, b) => a - b).map((value) => ({ value: String(value), label: formatAmount(value) }));
}

export function sortLabel(sort: string) {
  return sort === "low" ? "Price: low to high" : sort === "high" ? "Price: high to low" : "Newest first";
}
