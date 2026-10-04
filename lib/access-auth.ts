// Public configuration for this Worker's existing Cloudflare Access application.
export const ACCESS_ISSUER = 'https://mohamed-gsmart.cloudflareaccess.com';
export const ACCESS_AUDIENCE = '4b1cd54238e1664ef70d0e1ad29608a304f333bea64f0db47ea8e5c75081d774';
type SigningKey = JsonWebKey & {kid?:string};
export type AccessUser = {userId:string;email:string;displayName:string;fullName:null};
let cachedKeys: {keys:SigningKey[];expires:number}|undefined;
function bytes(value:string){if(!/^[A-Za-z0-9_-]+$/.test(value))throw Error('Invalid token encoding');return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'=')),c=>c.charCodeAt(0));}
export async function verifyAccessToken(token:string,keys:SigningKey[],now=Date.now()/1000):Promise<AccessUser|null>{
 try {
  if(token.length>16000)return null;
  const parts=token.split('.');if(parts.length!==3)return null;
  const head=JSON.parse(new TextDecoder().decode(bytes(parts[0])));
  if(head.alg!=='RS256'||typeof head.kid!=='string'||head.crit!==undefined)return null;
  const jwk=keys.find(k=>k.kid===head.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));if(!jwk)return null;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))return null;
  const p=JSON.parse(new TextDecoder().decode(bytes(parts[1])));
  if(p.iss!==ACCESS_ISSUER||!Array.isArray(p.aud)||!p.aud.includes(ACCESS_AUDIENCE)||typeof p.exp!=='number'||p.exp<=now||typeof p.iat!=='number'||p.iat>now+30||p.nbf!==undefined&&(typeof p.nbf!=='number'||p.nbf>now+30))return null;
  if(p.type!=='app'||typeof p.sub!=='string'||!p.sub||typeof p.email!=='string'||!p.email.includes('@'))return null;
  const email=p.email.trim().toLowerCase();return {userId:'cf-access:'+p.sub,email,displayName:email,fullName:null};
 }catch{return null;}
}
export async function accessUser(token:string|null):Promise<AccessUser|null>{
 if(!token)return null;
 try{
  if(!cachedKeys||cachedKeys.expires<Date.now()){
   const response=await fetch(ACCESS_ISSUER+'/cdn-cgi/access/certs',{signal:AbortSignal.timeout(5000)});
   if(!response.ok)return null;
   const result=await response.json() as {keys:SigningKey[]};if(!Array.isArray(result.keys))return null;
   cachedKeys={keys:result.keys,expires:Date.now()+300000};
  }
  return verifyAccessToken(token,cachedKeys.keys);
 }catch{return null;}
}
export function accessRole(email:string,adminEmail:string|undefined){return adminEmail&&email.toLowerCase()===adminEmail.trim().toLowerCase()?'owner':'player';}
