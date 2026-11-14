import {createHash, randomUUID} from "node:crypto";
import {mkdir, unlink, writeFile} from "node:fs/promises";
import path from "node:path";

/**
 * Image storage, in order of preference:
 * 1. Cloudinary when CLOUDINARY_* is configured.
 * 2. Supabase Storage when NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SECRET_KEY
 *    (or the legacy SUPABASE_SERVICE_ROLE_KEY) are configured; publicId is `supabase:<object path>`.
 * 3. Otherwise the local `uploads/` folder in the project root, served by `src/app/uploads/[...path]/route.ts`;
 *    publicId is `local:<relative path>`. Not suitable for Vercel, which has no persistent disk.
 */
export const LOCAL_UPLOAD_ROOT = path.join(process.cwd(), "uploads");
const LOCAL_PREFIX = "local:";
const SUPABASE_PREFIX = "supabase:";

/** Server-only Supabase Storage settings. The secret key must never be exposed with a NEXT_PUBLIC_ prefix. */
export function supabaseStorageConfig(){
 const rawUrl=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,bucket=process.env.SUPABASE_STORAGE_BUCKET||"property-images";
 if(!rawUrl||!key)return null;
 let url:URL;try{url=new URL(rawUrl)}catch{return null}
 if(url.protocol!=="https:"||!/^[a-z0-9-]+$/.test(bucket))return null;
 return{url:url.origin,key,bucket};
}
function supabaseHeaders(key:string,extra:Record<string,string>={}){return{apikey:key,authorization:`Bearer ${key}`,...extra};}
/** Object paths are built only from sanitized folder segments and a UUID file name. */
function validSupabasePath(p:string){return /^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(p);}

export function cloudinaryConfig(){const cloud=process.env.CLOUDINARY_CLOUD_NAME,apiKey=process.env.CLOUDINARY_API_KEY,apiSecret=process.env.CLOUDINARY_API_SECRET;return cloud&&apiKey&&apiSecret?{cloud,apiKey,apiSecret}:null;}

export function cloudinarySignature(params:Record<string,string>,secret:string){const payload=Object.entries(params).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>`${key}=${value}`).join("&");return createHash("sha1").update(payload+secret).digest("hex");}

/** Resolves a stored relative path inside the uploads folder, refusing anything that escapes it. */
export function resolveLocalUpload(relative:string){const full=path.resolve(LOCAL_UPLOAD_ROOT,relative);if(full!==LOCAL_UPLOAD_ROOT&&full.startsWith(LOCAL_UPLOAD_ROOT+path.sep))return full;return null;}

export async function destroyCloudinaryImage(publicId:string){
 if(publicId.startsWith(LOCAL_PREFIX)){const full=resolveLocalUpload(publicId.slice(LOCAL_PREFIX.length));if(!full)throw new Error("Invalid image path.");await unlink(full).catch((e:NodeJS.ErrnoException)=>{if(e.code!=="ENOENT")throw new Error("Image storage could not remove the image.");});return;}
 if(publicId.startsWith(SUPABASE_PREFIX)){
  const objectPath=publicId.slice(SUPABASE_PREFIX.length);if(!validSupabasePath(objectPath))throw new Error("Invalid image path.");
  const config=supabaseStorageConfig();if(!config)throw new Error("Image storage is not configured.");
  // Bulk-remove endpoint; succeeds (empty list) when the object no longer exists.
  const response=await fetch(`${config.url}/storage/v1/object/${config.bucket}`,{method:"DELETE",headers:supabaseHeaders(config.key,{"content-type":"application/json"}),body:JSON.stringify({prefixes:[objectPath]})});
  if(!response.ok)throw new Error("Image storage could not remove the image.");return;
 }
 const config=cloudinaryConfig();if(!config)throw new Error("Image storage is not configured.");const timestamp=Math.floor(Date.now()/1000).toString(),params={public_id:publicId,timestamp};const body=new URLSearchParams({...params,api_key:config.apiKey,signature:cloudinarySignature(params,config.apiSecret)});const response=await fetch(`https://api.cloudinary.com/v1_1/${config.cloud}/image/destroy`,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});if(!response.ok)throw new Error("Image storage could not remove the image.");const data=await response.json() as {result?:string};if(data.result!=="ok"&&data.result!=="not found")throw new Error("Image storage rejected the delete request.");}

