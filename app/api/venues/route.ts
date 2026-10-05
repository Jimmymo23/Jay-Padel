import {db,identity,sameOrigin,error} from '../../../lib/server';
import {directorySchema,validateVenue,directory} from '../../../lib/directory';
export async function POST(req:Request){try{
 if(!sameOrigin(req))return error('Invalid request origin.',403);const u=await identity();if(u?.role!=='owner')return error('Admin access required.',403);
 const raw=await req.text();if(raw.length>30000)return error('Venue details are too large.',413);let body:any;try{body=JSON.parse(raw);}catch{return error('Invalid venue details.');}const invalid=validateVenue(body);if(invalid)return error(invalid);await directorySchema();const b=db();
 const previous=body.venueId?await b.prepare('SELECT id FROM venues WHERE id=?').bind(body.venueId).first():null;if(body.venueId&&!previous)return error('Venue not found.',404);
 const id=body.venueId??'venue-'+crypto.randomUUID();const existing=previous?(await b.prepare('SELECT id FROM courts WHERE venue_id=?').bind(id).all()).results as any[]:[];
 const included=body.courts.filter((c:any)=>c.id).map((c:any)=>c.id);
 if(new Set(included).size!==included.length||included.some((cid:string)=>!existing.some(c=>c.id===cid))||existing.some(c=>!included.includes(c.id)))return error('Existing courts must be preserved. Reload the venue and try again.',409);
 const duplicate=await b.prepare('SELECT id FROM venues WHERE lower(trim(name))=lower(?) AND lower(trim(area))=lower(?) AND id!=?').bind(body.name.trim(),body.area.trim(),id).first();if(duplicate)return error('A venue with this name and area already exists.',409);
 const metadata={notes:body.notes.trim(),mapUrl:body.mapUrl.trim(),bookingUrl:body.bookingUrl.trim()};
 const statements=[b.prepare('INSERT INTO venues(id,name,area,facilities) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,area=excluded.area,facilities=excluded.facilities').bind(id,body.name.trim(),body.area.trim(),JSON.stringify([...new Set(body.facilities.map((f:string)=>f.trim()))])),b.prepare('INSERT INTO venue_details VALUES(?,?) ON CONFLICT(venue_id) DO UPDATE SET metadata=excluded.metadata').bind(id,JSON.stringify(metadata))];
 // Temporarily free unique court names so existing courts can be renamed or swapped atomically.
 for(const c of existing)statements.push(b.prepare('UPDATE courts SET name=? WHERE id=? AND venue_id=?').bind('__rename_'+crypto.randomUUID(),c.id,id));
 for(const c of body.courts)statements.push(b.prepare('INSERT INTO courts(id,venue_id,name,type) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,type=excluded.type').bind(c.id??'court-'+crypto.randomUUID(),id,c.name.trim(),c.type));
 if(body.location)statements.push(b.prepare('INSERT INTO checkin_sites VALUES(?,?,?,?,?) ON CONFLICT(venue_id) DO UPDATE SET latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius,updated_at=excluded.updated_at').bind(id,body.location.latitude,body.location.longitude,body.location.radius,new Date().toISOString()));
 statements.push(b.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),u.userId,id,previous?'update venue':'add venue','Admin saved venue and court details',new Date().toISOString()));
 try{await b.batch(statements);}catch(e){if(String(e).includes('UNIQUE'))return error('A venue or court with these details already exists.',409);throw e;}
 return Response.json({id,...await directory()},{status:previous?200:201,headers:{'Cache-Control':'private, no-store'}});
 }catch(e){console.error('save venue',e);return error('Could not save the venue. Your draft is still here.',503);}}
