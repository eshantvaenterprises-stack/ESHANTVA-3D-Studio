import assert from 'node:assert/strict';
import { configuredNotificationDelivery } from '../supabase/functions/_shared/configuredNotification.ts';
import { sendCustomRequestConfirmation, sendBulkRequestConfirmation } from '../supabase/functions/_shared/notification.ts';

// Real adapter, decorator, retry layer and SMTP parser; in-memory socket/RPC
// boundaries. This is targeted wiring evidence, never native TLS/SQL evidence.
const event={publicRequestId:'CR-2026-XYZ123',customerEmail:'local@example.invalid',submittedAt:'2026-11-11T00:00:00Z'};
let checks=0;
for(const scenario of ['disabled','accepted','retryable','rejected','ambiguous','ledger-unavailable','settle-unavailable']) {
 let connects=0,closed=0,messages=0,claims=0,state='queued',hash,lease='synthetic-lease';
 const env={NOTIFICATION_TRANSPORT:scenario==='disabled'?'':'smtp_tls',SMTP_HOST:'synthetic.invalid',SMTP_PORT:'465',SMTP_USERNAME:'synthetic',SMTP_PASSWORD:'synthetic-only',SMTP_FROM:'studio@example.invalid'};
 globalThis.Deno={env:{get:k=>env[k]},connectTls:async()=>{
  connects++;let pending='220 synthetic ESMTP\r\n',data=false;
  return {
   async read(buffer){if(!pending)throw Error('synthetic disconnect');const bytes=new TextEncoder().encode(pending);buffer.set(bytes);pending='';return bytes.length;},
   async write(bytes){const line=new TextDecoder().decode(bytes);
    if(line.startsWith('EHLO'))pending='250-synthetic\r\n250 AUTH PLAIN\r\n';
    else if(line.startsWith('AUTH'))pending='235 accepted\r\n';
    else if(line.startsWith('MAIL'))pending='250 sender\r\n';
    else if(line.startsWith('RCPT'))pending=scenario==='retryable'&&connects<3?'450 later\r\n':scenario==='rejected'?'550 rejected\r\n':'250 recipient\r\n';
    else if(line==='DATA\r\n'){data=true;pending='354 data\r\n';}
    else if(data){messages++;assert.match(line,/To: <local@example.invalid>\r\n/);assert.ok(!line.includes('Bcc:'));assert.match(line,/Message-ID: <(?:custom.CR|bulk.BR)-2026-XYZ123@eshantva.invalid>/);pending=scenario==='ambiguous'?'':'250 accepted\r\n';}
    return bytes.length;
   },close(){closed++;}
  };
 }};
 const admin={async rpc(name,args){
  if(scenario==='ledger-unavailable')return {data:null,error:{code:'synthetic'}};
  if(name==='claim_notification_delivery'){
   claims++;if(state==='sent')return {data:{state:'sent'},error:null};
   if(state==='unknown'||state==='sending'||(hash&&hash!==args.p_hash))return {data:{state:'blocked'},error:null};
   hash=args.p_hash;state='sending';return {data:{state:'claimed',lease},error:null};
  }
  assert.equal(name,'settle_notification_delivery');assert.equal(args.p_lease,lease);
  if(scenario==='settle-unavailable')return {data:null,error:{code:'synthetic'}};
  state=args.p_state;return {data:true,error:null};
 }};
 const delivery=configuredNotificationDelivery(admin);if(delivery)delivery.wait=async()=>{};
 const result=await sendCustomRequestConfirmation(event,delivery);
 if(scenario==='disabled'){assert.deepEqual(result,{sent:false,reason:'provider_not_configured'});assert.equal(connects,0);}
 else if(['accepted','retryable'].includes(scenario)){
  assert.equal(result.sent,true);assert.equal(connects,scenario==='retryable'?3:1);assert.equal(state,'sent');
  const replay=await sendCustomRequestConfirmation(event,delivery);assert.equal(replay.sent,true);assert.equal(messages,1);
 }else{assert.equal(result.sent,false);assert.equal(result.reason,scenario==='rejected'?'delivery_rejected':'delivery_unknown');assert.equal(connects,scenario==='ledger-unavailable'?0:1);}
 assert.equal(connects,closed);if(scenario!=='disabled')assert.ok(claims>0||scenario==='ledger-unavailable');checks++;
}
// Both original call-site kinds are supported by the same adapter.
globalThis.Deno={env:{get:()=>''}};
assert.deepEqual(await sendBulkRequestConfirmation({...event,publicRequestId:'BR-2026-XYZ123'},configuredNotificationDelivery({rpc(){throw Error('must not call')}})),{sent:false,reason:'provider_not_configured'});checks++;
delete globalThis.Deno;
console.log(`CONFIGURED_NOTIFICATION_WIRING_PASS=${checks}; in-memory SMTP/RPC boundaries; no native TLS or SQL claim`);