function detectImageType(bytes:Uint8Array){if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return"image/jpeg";if(bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47)return"image/png";if(String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP")return"image/webp";return null;}
const EXT:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};

export async function uploadCloudinaryImage(file:File,folder:string){
 if(file.size<1||file.size>10*1024*1024)throw new Error("Image is larger than 10 MB.");
 const bytes=new Uint8Array(await file.arrayBuffer());const mime=detectImageType(bytes);if(!mime||mime!==file.type)throw new Error("Use a valid JPEG, PNG or WebP image.");
 const config=cloudinaryConfig();
 const supabase=config?null:supabaseStorageConfig();
 if(supabase){
  const dir=folder.split("/").map(s=>s.replace(/[^a-zA-Z0-9_-]/g,"")).filter(Boolean).join("/")||"images";
  const objectPath=`${dir}/${randomUUID()}.${EXT[mime]}`;
  const response=await fetch(`${supabase.url}/storage/v1/object/${supabase.bucket}/${objectPath}`,{method:"POST",headers:supabaseHeaders(supabase.key,{"content-type":mime,"cache-control":"max-age=31536000","x-upsert":"false"}),body:bytes});
  if(!response.ok){
   // Supabase's reason (e.g. "Bucket not found", "Invalid Compact JWS", "mime type not supported") goes to the server log only.
   const detail=(await response.text().catch(()=>"")).replace(/sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]+/g,"***").slice(0,300);
   console.error(`[storage] Supabase upload failed: HTTP ${response.status} ${detail}`);
   if(response.status===401||response.status===403)throw new Error("Image storage rejected the upload: check SUPABASE_SECRET_KEY (use the secret or service_role key, not the publishable/anon key).");
   if(response.status===404||/bucket not found/i.test(detail))throw new Error(`Image storage bucket "${supabase.bucket}" was not found. Run the database migrations or create it in Supabase Storage.`);
   throw new Error("Image storage rejected the upload.");
  }
  return{url:`${supabase.url}/storage/v1/object/public/${supabase.bucket}/${objectPath}`,publicId:`${SUPABASE_PREFIX}${objectPath}`};
 }
 if(!config&&process.env.VERCEL){
  // Vercel has no persistent, writable disk, so the local fallback cannot work there.
  console.error("[storage] No image storage configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or CLOUDINARY_*) in Vercel.");
  throw new Error("Image uploads are not configured on this server yet. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel, then redeploy.");
 }
 if(!config){
  // Local storage: keep only safe folder segments, then write <uuid>.<ext>.
  const dir=folder.split("/").map(s=>s.replace(/[^a-zA-Z0-9_-]/g,"")).filter(Boolean).join("/");
  const relative=`${dir}/${randomUUID()}.${EXT[mime]}`;const full=resolveLocalUpload(relative);if(!full)throw new Error("Invalid image path.");
  await mkdir(path.dirname(full),{recursive:true});await writeFile(full,bytes);
  return{url:`/uploads/${relative}`,publicId:`${LOCAL_PREFIX}${relative}`};
 }
 const timestamp=Math.floor(Date.now()/1000).toString(),publicId=randomUUID(),signed={folder,public_id:publicId,timestamp};const body=new FormData();body.append("file",new Blob([bytes],{type:mime}),"property-image");for(const [key,value]of Object.entries({...signed,api_key:config.apiKey,signature:cloudinarySignature(signed,config.apiSecret)}))body.append(key,value);const response=await fetch(`https://api.cloudinary.com/v1_1/${config.cloud}/image/upload`,{method:"POST",body});if(!response.ok)throw new Error("Image storage rejected the upload.");const data=await response.json() as {secure_url?:string;public_id?:string};if(!data.secure_url||!data.public_id)throw new Error("Image storage returned an invalid response.");return{url:data.secure_url,publicId:data.public_id};}
