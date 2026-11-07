import {createHash,randomBytes} from "node:crypto";
import {prisma} from "@/lib/prisma";
export function hashToken(token:string){return createHash("sha256").update(token).digest("hex");}
export async function issueToken(identifier:string,ttlMs:number){const token=randomBytes(32).toString("base64url");await prisma.verificationToken.deleteMany({where:{identifier}});await prisma.verificationToken.create({data:{identifier,token:hashToken(token),expires:new Date(Date.now()+ttlMs)}});return token;}
