import {db,today} from './server';
import {courts} from './data';
let schema:Promise<unknown>|undefined;
export async function evidenceSchema(){
 if(!schema)schema=db().batch([
  db().prepare('CREATE TABLE IF NOT EXISTS checkin_sites(venue_id TEXT PRIMARY KEY,latitude REAL NOT NULL,longitude REAL NOT NULL,radius INTEGER NOT NULL,updated_at TEXT NOT NULL)'),
  db().prepare('CREATE TABLE IF NOT EXISTS checkins(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,venue_id TEXT NOT NULL,played_date TEXT NOT NULL,distance INTEGER NOT NULL,accuracy INTEGER NOT NULL,created_at TEXT NOT NULL,UNIQUE(user_id,venue_id,played_date))'),
  db().prepare('CREATE TABLE IF NOT EXISTS evidence_photos(id TEXT PRIMARY KEY,target_id TEXT NOT NULL,kind TEXT NOT NULL,user_id TEXT NOT NULL,category TEXT NOT NULL,caption TEXT NOT NULL,data TEXT NOT NULL,status TEXT NOT NULL DEFAULT \'pending\',created_at TEXT NOT NULL)'),
  db().prepare('CREATE TABLE IF NOT EXISTS evidence_links(target_id TEXT PRIMARY KEY,checkin_id TEXT NOT NULL)'),
  db().prepare('CREATE INDEX IF NOT EXISTS photos_target ON evidence_photos(target_id)')
 ]).catch(e=>{schema=undefined;throw e;});
 await schema;
}
export async function attachmentStatements(body:any,userId:string,target:string,kind:string){
 await evidenceSchema();const b=db();const statements=[];
 if(body.checkinId){const venue=courts.find(c=>c.id===body.courtId)?.venueId;
  const checkin=await b.prepare('SELECT id FROM checkins WHERE id=? AND user_id=? AND venue_id=? AND played_date=?').bind(body.checkinId,userId,venue,kind==='review'?body.playedDate:today()).first();
  if(!checkin)throw new Error('Check-in does not match this account, venue and play date.');
  statements.push(b.prepare('INSERT INTO evidence_links(target_id,checkin_id) VALUES(?,?)').bind(target,body.checkinId));
 }
 for(const p of body.photos??[])statements.push(b.prepare('INSERT INTO evidence_photos(id,target_id,kind,user_id,category,caption,data,status,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),target,kind,userId,p.category,p.caption.trim(),p.data,'pending',new Date().toISOString()));
 return statements;
}
export async function decorateEvidence(rows:any[],privateView=false){
 if(!rows.length)return rows;const b=db(),linked=new Set<string>(),photos=new Map<string,any[]>();
 // Fetch metadata in bounded groups; never load image data for the directory.
 for(let offset=0;offset<rows.length;offset+=80){const ids=rows.slice(offset,offset+80).map(r=>r.id),placeholders=ids.map(()=>'?').join(',');
  const links=await b.prepare(`SELECT target_id FROM evidence_links WHERE target_id IN (${placeholders})`).bind(...ids).all();for(const link of links.results as any[])linked.add(link.target_id);
  const found=await b.prepare(`SELECT target_id,id,category,caption,status FROM evidence_photos WHERE target_id IN (${placeholders})`).bind(...ids).all();
  for(const {target_id,...p} of found.results as any[]){if(!privateView&&p.status!=='accepted')continue;photos.set(target_id,[...(photos.get(target_id)??[]),p]);}
 }
 return rows.map(r=>({...r,location_checked:linked.has(r.id),photos:photos.get(r.id)??[]}));
}
