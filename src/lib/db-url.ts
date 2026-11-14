/**
 * Cleans common copy/paste mistakes from a DATABASE_URL value: surrounding whitespace or line breaks,
 * surrounding quote marks, and an accidental `DATABASE_URL=` prefix.
 */
export function cleanDatabaseUrl(raw: string) {
  let value = raw.trim();
  if (/^DATABASE_URL\s*=/i.test(value)) value = value.replace(/^DATABASE_URL\s*=\s*/i, "");
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return value.trim();
}

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
  const value = cleanDatabaseUrl(raw);
  try {
    const url = new URL(value);
    const mode = url.searchParams.get("sslmode");
    if ((mode === "require" || mode === "prefer") && !url.searchParams.has("uselibpqcompat")) {
      url.searchParams.set("uselibpqcompat", "true");
      return url.toString();
    }
  } catch {}
  return value;
}

/**
 * Describes where a connection string points without revealing the password, for server logs.
 * Returns a list of detected problems as well.
 */
export function describeDatabaseUrl(raw: string | undefined) {
  if (!raw) return {summary: "DATABASE_URL is not set", problems: ["DATABASE_URL is not set"]};
  const problems: string[] = [];
  if (raw !== raw.trim()) problems.push("value has leading/trailing spaces or line breaks (cleaned automatically)");
  if (/^["']|["']$/.test(raw.trim())) problems.push("value is wrapped in quote marks (cleaned automatically)");
  if (/^DATABASE_URL\s*=/i.test(raw.trim())) problems.push("value starts with 'DATABASE_URL=' (cleaned automatically)");
  const value = cleanDatabaseUrl(raw);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return {summary: `unparseable value (length ${value.length}, starts with "${value.slice(0, 13)}")`, problems: [...problems, "not a valid URL; a password with @ # / ? % or spaces breaks it"]};
  }
  const user = decodeURIComponent(url.username), database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  // Only echo values that cannot contain secrets: a malformed database name may hold a second pasted URL
  // (including its password), so it is described, never printed.
  const safeName = /^[A-Za-z0-9_-]{1,63}$/;
  const databaseLabel = safeName.test(database) ? database : `<invalid, ${database.length} characters>`;
  const userLabel = /^[A-Za-z0-9_.-]{1,80}$/.test(user) ? user : `<invalid, ${user.length} characters>`;
  const params = [...url.searchParams.keys()].filter((k) => /^[a-z_]{1,30}$/i.test(k)).join(",") || "none";
  if ((value.match(/postgres(ql)?:\/\//g) || []).length > 1) problems.push("the value contains the connection URL more than once; it was pasted twice. Delete it and paste it exactly once");
  if (!/^postgres(ql)?:$/.test(url.protocol)) problems.push(`scheme is "${url.protocol}" instead of "postgresql:"`);
  if (!url.password) problems.push("no password in the URL");
  if (/\[|\]|YOUR[-_]?PASSWORD/i.test(decodeURIComponent(url.password))) problems.push("password is still the [YOUR-PASSWORD] placeholder");
  if (url.hostname.endsWith("pooler.supabase.com") && !/^postgres\.[a-z0-9]+$/.test(user)) problems.push(`Supabase pooler user must be "postgres.<project-ref>", got ${userLabel}`);
  if (!safeName.test(database)) problems.push(`database name should be "postgres", got ${databaseLabel}`);
  return {summary: `user=${userLabel} host=${url.hostname} port=${url.port || "5432"} database=${databaseLabel} params=${params}`, problems};
}
