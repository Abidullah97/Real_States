const CRORE = 10_000_000;
const LAKH = 100_000;

function trimDecimals(value: number, digits = 2) {
  return Number(value.toFixed(digits)).toLocaleString("en-US", { maximumFractionDigits: digits });
}

/** Short, readable amount. PKR uses the local lakh/crore convention. */
export function formatAmount(amount: number, currency = "PKR") {
  if (currency === "PKR") {
    if (amount >= CRORE) return `PKR ${trimDecimals(amount / CRORE)} Crore`;
    if (amount >= LAKH) return `PKR ${trimDecimals(amount / LAKH)} Lakh`;
    return `PKR ${Math.round(amount).toLocaleString("en-US")}`;
  }
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
  }
}

/** Exact amount with all digits, used for accessible titles and admin tables. */
export function formatExactAmount(amount: number, currency = "PKR") {
  return `${currency} ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function formatPrice(amount: number, currency: string, listingType: "SALE" | "RENT") {
  return listingType === "RENT" ? `${formatExactAmount(amount, currency)} / month` : formatAmount(amount, currency);
}

export function formatArea(area: number, unit: string) {
  return `${area.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${unit}`;
}

export function formatDate(value: Date | string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Date(value).toLocaleDateString("en-GB", options);
}

export function formatRelative(value: Date | string, now = Date.now()) {
  const seconds = Math.round((now - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return formatDate(value);
}

export function initials(name: string | null | undefined, fallback = "EH") {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : plural}`;
}
