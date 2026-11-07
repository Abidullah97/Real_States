"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { useDrawer } from "@/components/ui/use-drawer";
import { BEDROOM_OPTIONS, PROPERTY_TYPES, budgetOptions } from "@/lib/search-options";

type Mode = "sale" | "rent" | "sell";
const TABS: { mode: Mode; label: string }[] = [
  { mode: "sale", label: "Buy" },
  { mode: "rent", label: "Rent" },
  { mode: "sell", label: "Sell" },
];

/**
 * Hero search. Buy and Rent search published listings; Sell switches the panel to the
 * owner submission path rather than pretending to search.
 */
export default function PropertySearch({ cities = [], types = [...PROPERTY_TYPES] }: { cities?: string[]; types?: string[] }) {
  const router = useRouter();
  const id = useId();
  const [mode, setMode] = useState<Mode>("sale");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minBeds, setMinBeds] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  useDrawer(drawerOpen, drawerRef, closeDrawer);

  const budgets = budgetOptions(mode === "rent" ? "rent" : "sale");
  const bedsRelevant = type !== "Land";
  const extraCount = [minPrice, maxPrice, bedsRelevant && minBeds].filter(Boolean).length;

  function switchMode(next: Mode) {
    setMode(next);
    setMinPrice("");
    setMaxPrice("");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === "sell") {
      router.push("/sell");
      return;
    }
    const q = new URLSearchParams({ status: mode });
    if (location.trim()) q.set("location", location.trim());
    if (type) q.set("type", type);
    if (minPrice) q.set("minPrice", minPrice);
    if (maxPrice) q.set("maxPrice", maxPrice);
    if (minBeds && bedsRelevant) q.set("minBeds", minBeds);
    router.push(`/properties?${q.toString()}`);
  }

  const priceSelect = (which: "min" | "max") => {
    const value = which === "min" ? minPrice : maxPrice;
    const other = which === "min" ? maxPrice : minPrice;
    const options = budgets.filter((b) => !other || (which === "min" ? Number(b.value) < Number(other) : Number(b.value) > Number(other)));
    return (
      <div className={`hs-field hs-${which}`}>
        <label htmlFor={`${id}-${which}`}>{which === "min" ? "Min price" : "Max price"}</label>
        <select id={`${id}-${which}`} value={value} onChange={(e) => (which === "min" ? setMinPrice(e.target.value) : setMaxPrice(e.target.value))}>
          <option value="">{which === "min" ? "No min" : "No max"}</option>
          {options.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
              {mode === "rent" ? " / mo" : ""}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <form className="hero-search" role="search" aria-label="Find a property" onSubmit={submit}>
      <div className="hero-search-tabs" role="radiogroup" aria-label="What would you like to do?">
        {TABS.map((t) => (
          <button key={t.mode} type="button" role="radio" aria-checked={mode === t.mode} className={mode === t.mode ? "is-active" : ""} onClick={() => switchMode(t.mode)}>
            {t.label}
          </button>
        ))}
      </div>

      {mode === "sell" ? (
        <div className="hero-sell">
          <span className="hero-sell-icon" aria-hidden="true">
            <Icon name="key" size={22} />
          </span>
          <div>
            <p className="hero-sell-title">Selling or renting out a property?</p>
            <p className="hero-sell-text">Submit the details in a few minutes. Our team reviews every listing before it goes live.</p>
          </div>
          <div className="hero-sell-actions">
            <Link href="/agents" className="btn btn-secondary btn-lg">
              Find an agent
            </Link>
            <button type="submit" className="btn btn-gold btn-lg">
              List your property <Icon name="arrow-right" size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="hero-search-row">
          <div className="hs-field hs-location">
            <label htmlFor={`${id}-location`}>Location</label>
            <div className="hs-control">
              <Icon name="pin" size={18} />
              <input
                id={`${id}-location`}
                list={`${id}-cities`}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City or neighbourhood"
                autoComplete="off"
                maxLength={100}
              />
              <datalist id={`${id}-cities`}>
                {cities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="hs-field hs-type">
            <label htmlFor={`${id}-type`}>Property type</label>
            <select id={`${id}-type`} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Any type</option>
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className={`drawer-backdrop hs-backdrop ${drawerOpen ? "is-open" : ""}`} onClick={closeDrawer} aria-hidden="true" />
          <div
            ref={drawerRef}
            className={`hs-extra ${drawerOpen ? "is-open" : ""}`}
            role={drawerOpen ? "dialog" : undefined}
            aria-modal={drawerOpen || undefined}
            aria-labelledby={drawerOpen ? `${id}-filters-title` : undefined}
          >
            <div className="hs-drawer-head">
              <h2 id={`${id}-filters-title`}>Price and bedrooms</h2>
              <button type="button" className="icon-btn icon-btn-bordered" onClick={closeDrawer} aria-label="Close filters">
                <Icon name="close" />
              </button>
            </div>
            {priceSelect("min")}
            {priceSelect("max")}
            <div className="hs-field hs-beds">
              <label htmlFor={`${id}-beds`}>Bedrooms</label>
              <select id={`${id}-beds`} value={bedsRelevant ? minBeds : ""} onChange={(e) => setMinBeds(e.target.value)} disabled={!bedsRelevant}>
                <option value="">{bedsRelevant ? "Any" : "Not applicable"}</option>
                {BEDROOM_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}+ beds
                  </option>
                ))}
              </select>
            </div>
            <div className="hs-drawer-foot">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setMinPrice("");
                  setMaxPrice("");
                  setMinBeds("");
                }}
              >
                Reset
              </button>
              <button type="button" className="btn" onClick={closeDrawer}>
                Apply
              </button>
            </div>
          </div>

          <button type="button" className="hs-more" aria-haspopup="dialog" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>
            <Icon name="sliders" size={18} />
            Price & beds
            {extraCount > 0 && <span className="hs-count">{extraCount}</span>}
          </button>
          <button type="submit" className="btn btn-gold btn-lg hs-submit">
            <Icon name="search" size={18} />
            <span>Search</span>
          </button>
        </div>
      )}
    </form>
  );
}
