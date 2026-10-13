import { createHmac, timingSafeEqual } from "node:crypto";
export function hashApiKey(key:string){const pepper=process.env.API_KEY_PEPPER;if(!pepper)throw new Error("API_KEY_PEPPER is not configured.");return createHmac("sha256",pepper).update(key).digest("hex");}
export function verifyApiKey(key:string,hash:string){const a=Buffer.from(hashApiKey(key));const b=Buffer.from(hash);return a.length===b.length&&timingSafeEqual(a,b);}
