import {categories} from './data';
export const MAX_PHOTOS=3,MAX_PHOTO_BYTES=90000;
export function locationCheck(position:any,site:any){
 if(!position||![position.latitude,position.longitude,position.accuracy,position.timestamp].every(Number.isFinite)||Math.abs(position.latitude)>90||Math.abs(position.longitude)>180||position.accuracy<0||position.accuracy>50)return {ok:false,error:'GPS accuracy must be within 50 metres. Try outdoors.'};
 if(Math.abs(Date.now()-position.timestamp)>120000)return {ok:false,error:'Location reading expired. Check in again.'};
 const rad=(n:number)=>n*Math.PI/180,a=rad(position.latitude-site.latitude),b=rad(position.longitude-site.longitude);
 const h=Math.sin(a/2)**2+Math.cos(rad(site.latitude))*Math.cos(rad(position.latitude))*Math.sin(b/2)**2;
 const distance=6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
 return distance<=site.radius?{ok:true,distance:Math.round(distance),accuracy:Math.round(position.accuracy)}:{ok:false,error:'Your location is outside the court check-in area.'};
}
export function validatePhotos(photos:any){
 if(photos===undefined)return null;
 if(!Array.isArray(photos)||photos.length>MAX_PHOTOS)return 'Attach up to three photos.';
 for(const p of photos){
  if(!p||!categories.some(c=>c.key===p.category)||typeof p.caption!=='string'||p.caption.trim().length<5||p.caption.length>300||typeof p.data!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(p.data))return 'Each photo needs a category, description (5–300 characters) and JPEG image.';
  try{const bytes=atob(p.data.split(',')[1]);if(bytes.length<100||bytes.length>MAX_PHOTO_BYTES||bytes.charCodeAt(0)!==255||bytes.charCodeAt(1)!==216||bytes.charCodeAt(bytes.length-2)!==255||bytes.charCodeAt(bytes.length-1)!==217)return 'Photo is invalid or too large. Please choose another image.';}catch{return 'Invalid photo encoding.';}
 }
 return null;
}
export function evidenceLabel(location:boolean,photo:boolean){return location&&photo?'Location + photo supported':location?'Location checked':photo?'Photo supported':'Self-reported';}

export function canViewPhoto(role:string,user:string,owner:string,photoStatus:string,publication:string){return role==='owner'||user===owner||(photoStatus==='accepted'&&publication==='published');}
