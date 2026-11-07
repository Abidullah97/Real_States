import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { properties as demo, type Property } from "@/lib/properties";

export type PropertySearch = {
  location?: string;
  status?: string;
  type?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  page?: number;
  pageSize?: number;
};
export type PropertySearchResult = { items: Property[]; total: number; page: number; pageSize: number; demo?: boolean };

export type LocationSummary = { city: string; count: number; image: string | null };

export type AgentSummary = {
  id: string;
  name: string;
  image: string | null;
  agency: string | null;
  bio: string | null;
  phone: string | null;
  verified: boolean;
  listings: number;
  cities: string[];
  specialties: string[];
};

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80";
const demoAllowed = () => process.env.NODE_ENV !== "production";

type PropertyRow = {
  slug: string;
  title: string;
  reference: string;
  location: { locality: string | null; city: string; latitude: number | null; longitude: number | null };
  price: { toString(): string };
  currency: string;
  listingType: "SALE" | "RENT";
  bedrooms: number;
  bathrooms: number;
  parking: number;
  area: { toString(): string };
  areaUnit: string;
  propertyType: string;
  images: { url: string; alt: string }[];
  featured: boolean;
  featuredUntil?: Date | null;
  publishedAt: Date | null;
};

function mapProperty(p: PropertyRow): Property {
  const price = Number(p.price);
  return {
    slug: p.slug,
    title: p.title,
    reference: p.reference,
    location: [p.location.locality, p.location.city].filter(Boolean).join(", "),
    city: p.location.city,
    price,
    currency: p.currency,
    priceLabel: formatPrice(price, p.currency, p.listingType),
    listingType: p.listingType,
    status: p.listingType === "RENT" ? "For rent" : "For sale",
    beds: p.bedrooms,
    baths: p.bathrooms,
    parking: p.parking,
    area: Number(p.area),
    unit: p.areaUnit,
    kind: p.propertyType,
    image: p.images[0]?.url || FALLBACK_IMAGE,
    // A featured listing whose end date has passed is no longer presented as featured.
    featured: p.featured && !(p.featuredUntil && p.featuredUntil.getTime() < Date.now()),
    latitude: p.location.latitude,
    longitude: p.location.longitude,
    publishedAt: p.publishedAt?.toISOString() ?? null,
  };
}

function listingTypeFilter(status?: string) {
  const v = (status || "").toLowerCase();
  if (v === "rent") return "RENT" as const;
  if (v === "sale" || v === "buy") return "SALE" as const;
  return undefined;
}

function filterDemo(filters: PropertySearch) {
  const type = listingTypeFilter(filters.status);
  const location = filters.location?.toLowerCase();
  let rows = demo.filter(
    (p) =>
      (!location || p.location.toLowerCase().includes(location)) &&
      (!type || p.listingType === type) &&
      (!filters.type || filters.type === "all" || p.kind.toLowerCase() === filters.type.toLowerCase()) &&
      (filters.minPrice === undefined || p.price >= filters.minPrice) &&
      (filters.maxPrice === undefined || p.price <= filters.maxPrice) &&
      (filters.minBeds === undefined || p.beds >= filters.minBeds),
  );
  if (filters.sort === "low") rows = [...rows].sort((a, b) => a.price - b.price);
  else if (filters.sort === "high") rows = [...rows].sort((a, b) => b.price - a.price);
  else if (filters.sort === "latest") rows = [...rows].sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  else rows = [...rows].sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || String(b.publishedAt).localeCompare(String(a.publishedAt)));
  return rows;
}

