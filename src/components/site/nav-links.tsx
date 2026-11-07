"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { normaliseMode } from "@/lib/search-options";

export const NAV_ITEMS = [
  { label: "Buy", href: "/properties?status=sale", match: "sale" },
  { label: "Rent", href: "/properties?status=rent", match: "rent" },
  { label: "Sell", href: "/sell" },
  { label: "Agents", href: "/agents" },
  { label: "About", href: "/about" },
] as const;

/** Main navigation with an active state that understands Buy/Rent search modes. */
export default function NavLinks({ className = "", onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const mode = normaliseMode(params.get("status"));
  return (
    <ul className={className}>
      {NAV_ITEMS.map((item) => {
        const active = "match" in item ? pathname === "/properties" && mode === item.match : pathname.startsWith(item.href);
        return (
          <li key={item.label}>
            <Link href={item.href} aria-current={active ? "page" : undefined} onClick={onNavigate}>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function StaticNavLinks({ className = "" }: { className?: string }) {
  return (
    <ul className={className}>
      {NAV_ITEMS.map((item) => (
        <li key={item.label}>
          <Link href={item.href}>{item.label}</Link>
        </li>
      ))}
    </ul>
  );
}
