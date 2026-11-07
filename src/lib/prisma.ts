import {PrismaClient} from "@/generated/prisma/client";
import {PrismaPg} from "@prisma/adapter-pg";
const globalForPrisma=globalThis as unknown as {prisma?:PrismaClient};
const adapter=new PrismaPg({connectionString:process.env.DATABASE_URL||"postgresql://invalid:invalid@127.0.0.1:1/estate_house?schema=public"});
export const prisma=globalForPrisma.prisma??new PrismaClient({adapter});
if(process.env.NODE_ENV!=="production")globalForPrisma.prisma=prisma;
