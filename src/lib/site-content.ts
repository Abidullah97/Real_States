import { prisma } from "@/lib/prisma";
import { properties as demo } from "@/lib/properties";

export type SiteSettingsData = {
  siteName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  officeAddress: string | null;
  officeHours: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  linkedinUrl: string | null;
  heroHeading: string | null;
  heroDescription: string | null;
  heroImageUrl: string | null;
  featuredLimit: number;
  showFeatured: boolean;
  showLocations: boolean;
  showCategories: boolean;
  showLatest: boolean;
  showTestimonials: boolean;
  showAgents: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  ogImageUrl: string | null;
};

export type TestimonialData = { id: string; name: string; context: string | null; quote: string; rating: number | null };

export type CategorySummary = { type: string; count: number };

const EMPTY_SETTINGS: SiteSettingsData = {
  siteName: null,
  logoUrl: null,
  faviconUrl: null,
  websiteUrl: null,
  contactEmail: null,
  contactPhone: null,
  officeAddress: null,
  officeHours: null,
  instagramUrl: null,
  facebookUrl: null,
  linkedinUrl: null,
  heroHeading: null,
  heroDescription: null,
  heroImageUrl: null,
  featuredLimit: 6,
  showFeatured: true,
  showLocations: true,
  showCategories: true,
  showLatest: true,
  showTestimonials: true,
  showAgents: true,
  seoTitle: null,
  seoDescription: null,
  seoKeywords: null,
  ogImageUrl: null,
};

/**
 * Operator-managed public details. Social URLs fall back to the NEXT_PUBLIC_SOCIAL_* variables
 * so existing deployments keep working; nothing is invented when neither is set.
 */
export async function getSiteSettings(): Promise<SiteSettingsData> {
  let stored: Partial<SiteSettingsData> = {};
  try {
    const row = await prisma.siteSettings.findUnique({ where: { id: "site" } });
    if (row) {
      const { id: _id, updatedAt: _updatedAt, ...rest } = row;
      void _id;
      void _updatedAt;
      stored = rest;
    }
  } catch {}
  return {
    ...EMPTY_SETTINGS,
    ...stored,
    instagramUrl: stored.instagramUrl || process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || null,
    facebookUrl: stored.facebookUrl || process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || null,
    linkedinUrl: stored.linkedinUrl || process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || null,
  };
}

/** Only testimonials an administrator has published. Returns [] when none exist. */
export async function getPublishedTestimonials(limit = 3): Promise<TestimonialData[]> {
  try {
    return await prisma.testimonial.findMany({
      where: { published: true },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      take: limit,
      select: { id: true, name: true, context: true, quote: true, rating: true },
    });
  } catch {
    return [];
  }
}

/** Published listing counts per property type, from real rows (demo listings only in development without a database). */
export async function getCategorySummaries(): Promise<CategorySummary[]> {
  try {
    const rows = await prisma.property.groupBy({ by: ["propertyType"], where: { status: "PUBLISHED" }, _count: { _all: true } });
    return rows.map((r) => ({ type: r.propertyType, count: r._count._all })).sort((a, b) => b.count - a.count);
  } catch {
    if (process.env.NODE_ENV === "production") return [];
    const counts = new Map<string, number>();
    for (const p of demo) counts.set(p.kind, (counts.get(p.kind) || 0) + 1);
    return [...counts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  }
}
