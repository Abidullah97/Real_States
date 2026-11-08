import {PrismaClient} from "@/generated/prisma/client";
import {PrismaPg} from "@prisma/adapter-pg";
const globalForPrisma=globalThis as unknown as {prisma?:PrismaClient};
// Make the most common deployment mistakes obvious in the server logs instead of surfacing only as a generic
// Auth.js "Configuration" error at sign-in. Only the host is checked; the connection string is never logged.
if(process.env.NODE_ENV==="production"&&process.env.NEXT_PHASE!=="phase-production-build"){const url=process.env.DATABASE_URL;if(!url)console.error("[db] DATABASE_URL is not set. Configure it in your hosting provider's environment variables.");else if(process.env.VERCEL&&/@(localhost|127\.0\.0\.1)[:/]/.test(url))console.error("[db] DATABASE_URL points to localhost, which a Vercel deployment cannot reach. Use a hosted PostgreSQL connection string.");}
const adapter=new PrismaPg({connectionString:process.env.DATABASE_URL||"postgresql://invalid:invalid@127.0.0.1:1/estate_house?schema=public"});
export const prisma=globalForPrisma.prisma??new PrismaClient({adapter});
if(process.env.NODE_ENV!=="production")globalForPrisma.prisma=prisma;