export async function searchProperties(filters: PropertySearch = {}): Promise<PropertySearchResult> {
  const page = Math.max(1, Math.floor(filters.page || 1));
  const pageSize = Math.min(60, Math.max(1, Math.floor(filters.pageSize || 12)));
  try {
    await expireFeatured();
    const listingType = listingTypeFilter(filters.status);
    const where = {
      status: "PUBLISHED" as const,
      ...(listingType ? { listingType } : {}),
      ...(filters.type && filters.type !== "all" ? { propertyType: { equals: filters.type, mode: "insensitive" as const } } : {}),
      ...(filters.location
        ? {
            location: {
              is: {
                OR: [
                  { city: { contains: filters.location, mode: "insensitive" as const } },
                  { locality: { contains: filters.location, mode: "insensitive" as const } },
                  { area: { contains: filters.location, mode: "insensitive" as const } },
                  { province: { contains: filters.location, mode: "insensitive" as const } },
                ],
              },
            },
          }
        : {}),
      ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
        ? {
            price: {
              ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
              ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
            },
          }
        : {}),
      ...(filters.minBeds !== undefined ? { bedrooms: { gte: filters.minBeds } } : {}),
    };
    const orderBy =
      filters.sort === "low"
        ? { price: "asc" as const }
        : filters.sort === "high"
          ? { price: "desc" as const }
          : filters.sort === "latest"
            ? [{ publishedAt: "desc" as const }]
            : [{ featured: "desc" as const }, { featuredOrder: "asc" as const }, { publishedAt: "desc" as const }];
    const [rows, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: { location: true, images: { orderBy: { position: "asc" }, take: 1 } },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.property.count({ where }),
    ]);
    return { items: rows.map(mapProperty), total, page, pageSize };
  } catch {
    if (demoAllowed()) {
      const rows = filterDemo(filters);
      return { items: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize, demo: true };
    }
    return { items: [], total: 0, page, pageSize };
  }
}

export async function getProperties(): Promise<Property[]> {
  const result = await searchProperties({ pageSize: 60 });
  return result.total ? result.items : demoAllowed() ? demo : [];
}

const AGENT_SELECT = {
  name: true,
  image: true,
  role: true,
  disabledAt: true,
  agentProfile: { select: { id: true, phone: true, verifiedAt: true, agency: { select: { name: true } } } },
} as const;

let lastExpiry = 0;
/** Featured end dates are enforced lazily: at most once a minute, expired listings lose featured status. */
async function expireFeatured() {
  if (Date.now() - lastExpiry < 60_000) return;
  lastExpiry = Date.now();
  await prisma.property.updateMany({ where: { featured: true, featuredUntil: { lt: new Date() } }, data: { featured: false } }).catch(() => {});
}

/** Active featured listings in the administrator-defined order, capped at the homepage limit. */
export async function getFeaturedProperties(limit: number): Promise<Property[]> {
  try {
    await expireFeatured();
    const rows = await prisma.property.findMany({
      // Expired entries are excluded immediately; expireFeatured() later clears their flag as housekeeping.
      where: { status: "PUBLISHED", featured: true, OR: [{ featuredUntil: null }, { featuredUntil: { gt: new Date() } }] },
      include: { location: true, images: { orderBy: { position: "asc" }, take: 1 } },
      orderBy: [{ featuredOrder: "asc" }, { publishedAt: "desc" }],
      take: limit,
    });
    return rows.map(mapProperty);
  } catch {
    return demoAllowed() ? demo.filter((p) => p.featured).slice(0, limit) : [];
  }
}

export async function getPropertyDetails(slug: string): Promise<Property | undefined> {
  try {
    const p = await prisma.property.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: {
        location: true,
        images: { orderBy: { position: "asc" } },
        features: true,
        owner: { select: AGENT_SELECT },
        agent: { select: AGENT_SELECT },
      },
    });
    if (p) {
      // The assigned agent is the contact; otherwise an owner who is an approved agent.
      const contact = p.agent?.role === "AGENT" && !p.agent.disabledAt ? p.agent : p.owner?.role === "AGENT" && !p.owner.disabledAt ? p.owner : null;
      return {
        ...mapProperty(p),
        description: p.description,
        features: p.features.map((f) => f.name),
        images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
        agent: contact
          ? {
              profileId: contact.agentProfile?.id ?? null,
              name: contact.name || "Estate House agent",
              phone: contact.agentProfile?.phone || null,
              verified: !!contact.agentProfile?.verifiedAt,
              agency: contact.agentProfile?.agency?.name ?? null,
              image: contact.image,
            }
          : null,
      };
    }
  } catch {}
  return demoAllowed() ? demo.find((p) => p.slug === slug) : undefined;
}

/** Listings in the same city first, then the same property type, excluding the current one. */
export async function getSimilarProperties(property: Property, limit = 3): Promise<Property[]> {
  const sameCity = await searchProperties({ location: property.city, status: property.listingType === "RENT" ? "rent" : "sale", pageSize: limit + 1 });
  let items = sameCity.items.filter((p) => p.slug !== property.slug);
  if (items.length < limit) {
    const sameType = await searchProperties({ type: property.kind, pageSize: limit + 4 });
    for (const p of sameType.items) if (p.slug !== property.slug && !items.some((x) => x.slug === p.slug)) items.push(p);
  }
  items = items.slice(0, limit);
  return items;
}

