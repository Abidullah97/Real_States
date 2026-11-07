import { getCategoryNames } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

export type SearchParams = Record<string, string | string[] | undefined>;
export const param = (p: SearchParams, key: string) => {
  const v = p[key];
  return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
};
export const pageParam = (p: SearchParams) => Math.max(1, Math.floor(Number(param(p, "page")) || 1));

/** Options for the listing form: managed categories and active agents. */
export async function getPropertyFormOptions() {
  const [categories, agents] = await Promise.all([
    getCategoryNames(),
    prisma.user.findMany({ where: { role: "AGENT", disabledAt: null }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
  ]);
  return { categories, agents: agents.map((a) => ({ id: a.id, name: a.name || a.email })) };
}

/** Prisma include used wherever a full listing row is shown in the admin. */
export const propertyRowInclude = {
  location: true,
  features: true,
  images: { orderBy: { position: "asc" as const } },
  owner: { select: { name: true, email: true } },
  agent: { select: { name: true, email: true } },
};

/** Decimal fields are converted so rows can be passed to client components. */
export const toPropertyRow = <T extends { price: { toString(): string }; area: { toString(): string } }>(p: T) => ({ ...p, price: Number(p.price), area: Number(p.area) });
