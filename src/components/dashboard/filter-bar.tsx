import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export type FilterSelect = { name: string; label: string; value?: string; options: { value: string; label: string }[] };

/**
 * Server-side filter form (plain GET form): search box, select filters and a sort control.
 * Works without JavaScript and keeps filters in the URL so views can be shared and bookmarked.
 */
export default function FilterBar({
  action,
  query,
  searchPlaceholder = "Search",
  selects = [],
  hidden = {},
  resetHref,
}: {
  action: string;
  query?: string;
  searchPlaceholder?: string;
  selects?: FilterSelect[];
  hidden?: Record<string, string | undefined>;
  resetHref?: string;
}) {
  const active = !!query || selects.some((s) => s.value);
  return (
    <form action={action} className="filter-bar" role="search">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <div className="table-search">
        <label htmlFor={`${action}-q`} className="visually-hidden">
          {searchPlaceholder}
        </label>
        <Icon name="search" size={17} />
        <input id={`${action}-q`} name="q" type="search" className="input" defaultValue={query} placeholder={searchPlaceholder} maxLength={100} />
      </div>
      {selects.map((s) => (
        <label key={s.name} className="filter-select">
          <span className="visually-hidden">{s.label}</span>
          <select name={s.name} className="select" defaultValue={s.value || ""} aria-label={s.label}>
            {s.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <button type="submit" className="btn btn-secondary">
        <Icon name="filter" size={16} /> Apply
      </button>
      {active && resetHref && (
        <Link href={resetHref} className="text-link filter-reset">
          Reset
        </Link>
      )}
    </form>
  );
}