/** Cities with published listings, ordered by listing count. Counts and images come from real rows only. */
export async function getLocationSummaries(limit = 4, { images = true }: { images?: boolean } = {}): Promise<LocationSummary[]> {
  try {
    const groups = await prisma.property.groupBy({ by: ["locationId"], where: { status: "PUBLISHED" }, _count: { _all: true } });
    if (!groups.length) return demoAllowed() ? demoLocations(limit) : [];
    const locations = await prisma.location.findMany({ where: { id: { in: groups.map((g) => g.locationId) } }, select: { id: true, city: true } });
    const counts = new Map<string, number>();
    for (const g of groups) {
      const city = locations.find((l) => l.id === g.locationId)?.city;
      if (city) counts.set(city, (counts.get(city) || 0) + g._count._all);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
    if (!images) return top.map(([city, count]) => ({ city, count, image: null }));
    return Promise.all(
      top.map(async ([city, count]) => {
        const cover = await prisma.property.findFirst({
          where: { status: "PUBLISHED", location: { is: { city } }, images: { some: {} } },
          orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
          select: { images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } },
        });
        return { city, count, image: cover?.images[0]?.url ?? null };
      }),
    );
  } catch {
    return demoAllowed() ? demoLocations(limit) : [];
  }
}

function demoLocations(limit: number): LocationSummary[] {
  const map = new Map<string, LocationSummary>();
  for (const p of demo) {
    const entry = map.get(p.city) || { city: p.city, count: 0, image: p.image };
    entry.count += 1;
    map.set(p.city, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

/** Active agent profiles with their published listing counts. Never falls back to invented people. */
export async function getAgents(limit?: number): Promise<AgentSummary[]> {
  try {
    const rows = await prisma.agentProfile.findMany({
      where: { status: "APPROVED", user: { role: "AGENT", disabledAt: null } },
      include: {
        agency: { select: { name: true } },
        user: {
          select: {
            name: true,
            image: true,
            properties: { where: { status: "PUBLISHED" }, select: { id: true, propertyType: true, location: { select: { city: true } } } },
            agentListings: { where: { status: "PUBLISHED" }, select: { id: true, propertyType: true, location: { select: { city: true } } } },
          },
        },
      },
      orderBy: { verifiedAt: { sort: "desc", nulls: "last" } },
      ...(limit ? { take: limit } : {}),
    });
    return rows.map((a) => {
      // Listings the agent owns or has been assigned, counted once each.
      const all = [...new Map([...a.user.properties, ...a.user.agentListings].map((p) => [p.id, p])).values()];
      return {
        id: a.id,
        name: a.user.name || "Estate House agent",
        image: a.user.image,
        agency: a.agency?.name ?? null,
        bio: a.bio,
        phone: a.phone,
        verified: !!a.verifiedAt,
        listings: all.length,
        cities: [...new Set(all.map((p) => p.location.city))].slice(0, 3),
        specialties: a.specialization ? [a.specialization] : [...new Set(all.map((p) => p.propertyType))].slice(0, 3),
      };
    });
  } catch {
    return [];
  }
}

export type AgentProfileData = AgentSummary & { listingsItems: Property[] };

/** A single active agent with their published listings, or null if unavailable. */
export async function getAgentProfile(id: string): Promise<AgentProfileData | null> {
  try {
    const a = await prisma.agentProfile.findFirst({
      where: { id, status: "APPROVED", user: { role: "AGENT", disabledAt: null } },
      include: {
        agency: { select: { name: true } },
        user: {
          select: {
            name: true,
            image: true,
            properties: { where: { status: "PUBLISHED" }, include: { location: true, images: { orderBy: { position: "asc" }, take: 1 } }, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }] },
            agentListings: { where: { status: "PUBLISHED" }, include: { location: true, images: { orderBy: { position: "asc" }, take: 1 } }, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }] },
          },
        },
      },
    });
    if (!a) return null;
    const listingsItems = [...new Map([...a.user.agentListings, ...a.user.properties].map((p) => [p.id, p])).values()].map(mapProperty);
    return {
      id: a.id,
      name: a.user.name || "Estate House agent",
      image: a.user.image,
      agency: a.agency?.name ?? null,
      bio: a.bio,
      phone: a.phone,
      verified: !!a.verifiedAt,
      listings: listingsItems.length,
      cities: [...new Set(listingsItems.map((p) => p.city))],
      specialties: [...new Set(listingsItems.map((p) => p.kind))],
      listingsItems,
    };
  } catch {
    return null;
  }
}
