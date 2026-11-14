import {PrismaClient} from "@/generated/prisma/client";
import {describeDatabaseUrl, pgConnectionString} from "@/lib/db-url";
import {PrismaPg} from "@prisma/adapter-pg";
const globalForPrisma=globalThis as unknown as {prisma?:PrismaClient};
// Make deployment mistakes obvious in the server logs instead of surfacing only as a generic Auth.js
// "Configuration" error at sign-in. Logs user, host, port, database and option names; never the password.
if(process.env.NODE_ENV==="production"&&process.env.NEXT_PHASE!=="phase-production-build"){
 const url=process.env.DATABASE_URL,info=describeDatabaseUrl(url);
 if(process.env.VERCEL&&url&&/@(localhost|127\.0\.0\.1)[:/]/.test(url))info.problems.push("points to localhost, which a Vercel deployment cannot reach");
 console.log(`[db] DATABASE_URL target: ${info.summary}`);
 for(const problem of info.problems)console.error(`[db] DATABASE_URL problem: ${problem}`);
}
const adapter=new PrismaPg({connectionString:pgConnectionString(process.env.DATABASE_URL,"postgresql://invalid:invalid@127.0.0.1:1/estate_house?schema=public")});
export const prisma=globalForPrisma.prisma??new PrismaClient({adapter});
if(process.env.NODE_ENV!=="production")globalForPrisma.prisma=prisma;
