'use client';
import {useState} from 'react';
import {supabaseFunctionUrl,supabasePublicConfig} from '@/config/supabase';
import {getSupabaseBrowserClient} from '@/lib/supabaseBrowser';
import {requireExplicitRecruitmentEnvironment} from '@/lib/recruitmentEnvironment';
type SavedStatus={eligible:boolean;saved:boolean;maskedAccount:string|null;maskedIfsc?:string|null;updatedAt?:string|null};
const url=supabaseFunctionUrl('recruitment-bank-api',process.env.NEXT_PUBLIC_SUPABASE_RECRUITMENT_BANK_FUNCTION_URL);
async function request<T>(action:string,fields:Record<string,unknown>={}):Promise<T>{
 requireExplicitRecruitmentEnvironment(url);
 const {data:{session}}=await getSupabaseBrowserClient().auth.getSession();
 if(!session?.access_token||session.user.is_anonymous)throw new Error('CANDIDATE_AUTH_REQUIRED');
 const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:supabasePublicConfig.publishableKey},cache:'no-store',body:JSON.stringify({action,...fields})});
 const result=await r.json().catch(()=>({ok:false,code:'BANK_SERVICE_UNAVAILABLE'})) as {ok:boolean;code?:string;data?:T};
 if(!r.ok||!result.ok||!result.data)throw new Error(result.code||'BANK_SERVICE_UNAVAILABLE');return result.data;
}
export function CandidatePaymentDetails(){
 const [status,setStatus]=useState<SavedStatus|null>(null),[message,setMessage]=useState('Payment collection is available only to eligible trainees after business approval.'),[busy,setBusy]=useState(false);
 const [holder,setHolder]=useState(''),[account,setAccount]=useState(''),[confirm,setConfirm]=useState(''),[ifsc,setIfsc]=useState(''),[ack,setAck]=useState(false);
 const [saveAttempt,setSaveAttempt]=useState<{fingerprint:string;requestId:string}|null>(null);
 const load=async()=>{setBusy(true);try{setStatus(await request<SavedStatus>('candidate-status'));setMessage('Server-confirmed masked payment details status.')}catch(e){setMessage(e instanceof Error?e.message:'Unavailable')}finally{setBusy(false)}};
 const save=async()=>{setBusy(true);try{if(!ack||account!==confirm)throw Error('Confirm the payment purpose and match the account numbers.');const fingerprint=JSON.stringify([holder.trim(),account,ifsc.trim().toUpperCase()]);const attempt=saveAttempt?.fingerprint===fingerprint?saveAttempt:{fingerprint,requestId:crypto.randomUUID()};setSaveAttempt(attempt);const result=await request<SavedStatus>('candidate-save',{accountHolder:holder,accountNumber:account,confirmAccountNumber:confirm,ifsc,acknowledged:true,requestId:attempt.requestId});setSaveAttempt(null);setAccount('');setConfirm('');setStatus(result);setMessage('Encrypted payment details recorded for authorized payment review. No transfer has been initiated.')}catch(e){setMessage(e instanceof Error?e.message:'Unable to save payment details.')}finally{setBusy(false)}};
 return <section className="recruit-card"><h3>Restricted payment details</h3>
  <p>Only submit bank details if ESHANTVA has approved a training-related payment to you. Your account information is stored encrypted and is accessible only to authorized payment reviewers. No bank transfer is initiated by this form.</p>
  <button type="button" className="button" disabled={busy} onClick={()=>void load()}>Check secure payment-details status</button>
  {status?.saved&&<p>Saved account: {status.maskedAccount} · IFSC: {status.maskedIfsc||'masked'}</p>}
  {status?.eligible?<div className="candidate-form compact">
   <label>Account holder name <input autoComplete="off" value={holder} maxLength={160} onChange={e=>setHolder(e.target.value)}/></label>
   <label>Account number <input autoComplete="off" type="password" value={account} onChange={e=>setAccount(e.target.value)} /></label>
   <label>Confirm account number <input autoComplete="off" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
   <label>IFSC <input autoComplete="off" value={ifsc} maxLength={11} onChange={e=>setIfsc(e.target.value.toUpperCase())}/></label>
   <label className="check-row"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/> I confirm these are my payment details and acknowledge their restricted use for approved training-related payments.</label>
   <button type="button" className="button" disabled={busy||!ack||!holder||!account||!ifsc} onClick={()=>void save()}>Save encrypted payment details</button>
  </div>:<p>Payment information cannot be submitted before the approved training-payment stage. Use the status check when instructed.</p>}<p role="status">{message}</p>
 </section>;
}
