import assert from 'node:assert/strict';
import {verifyAccessToken,accessRole,ACCESS_ISSUER,ACCESS_AUDIENCE} from '../lib/access-auth';
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const key={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test'};
const now=1800000000;
const payload={iss:ACCESS_ISSUER,aud:[ACCESS_AUDIENCE],sub:'player-id',email:'player@example.test',type:'app',iat:now-10,nbf:now-10,exp:now+60};
const enc=(x:unknown)=>Buffer.from(JSON.stringify(x)).toString('base64url');
async function token(p:unknown=payload,h:unknown={alg:'RS256',kid:'test'}){const message=enc(h)+'.'+enc(p);return message+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(message))).toString('base64url');}
const valid=await token();
assert.equal((await verifyAccessToken(valid,[key],now))?.userId,'cf-access:player-id');
for(const changed of [{iss:'https://other.cloudflareaccess.com'},{aud:['other']},{exp:now},{nbf:now+60},{iat:now+60},{type:'service'},{email:null},{sub:''}])assert.equal(await verifyAccessToken(await token({...payload,...changed}),[key],now),null);
assert.equal(await verifyAccessToken(await token(payload,{alg:'none',kid:'test'}),[key],now),null);
assert.equal(await verifyAccessToken(await token(payload,{alg:'RS256',kid:'unknown'}),[key],now),null);
const parts=valid.split('.');parts[1]=enc({...payload,email:'admin@example.test'});assert.equal(await verifyAccessToken(parts.join('.'),[key],now),null);
assert.equal(await verifyAccessToken('not-a-token',[key],now),null);
assert.equal(accessRole('admin@example.test',undefined),'player');
assert.equal(accessRole('player@example.test','admin@example.test'),'player');
assert.equal(accessRole('Admin@Example.Test','admin@example.test'),'owner');
console.log('16 authentication and role checks passed.');
