import {categories,type Review} from './data';
export function calculateScore(reviews:Review[],now=new Date()){
 const eligible=reviews.filter(r=>r.status==='published'&&Number.isFinite(Date.parse(r.played_date))).map(r=>({...r,age:Math.floor((Date.parse(new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now))-Date.parse(r.played_date))/86400000)})).filter(r=>r.age>=0&&r.age<=365);
 const means:Record<string,number>={};let coverage=0;
 for(const c of categories){const obs=eligible.flatMap(r=>{let ratings;try{ratings=JSON.parse(r.ratings)}catch{return []}const val=ratings[c.key];return Number.isInteger(val)&&val>=1&&val<=5?[{user:r.user_id,x:25*(val-1),w:r.age<=30?1:r.age<=90?.85:r.age<=180?.65:.4}]:[]});if(!obs.length)continue;const totals:Record<string,number>={};for(const o of obs)totals[o.user]=(totals[o.user]??0)+o.w;let total=0,sum=0;for(const o of obs){const w=o.w*Math.min(1,1.8/totals[o.user]);total+=w;sum+=w*o.x;}means[c.key]=sum/total;coverage+=c.weight;}
 const count=new Set(eligible.map(r=>r.user_id)).size;
 const score=count>=2&&coverage>=60?Math.round(categories.reduce((sum,c)=>sum+(means[c.key]??0)*c.weight,0)/coverage):null;
 return {score,coverage,count,confidence:'Low',provisional:true,components:means,freshness:eligible.length?eligible.reduce((m,r)=>r.played_date>m?r.played_date:m,''):null,config:'pq-v1.1-beta'};
}
