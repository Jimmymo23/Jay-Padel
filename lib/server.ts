import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../app/chatgpt-auth';
import {venues,courts,categories} from './data';
export function db(){if(!env.DB)throw new Error('Storage is unavailable');return env.DB;}
export async function seed(){const b=db(); await b.batch([...venues.map(v=>b.prepare('INSERT OR IGNORE INTO venues(id,name,area,facilities) VALUES(?,?,?,?)').bind(v.id,v.name,v.area,JSON.stringify(v.facilities))),...courts.map(c=>b.prepare('INSERT OR IGNORE INTO courts(id,venue_id,name,type) VALUES(?,?,?,?)').bind(c.id,c.venueId,c.name,c.type))]);}
export async function identity(){if(!import.meta.env.DEV)return null;const u=await getChatGPTUser();if(!u)return null; const b=db();await b.prepare("INSERT OR IGNORE INTO users(id,name,role,created_at) VALUES(?,?,'player',?)").bind(u.userId,u.displayName,new Date().toISOString()).run();
 // Local development only: first mock user can moderate. Production identity stays disabled until Cloudflare authentication is configured.
 await b.prepare("UPDATE OR IGNORE users SET role='owner' WHERE id=? AND NOT EXISTS(SELECT 1 FROM users WHERE role='owner')").bind(u.userId).run();
 const row=await b.prepare('SELECT role FROM users WHERE id=?').bind(u.userId).first<{role:string}>();return {...u,role:row?.role??'player'};}
export function validCourt(id:unknown){return typeof id==='string'&&courts.some(c=>c.id===id);}
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function validateReview(body:any){if(!validCourt(body.courtId)||typeof body.playedDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.playedDate)||Number.isNaN(Date.parse(body.playedDate))||new Date(body.playedDate).toISOString().slice(0,10)!==body.playedDate||body.playedDate>today())return 'Choose a valid court and past play date.';if(typeof body.text!=='string'||body.text.length>2000)return 'Review text must be under 2,000 characters.';if(!body.ratings||Object.keys(body.ratings).some(k=>!categories.some(c=>c.key===k)))return 'Invalid rating categories.';if(categories.some(c=>body.ratings[c.key]!==null&&(!Number.isInteger(body.ratings[c.key])||body.ratings[c.key]<1||body.ratings[c.key]>5)))return 'Rate each category or select Not sure.';if(!Object.values(body.ratings).some(r=>r!==null))return 'Add at least one category rating.';return null;}
export function sameOrigin(req:Request){return req.headers.get('origin')===new URL(req.url).origin;}
export const error=(msg:string,status=400)=>Response.json({error:msg},{status});
