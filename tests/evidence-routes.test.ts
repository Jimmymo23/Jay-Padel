import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {GET as data} from '../app/api/data/route';
import {POST as checkIn} from '../app/api/checkins/route';
import {POST as review} from '../app/api/reviews/route';
import {POST as issue} from '../app/api/issues/route';
import {GET as photo,POST as assess} from '../app/api/evidence/route';
import {POST as moderate} from '../app/api/moderation/route';
import {today} from '../lib/server';
// Bundle this harness with cloudflare:workers and next/headers mapped to the globals below.
const g=globalThis as any;const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(process.cwd()+'/drizzle/0000_old_electro.sql','utf8'));
function statement(query:string,values:any[]=[]):any{return {bind:(...v:any[])=>statement(query,v),first:async()=>sql.prepare(query).get(...values)??null,all:async()=>({results:sql.prepare(query).all(...values)}),run:async()=>sql.prepare(query).run(...values)};}
g.evidenceTestDB={prepare:statement,batch:async(statements:any[])=>{sql.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};
function user(id:string|null){g.evidenceTestHeaders=new Headers(id?{'oai-authenticated-user-id':id,'oai-authenticated-user-email':id+'@test.invalid'}:{});}
const origin='https://test.invalid';function req(path:string,body:any,source=origin){return new Request(origin+path,{method:'POST',headers:{origin:source,'content-type':'application/json'},body:JSON.stringify(body)});}
user('admin');await data();
assert.equal((await checkIn(req('/api/checkins',{venueId:'aeon',action:'configure',latitude:30.0031455,longitude:30.9669285,radius:100}))).status,200);
user('player');await data();assert.equal((await checkIn(req('/api/checkins',{venueId:'aeon',action:'configure',latitude:30,longitude:30,radius:100}))).status,403);
assert.equal((await checkIn(req('/api/checkins',{venueId:'aeon'},'https://evil.invalid'))).status,403);
assert.equal((await checkIn(req('/api/checkins',{venueId:'east'}))).status,400);
const position={latitude:30.0031455,longitude:30.9669285,accuracy:10,timestamp:Date.now()};
assert.equal((await checkIn(req('/api/checkins',{venueId:'aeon',position:{...position,latitude:30.1}}))).status,400);
const checked=await (await checkIn(req('/api/checkins',{venueId:'aeon',position}))).json() as any;
assert.ok(checked.id);assert.equal(checked.played_date,today());
assert.equal((await (await checkIn(req('/api/checkins',{venueId:'aeon',position}))).json() as any).id,checked.id);
const jpeg='data:image/jpeg;base64,'+btoa('\xff\xd8'+'a'.repeat(100)+'\xff\xd9');
const body={courtId:'aeon-1',playedDate:today(),ratings:{turf:3,lighting:null,glass:null,fence:null,net:null,cleanliness:null},text:'Integration test',checkinId:checked.id,photos:[{data:jpeg,category:'turf',caption:'Private condition photo'}]};
assert.equal((await review(req('/api/reviews',{...body,courtId:'east-1'}))).status,400);
user('other');await data();assert.equal((await review(req('/api/reviews',body))).status,400);
user('player');const created=await review(req('/api/reviews',body));assert.equal(created.status,201);const target=(await created.json() as any).id;
assert.equal((await review(req('/api/reviews',body))).status,409);
let d=await (await data()).json() as any;assert.equal(d.myReviews[0].location_checked,true);const pid=d.myReviews[0].photos[0].id;
assert.equal((await photo(new Request(origin+'/api/evidence?id='+pid))).status,200);
user('other');assert.equal((await photo(new Request(origin+'/api/evidence?id='+pid))).status,404);
assert.equal((await assess(req('/api/evidence',{id:pid,status:'accepted',reason:'Testing evidence assessment'}))).status,403);
user('admin');assert.equal((await moderate(req('/api/moderation',{id:target,kind:'review',action:'publish',reason:'Testing moderation'}))).status,409);
assert.equal((await assess(req('/api/evidence',{id:pid,status:'accepted',reason:'Testing evidence assessment'}))).status,200);
user('other');assert.equal((await photo(new Request(origin+'/api/evidence?id='+pid))).status,404);
user('admin');assert.equal((await moderate(req('/api/moderation',{id:target,kind:'review',action:'publish',reason:'Testing moderation'}))).status,200);
user('other');assert.equal((await photo(new Request(origin+'/api/evidence?id='+pid))).status,200);d=await (await data()).json() as any;assert.equal(d.reviews[0].photos[0].status,'accepted');assert.ok(!JSON.stringify(d).includes('data:image'));
user('player');const reported=await issue(req('/api/issues',{courtId:'aeon-2',category:'turf',severity:'minor',text:'Integration test issue',checkinId:checked.id,photos:[{data:jpeg,category:'turf',caption:'Test issue image'}]}));assert.equal(reported.status,201);const iid=(await reported.json() as any).id;
user('admin');d=await (await data()).json() as any;const ip=d.pendingIssues[0].photos[0].id;assert.equal((await assess(req('/api/evidence',{id:ip,status:'rejected',reason:'Rejecting test photograph'}))).status,200);assert.equal((await moderate(req('/api/moderation',{id:iid,kind:'issue',action:'publish',reason:'Publishing issue without photo support'}))).status,200);
user('other');assert.equal((await photo(new Request(origin+'/api/evidence?id='+ip))).status,404);d=await (await data()).json() as any;assert.equal(d.issues[0].photos.length,0);
user(null);assert.equal((await review(req('/api/reviews',body))).status,401);assert.equal((await photo(new Request(origin+'/api/evidence?id='+pid))).status,401);
const columns=sql.prepare('PRAGMA table_info(checkins)').all().map((c:any)=>c.name);assert.ok(!columns.includes('latitude'));assert.ok(!columns.includes('longitude'));
console.log('Evidence route integration checks passed: ownership, geofence, atomic attachments, duplicate prevention, private images, independent moderation and audit.');
