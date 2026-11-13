import {PrismaClient} from "../src/generated/prisma/client";
import {PrismaPg} from "@prisma/adapter-pg";
import {pgConnectionString} from "../src/lib/db-url";
const db=new PrismaClient({adapter:new PrismaPg({connectionString:pgConnectionString(process.env.DATABASE_URL,"postgresql://invalid:invalid@127.0.0.1:1/estate_house?schema=public")})});
async function main(){const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();if(!email){throw new Error("Set ADMIN_EMAIL to an existing account email. This command never creates an account or sets a password.")}
 const role=(process.env.ADMIN_ROLE?.trim().toUpperCase()||"ADMIN");if(role!=="ADMIN"&&role!=="SUPER_ADMIN")throw new Error("ADMIN_ROLE must be ADMIN or SUPER_ADMIN.");
 const user=await db.user.findUnique({where:{email}});if(!user)throw new Error("No account found. Register through the website first, then rerun this command.");await db.user.update({where:{email},data:{role}});console.log(`${role==="SUPER_ADMIN"?"Super Admin":"Administrator"} role assigned to ${email}.`)}
main().catch(e=>{console.error(e instanceof Error?e.message:"Failed to promote account");process.exit(1)}).finally(()=>db.$disconnect());
