'use client';
import { useCallback,useEffect,useState } from 'react';
import { getAdminAuthSession } from '@/lib/adminAuth';
import { siteConfig } from '@/config/site';
import { AdminPhase3Nav } from '@/components/admin/AdminPhase3Nav';
import { legacyMutation,loadLegacyList,loadLegacySummary,previewLegacySource } from '@/lib/adminLegacyRecruitmentApi';
import type { LegacyList,LegacyPreview,LegacySummary } from '@/lib/adminLegacyRecruitmentApi';

const initial={sourceType:'WHATSAPP',sourceRef:'',receivedAt:'',fullName:'',email:'',phone:''};
const receivedAtIso=(local:string)=>local?new Date(local).toISOString():'';
export function LegacyIntakeAdminClient(){
 const [summary,setSummary]=useState<LegacySummary|null>(null);
 const [rows,setRows]=useState<LegacyList>({people:[],sources:[]});
 const [state,setState]=useState('Checking admin access…');const[busy,setBusy]=useState(false);
 const[form,setForm]=useState(initial);const[preview,setPreview]=useState<LegacyPreview|null>(null);
 const[evidenceJson,setEvidenceJson]=useState('{\"prefill\":{}}');
 const[prefillField,setPrefillField]=useState('address_line');
 const[reason,setReason]=useState('');const [message,setMessage]=useState('');const[personId,setPersonId]=useState('');const [sourceId,setSourceId]=useState('');
 const [secret,setSecret]=useState<{temporaryPassword:string;expiresAt:string;invitationId:string;deliveryChannel:string}|null>(null);
 const reload=useCallback(async()=>{const [s,l]=await Promise.all([loadLegacySummary(),loadLegacyList()]);setSummary(s);setRows(l);setState('ready')},[]);
 useEffect(()=>{let alive=true;getAdminAuthSession().then(({data})=>{if(!alive)return;if(!data.session?.user||data.session.user.is_anonymous){location.replace(`${siteConfig.basePath}/admin/login/`);return}void reload().catch(()=>setState('Access denied or staging configuration unavailable.'))});return()=>{alive=false}},[reload]);
 async function run(action:string,params:Record<string,unknown>){if(!summary?.importEnabled){setMessage('Import and mutations remain locked until separately authorized.');return}
 setBusy(true);setSecret(null);setMessage('');try{const result=await legacyMutation<Record<string,unknown>>(action,params,reason);
 if(action==='issue-invitation'&&typeof result.temporaryPassword==='string')setSecret(result as unknown as {temporaryPassword:string;expiresAt:string;invitationId:string;deliveryChannel:string});
 setMessage('Action completed with server-side audit record.');await reload();}catch(e){setMessage(e instanceof Error?e.message:'Action rejected.')}finally{setBusy(false)}}
 async function stageSourceWithEvidence(){
   let rawSnapshot:Record<string,unknown>;
   try{
     const decoded:unknown=JSON.parse(evidenceJson);
     if(!decoded||typeof decoded!=='object'||Array.isArray(decoded))throw new Error('Evidence must be a JSON object.');
     // Never erase source-authored claims when an optional review field is left blank.
     rawSnapshot={...(decoded as Record<string,unknown>),
       ...(form.fullName.trim()?{name:form.fullName.trim()}:{}),
       ...(form.email.trim()?{email:form.email.trim()}:{}),
       ...(form.phone.trim()?{phone:form.phone.trim()}:{}),};
     if(new TextEncoder().encode(JSON.stringify(rawSnapshot)).byteLength>16000)throw new Error('Evidence exceeds 16 KB source limit.');
     const contact=rawSnapshot.self_declared;
     if(contact&&typeof contact==='object'&&!Array.isArray(contact)){
       const fields=contact as Record<string,unknown>;
       if(typeof fields.full_name==='string'&&form.fullName&&fields.full_name.trim().toLocaleLowerCase()!==form.fullName.trim().toLocaleLowerCase())
         throw new Error('Source CV name differs from selected source name. Review before import.');
       if(typeof fields.email==='string'&&form.email&&fields.email.trim().toLowerCase()!==form.email.trim().toLowerCase())
         throw new Error('Source CV email differs from selected source email. Review before import.');
       if(typeof fields.phone==='string'&&form.phone&&fields.phone.trim()!==form.phone.trim())
         throw new Error('Source CV phone differs from selected source phone. Review before import.');
     }
   }catch(error){setMessage(error instanceof Error?error.message:'Malformed source evidence JSON.');return}
   await run('stage-source',{sourceType:form.sourceType,sourceRef:form.sourceRef,
    receivedAt:receivedAtIso(form.receivedAt),rawSnapshot});
 }
 const unlocked=summary?.importEnabled===true;
 return <div className="admin-app-shell"><aside className="admin-sidebar"><div className="admin-wordmark"><span>ESHANTVA</span><small>ADMIN</small></div><AdminPhase3Nav active="recruitment"/></aside><main className="admin-main">
 <header className="admin-topbar"><div><span className="admin-kicker">STAGE 2C · PRIVATE</span><h1>Legacy applicant review</h1><p>Only evidence received before 12 October 2026, 6:00 PM IST is eligible. Matching never merges people automatically.</p></div><button className="button" onClick={()=>void reload().catch(()=>setState('Unable to refresh.'))}>Refresh</button></header>
 {state!=='ready'&&<section className="admin-phase-note">{state}</section>}
 {summary&&<section className="admin-phase-note"><h2>Controlled intake</h2><p>{summary.importEnabled?'Authorized intake operations enabled':'Intake mutations locked. No real records may be imported until separately authorized.'}</p><div className="admin-metric-grid">{([['People',summary.persons],['Unreviewed',summary.unreviewed],['Conflicts',summary.conflicts],['Approved',summary.approved],['Invited',summary.invited],['Activated',summary.activated]] as const).map(([name,n])=><article key={name}><span>{name}</span><strong>{n}</strong></article>)}</div></section>}
 <section className="admin-phase-note"><h2>Preview incoming evidence</h2><p>Review full source provenance before importing. Exact email/phone matches are leads for human conflict review, not automatic identity proof.</p><form className="candidate-form" action={async()=>{setBusy(true);setMessage('');try{setPreview(await previewLegacySource({...form,receivedAt:receivedAtIso(form.receivedAt)}))}catch(e){setMessage(e instanceof Error?e.message:'Preview unavailable')}finally{setBusy(false)}}}>
 <label>Source channel<select value={form.sourceType} onChange={e=>setForm({...form,sourceType:e.target.value})}><option>WHATSAPP</option><option>EMAIL</option><option>OTHER</option></select></label>
 <label>Original message/source reference<input value={form.sourceRef} onChange={e=>setForm({...form,sourceRef:e.target.value})} required/></label>
 <label>Original receipt date and time (local)<input type="datetime-local" value={form.receivedAt} onChange={e=>setForm({...form,receivedAt:e.target.value})} required/></label>
 <label>Full name (if available)<input value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})}/></label>
 <label>Email (if provided)<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
 <label>Phone (+country code, if provided)<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
 <button className="button" disabled={busy}>Preview source and possible duplicates</button></form>
 <label className="candidate-form">Private applicant-authored source evidence (review exact source/person fields; JSON object)
 <textarea value={evidenceJson} onChange={e=>setEvidenceJson(e.target.value)} rows={6} spellCheck={false}/></label>
 {preview&&<div className="recruit-card"><p><strong>Before cutoff:</strong> {preview.eligibleReceivedAt?'Yes':'No · excluded from approved legacy intake'}</p><p><strong>Source already recorded:</strong> {preview.sourceAlreadyExists?'Yes':'No'}</p><p><strong>Possible matching people:</strong> {preview.matches.length}</p>{preview.matches.map(p=><p key={p.id}>{p.full_name||'Unnamed'} · {p.intake_status}</p>)}<p>{!form.fullName.trim()&&!form.email.trim()&&!form.phone.trim()?'Source-only record: person creation and invitation remain unavailable until contact and name are supplied.':'Human review required. Automatic merge disabled.'}</p></div>}
 </section>
 <section className="admin-phase-note"><h2>Phone-only identity exception</h2><p>A phone-only applicant cannot attach a new verified email automatically. Before invitation, one ADMIN must document the original-number callback, independent email-control evidence and proof references; a second distinct ADMIN must approve. The proposed email must then match the claimant&apos;s confirmed Supabase Auth email. This process is locked until the ownership-review backend is enabled after authorized evidence review.</p></section>
 <section className="admin-phase-note"><h2>Manual decisions and audit</h2><label className="candidate-form">Reason / supporting evidence (12+ characters)<textarea value={reason} onChange={e=>setReason(e.target.value)} minLength={12} required/></label>
 <label>Selected person ID<input value={personId} onChange={e=>setPersonId(e.target.value)} placeholder="Use reviewed person ID"/></label><label>Selected source ID<input value={sourceId} onChange={e=>setSourceId(e.target.value)} placeholder="Use reviewed source ID"/></label><label>Evidence field to prefill on that person&apos;s permanent form<select value={prefillField} onChange={e=>setPrefillField(e.target.value)}><option value="address_line">Address</option><option value="city">City</option><option value="district">District</option><option value="state">State</option><option value="pin_code">PIN</option><option value="current_engagement">Current work/student status</option><option value="availability_text">Availability</option><option value="education">Education (complete structured evidence)</option><option value="experience">Experience (complete structured evidence)</option><option value="languages">Languages (complete structured evidence)</option></select></label>
 <div className="admin-transition-bar"><button disabled={!unlocked||busy||!preview||!preview.eligibleReceivedAt||preview.sourceAlreadyExists||reason.length<12} onClick={()=>void stageSourceWithEvidence()}>Stage source</button><button disabled={!unlocked||busy||reason.length<12} onClick={()=>void run('create-person',{fullName:form.fullName,email:form.email,phone:form.phone})}>Create pending person</button><button disabled={!unlocked||busy||!sourceId||!personId||reason.length<12} onClick={()=>void run('review-source',{sourceId,personId,decision:'LINKED'})}>Link source to person</button><button disabled={!unlocked||busy||!sourceId||!personId||reason.length<12} onClick={()=>void run('review-source',{sourceId,personId,decision:'CONFLICT'})}>Mark conflict</button><button disabled={!unlocked||busy||!sourceId||reason.length<12} onClick={()=>void run('review-source',{sourceId,personId:null,decision:'EXCLUDED'})}>Exclude source</button><button disabled={!unlocked||busy||!sourceId||!personId||reason.length<12} onClick={()=>void run('resolve-prefill-field',{personId,sourceId,fieldKey:prefillField})}>Resolve source field for permanent form</button><button disabled={!unlocked||busy||!personId||reason.length<12} onClick={()=>void run('approve-person',{personId})}>Approve reviewed person</button><button disabled={!unlocked||busy||!personId||reason.length<12} onClick={()=>void run('issue-invitation',{personId,channel:form.sourceType==='WHATSAPP'?'WHATSAPP':'EMAIL'})}>Generate 48-hour invitation</button></div>
 {secret&&<div className="recruit-card"><strong>One-time temporary credential</strong><p>Copy privately now; it cannot be retrieved later. Never send via public chat or logs.</p><code>{secret.temporaryPassword}</code><p>Expiry: {secret.expiresAt} · Channel: {secret.deliveryChannel}</p><button className="button" onClick={()=>{void navigator.clipboard.writeText(secret.temporaryPassword)}}>Copy password</button><button className="button" onClick={()=>setSecret(null)}>Clear from view</button></div>}
 </section>
 {message&&<p className="form-message">{message}</p>}
 <section className="admin-phase-note"><h2>Imported sources</h2>{rows.sources.map(s=><article className="application-row" key={s.id}><strong>{s.source_type}: {s.source_ref}</strong><span>{new Date(s.received_at).toLocaleString()} · {s.review_state}</span><button className="button" onClick={()=>setSourceId(s.id)}>Select source</button></article>)}{!rows.sources.length&&<p>No sources imported.</p>}</section>
 <section className="admin-phase-note"><h2>Person review queue</h2>{rows.people.map(p=><article className="application-row" key={p.id}><strong>{p.full_name||'Unnamed'}</strong><span>{p.email_normalized||p.phone_e164||'Contact unavailable'} · {p.intake_status}</span><button className="button" onClick={()=>setPersonId(p.id)}>Select person</button></article>)}{!rows.people.length&&<p>No people imported.</p>}</section>
 </main></div>;
}
