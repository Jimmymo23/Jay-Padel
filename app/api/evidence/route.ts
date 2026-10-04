import {canViewPhoto} from '../../../lib/evidence';
import {db,identity,sameOrigin,error} from '../../../lib/server';
import {evidenceSchema} from '../../../lib/evidence-server';
export async function GET(req:Request){try{
 const u=await identity();if(!u)return error('Sign in to view evidence.',401);await evidenceSchema();const id=new URL(req.url).searchParams.get('id');const p:any=await db().prepare('SELECT * FROM evidence_photos WHERE id=?').bind(id??'').first();
 if(!p)return error('Photo unavailable.',404);
 const table=p.kind==='review'?'reviews':'issues',column=p.kind==='review'?'status':'publication';const target:any=await db().prepare(`SELECT ${column} AS publication FROM ${table} WHERE id=?`).bind(p.target_id).first();
 if(!canViewPhoto(u.role,u.userId,p.user_id,p.status,target?.publication))return error('Photo unavailable.',404);
 const data=Uint8Array.from(atob(p.data.split(',')[1]),c=>c.charCodeAt(0));return new Response(data,{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"}});
 }catch{return error('Photo unavailable.',503);}}
export async function POST(req:Request){try{
 if(!sameOrigin(req))return error('Invalid request origin.',403);const u=await identity();if(u?.role!=='owner')return error('Moderator access required.',403);await evidenceSchema();const body:any=await req.json();
 if(!['accepted','rejected'].includes(body.status)||typeof body.reason!=='string'||body.reason.trim().length<5||body.reason.length>500)return error('Add an evidence decision reason of 5–500 characters.');
 const p=await db().prepare('SELECT id FROM evidence_photos WHERE id=? AND status=\'pending\'').bind(body.id??'').first();if(!p)return error('Photo has already been handled.',409);
 await db().batch([db().prepare('UPDATE evidence_photos SET status=? WHERE id=? AND status=\'pending\'').bind(body.status,body.id),db().prepare('INSERT INTO audit VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),u.userId,body.id,'photo '+body.status,body.reason.trim(),new Date().toISOString())]);return Response.json({ok:true});
 }catch{return error('Could not save photo decision.',503);}}
