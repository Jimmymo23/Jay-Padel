import {directory} from '../../../lib/directory';
import {db,identity,sameOrigin,today,error} from '../../../lib/server';
import {venues} from '../../../lib/data';
import {locationCheck} from '../../../lib/evidence';
import {evidenceSchema} from '../../../lib/evidence-server';
export async function POST(req:Request){try{
 if(!sameOrigin(req))return error('Invalid request origin.',403);const u=await identity();if(!u)return error('Sign in to check in.',401);
 if(!u.registered)return error('Complete your player profile before contributing.',403);const body:any=await req.json();const listing=await directory();if(!listing.venues.some(v=>v.id===body.venueId&&v.real))return error('Choose a real venue.');await evidenceSchema();const b=db();
 if(body.action==='configure'){
  if(u.role!=='owner')return error('Moderator access required.',403);
  if(![body.latitude,body.longitude,body.radius].every(Number.isFinite)||Math.abs(body.latitude)>90||Math.abs(body.longitude)>180||!Number.isInteger(body.radius)||body.radius<50||body.radius>200)return error('Enter valid court coordinates and a radius of 50–200 metres.');
  await b.batch([b.prepare('INSERT INTO checkin_sites VALUES(?,?,?,?,?) ON CONFLICT(venue_id) DO UPDATE SET latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius,updated_at=excluded.updated_at').bind(body.venueId,body.latitude,body.longitude,body.radius,new Date().toISOString()),b.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),u.userId,body.venueId,'configure check-in','Court geofence configured',new Date().toISOString())]);return Response.json({ok:true});
 }
 const site=await b.prepare('SELECT * FROM checkin_sites WHERE venue_id=?').bind(body.venueId).first();if(!site)return error('Court pin has not been configured yet.',409);
 const result=locationCheck(body.position,site);if(!result.ok)return error(result.error!);
 const id=crypto.randomUUID();await b.prepare('INSERT OR IGNORE INTO checkins VALUES(?,?,?,?,?,?,?)').bind(id,u.userId,body.venueId,today(),result.distance,result.accuracy,new Date().toISOString()).run();
 const row=await b.prepare('SELECT id,venue_id,played_date,created_at FROM checkins WHERE user_id=? AND venue_id=? AND played_date=?').bind(u.userId,body.venueId,today()).first();return Response.json(row,{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){console.error('check-in',e);return error('Could not save check-in. Please try again.',503);}}
