import assert from 'node:assert/strict';
import { withNotificationLedger } from '../supabase/functions/_shared/notificationLedger.ts';
const event={kind:'custom',eventKey:'custom.CR-2026-TEST01',publicRequestId:'CR-2026-TEST01',customerEmail:'fixture@example.invalid',submittedAt:'2026-11-15T00:00:00Z'};
let checks=0;
function fixture(mode='accepted'){
 let state='queued',hash=null,calls=0,release;const settlements=[];
 const ledger={async claim(_key,payloadHash){if(hash&&hash!==payloadHash)return{state:'blocked'};hash=payloadHash;if(state==='sent')return{state:'sent'};if(state!=='queued'&&state!=='retryable')return{state:'blocked'};state='sending';return{state:'claimed',lease:'fixture-lease'};},async settle(_key,lease,next){assert.equal(lease,'fixture-lease');settlements.push(next);if(mode==='settlement-crash')throw Error('injected settlement failure');state=next;}};
 const transport={async send(){calls++;if(mode==='concurrent')await new Promise(resolve=>release=resolve);if(mode==='transport-crash')throw Error('injected ambiguous acceptance');return{accepted:mode!=='retryable'&&mode!=='rejected',retryable:mode==='retryable'};}};
 return{subject:withNotificationLedger(transport,ledger),get state(){return state;},get calls(){return calls;},release:()=>release(),settlements};
}
const signal=new AbortController().signal;
const accepted=fixture();assert.deepEqual(await accepted.subject.send(event,signal),{accepted:true,retryable:false});assert.equal(accepted.state,'sent');checks++;
assert.deepEqual(await accepted.subject.send(event,signal),{accepted:true});assert.equal(accepted.calls,1);checks++;
await assert.rejects(accepted.subject.send({...event,customerEmail:'other@example.invalid'},signal),/claim unavailable/);assert.equal(accepted.calls,1);checks++;
for(const mode of ['transport-crash','settlement-crash']){const f=fixture(mode);await assert.rejects(f.subject.send(event,signal),/delivery unresolved/);await assert.rejects(f.subject.send(event,signal),/claim unavailable/);assert.equal(f.calls,1);assert.ok(f.settlements.includes('unknown'));checks++;}
const cancelled=fixture(),abort=new AbortController();abort.abort();await assert.rejects(cancelled.subject.send(event,abort.signal),/delivery unresolved/);assert.equal(cancelled.calls,0);assert.equal(cancelled.state,'unknown');checks++;
for(const mode of ['retryable','rejected']){const f=fixture(mode);await f.subject.send(event,signal);assert.equal(f.state,mode);checks++;}
const concurrent=fixture('concurrent');const first=concurrent.subject.send(event,signal);while(!concurrent.calls)await new Promise(resolve=>setImmediate(resolve));await assert.rejects(concurrent.subject.send(event,signal),/claim unavailable/);concurrent.release();await first;assert.equal(concurrent.calls,1);checks++;
console.log(`NOTIFICATION_LEDGER_BOUNDARY_PASS=${checks}; actual decorator with in-memory atomic claim double; SQL RLS/grants/atomicity NOT_PROVEN; no sends`);
