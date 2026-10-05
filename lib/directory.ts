import {db,seed} from './server';
import {evidenceSchema} from './evidence-server';
import {venues as fixtures,courts as fixtureCourts,type Venue,type Court} from './data';
let schema:Promise<unknown>|undefined;
export async function directorySchema(){await seed();await evidenceSchema();if(!schema)schema=db().batch([
 db().prepare('CREATE TABLE IF NOT EXISTS venue_details(venue_id TEXT PRIMARY KEY,metadata TEXT NOT NULL)'),
 db().prepare('CREATE UNIQUE INDEX IF NOT EXISTS venue_name_area ON venues(lower(trim(name)),lower(trim(area)))'),
 db().prepare('CREATE UNIQUE INDEX IF NOT EXISTS court_name_venue ON courts(venue_id,lower(trim(name)))')
]).catch(e=>{schema=undefined;throw e;});await schema;}
export async function directory(){await directorySchema();const b=db();const vr=await b.prepare('SELECT v.*,d.metadata FROM venues v LEFT JOIN venue_details d ON v.id=d.venue_id ORDER BY v.rowid').all();const cr=await b.prepare('SELECT * FROM courts ORDER BY rowid').all();
 const courts:Court[]=(cr.results as any[]).map(c=>{const fixture=fixtureCourts.find(f=>f.id===c.id);return {...(fixture??{ratings:[],sampleCount:0,real:true}),id:c.id,venueId:c.venue_id,name:c.name,type:c.type};});
 const venues:Venue[]=(vr.results as any[]).map(v=>{const fixture=fixtures.find(f=>f.id===v.id);const meta=v.metadata?JSON.parse(v.metadata):{};const types=[...new Set(courts.filter(c=>c.venueId===v.id).map(c=>c.type))];return {...(fixture??{color:'mint',real:true}),...meta,id:v.id,name:v.name,area:v.area,facilities:JSON.parse(v.facilities),courts:courts.filter(c=>c.venueId===v.id).length,type:types.length===1?types[0]:'Mixed'};});return {venues,courts};
}
export function validateVenue(body:any){
 if(!body||typeof body!=='object')return 'Invalid venue details.';
 if(typeof body.name!=='string'||body.name.trim().length<2||body.name.length>120||typeof body.area!=='string'||body.area.trim().length<2||body.area.length>100)return 'Enter a venue name and area (2–120 and 2–100 characters).';
 if(typeof body.notes!=='string'||body.notes.length>1000||!Array.isArray(body.facilities)||body.facilities.length>12||body.facilities.some((f:any)=>typeof f!=='string'||!f.trim()||f.length>60))return 'Use up to 12 facilities and notes under 1,000 characters.';
 for(const key of ['mapUrl','bookingUrl']){if(typeof body[key]!=='string'||body[key].length>2000)return 'Enter valid HTTPS links or leave them blank.';if(body[key])try{const url=new URL(body[key]);if(url.protocol!=='https:'||url.username||url.password)throw Error();}catch{return 'Links must use https:// and have no embedded login details.';}}
 if(body.venueId!==undefined&&typeof body.venueId!=='string')return 'Invalid venue selection.';
 if(!Array.isArray(body.courts)||body.courts.length<1||body.courts.length>20||body.courts.some((c:any)=>!c||typeof c.name!=='string'||c.name.trim().length<2||c.name.length>60||!['Indoor','Outdoor','Covered'].includes(c.type)||(c.id!==undefined&&typeof c.id!=='string')))return 'Add 1–20 courts with names and valid types.';
 const names=body.courts.map((c:any)=>c.name.trim().toLowerCase());if(new Set(names).size!==names.length)return 'Each court needs a different name.';
 if(body.location!==null){const s=body.location;if(!s||![s.latitude,s.longitude,s.radius].every(Number.isFinite)||Math.abs(s.latitude)>90||Math.abs(s.longitude)>180||!Number.isInteger(s.radius)||s.radius<50||s.radius>200)return 'Enter both court coordinates and a radius of 50–200 metres, or leave the pin blank.';}
 return null;
}
