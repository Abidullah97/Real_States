import {createHash} from "node:crypto";import {prisma} from "@/lib/prisma";
let lastCleanup=0;
/** Atomic fixed-window limiter shared by all app instances through PostgreSQL. */
export async function overLimit(key:string,limit:number,windowMs:number){const now=Date.now(),start=Math.floor(now/windowMs)*windowMs,resetAt=new Date(start+windowMs),id=createHash("sha256").update(`${key}:${start}`).digest("hex");const row=await prisma.rateLimitBucket.upsert({where:{id},create:{id,count:1,resetAt},update:{count:{increment:1}}});if(now-lastCleanup>10*60_000){lastCleanup=now;void prisma.rateLimitBucket.deleteMany({where:{resetAt:{lt:new Date(now-24*60*60_000)}}}).catch(()=>{});}return row.count>limit;}
