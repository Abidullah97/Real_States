"use client";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import PropertyCard from "@/components/property/property-card";
import Pagination from "@/components/property/pagination";
import EmptyState from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { PropertyGridSkeleton } from "@/components/ui/skeleton";
import { useDrawer } from "@/components/ui/use-drawer";
import { formatAmount, pluralize } from "@/lib/format";
import { BEDROOM_OPTIONS, PROPERTY_TYPES, budgetOptions, normaliseMode, type ListingMode } from "@/lib/search-options";
import type { Property } from "@/lib/properties";

export type BrowserFilters = { location?: string; status?: string; type?: string; sort?: string; minPrice?: string; maxPrice?: string; minBeds?: string; page?: string };
type Result = { items: Property[]; total: number; page: number; pageSize: number; demo?: boolean };
type State = { location: string; status: ListingMode; type: string; sort: string; minPrice: string; maxPrice: string; minBeds: string; page: number };

type View = "grid" | "list";

const PAGE_SIZE = 12;

// The preferred result layout is a per-visitor convenience kept in localStorage.
function readStoredView(): View {
  try {
    return localStorage.getItem("eh:view") === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
const EMPTY: Omit<State, "location" | "status"> = { type: "", sort: "newest", minPrice: "", maxPrice: "", minBeds: "", page: 1 };

function fromInitial(types: readonly string[], initial?: BrowserFilters): State {
  const typeMatch = types.find((t) => t.toLowerCase() === (initial?.type || "").toLowerCase());
  return {
    location: initial?.location || "",
    status: normaliseMode(initial?.status),
    type: typeMatch || "",
    sort: initial?.sort === "low" || initial?.sort === "high" ? initial.sort : "newest",
    minPrice: initial?.minPrice || "",
    maxPrice: initial?.maxPrice || "",
    minBeds: initial?.minBeds || "",
    page: Math.max(1, Number(initial?.page) || 1),
  };
}

function toQuery(s: State) {
  const q = new URLSearchParams();
  if (s.location) q.set("location", s.location);
  if (s.status !== "all") q.set("status", s.status);
  if (s.type) q.set("type", s.type);
  if (s.sort !== "newest") q.set("sort", s.sort);
  if (s.minPrice) q.set("minPrice", s.minPrice);
  if (s.maxPrice) q.set("maxPrice", s.maxPrice);
  if (s.minBeds && s.type !== "Land") q.set("minBeds", s.minBeds);
  if (s.page > 1) q.set("page", String(s.page));
  return q;
}

export default function PropertyBrowser({ initial, initialResult, types = [...PROPERTY_TYPES] }: { initial?: BrowserFilters; initialResult: Result; types?: string[] }) {
  const id = useId();
  const [state, setState] = useState<State>(() => fromInitial(types, initial));
  const [draftLocation, setDraftLocation] = useState(state.location);
  const storedView = useSyncExternalStore(subscribeToStorage, readStoredView, () => "grid" as const);
  const [chosenView, setView] = useState<View | null>(null);
  const view = chosenView ?? storedView;
  const [data, setData] = useState<Result>(initialResult);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const firstRun = useRef(true);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);
  useDrawer(filtersOpen, filtersRef, closeFilters);

  const update = (patch: Partial<State>) => setState((s) => ({ ...s, page: 1, ...patch }));

  useEffect(() => {
    const q = toQuery(state);
    history.replaceState(null, "", `${location.pathname}${q.toString() ? `?${q}` : ""}`);
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const request = new URLSearchParams(q);
    request.set("page", String(state.page));
    request.set("pageSize", String(PAGE_SIZE));
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      setError("");
      try {
        const response = await fetch(`/api/properties?${request}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Search is temporarily unavailable.");
        setData(result);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Search is temporarily unavailable.");
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [state, reloadKey]);

  function submitLocation(e: FormEvent) {
    e.preventDefault();
    update({ location: draftLocation.trim() });
  }

  function goToPage(page: number) {
    setState((s) => ({ ...s, page }));
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function chooseView(next: View) {
    setView(next);
    try {
      localStorage.setItem("eh:view", next);
    } catch {}
  }

  const clearAll = () => {
    setDraftLocation("");
    setState({ location: "", status: "all", ...EMPTY });
  };

  const budgets = budgetOptions(state.status, state.minPrice || state.maxPrice);
  const bedsRelevant = state.type !== "Land";
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const filterCount = [state.type, state.minPrice, state.maxPrice, bedsRelevant && state.minBeds].filter(Boolean).length;

  const chips: { label: string; clear: () => void }[] = [];
  if (state.location) chips.push({ label: `Location: ${state.location}`, clear: () => { setDraftLocation(""); update({ location: "" }); } });
  if (state.status !== "all") chips.push({ label: state.status === "rent" ? "For rent" : "For sale", clear: () => update({ status: "all", minPrice: "", maxPrice: "" }) });
  if (state.type) chips.push({ label: state.type, clear: () => update({ type: "" }) });
  if (state.minPrice) chips.push({ label: `From ${formatAmount(Number(state.minPrice))}`, clear: () => update({ minPrice: "" }) });
  if (state.maxPrice) chips.push({ label: `Up to ${formatAmount(Number(state.maxPrice))}`, clear: () => update({ maxPrice: "" }) });
  if (state.minBeds && bedsRelevant) chips.push({ label: `${state.minBeds}+ bedrooms`, clear: () => update({ minBeds: "" }) });

  const summary = [state.status === "rent" ? "for rent" : state.status === "sale" ? "for sale" : "", state.location ? `in ${state.location}` : ""].filter(Boolean).join(" ");

  return (
    <>
      <form className="listings-search" role="search" aria-label="Search properties" onSubmit={submitLocation}>
        <div className="listings-mode" role="radiogroup" aria-label="Listing type">
          {(["all", "sale", "rent"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={state.status === m}
              className={state.status === m ? "is-active" : ""}
              onClick={() => update({ status: m, minPrice: "", maxPrice: "" })}
            >
              {m === "all" ? "All" : m === "sale" ? "Buy" : "Rent"}
            </button>
          ))}
        </div>
        <div className="listings-search-input">
          <label htmlFor={`${id}-location`} className="visually-hidden">
            City or neighbourhood
          </label>
          <Icon name="search" size={18} />
          <input
            id={`${id}-location`}
            type="search"
            value={draftLocation}
            onChange={(e) => setDraftLocation(e.target.value)}
            placeholder="City or neighbourhood"
            maxLength={100}
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn">
          Search
        </button>
      </form>

      <div className="listings-layout">
        <div className={`drawer-backdrop listings-backdrop ${filtersOpen ? "is-open" : ""}`} onClick={closeFilters} aria-hidden="true" />
        <aside
          ref={filtersRef}
          id="property-filters"
          className={`filters-panel ${filtersOpen ? "is-open" : ""}`}
          aria-labelledby={`${id}-filters-title`}
          role={filtersOpen ? "dialog" : undefined}
          aria-modal={filtersOpen || undefined}
        >
          <div className="filters-head">
            <h2 id={`${id}-filters-title`}>Filters</h2>
            {filterCount > 0 && (
              <button type="button" className="filters-clear" onClick={() => update({ type: "", minPrice: "", maxPrice: "", minBeds: "" })}>
                Clear
              </button>
            )}
            <button type="button" className="icon-btn icon-btn-bordered filters-close" onClick={closeFilters} aria-label="Close filters">
              <Icon name="close" />
            </button>
          </div>
          <div className="filters-body">
            <fieldset className="segmented filter-group">
              <legend>Property type</legend>
              {["", ...types].map((t) => (
                <label key={t || "any"}>
                  <input type="radio" name={`${id}-type`} value={t} checked={state.type === t} onChange={() => update({ type: t })} />
                  <span>{t || "Any"}</span>
                </label>
              ))}
            </fieldset>

            <fieldset className="filter-group filter-budget">
              <legend>Budget{state.status === "rent" ? " per month" : ""}</legend>
              <div className="filter-range">
                <div className="field">
                  <label className="field-hint" htmlFor={`${id}-min`}>
                    Minimum
                  </label>
                  <select id={`${id}-min`} className="select" value={state.minPrice} onChange={(e) => update({ minPrice: e.target.value })}>
                    <option value="">No min</option>
                    {budgets
                      .filter((b) => !state.maxPrice || Number(b.value) < Number(state.maxPrice))
                      .map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-hint" htmlFor={`${id}-max`}>
                    Maximum
                  </label>
                  <select id={`${id}-max`} className="select" value={state.maxPrice} onChange={(e) => update({ maxPrice: e.target.value })}>
                    <option value="">No max</option>
                    {budgets
                      .filter((b) => !state.minPrice || Number(b.value) > Number(state.minPrice))
                      .map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </fieldset>

            <fieldset className="segmented filter-group" disabled={!bedsRelevant}>
              <legend>Bedrooms{!bedsRelevant && <span className="field-optional"> · not applicable to land</span>}</legend>
              {["", ...BEDROOM_OPTIONS].map((b) => (
                <label key={b || "any"}>
                  <input type="radio" name={`${id}-beds`} value={b} checked={(bedsRelevant ? state.minBeds : "") === b} onChange={() => update({ minBeds: b })} />
                  <span>{b ? `${b}+` : "Any"}</span>
                </label>
              ))}
            </fieldset>
          </div>
          <div className="filters-foot">
            <button type="button" className="btn btn-ghost" onClick={clearAll}>
              Clear all
            </button>
            <button type="button" className="btn" onClick={closeFilters}>
              Show {pluralize(data.total, "result")}
            </button>
          </div>
        </aside>

        <section ref={resultsRef} className="listings-results" aria-labelledby={`${id}-results-title`} aria-busy={busy}>
          <div className="results-toolbar">
            <div>
              <h2 id={`${id}-results-title`} className="results-count" aria-live="polite">
                {busy ? (
                  "Updating results…"
                ) : (
                  <>
                    <span className="num">{pluralize(data.total, "property", "properties")}</span> {summary}
                  </>
                )}
              </h2>
            </div>
            <div className="results-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm filters-toggle"
                aria-expanded={filtersOpen}
                aria-controls="property-filters"
                onClick={() => setFiltersOpen(true)}
              >
                <Icon name="sliders" size={16} /> Filters
                {filterCount > 0 && <span className="filters-count">{filterCount}</span>}
              </button>
              <label className="sort-control">
                <span className="visually-hidden">Sort results</span>
                <select className="select" value={state.sort} onChange={(e) => update({ sort: e.target.value })}>
                  <option value="newest">Recommended</option>
                  <option value="low">Price: low to high</option>
                  <option value="high">Price: high to low</option>
                </select>
              </label>
              <div className="view-toggle" role="group" aria-label="Result layout">
                <button type="button" aria-pressed={view === "grid"} onClick={() => chooseView("grid")} aria-label="Grid view" title="Grid view">
                  <Icon name="grid" size={18} />
                </button>
                <button type="button" aria-pressed={view === "list"} onClick={() => chooseView("list")} aria-label="List view" title="List view">
                  <Icon name="list" size={18} />
                </button>
              </div>
            </div>
          </div>

          {chips.length > 0 && (
            <ul className="active-chips" aria-label="Active filters">
              {chips.map((c) => (
                <li key={c.label}>
                  <button type="button" className="chip" onClick={c.clear} aria-label={`Remove filter: ${c.label}`}>
                    {c.label} <Icon name="close" size={14} />
                  </button>
                </li>
              ))}
              {chips.length > 1 && (
                <li>
                  <button type="button" className="chip-clear" onClick={clearAll}>
                    Clear all
                  </button>
                </li>
              )}
            </ul>
          )}

          {busy && <div className="results-progress" aria-hidden="true" />}

          {error ? (
            <EmptyState
              icon="alert"
              title="We couldn’t load properties"
              description={error}
              action={
                <button type="button" className="btn" onClick={() => setReloadKey((k) => k + 1)}>
                  Try again
                </button>
              }
            />
          ) : busy && !data.items.length ? (
            <PropertyGridSkeleton count={6} variant={view} />
          ) : data.items.length ? (
            <>
              <div className={`${view === "list" ? "property-list" : "property-grid results-grid"} ${busy ? "is-updating" : ""}`}>
                {data.items.map((p, i) => (
                  <PropertyCard key={p.slug} property={p} variant={view} priority={i < 3} />
                ))}
              </div>
              <Pagination page={data.page} totalPages={totalPages} onPageChange={goToPage} label="Property result pages" />
              {data.demo && (
                <p className="alert alert-neutral demo-notice">
                  <Icon name="info" size={18} />
                  The database is not connected, so illustrative demonstration listings are shown.
                </p>
              )}
            </>
          ) : (
            <EmptyState
              icon="search"
              title="No properties match these filters"
              description="Try a nearby area, widen your budget or remove a filter to see more results."
              action={
                <button type="button" className="btn btn-secondary" onClick={clearAll}>
                  Clear all filters
                </button>
              }
            />
          )}
        </section>
      </div>
    </>
  );
}
