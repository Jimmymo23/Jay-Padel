import {db,identity,sameOrigin,error} from '../../../lib/server';
export async function POST(req:Request){try{
 if(!sameOrigin(req))return error('Invalid request origin.',403);
 const u=await identity();if(!u)return error('Verify your email before creating your player profile.',401);
 const raw=await req.text();if(raw.length>1000)return error('Profile request is too large.',413);
 let body:any;try{body=JSON.parse(raw);}catch{return error('Invalid profile request.');}
 const name=typeof body?.name==='string'?body.name.trim().replace(/\s+/g,' '):'';
 if(name.length<2||name.length>60||/[\u0000-\u001f\u007f<>@]/.test(name))return error('Choose a display name of 2–60 characters. Do not use an email address.');
 const b=db(),now=new Date().toISOString();
 await b.batch([b.prepare('INSERT INTO player_profiles VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,updated_at=excluded.updated_at').bind(u.userId,name,now,now),b.prepare('UPDATE users SET name=? WHERE id=?').bind(name,u.userId)]);
 return Response.json({ok:true,name},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){console.error('save profile',e);return error('Could not save your profile. Please try again.',503);}}
