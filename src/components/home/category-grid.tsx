import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { pluralize } from "@/lib/format";
import type { CategorySummary } from "@/lib/site-content";

const ICONS: Record<string, string> = { House: "home", Apartment: "building", Villa: "key", Townhouse: "layers", Land: "map" };

/** Property-type tiles with live published counts, each linking to a filtered search. */
export default function CategoryGrid({ categories }: { categories: CategorySummary[] }) {
  return (
    <ul className="category-grid">
      {categories.map((c) => (
        <li key={c.type}>
          <Link href={`/properties?type=${encodeURIComponent(c.type)}`} className="category-card">
            <span className="category-icon">
              <Icon name={ICONS[c.type] || "grid"} size={26} />
            </span>
            <span className="category-name">{c.type === "Land" ? "Plots & land" : `${c.type}s`}</span>
            <span className="category-count num">{pluralize(c.count, "listing")}</span>
            <span className="category-arrow" aria-hidden="true">
              <Icon name="arrow-right" size={18} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
