import {auth} from "../../auth";
import {prisma} from "@/lib/prisma";
import {NextResponse} from "next/server";

export type Principal={id:string;email:string;name:string|null;role:"USER"|"OWNER"|"AGENT"|"ADMIN"|"SUPER_ADMIN"};
export async function currentPrincipal():Promise<Principal|null>{
 const session=await auth();if(!session?.user?.id||!session.user.email)return null;
 const user=await prisma.user.findUnique({where:{id:session.user.id},select:{id:true,email:true,name:true,role:true,disabledAt:true}});
 return user&&!user.disabledAt?{id:user.id,email:user.email,name:user.name,role:user.role}:null;
}
export async function requireRoles(roles:Principal["role"][]){
 try{const principal=await currentPrincipal();if(!principal)return{principal:null,response:NextResponse.json({error:"Sign in is required."},{status:401})};if(!roles.includes(principal.role))return{principal:null,response:NextResponse.json({error:"You do not have access to this action."},{status:403})};return{principal,response:null};}
 catch{return{principal:null,response:NextResponse.json({error:"Authorization service is unavailable."},{status:503})};}
}
/** Header-safe principal lookup: returns null instead of throwing when auth or the database is unavailable. */
export async function getViewer():Promise<Principal|null>{try{return await currentPrincipal()}catch{return null}}
