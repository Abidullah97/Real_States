import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {siteSettingsSchema} from "../src/lib/validation";
import {LOCAL_UPLOAD_ROOT,resolveLocalUpload,supabaseStorageConfig,uploadCloudinaryImage,destroyCloudinaryImage} from "../src/lib/cloudinary";

test("site settings accept locally stored branding images and https links",()=>{
 assert.equal(siteSettingsSchema.safeParse({logoUrl:"/uploads/estate-house/site/logo/3f1c.png"}).success,true);
 assert.equal(siteSettingsSchema.safeParse({heroImageUrl:"/uploads/estate-house/site/hero/a1b2.jpg"}).success,true);
 assert.equal(siteSettingsSchema.safeParse({logoUrl:"https://cdn.example.com/logo.png"}).success,true);
 assert.equal(siteSettingsSchema.safeParse({logoUrl:""}).success,true);
});

test("site settings reject unsafe or foreign image values",()=>{
 for(const logoUrl of ["javascript:alert(1)","http://insecure.example.com/logo.png","/uploads/../.env","/uploads/x/logo.svg","/etc/passwd"])
  assert.equal(siteSettingsSchema.safeParse({logoUrl}).success,false,logoUrl);
 assert.equal(siteSettingsSchema.safeParse({heroImageUrl:"https://evil.example.com/hero.jpg"}).success,false);
});

test("site settings accept Supabase Storage public images but not other Supabase paths",()=>{
 assert.equal(siteSettingsSchema.safeParse({heroImageUrl:"https://abcdefgh.supabase.co/storage/v1/object/public/property-images/estate-house/site/hero/3f1c.jpg"}).success,true);
 assert.equal(siteSettingsSchema.safeParse({heroImageUrl:"https://abcdefgh.supabase.co/rest/v1/User"}).success,false);
 assert.equal(siteSettingsSchema.safeParse({heroImageUrl:"https://supabase.co.evil.example/storage/v1/object/public/x.jpg"}).success,false);
});

test("Supabase Storage uploads and deletes use the server secret key and safe object paths",async()=>{
 const calls:{url:string;init:RequestInit}[]=[];const realFetch=globalThis.fetch;
 const env={...process.env};
 delete process.env.CLOUDINARY_CLOUD_NAME;
 process.env.NEXT_PUBLIC_SUPABASE_URL="https://abcdefgh.supabase.co";process.env.SUPABASE_SECRET_KEY="sb_secret_test";
 globalThis.fetch=(async(url:string,init:RequestInit)=>{calls.push({url:String(url),init});return new Response("{}",{status:200});}) as typeof fetch;
 try{
  assert.deepEqual(supabaseStorageConfig(),{url:"https://abcdefgh.supabase.co",key:"sb_secret_test",bucket:"property-images"});
  const png=new File([new Uint8Array([0x89,0x50,0x4e,0x47,0,0,0,0])],"a.png",{type:"image/png"});
  const res=await uploadCloudinaryImage(png,"estate-house/../p1");
  assert.match(res.publicId,/^supabase:estate-house\/p1\/[0-9a-f-]{36}\.png$/);
  assert.equal(res.url,`https://abcdefgh.supabase.co/storage/v1/object/public/property-images/${res.publicId.slice(9)}`);
  assert.equal(calls[0].url,`https://abcdefgh.supabase.co/storage/v1/object/property-images/${res.publicId.slice(9)}`);
  assert.equal((calls[0].init.headers as Record<string,string>).apikey,"sb_secret_test");
  await destroyCloudinaryImage(res.publicId);
  assert.equal(calls[1].init.method,"DELETE");assert.deepEqual(JSON.parse(String(calls[1].init.body)),{prefixes:[res.publicId.slice(9)]});
  await assert.rejects(destroyCloudinaryImage("supabase:../../other-bucket/x.png"));
  process.env.NEXT_PUBLIC_SUPABASE_URL="http://insecure.example";assert.equal(supabaseStorageConfig(),null);
 }finally{globalThis.fetch=realFetch;process.env=env;}
});

test("local uploads cannot escape the uploads folder",()=>{
 assert.equal(resolveLocalUpload("estate-house/p1/a.jpg"),path.join(LOCAL_UPLOAD_ROOT,"estate-house","p1","a.jpg"));
 for(const bad of ["../.env","estate-house/../../package.json","..","", "/etc/passwd"])
  assert.equal(resolveLocalUpload(bad),null,bad);
});
