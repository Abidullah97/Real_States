import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {z} from "zod";
import {compare} from "bcryptjs";
import {prisma} from "@/lib/prisma";
import {overLimit} from "@/lib/rate-limit";
import {logAction} from "@/lib/audit";
import {isAdminRole} from "@/lib/roles";
export const {handlers,auth,signIn,signOut}=NextAuth({
 // trustHost is deliberately left unset: Auth.js then trusts the host when AUTH_URL or AUTH_TRUST_HOST is set,
 // on Vercel (VERCEL env var), or outside production. Setting it to false here broke every sign-in on Vercel (UntrustedHost).
 // Sessions expire after 8 hours; suspension takes effect immediately because every request re-checks the account.
 session:{strategy:"jwt",maxAge:8*60*60},
 pages:{signIn:"/signin"},
 providers:[Credentials({credentials:{email:{label:"Email",type:"email"},password:{label:"Password",type:"password"}},async authorize(credentials){const parsed=z.object({email:z.email(),password:z.string().min(8).max(128)}).safeParse(credentials);if(!parsed.success)return null;const email=parsed.data.email.toLowerCase();
  // Brute-force protection: at most 10 attempts per email address per 15 minutes.
  if(await overLimit(`login:${email}`,10,15*60_000))return null;
  const user=await prisma.user.findUnique({where:{email},select:{id:true,name:true,email:true,emailVerified:true,passwordHash:true,role:true,disabledAt:true}});if(!user?.passwordHash||!user.emailVerified||user.disabledAt||!await compare(parsed.data.password,user.passwordHash))return null;
  if(isAdminRole(user.role))await logAction(user.id,"auth.login","User",user.id,{email:user.email});
  return{id:user.id,name:user.name,email:user.email,role:user.role};}})],
 callbacks:{jwt({token,user}){if(user){token.role=(user as typeof user&{role:string}).role;token.sub=user.id}return token},session({session,token}){if(session.user){session.user.id=token.sub||"";(session.user as typeof session.user&{role:string}).role=String(token.role||"USER")}return session}},
 events:{async signOut(message){const token="token" in message?message.token:null;if(token?.sub&&isAdminRole(String(token.role||"")))await logAction(token.sub,"auth.logout","User",token.sub);}},
});
