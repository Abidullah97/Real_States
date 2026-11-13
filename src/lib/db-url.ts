/**
 * Normalizes DATABASE_URL for node-postgres (used by the Prisma pg adapter).
 *
 * node-postgres treats `sslmode=require`/`prefer` as `verify-full`, which rejects poolers whose certificate
 * chain is not in Node's trust store (for example Supabase: SELF_SIGNED_CERT_IN_CHAIN). Prisma's CLI uses the
 * standard libpq meaning ("encrypt, but do not verify the certificate"), so the same URL works for migrations
 * but not for the app. Adding `uselibpqcompat=true` gives the app the same libpq behaviour. URLs that already
 * choose a mode explicitly (verify-full, verify-ca, no-verify, disable or uselibpqcompat) are left unchanged.
 */
export function pgConnectionString(raw: string | undefined, fallback: string) {
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    const mode = url.searchParams.get("sslmode");
    if ((mode === "require" || mode === "prefer") && !url.searchParams.has("uselibpqcompat")) {
      url.searchParams.set("uselibpqcompat", "true");
      return url.toString();
    }
  } catch {}
  return raw;
}
