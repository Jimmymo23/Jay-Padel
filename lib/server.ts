import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../app/chatgpt-auth';
import {headers} from 'next/headers';
import {accessUser,accessRole} from './access-auth';
import {venues,courts,categories} from './data';
export function db(){if(!env.DB)throw new Error('Storage is unavailable');return env.DB;}
export async function seed(){const b=db(); await b.batch([...venues.map(v=>b.prepare('INSERT OR IGNORE INTO venues(id,name,area,facilities) VALUES(?,?,?,?)').bind(v.id,v.name,v.area,JSON.stringify(v.facilities))),...courts.map(c=>b.prepare('INSERT OR IGNORE INTO courts(id,venue_id,name,type) VALUES(?,?,?,?)').bind(c.id,c.venueId,c.name,c.type))]);}
export async function profileSchema(){await db().prepare("CREATE TABLE IF NOT EXISTS player_profiles(user_id TEXT PRIMARY KEY,display_name TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)").run();}
export async function identity(){
 const local=import.meta.env.DEV;
 const u=local?await getChatGPTUser():await accessUser((await headers()).get('cf-access-jwt-assertion'));
 if(!u)return null;
 const b=db();await profileSchema();const profile=await b.prepare('SELECT display_name FROM player_profiles WHERE user_id=?').bind(u.userId).first<{display_name:string}>();const role=local?'player':accessRole(u.email,env.JAY_PADEL_ADMIN_EMAIL);const displayName=profile?.display_name??(local?u.displayName:role==='owner'?'Jay Padel Admin':'Player');
 await b.prepare('INSERT OR IGNORE INTO users(id,name,role,created_at) VALUES(?,?,?,?)').bind(u.userId,displayName,'player',new Date().toISOString()).run();
 if(local){await b.prepare("UPDATE OR IGNORE users SET role='owner' WHERE id=? AND NOT EXISTS(SELECT 1 FROM users WHERE role='owner')").bind(u.userId).run();}
 else {
  // Reconcile roles from configuration on every request; stale database roles never grant admin access.
  if(role==='owner')await b.prepare("UPDATE users SET role='player' WHERE role='owner' AND id!=?").bind(u.userId).run();
  await b.prepare('UPDATE users SET name=?,role=? WHERE id=?').bind(displayName,role,u.userId).run();
 }
 const row=await b.prepare('SELECT role FROM users WHERE id=?').bind(u.userId).first<{role:string}>();return {...u,displayName,registered:local||role==='owner'||!!profile,role:local?(row?.role??'player'):role};
}
export async function validCourt(id:unknown){if(typeof id!=='string')return false;await seed();return !!await db().prepare('SELECT id FROM courts WHERE id=?').bind(id).first();}
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export async function validateReview(body:any){if(!body||!await validCourt(body.courtId)||typeof body.playedDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.playedDate)||Number.isNaN(Date.parse(body.playedDate))||new Date(body.playedDate).toISOString().slice(0,10)!==body.playedDate||body.playedDate>today())return 'Choose a valid court and past play date.';if(typeof body.text!=='string'||body.text.length>2000)return 'Review text must be under 2,000 characters.';if(!body.ratings||Object.keys(body.ratings).some(k=>!categories.some(c=>c.key===k)))return 'Invalid rating categories.';if(categories.some(c=>body.ratings[c.key]!==null&&(!Number.isInteger(body.ratings[c.key])||body.ratings[c.key]<1||body.ratings[c.key]>5)))return 'Rate each category or select Not sure.';if(!Object.values(body.ratings).some(r=>r!==null))return 'Add at least one category rating.';return null;}
export function sameOrigin(req:Request){return req.headers.get('origin')===new URL(req.url).origin;}
export const error=(msg:string,status=400)=>Response.json({error:msg},{status});
