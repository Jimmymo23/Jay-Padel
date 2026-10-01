import assert from 'node:assert/strict';
import {calculateScore} from '../lib/scoring';
const keys=['turf','lighting','glass','fence','net','cleanliness'];
const now=new Date('2026-10-01T12:00:00Z');
function review(user:string,date='2026-09-25',rating=4,subset=keys){return {id:crypto.randomUUID(),user_id:user,court_id:'east-1',played_date:date,ratings:JSON.stringify(Object.fromEntries(keys.map(k=>[k,subset.includes(k)?rating:null]))),text:'Test',status:'published',created_at:date};}
assert.equal(calculateScore([review('a'),review('b')],now).score,75);
assert.equal(calculateScore([review('a')],now).score,null);
assert.equal(calculateScore([review('a',undefined,5,['turf']),review('b',undefined,5,['turf'])],now).score,null);
const incomplete=review('a');incomplete.ratings=JSON.stringify({turf:5,lighting:3,glass:null,fence:null,net:null,cleanliness:null});
assert.equal(calculateScore([incomplete,{...incomplete,user_id:'b'}],now).score,83);
assert.equal(calculateScore([review('a','2025-09-30'),review('b','2025-09-30')],now).score,null);
assert.equal(calculateScore([review('a'),{...review('b'),status:'pending'}],now).score,null);
assert.equal(calculateScore([review('a','2026-10-02'),review('b','2026-10-02')],now).score,null);
const repeated=[review('a',undefined,5),review('a','2026-09-24',5),review('a','2026-09-23',5),review('b',undefined,1)];
assert.equal(calculateScore(repeated,now).score,64); // 1.8*100 / (1.8+1)
console.log('8 meaningful score fixtures passed.');
