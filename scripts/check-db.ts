import {Client} from "pg";
import {pgConnectionString} from "../src/lib/db-url";

/**
 * Checks a DATABASE_URL exactly as the deployed app would use it and prints a plain-language result.
 * The password and full connection string are never printed.
 * Usage: set DATABASE_URL in the environment, then `npm run db:check`.
 */
async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return fail("DATABASE_URL is empty. Paste the value you saved in Vercel.");
  if (/^\s|\s$/.test(raw)) return fail("The value starts or ends with a space. Remove it in Vercel.");
  if (/^["']|["']$/.test(raw)) return fail("The value is wrapped in quote marks. In Vercel, save it without quotes.");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fail("This is not a valid connection URL. If the password contains @ # / : ? % or &, reset it in Supabase to letters and numbers only.");
  }
  if (!/^postgres(ql)?:$/.test(url.protocol)) return fail("The URL must start with postgresql://");
  if (/^(localhost|127\.0\.0\.1)$/.test(url.hostname)) return fail("The URL points to localhost. Vercel cannot reach your computer; use the Supabase pooler address.");
  if (url.password.includes("YOUR") || url.password.includes("[")) return fail("The password is still a placeholder such as YOUR_PASSWORD. Put your real Supabase database password in.");
  console.log(`Host: ${url.hostname}:${url.port || "5432"}  user: ${decodeURIComponent(url.username)}  database: ${url.pathname.slice(1)}`);

  const client = new Client({connectionString: pgConnectionString(raw, raw), connectionTimeoutMillis: 30_000});
  try {
    await client.connect();
    const {rows} = await client.query(`select count(*)::int as users from "User"`);
    const migrations = await client.query(`select count(*)::int as n from "_prisma_migrations" where finished_at is not null`);
    console.log(`OK: connected. Users: ${rows[0].users}. Applied migrations: ${migrations.rows[0].n}.`);
    console.log("This value works. Save exactly this value as DATABASE_URL in Vercel (Production) and redeploy.");
  } catch (e) {
    const err = e as {code?: string; message?: string};
    const msg = err.message || "";
    if (err.code === "28P01" || /password authentication failed/i.test(msg)) fail("Wrong password. Reset the database password in Supabase (letters and numbers only) and use the new one.");
    else if (/tenant|user .* not found/i.test(msg)) fail("Supabase does not recognise the user/host. The user must be postgres.<project-ref> and the host must match your project's pooler (aws-0-...).");
    else if (/certificate/i.test(msg)) fail("SSL certificate error. Use ...?uselibpqcompat=true&sslmode=require at the end of the URL.");
    else if (err.code === "42P01") fail("Connected, but the tables do not exist. Run `npm run db:migrate` against this database.");
    else if (/ENOTFOUND|EAI_AGAIN/.test(msg)) fail("The host name does not exist. Check the host part of the URL for typos.");
    else if (/timeout|ETIMEDOUT|ECONNREFUSED/i.test(msg)) fail("Could not reach the server (timeout/refused). Check host and port (6543 for Vercel, 5432 for migrations).");
    else fail(`Connection failed: ${err.code || ""} ${msg.replace(/\/\/[^@]*@/g, "//***@")}`);
  } finally {
    await client.end().catch(() => {});
  }
}

function fail(message: string) {
  console.error(`PROBLEM: ${message}`);
  process.exitCode = 1;
}

main();
