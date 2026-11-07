import { z } from "zod";
import { prisma } from "@/lib/prisma";

const coordinate = (min: number, max: number) => z.preprocess((v) => (v === "" || v === undefined || v === null ? undefined : Number(v)), z.number().min(min).max(max).optional());
const optionalDate = z.preprocess((v) => (v === "" || v === undefined ? undefined : v === null ? null : new Date(String(v))), z.date().nullable().optional());

export const LISTING_STATUSES = ["DRAFT", "PENDING", "PUBLISHED", "SOLD", "RENTED", "ARCHIVED", "REJECTED"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

const fields = {
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(30).max(8000),
  listingType: z.enum(["SALE", "RENT"]),
  propertyType: z.string().trim().min(2).max(60),
  price: z.coerce.number().positive().max(1_000_000_000_000),
  currency: z.string().regex(/^[A-Z]{3}$/),
  area: z.coerce.number().positive().max(1_000_000),
  areaUnit: z.enum(["sq ft", "sq m", "marla", "kanal"]),
  bedrooms: z.coerce.number().int().min(0).max(50),
  bathrooms: z.coerce.number().int().min(0).max(50),
  parking: z.coerce.number().int().min(0).max(50),
  country: z.string().trim().min(2).max(60).optional(),
  province: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2).max(100),
  /** Location hierarchy "area" level (distinct from the numeric floor area above). */
  locationArea: z.string().trim().max(100).optional(),
  locality: z.string().trim().max(100).optional(),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  address: z.string().trim().max(300).optional(),
  features: z.array(z.string().trim().min(2).max(60)).max(40),
  featured: z.boolean(),
  featuredOrder: z.coerce.number().int().min(0).max(10_000),
  featuredUntil: optionalDate,
  agentId: z.string().max(60).nullable(),
};

const FIELD_HINTS: Record<string, string> = {
  title: "Title must be 5–140 characters (not counting leading or trailing spaces).",
  description: "Description must be at least 30 characters (not counting leading or trailing spaces).",
  listingType: "Choose Sale or Rent.",
  propertyType: "Choose a category.",
  price: "Price must be a number greater than 0.",
  currency: "Currency must be a three-letter upper case code such as PKR.",
  area: "Area must be a number greater than 0.",
  areaUnit: "Choose an area unit.",
  bedrooms: "Bedrooms must be a whole number from 0 to 50.",
  bathrooms: "Bathrooms must be a whole number from 0 to 50.",
  parking: "Parking must be a whole number from 0 to 50.",
  country: "Country must be at least 2 characters.",
  province: "Province must be at most 80 characters.",
  city: "City must be at least 2 characters.",
  locationArea: "Area (location) must be at most 100 characters.",
  locality: "Neighbourhood must be at most 100 characters.",
  latitude: "Latitude must be between -90 and 90.",
  longitude: "Longitude must be between -180 and 180.",
  address: "Street address must be at most 300 characters.",
  features: "Each feature must be 2–60 characters, separated by commas (up to 40 features).",
  featuredOrder: "Featured order must be a whole number from 0 to 10000.",
  featuredUntil: "Featured-until must be a valid date.",
  agentId: "Select a valid agent.",
  status: "Choose a valid status.",
  ownerEmail: "Owner email must be a valid email address.",
  rejectionReason: "Rejection reason must be 5–500 characters.",
};

/** Turns schema issues into a message naming each field that needs fixing. */
export function describePropertyIssues(error: z.ZodError, fallback = "Please review the property details."): string {
  const fields = [...new Set(error.issues.map((i) => String(i.path[0] ?? "")))].filter(Boolean);
  const hints = fields.map((f) => FIELD_HINTS[f] || `Check the "${f}" field.`);
  return hints.length ? `${fallback} ${hints.join(" ")}` : fallback;
}

export const createPropertySchema = z.object({
  ...fields,
  parking: fields.parking.default(0),
  bedrooms: fields.bedrooms.default(0),
  bathrooms: fields.bathrooms.default(0),
  features: fields.features.default([]),
  featured: fields.featured.default(false),
  featuredOrder: fields.featuredOrder.default(0),
  agentId: fields.agentId.optional(),
  status: z.enum(["DRAFT", "PENDING", "PUBLISHED"]).default("DRAFT"),
  ownerEmail: z.email().optional(),
});

export const patchPropertySchema = z
  .object({ ...fields, status: z.enum(LISTING_STATUSES), rejectionReason: z.string().trim().min(5).max(500), address: z.string().trim().max(300).nullable() })
  .partial();

/** Finds or creates the location row for a listing, keeping the hierarchy fields together. */
export async function resolveLocation(input: {
  country?: string;
  province?: string | null;
  city: string;
  area?: string | null;
  locality?: string | null;
  latitude?: number;
  longitude?: number;
}) {
  const country = input.country?.trim() || "Pakistan";
  const city = input.city.trim();
  const locality = input.locality?.trim() || null;
  let location = await prisma.location.findFirst({ where: { country, city, locality } });
  const extra = {
    ...(input.province !== undefined ? { province: input.province || null } : {}),
    ...(input.area !== undefined ? { area: input.area || null } : {}),
    ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
    ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
  };
  if (!location) location = await prisma.location.create({ data: { country, city, locality, ...extra } });
  else if (Object.keys(extra).length) location = await prisma.location.update({ where: { id: location.id }, data: extra });
  return location;
}

/** An agent assignment must point at an active agent account. */
export async function isAssignableAgent(id: string) {
  const agent = await prisma.user.findUnique({ where: { id }, select: { role: true, disabledAt: true } });
  return !!agent && agent.role === "AGENT" && !agent.disabledAt;
}

/** Audit action name for a status transition, so the activity log reads naturally. */
export function statusAction(from: string, to: string) {
  if (to === "PUBLISHED") return from === "PENDING" ? "property.approve" : "property.publish";
  if (to === "REJECTED") return "property.reject";
  if (to === "PENDING") return "property.submit_review";
  if (to === "SOLD") return "property.mark_sold";
  if (to === "RENTED") return "property.mark_rented";
  if (to === "ARCHIVED") return "property.archive";
  if (to === "DRAFT") return from === "PUBLISHED" ? "property.unpublish" : from === "ARCHIVED" ? "property.restore" : "property.withdraw";
  return "property.update";
}
