import { prisma } from "@/lib/prisma";

export type Category = { id: string; name: string; slug: string; description: string | null; position: number };

/** Used only when the database is unreachable in development, matching the original fixed list. */
const FALLBACK = ["House", "Apartment", "Villa", "Townhouse", "Land", "Other"];

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

/** Administrator-managed property categories, in display order. */
export async function getCategories(): Promise<Category[]> {
  try {
    return await prisma.propertyCategory.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true, description: true, position: true } });
  } catch {
    return FALLBACK.map((name, i) => ({ id: name, name, slug: slugify(name), description: null, position: i }));
  }
}

export async function getCategoryNames(): Promise<string[]> {
  return (await getCategories()).map((c) => c.name);
}

/** True when the given property type is a managed category. Used by every listing write path. */
export async function isValidCategory(name: string): Promise<boolean> {
  try {
    return !!(await prisma.propertyCategory.findUnique({ where: { name }, select: { id: true } }));
  } catch {
    return FALLBACK.includes(name);
  }
}
