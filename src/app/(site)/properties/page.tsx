import type { Metadata } from "next";
import PropertyBrowser from "@/components/property/property-browser";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import { getCategoryNames } from "@/lib/categories";
import { searchProperties } from "@/lib/property-data";
import { normaliseMode } from "@/lib/search-options";

export const dynamic = "force-dynamic";

type Params = Record<"location" | "status" | "type" | "sort" | "minPrice" | "maxPrice" | "minBeds" | "page", string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const numberOrUndefined = (v?: string) => (v && Number.isFinite(Number(v)) ? Number(v) : undefined);

const COPY = {
  all: { title: "Properties for sale and rent", lead: "Browse every published home, apartment and plot, then narrow the list by location, budget and size." },
  sale: { title: "Properties for sale", lead: "Houses, apartments and plots currently offered for sale, with clear pricing and specifications." },
  rent: { title: "Properties for rent", lead: "Homes and apartments available to rent, with monthly prices shown on every listing." },
};

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const mode = normaliseMode(first((await searchParams).status));
  return { title: COPY[mode].title, description: COPY[mode].lead };
}

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const initial = {
    location: first(params.location),
    status: first(params.status),
    type: first(params.type),
    sort: first(params.sort),
    minPrice: first(params.minPrice),
    maxPrice: first(params.maxPrice),
    minBeds: first(params.minBeds),
    page: first(params.page),
  };
  const mode = normaliseMode(initial.status);
  const typesPromise = getCategoryNames();
  const result = await searchProperties({
    location: initial.location,
    status: initial.status,
    type: initial.type,
    sort: initial.sort,
    minPrice: numberOrUndefined(initial.minPrice),
    maxPrice: numberOrUndefined(initial.maxPrice),
    minBeds: numberOrUndefined(initial.minBeds),
    page: numberOrUndefined(initial.page) || 1,
    pageSize: 12,
  });

  return (
    <div className="container listings-page">
      <header className="page-head">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Properties", href: "/properties" }, ...(mode !== "all" ? [{ label: mode === "sale" ? "For sale" : "For rent" }] : [])]} />
        <h1>{COPY[mode].title}</h1>
        <p className="lead">{COPY[mode].lead}</p>
      </header>
      <PropertyBrowser initial={initial} initialResult={result} types={await typesPromise} />
    </div>
  );
}
