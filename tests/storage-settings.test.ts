import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {siteSettingsSchema} from "../src/lib/validation";
import {LOCAL_UPLOAD_ROOT,resolveLocalUpload} from "../src/lib/cloudinary";

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

test("local uploads cannot escape the uploads folder",()=>{
 assert.equal(resolveLocalUpload("estate-house/p1/a.jpg"),path.join(LOCAL_UPLOAD_ROOT,"estate-house","p1","a.jpg"));
 for(const bad of ["../.env","estate-house/../../package.json","..","", "/etc/passwd"])
  assert.equal(resolveLocalUpload(bad),null,bad);
});
