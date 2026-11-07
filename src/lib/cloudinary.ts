import {createHash, randomUUID} from "node:crypto";
import {mkdir, unlink, writeFile} from "node:fs/promises";
import path from "node:path";

/**
 * Image storage. Uses Cloudinary when CLOUDINARY_* is configured; otherwise images are saved to the
 * local `uploads/` folder in the project root and served by `src/app/uploads/[...path]/route.ts`.
 * Local images are stored with a publicId of the form `local:<relative path>`.
 */
export const LOCAL_UPLOAD_ROOT = path.join(process.cwd(), "uploads");
const LOCAL_PREFIX = "local:";

export function cloudinaryConfig(){const cloud=process.env.CLOUDINARY_CLOUD_NAME,apiKey=process.env.CLOUDINARY_API_KEY,apiSecret=process.env.CLOUDINARY_API_SECRET;return cloud&&apiKey&&apiSecret?{cloud,apiKey,apiSecret}:null;}

export function cloudinarySignature(params:Record<string,string>,secret:string){const payload=Object.entries(params).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>`${key}=${value}`).join("&");return createHash("sha1").update(payload+secret).digest("hex");}

/** Resolves a stored relative path inside the uploads folder, refusing anything that escapes it. */
export function resolveLocalUpload(relative:string){const full=path.resolve(LOCAL_UPLOAD_ROOT,relative);if(full!==LOCAL_UPLOAD_ROOT&&full.startsWith(LOCAL_UPLOAD_ROOT+path.sep))return full;return null;}

export async function destroyCloudinaryImage(publicId:string){
 if(publicId.startsWith(LOCAL_PREFIX)){const full=resolveLocalUpload(publicId.slice(LOCAL_PREFIX.length));if(!full)throw new Error("Invalid image path.");await unlink(full).catch((e:NodeJS.ErrnoException)=>{if(e.code!=="ENOENT")throw new Error("Image storage could not remove the image.");});return;}
 const config=cloudinaryConfig();if(!config)throw new Error("Image storage is not configured.");const timestamp=Math.floor(Date.now()/1000).toString(),params={public_id:publicId,timestamp};const body=new URLSearchParams({...params,api_key:config.apiKey,signature:cloudinarySignature(params,config.apiSecret)});const response=await fetch(`https://api.cloudinary.com/v1_1/${config.cloud}/image/destroy`,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});if(!response.ok)throw new Error("Image storage could not remove the image.");const data=await response.json() as {result?:string};if(data.result!=="ok"&&data.result!=="not found")throw new Error("Image storage rejected the delete request.");}

function detectImageType(bytes:Uint8Array){if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return"image/jpeg";if(bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47)return"image/png";if(String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP")return"image/webp";return null;}
const EXT:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};

export async function uploadCloudinaryImage(file:File,folder:string){
 if(file.size<1||file.size>10*1024*1024)throw new Error("Image is larger than 10 MB.");
 const bytes=new Uint8Array(await file.arrayBuffer());const mime=detectImageType(bytes);if(!mime||mime!==file.type)throw new Error("Use a valid JPEG, PNG or WebP image.");
 const config=cloudinaryConfig();
 if(!config){
  // Local storage: keep only safe folder segments, then write <uuid>.<ext>.
  const dir=folder.split("/").map(s=>s.replace(/[^a-zA-Z0-9_-]/g,"")).filter(Boolean).join("/");
  const relative=`${dir}/${randomUUID()}.${EXT[mime]}`;const full=resolveLocalUpload(relative);if(!full)throw new Error("Invalid image path.");
  await mkdir(path.dirname(full),{recursive:true});await writeFile(full,bytes);
  return{url:`/uploads/${relative}`,publicId:`${LOCAL_PREFIX}${relative}`};
 }
 const timestamp=Math.floor(Date.now()/1000).toString(),publicId=randomUUID(),signed={folder,public_id:publicId,timestamp};const body=new FormData();body.append("file",new Blob([bytes],{type:mime}),"property-image");for(const [key,value]of Object.entries({...signed,api_key:config.apiKey,signature:cloudinarySignature(signed,config.apiSecret)}))body.append(key,value);const response=await fetch(`https://api.cloudinary.com/v1_1/${config.cloud}/image/upload`,{method:"POST",body});if(!response.ok)throw new Error("Image storage rejected the upload.");const data=await response.json() as {secure_url?:string;public_id?:string};if(!data.secure_url||!data.public_id)throw new Error("Image storage returned an invalid response.");return{url:data.secure_url,publicId:data.public_id};}
