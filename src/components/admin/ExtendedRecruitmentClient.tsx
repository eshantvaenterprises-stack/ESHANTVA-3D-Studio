'use client';
import {useCallback,useEffect,useState} from 'react';
import {listExtendedBatches,listExtendedSessions,readExtendedSession,createExtendedSession,openExtendedSession,assignExtendedInterview,reassignExtendedInterview,markExtendedInterviewAttendance,readExtendedTraining,readExtendedExportJobs,readBackExtendedInterviewResult,saveExtendedInterviewResult,publishExtendedInterviewResult,createExtendedPublicationBatch,readExtendedBatch,selectExtendedBatchRevision,replaceExtendedBatchRevision,renderExtendedAdmitCard,verifyExtendedDocumentRevision,verifyExtendedBatch,publishExtendedBatch,readBackDocumentRevision,saveExtendedDocumentRevision,createExtendedTrainingCohort,publishExtendedTrainingCohort,startExtendedTrainingCohort,enrollExtendedTraining,confirmExtendedTrainingEnrollment,activateExtendedTrainingEnrollment,completeExtendedTrainingEnrollment,recordExtendedTrainingDay,recordExtendedTrainingAssessment,recordExtendedPhysicalVerification,recordExtendedPaymentReconciliation,recordExtendedFinalDecision,previewExtendedDocumentRevision,uploadExtendedAppointment,publishExtendedAppointment,type ExtendedBatch,type ExtendedSession,type ExtendedAssignment,listExtendedTemplates,createExtendedTemplate,approveExtendedTemplate,updateExtendedDraftTemplate,listExtendedDocumentReviews,reviewExtendedCandidateDocument,previewExtendedReviewDocument,previewExtendedTrainingEmail,type ExtendedTemplate,type DocumentReviewEntry,type TrainingEmailPreview,queueExtendedTrainingEmail,sendApprovedTrainingEmail,reconcileApprovedTrainingEmail,readTrainingEmailStatus,adminRevealPaymentDetails} from '@/lib/adminRecruitmentExtendedApi';
import {siteConfig} from '@/config/site';
import {requestExtendedRecruitmentExport,allowedExportScopes,type ExportScope,type ExportField,type ExportFormat} from '@/lib/adminRecruitmentExportApi';
const empty={sessionCode:'',title:'',venue:'',startsAt:'',endsAt:'',capacity:10};
export function ExtendedRecruitmentClient(){
 const [sessions,setSessions]=useState<ExtendedSession[]>([]),[batches,setBatches]=useState<ExtendedBatch[]>([]);
 const [message,setMessage]=useState('Loading authorized operations…');
 const [form,setForm]=useState(empty),[selected,setSelected]=useState(''),[assignments,setAssignments]=useState<ExtendedAssignment[]>([]);
 const [applicationId,setApplicationId]=useState(''),[reportingAt,setReportingAt]=useState(''),[operation,setOperation]=useState<'assign'|'reassign'>('assign');
 const [cohorts,setCohorts]=useState<{id:string;code:string;name:string;status:string}[]>([]),[jobs,setJobs]=useState<{id:string;format:string;state:string}[]>([]);
 const [busy,setBusy]=useState(false);
 const [templates,setTemplates]=useState<ExtendedTemplate[]>([]),[reviewQueue,setReviewQueue]=useState<DocumentReviewEntry[]>([]);
 const [templateKind,setTemplateKind]=useState<ExtendedTemplate['kind']>('ADMIT_CARD'),[templateSpec,setTemplateSpec]=useState('{"title":"ESHANTVA Interview Admit Card","instructions":"Report at the assigned time."}');
 const [selectedTemplate,setSelectedTemplate]=useState('');
 const [reviewRequirement,setReviewRequirement]=useState(''),[reviewStatus,setReviewStatus]=useState<'UNDER_REVIEW'|'VERIFIED'|'RESUBMIT_REQUIRED'|'REJECTED'>('UNDER_REVIEW'),[reviewReason,setReviewReason]=useState('');
 const [emailPreview,setEmailPreview]=useState<TrainingEmailPreview|null>(null),[queuedEmailId,setQueuedEmailId]=useState('');
 const [bankCandidateId,setBankCandidateId]=useState(''),[bankAccessPurpose,setBankAccessPurpose]=useState('');
 const [revealedBank,setRevealedBank]=useState<{holder:string;account:string;ifsc:string}|null>(null);

 const [appointmentFile,setAppointmentFile]=useState<File|null>(null);
 const [appointmentRevision,setAppointmentRevision]=useState(''),[appointmentDigest,setAppointmentDigest]=useState('');
 const [trainingCode,setTrainingCode]=useState(''),[trainingName,setTrainingName]=useState(''),[trainingStart,setTrainingStart]=useState(''),[trainingEnd,setTrainingEnd]=useState('');
 const [cohortId,setCohortId]=useState(''),[enrollmentId,setEnrollmentId]=useState(''),[trainingApplication,setTrainingApplication]=useState(''),[trainingDay,setTrainingDay]=useState(1),[trainingDate,setTrainingDate]=useState('');
 const [trainingAttendance,setTrainingAttendance]=useState<'PRESENT'|'ABSENT'|'EXCUSED'>('PRESENT'),[assessmentScore,setAssessmentScore]=useState(0),[assessmentNotes,setAssessmentNotes]=useState('');
 const [verificationNote,setVerificationNote]=useState(''),[finalReason,setFinalReason]=useState(''),[paymentPurpose,setPaymentPurpose]=useState(''),[paymentAmount,setPaymentAmount]=useState(0),[paymentReference,setPaymentReference]=useState('');
 const [batchKind,setBatchKind]=useState<'ADMIT_CARD'|'TRAINING_SCHEDULE'>('ADMIT_CARD'),[batchId,setBatchId]=useState(''),[batchRevision,setBatchRevision]=useState(''),[oldBatchRevision,setOldBatchRevision]=useState(''),[batchItems,setBatchItems]=useState<{revision_id:string;content_sha256:string}[]>([]);
 const [readbackDigest,setReadbackDigest]=useState(''),[readbackId,setReadbackId]=useState('');
 const [batchPreview,setBatchPreview]=useState<{revisionId:string;contentSha256:string;url:string;renderedSha256:string}[]>([]);
 const [batchPreviewApproved,setBatchPreviewApproved]=useState(false);
 const [verifiedBatchSignature,setVerifiedBatchSignature]=useState('');
 const invalidateBatchPreview=()=>{setBatchPreview([]);setBatchPreviewApproved(false);setVerifiedBatchSignature('')};
 const batchSignature=(items:{revision_id:string;content_sha256:string}[])=>JSON.stringify(items.map(item=>[item.revision_id,item.content_sha256]).sort((a,b)=>a[0].localeCompare(b[0])));
 const batchPreviewSignature=()=>JSON.stringify(batchPreview.map(item=>[item.revisionId,item.contentSha256]).sort((a,b)=>a[0].localeCompare(b[0])));
 const allBatchCardsPreviewed=batchItems.length>0&&batchPreview.length===batchItems.length&&batchPreviewSignature()===batchSignature(batchItems);
 const batchVerifiedForPublication=allBatchCardsPreviewed&&batchPreviewApproved&&verifiedBatchSignature===batchSignature(batchItems);
 const validTime=(value:string)=>value.length>0&&Number.isFinite(new Date(value).getTime());
 const stableSpec=(value:unknown):string=>{
  if(Array.isArray(value))return '['+value.map(stableSpec).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value as Record<string,unknown>).sort().map(k=>JSON.stringify(k)+':'+stableSpec((value as Record<string,unknown>)[k])).join(',')+'}';
  return JSON.stringify(value);
 };
 const [revisionTemplate,setRevisionTemplate]=useState(''),[revisionScope,setRevisionScope]=useState(''),[revisionKind,setRevisionKind]=useState<'ADMIT_CARD'|'TRAINING_SCHEDULE'|'APPOINTMENT_LETTER'>('ADMIT_CARD'),[revisionContent,setRevisionContent]=useState('');
 const [exportScope,setExportScope]=useState<ExportScope>('applications');
 const [exportFormat,setExportFormat]=useState<ExportFormat>('CSV'),[exportFields,setExportFields]=useState<ExportField[]>(['candidate_reference','application_reference','application_status']);
 const [resultApplication,setResultApplication]=useState(''),[resultAttendance,setResultAttendance]=useState<'PRESENT'|'ABSENT'|'EXCUSED'>('PRESENT'),[resultNotes,setResultNotes]=useState('');
 const [savedResult,setSavedResult]=useState<Record<string,unknown>|null>(null),[resultReady,setResultReady]=useState(false);
 const loadCompliance=async()=>{
  const [t,d]=await Promise.all([listExtendedTemplates(),listExtendedDocumentReviews()]);setTemplates(t.templates);setReviewQueue(d.requirements);
 };
 const load=useCallback(async()=>{
  try{const [s,b,t,e]=await Promise.all([listExtendedSessions(),listExtendedBatches(),readExtendedTraining(),readExtendedExportJobs()]);
    setSessions(s.sessions);setBatches(b.batches);setCohorts(t.cohorts);setJobs(e.jobs);
    setMessage('Server readback completed. Write operations require staging validation and ADMIN approval.');
  }catch{setMessage('Extended operations are not deployed or are unavailable to this account. No records were changed.');}
 },[]);
 useEffect(()=>{const handle=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(handle)},[load]);
 const detail=useCallback(async(id:string)=>{setSelected(id);if(!id){setAssignments([]);return}try{const r=await readExtendedSession(id);setAssignments(r.assignments)}catch{setMessage('Session readback unavailable.')}} ,[]);
 const run=useCallback(async(action:()=>Promise<unknown>)=>{if(busy)return;setBusy(true);try{await action();await load();if(selected)await detail(selected);setMessage('Server confirmed the operation; review latest saved state.')}catch(e){setMessage(e instanceof Error?e.message:'Operation failed; no success assumed.')}finally{setBusy(false)}},[busy,load,selected,detail]);
 return <main className="admin-page"><section className="admin-state-card">
  <a href={`${siteConfig.basePath}/admin/recruitment/`}>← Candidate Master</a>
  <h1>Interview sessions & recruitment operations</h1><p role="status">{message}</p><button type="button" disabled={busy} onClick={()=>void load()}>Refresh from server</button>
  <h2>Global document templates</h2>
  <p>Approved templates are immutable. Editing an approved template requires a new version; existing published cards remain unchanged.</p>
  <button type="button" disabled={busy} onClick={()=>void run(loadCompliance)}>Refresh templates and document queue</button>
  <ul>{templates.map(t=><li key={t.id}>Version {t.template_version} · {t.kind} · {t.approved_by?'Approved':'Draft'} · <code>{t.id}</code> <button type="button" onClick={()=>{setSelectedTemplate(t.id);setTemplateKind(t.kind);setTemplateSpec(JSON.stringify(t.template_spec,null,2))}}>Read saved template</button></li>)}</ul>
  <fieldset><legend>Draft a new global template version</legend>
   <label>Type <select value={templateKind} onChange={e=>setTemplateKind(e.target.value as ExtendedTemplate['kind'])}><option>ADMIT_CARD</option><option>TRAINING_SCHEDULE</option><option>APPOINTMENT_LETTER</option></select></label>
   <label>Template specification (English JSON) <textarea rows={5} value={templateSpec} onChange={e=>{setTemplateSpec(e.target.value);setSelectedTemplate('')}}/></label>
   <button type="button" disabled={busy} onClick={()=>void run(async()=>{const spec=JSON.parse(templateSpec) as Record<string,unknown>;const saved=await createExtendedTemplate(templateKind,spec);const list=await listExtendedTemplates();const readback=list.templates.find(t=>t.id===saved.templateId);if(!readback||stableSpec(readback.template_spec)!==stableSpec(spec))throw new Error('TEMPLATE_READBACK_MISMATCH');setTemplates(list.templates);setSelectedTemplate(saved.templateId)})}>Save new version and verify readback</button>
   <button type="button" disabled={busy||!selectedTemplate||!templates.some(t=>t.id===selectedTemplate&&!t.approved_by)} onClick={()=>void run(async()=>{const latest=await listExtendedTemplates();const t=latest.templates.find(x=>x.id===selectedTemplate);if(!t||t.approved_by)throw Error('TEMPLATE_STALE');const newSpec=JSON.parse(templateSpec) as Record<string,unknown>;await updateExtendedDraftTemplate(t.id,t.template_spec,newSpec);const verified=await listExtendedTemplates();if(stableSpec(verified.templates.find(x=>x.id===t.id)?.template_spec)!==stableSpec(newSpec))throw Error('TEMPLATE_DRAFT_READBACK_MISMATCH');setTemplates(verified.templates)})}>Update draft with optimistic readback</button>
   <button type="button" disabled={busy||!selectedTemplate||!templates.some(t=>t.id===selectedTemplate&&!t.approved_by)} onClick={()=>void run(async()=>{const latest=await listExtendedTemplates();const t=latest.templates.find(v=>v.id===selectedTemplate);if(!t||t.approved_by)throw new Error('TEMPLATE_STALE');await approveExtendedTemplate(t.id,t.template_spec);const verified=await listExtendedTemplates();if(!verified.templates.find(v=>v.id===t.id)?.approved_by)throw new Error('TEMPLATE_APPROVAL_NOT_CONFIRMED');setTemplates(verified.templates)})}>Approve exact saved template version</button>
  </fieldset>
  <h2>Selected-only document review</h2>
  <p>Only released requirements appear in the server queue. Every decision requires a reason and unique request ID.</p>
  <ul>{reviewQueue.map(r=><li key={r.id}><code>{r.id}</code> · {r.status} · {r.satisfied_by_file_id?'Uploaded':'No file'} <button type="button" onClick={()=>setReviewRequirement(r.id)}>Select</button></li>)}</ul>
  <fieldset><legend>Review submitted evidence</legend>
   <label>Requirement ID <input value={reviewRequirement} onChange={e=>setReviewRequirement(e.target.value)}/></label>
   <label>Decision <select value={reviewStatus} onChange={e=>setReviewStatus(e.target.value as typeof reviewStatus)}><option>UNDER_REVIEW</option><option>VERIFIED</option><option>RESUBMIT_REQUIRED</option><option>REJECTED</option></select></label>
   <label>Review reason <textarea value={reviewReason} onChange={e=>setReviewReason(e.target.value)}/></label>
   <button type="button" disabled={busy||reviewReason.trim().length<12||!reviewRequirement} onClick={()=>void run(async()=>{const r=await previewExtendedReviewDocument(reviewRequirement,reviewReason);if(!r.url.startsWith('https://'))throw Error('PRIVATE_FILE_PREVIEW_URL_INVALID');window.open(r.url,'_blank','noopener,noreferrer')})}>Audit access and open private file preview</button>
   <button type="button" disabled={busy||reviewReason.trim().length<12||!reviewRequirement} onClick={()=>void run(async()=>{await reviewExtendedCandidateDocument(reviewRequirement,reviewStatus,reviewReason,crypto.randomUUID());const updated=await listExtendedDocumentReviews();setReviewQueue(updated.requirements);if(updated.requirements.find(x=>x.id===reviewRequirement)?.status!==reviewStatus)throw new Error('DOCUMENT_REVIEW_READBACK_MISMATCH')})}>Save decision and verify readback</button>
  </fieldset>
  <h2>Interview sessions</h2>
  <table><thead><tr><th>Session</th><th>Venue</th><th>Start</th><th>Capacity</th><th>Status</th><th>Details</th></tr></thead><tbody>{sessions.map(s=><tr key={s.id}><td>{s.session_code} · {s.title}</td><td>{s.venue}</td><td>{new Date(s.starts_at).toLocaleString()}</td><td>{s.capacity}</td><td>{s.state}</td><td><button type="button" onClick={()=>void detail(s.id)}>Read back</button>{s.state==='DRAFT'&&<button type="button" disabled={busy} onClick={()=>void run(()=>openExtendedSession(s.id))}>Open</button>}</td></tr>)}</tbody></table>
  {!sessions.length&&<p>No authorized sessions available.</p>}
  <fieldset><legend>Create interview session</legend><div className="admin-form-grid">
   <label>Code <input value={form.sessionCode} maxLength={32} onChange={e=>setForm({...form,sessionCode:e.target.value.toUpperCase()})}/></label>
   <label>Title <input value={form.title} maxLength={160} onChange={e=>setForm({...form,title:e.target.value})}/></label>
   <label>Venue <input value={form.venue} maxLength={350} onChange={e=>setForm({...form,venue:e.target.value})}/></label>
   <label>Starts <input type="datetime-local" value={form.startsAt} onChange={e=>setForm({...form,startsAt:e.target.value})}/></label>
   <label>Ends <input type="datetime-local" value={form.endsAt} onChange={e=>setForm({...form,endsAt:e.target.value})}/></label>
   <label>Capacity <input type="number" min={1} max={1000} value={form.capacity} onChange={e=>setForm({...form,capacity:Number(e.target.value)})}/></label>
  </div><button type="button" disabled={busy||!validTime(form.startsAt)||!validTime(form.endsAt)||new Date(form.startsAt).getTime()>=new Date(form.endsAt).getTime()} onClick={()=>void run(()=>createExtendedSession({...form,startsAt:new Date(form.startsAt).toISOString(),endsAt:new Date(form.endsAt).toISOString()}))}>Save session to server</button></fieldset>
  {selected&&<section><h3>Selected session assignments</h3><p>Assignments shown from the server, not unsaved browser edits.</p><table><thead><tr><th>Application UUID</th><th>Reporting</th><th>Status</th><th>Attendance</th></tr></thead><tbody>{assignments.map(a=><tr key={a.id}><td>{a.application_id}</td><td>{new Date(a.reporting_at).toLocaleString()}</td><td>{a.state}</td><td><button disabled={busy} onClick={()=>void run(()=>markExtendedInterviewAttendance(a.application_id,'PRESENT'))}>Present</button><button disabled={busy} onClick={()=>void run(()=>markExtendedInterviewAttendance(a.application_id,'ABSENT'))}>Absent</button></td></tr>)}</tbody></table>
   <fieldset><legend>Assign or reassign candidate</legend><label>Application UUID <input value={applicationId} onChange={e=>setApplicationId(e.target.value)} /></label><label>Reporting time <input type="datetime-local" value={reportingAt} onChange={e=>setReportingAt(e.target.value)}/></label>
   <label>Action <select value={operation} onChange={e=>setOperation(e.target.value as 'assign'|'reassign')}><option value="assign">Assign</option><option value="reassign">Reassign</option></select></label>
   <button type="button" disabled={busy||!validTime(reportingAt)||!applicationId||!selected} onClick={()=>void run(()=>operation==='assign'?assignExtendedInterview(applicationId,selected,new Date(reportingAt).toISOString()):reassignExtendedInterview(applicationId,selected,new Date(reportingAt).toISOString()))}>Save and read back</button></fieldset>
  </section>}
  <h2>Interview result draft and verification</h2>
  <p>Save to server, read back the persisted version, then explicitly publish that exact snapshot. No unsaved edits can publish.</p>
  <fieldset><legend>Individual result</legend><label>Application UUID <input value={resultApplication} onChange={e=>{setResultApplication(e.target.value);setResultReady(false)}}/></label>
  <label>Attendance <select value={resultAttendance} onChange={e=>{setResultAttendance(e.target.value as 'PRESENT'|'ABSENT'|'EXCUSED');setResultReady(false)}}><option>PRESENT</option><option>ABSENT</option><option>EXCUSED</option></select></label>
  <label>Internal assessment notes <textarea value={resultNotes} maxLength={2000} onChange={e=>{setResultNotes(e.target.value);setResultReady(false)}}/></label>
  <button type="button" disabled={busy} onClick={()=>void run(async()=>{await saveExtendedInterviewResult(resultApplication,resultAttendance,{notes:resultNotes});setResultReady(false);setSavedResult(null)})}>Save draft</button>
  <button type="button" disabled={busy} onClick={()=>void run(async()=>{const r=await readBackExtendedInterviewResult(resultApplication);setSavedResult(r.draft_result);setResultReady(r.attendance===resultAttendance&&r.draft_result.notes===resultNotes)})}>Read back and verify</button>
  <button type="button" disabled={busy||!resultReady||!savedResult} onClick={()=>void run(async()=>{if(!savedResult)throw new Error('READBACK_REQUIRED');await publishExtendedInterviewResult(resultApplication,savedResult);setResultReady(false)})}>Publish verified draft</button>
  {savedResult&&<pre aria-label="Server-saved result preview">{JSON.stringify(savedResult,null,2)}</pre>}
  </fieldset>
  <h2>Admit-card and training schedule batches</h2><table><thead><tr><th>Type</th><th>Created</th><th>Verified</th><th>Publication</th></tr></thead><tbody>{batches.map(b=><tr key={b.id}><td>{b.kind}</td><td>{new Date(b.created_at).toLocaleString()}</td><td>{b.verified_at?'Verified':'Pending'}</td><td>{b.published_at?'Published':b.state}</td></tr>)}</tbody></table>
  {!batches.length&&<p>No authorized publication batches available.</p>}
  <fieldset><legend>Save a candidate-specific document revision</legend>
   <p>A saved revision is immutable after verification. Corrections create a new revision.</p>
   <label>Document type <select value={revisionKind} onChange={e=>setRevisionKind(e.target.value as typeof revisionKind)}><option>ADMIT_CARD</option><option>TRAINING_SCHEDULE</option><option>APPOINTMENT_LETTER</option></select></label>
   <label>Approved template UUID <input value={revisionTemplate} onChange={e=>setRevisionTemplate(e.target.value)}/></label>
   <label>{revisionKind==='TRAINING_SCHEDULE'?'Cohort UUID':'Application UUID'} <input value={revisionScope} onChange={e=>setRevisionScope(e.target.value)}/></label>
   <label>Candidate-specific content (JSON) <textarea rows={6} value={revisionContent} onChange={e=>setRevisionContent(e.target.value)}/></label>
   <button type="button" disabled={busy||!revisionTemplate||!revisionScope||!revisionContent} onClick={()=>void run(async()=>{
    const parsed:unknown=JSON.parse(revisionContent);
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('DOCUMENT_CONTENT_MUST_BE_JSON_OBJECT');
    const saved=await saveExtendedDocumentRevision(revisionKind,revisionTemplate,revisionScope,parsed as Record<string,unknown>);
    const readback=await readBackDocumentRevision(saved.revisionId);
    if(readback.id!==saved.revisionId)throw new Error('REVISION_READBACK_MISMATCH');
    setBatchRevision(saved.revisionId);setReadbackId(readback.id);setReadbackDigest(readback.content_sha256);
   })}>Save revision and read back from server</button>
  </fieldset>
  <h2>Admit Card Studio: revision-controlled</h2><p>Save the candidate-specific revision first. Render privately, read it back, then verify. Batch publication is disabled until deployment acceptance tests pass.</p>
  <fieldset><legend>Individual revision</legend>
   <label>Saved revision UUID <input value={batchRevision} onChange={e=>{setBatchRevision(e.target.value);setReadbackId('');setReadbackDigest('')}}/></label>
   <button type="button" disabled={busy} onClick={()=>void run(async()=>{const r=await readBackDocumentRevision(batchRevision);setReadbackId(r.id);setReadbackDigest(r.content_sha256)})}>Read back saved revision</button>
   <button type="button" disabled={busy||readbackId!==batchRevision} onClick={()=>void run(()=>renderExtendedAdmitCard(batchRevision))}>Render A4 PDF and compare stored bytes</button>
   <button type="button" disabled={busy||readbackId!==batchRevision} onClick={()=>void run(async()=>{const p=await previewExtendedDocumentRevision(batchRevision);if(p.contentSha256!==readbackDigest)throw new Error('SAVED_REVISION_CHANGED');if(!p.url.startsWith('https://'))throw new Error('PREVIEW_URL_INVALID');window.open(p.url,'_blank','noopener,noreferrer')})}>Preview saved A4 PDF</button>
   <button type="button" disabled={busy||readbackId!==batchRevision||!readbackDigest} onClick={()=>void run(()=>verifyExtendedDocumentRevision(batchRevision,readbackDigest))}>Verify rendered revision</button>
   {readbackDigest&&<p>Read-back SHA-256: <code>{readbackDigest}</code></p>}
  </fieldset>
  <fieldset><legend>Batch assembly</legend>
   <label>Batch type <select value={batchKind} onChange={e=>setBatchKind(e.target.value as 'ADMIT_CARD'|'TRAINING_SCHEDULE')}><option>ADMIT_CARD</option><option>TRAINING_SCHEDULE</option></select></label>
   <button type="button" disabled={busy} onClick={()=>void run(async()=>{const r=await createExtendedPublicationBatch(batchKind,batchKind==='ADMIT_CARD'?selected:cohortId);setBatchId(r.batchId);setBatchItems([]);invalidateBatchPreview()})}>Create batch</button>
   <label>Batch UUID <input value={batchId} onChange={e=>{setBatchId(e.target.value);setBatchItems([]);invalidateBatchPreview()}}/></label>
   <button type="button" disabled={busy} onClick={()=>void run(async()=>{const r=await readExtendedBatch(batchId);setBatchItems(r.items);invalidateBatchPreview()})}>Read back batch</button>
   <button type="button" disabled={busy||!batchId||!batchRevision} onClick={()=>void run(async()=>{await selectExtendedBatchRevision(batchId,batchRevision);invalidateBatchPreview();const r=await readExtendedBatch(batchId);setBatchItems(r.items)})}>Add verified card</button>
   <label>Old card revision UUID (for correction) <input value={oldBatchRevision} onChange={e=>setOldBatchRevision(e.target.value)}/></label>
   <button type="button" disabled={busy||!batchId||!batchRevision||!oldBatchRevision} onClick={()=>void run(async()=>{await replaceExtendedBatchRevision(batchId,oldBatchRevision,batchRevision);invalidateBatchPreview();const r=await readExtendedBatch(batchId);setBatchItems(r.items)})}>Replace one card revision</button>
   <ul>{batchItems.map(i=><li key={i.revision_id}>{i.revision_id} · <code>{i.content_sha256.slice(0,16)}…</code></li>)}</ul>
   <button type="button" disabled={busy||!batchId||!batchItems.length} onClick={()=>void run(async()=>{
    invalidateBatchPreview();
    const fresh=await readExtendedBatch(batchId);
    if(batchSignature(fresh.items)!==batchSignature(batchItems)){setBatchItems(fresh.items);throw new Error('BATCH_CHANGED_ON_SERVER_REVIEW_AGAIN')}
    if(new Set(fresh.items.map(item=>item.revision_id)).size!==fresh.items.length)throw new Error('DUPLICATE_BATCH_REVISION');
    const cards=[];
    for(const item of fresh.items){
     const pdf=await previewExtendedDocumentRevision(item.revision_id);
     if(pdf.contentSha256!==item.content_sha256||!pdf.renderedSha256||!pdf.url.startsWith('https://'))throw new Error('BATCH_PREVIEW_READBACK_MISMATCH');
     cards.push({revisionId:item.revision_id,contentSha256:item.content_sha256,url:pdf.url,renderedSha256:pdf.renderedSha256});
    }
    setBatchPreview(cards);
   })}>Load final batch PDF previews from server</button>
   {batchPreview.length>0&&<section aria-label="Final batch PDF review">
    <h3>Final batch preview · {batchPreview.length} files</h3>
    <p>Open and inspect every PDF. Links are short-lived private preview links. Refresh the previews if a link expires or a card changes.</p>
    <ol>{batchPreview.map((item,i)=><li key={item.revisionId}>
     Card {i+1} · Revision <code>{item.revisionId}</code> · PDF SHA-256 <code>{item.renderedSha256.slice(0,16)}…</code> · <a href={item.url} target="_blank" rel="noopener noreferrer">Open private PDF preview</a>
    </li>)}</ol>
    <label><input type="checkbox" checked={batchPreviewApproved} onChange={e=>setBatchPreviewApproved(e.target.checked)}/> I checked all PDF previews against the final interview schedule and candidate records.</label>
   </section>}
   <button type="button" disabled={busy||!allBatchCardsPreviewed||!batchPreviewApproved} onClick={()=>void run(async()=>{
    const fresh=await readExtendedBatch(batchId);
    if(batchSignature(fresh.items)!==batchPreviewSignature())throw new Error('BATCH_CHANGED_AFTER_PREVIEW');
    await verifyExtendedBatch(batchId);
    setVerifiedBatchSignature(batchSignature(fresh.items));
   })}>Verify latest entire batch on server</button>
   <button type="button" disabled={busy||!batchVerifiedForPublication} onClick={()=>void run(async()=>{
    const fresh=await readExtendedBatch(batchId);
    if(batchSignature(fresh.items)!==batchPreviewSignature()||batchSignature(fresh.items)!==verifiedBatchSignature)throw new Error('BATCH_CHANGED_AFTER_VERIFICATION');
    await publishExtendedBatch(batchId,crypto.randomUUID());invalidateBatchPreview();
   })}>Publish exact verified batch (requires server release gate)</button>
  </fieldset>
  <h2>Training cohorts</h2><ul>{cohorts.map(c=><li key={c.id}>{c.code}: {c.name} ({c.status})</li>)}</ul>
  <h2>Authorized exports</h2><p>Choose only the information genuinely needed. The export is generated server-side, audited and stored privately.</p>
  <label>Export scope <select value={exportScope} onChange={e=>{const scope=e.target.value as ExportScope;setExportScope(scope);setExportFields([...allowedExportScopes[scope]] as ExportField[])}}>{Object.keys(allowedExportScopes).map(scope=><option key={scope} value={scope}>{scope.replaceAll('_',' ')}</option>)}</select></label>
  <label>Export file format <select value={exportFormat} onChange={e=>setExportFormat(e.target.value as ExportFormat)}><option>CSV</option><option>XLSX</option><option>PDF</option></select></label>
  <fieldset><legend>Columns</legend>{([...allowedExportScopes[exportScope]] as ExportField[]).map(field=><label key={field} style={{marginRight:12}}><input type="checkbox" checked={exportFields.includes(field)} onChange={e=>setExportFields(current=>e.target.checked?[...current,field]:current.filter(x=>x!==field))}/>{field}</label>)}</fieldset>
  <button type="button" disabled={busy||!exportFields.length} onClick={()=>void run(async()=>{const data=await requestExtendedRecruitmentExport({format:exportFormat,scope:exportScope,columns:exportFields});if(!data.downloadUrl.startsWith('https://'))throw new Error('EXPORT_URL_INVALID');window.open(data.downloadUrl,'_blank','noopener,noreferrer')})}>Generate audited export</button>
  <h2>Training email recipient preview</h2>
  <p>Preview does not queue or send emails. Sending remains disabled until sender verification, owner approval and authenticated delivery tests.</p>
  <button type="button" disabled={busy||!cohortId} onClick={()=>void run(async()=>{setEmailPreview(await previewExtendedTrainingEmail(cohortId))})}>Read selected recipient preview</button>
  {emailPreview&&<section><p>Published schedule: {emailPreview.cohort.status} · Revision {emailPreview.cohort.schedule_version}</p>
   <ul>{emailPreview.recipients.map(r=><li key={r.enrollmentId}>{r.candidateId} · {r.state} · {r.verifiedEmail?'Profile email verified':'EMAIL NOT VERIFIED'} · {r.email} <button type="button" disabled={busy||emailPreview.cohort.status!=='PUBLISHED'||!r.verifiedEmail||!['INVITED','CONFIRMED'].includes(r.state)} onClick={()=>void run(async()=>{const fresh=await previewExtendedTrainingEmail(emailPreview.cohort.id);if(fresh.cohort.schedule_version!==emailPreview.cohort.schedule_version||!fresh.recipients.some(v=>v.enrollmentId===r.enrollmentId&&v.verifiedEmail&&['INVITED','CONFIRMED'].includes(v.state)))throw Error('RECIPIENT_LIST_CHANGED');const result=await queueExtendedTrainingEmail(r.enrollmentId);setQueuedEmailId(result.deliveryId);setEmailPreview(await previewExtendedTrainingEmail(emailPreview.cohort.id))})}>Queue selected candidate email (does not send)</button></li>)}</ul>
  </section>}
  {queuedEmailId&&<div><p>Email queue ID: <code>{queuedEmailId}</code>. Queueing did not send a message.</p><button type="button" disabled={busy} onClick={()=>void run(async()=>{const state=await sendApprovedTrainingEmail(queuedEmailId);if(state.state!=='SENT')throw Error('EMAIL_NOT_CONFIRMED_BY_PROVIDER');setQueuedEmailId('')})}>Send queued email (requires approved sender and release flag)</button><button type="button" disabled={busy} onClick={()=>void run(async()=>{const before=await readTrainingEmailStatus(queuedEmailId);if(!['SENDING','REVIEW_REQUIRED'].includes(before.state))throw Error('EMAIL_RECONCILIATION_NOT_REQUIRED');const state=await reconcileApprovedTrainingEmail(queuedEmailId);if(state.state!=='SENT')throw Error('EMAIL_RECEIPT_NOT_RECONCILED');setQueuedEmailId('')})}>Reconcile ambiguous provider receipt (within 23 hours)</button></div>}
  <h2>Ten-day training management</h2>
  <fieldset><legend>Cohort schedule</legend>
  <label>Code <input value={trainingCode} onChange={e=>setTrainingCode(e.target.value.toUpperCase())}/></label>
  <label>Name <input value={trainingName} onChange={e=>setTrainingName(e.target.value)}/></label>
  <label>Start date <input type="date" value={trainingStart} onChange={e=>setTrainingStart(e.target.value)}/></label>
  <label>End date <input type="date" value={trainingEnd} onChange={e=>setTrainingEnd(e.target.value)}/></label>
  <button disabled={busy} type="button" onClick={()=>void run(()=>createExtendedTrainingCohort(trainingCode,trainingName,trainingStart,trainingEnd))}>Save cohort</button>
  <label>Cohort UUID <input value={cohortId} onChange={e=>setCohortId(e.target.value)}/></label>
  <button disabled={busy} type="button" onClick={()=>void run(()=>publishExtendedTrainingCohort(cohortId))}>Publish only with verified training schedule</button>
  <button disabled={busy} type="button" onClick={()=>void run(()=>startExtendedTrainingCohort(cohortId))}>Start approved cohort</button>
  </fieldset>
  <fieldset><legend>Eligible trainee</legend>
  <label>Application UUID <input value={trainingApplication} onChange={e=>setTrainingApplication(e.target.value)}/></label>
  <button disabled={busy} type="button" onClick={()=>void run(()=>enrollExtendedTraining(cohortId,trainingApplication))}>Enroll selected and physically verified candidate</button>
  <label>Enrollment UUID <input value={enrollmentId} onChange={e=>setEnrollmentId(e.target.value)}/></label>
  <button disabled={busy} type="button" onClick={()=>void run(()=>confirmExtendedTrainingEnrollment(enrollmentId))}>Confirm</button>
  <button disabled={busy} type="button" onClick={()=>void run(()=>activateExtendedTrainingEnrollment(enrollmentId))}>Activate</button>
  <label>Training day <input type="number" min={1} max={10} value={trainingDay} onChange={e=>setTrainingDay(Number(e.target.value))}/></label>
  <label>Actual date <input type="date" value={trainingDate} onChange={e=>setTrainingDate(e.target.value)}/></label>
  <label>Attendance <select value={trainingAttendance} onChange={e=>setTrainingAttendance(e.target.value as 'PRESENT'|'ABSENT'|'EXCUSED')}><option>PRESENT</option><option>ABSENT</option><option>EXCUSED</option></select></label>
  <button disabled={busy} type="button" onClick={()=>void run(()=>recordExtendedTrainingDay(enrollmentId,trainingDay,trainingDate,trainingAttendance))}>Save day</button>
  <label>Assessment score (0–100) <input type="number" min={0} max={100} value={assessmentScore} onChange={e=>setAssessmentScore(Number(e.target.value))}/></label>
  <label>Assessment notes <textarea value={assessmentNotes} onChange={e=>setAssessmentNotes(e.target.value)}/></label>
  <button disabled={busy} type="button" onClick={()=>void run(()=>recordExtendedTrainingAssessment(enrollmentId,'REVIEWED',assessmentScore,assessmentNotes))}>Review assessment</button>
  <button disabled={busy} type="button" onClick={()=>void run(()=>recordExtendedTrainingAssessment(enrollmentId,'PUBLISHED',assessmentScore,assessmentNotes))}>Publish assessment</button>
  <button disabled={busy} type="button" onClick={()=>void run(()=>completeExtendedTrainingEnrollment(enrollmentId))}>Complete after 10 days</button>
  </fieldset>
  <h2>Verification, payments and final decision</h2>
  <fieldset><legend>Restricted stage actions</legend>
   <p>Document releases, verified identity and eligibility remain server-controlled. Do not enter bank-account or identity numbers here.</p>
   <label>Application UUID <input value={trainingApplication} onChange={e=>setTrainingApplication(e.target.value)}/></label>
   <label>Physical verification note <textarea value={verificationNote} onChange={e=>setVerificationNote(e.target.value)}/></label>
   <button disabled={busy} type="button" onClick={()=>void run(()=>recordExtendedPhysicalVerification(trainingApplication,'VERIFIED',verificationNote))}>Record physical verification</button>
   <label>Payment purpose <input value={paymentPurpose} onChange={e=>setPaymentPurpose(e.target.value)}/></label>
   <label>Amount in minor units <input type="number" min={0} value={paymentAmount} onChange={e=>setPaymentAmount(Number(e.target.value))}/></label>
   <label>Payment reference (hashed before sending) <input type="password" value={paymentReference} onChange={e=>setPaymentReference(e.target.value)}/></label>
   <button disabled={busy||!paymentReference} type="button" onClick={()=>void run(async()=>{const bytes=new TextEncoder().encode(paymentReference);const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');await recordExtendedPaymentReconciliation(enrollmentId,paymentPurpose,paymentAmount,'RECONCILED',digest);setPaymentReference('')})}>Reconcile payment</button>
   <label>Final decision reason <textarea value={finalReason} onChange={e=>setFinalReason(e.target.value)}/></label>
   <button disabled={busy} type="button" onClick={()=>void run(()=>recordExtendedFinalDecision(trainingApplication,'SELECTED',finalReason))}>Approve final selection</button>
   <button disabled={busy} type="button" onClick={()=>void run(()=>recordExtendedFinalDecision(trainingApplication,'NOT_SELECTED',finalReason))}>Not selected</button>
  </fieldset>
  <h2>Authorized bank-detail review</h2>
  <p>Only ADMIN may reveal payment details for an explicit recorded purpose. No plaintext is stored in browser storage or exported. Requires owner approval and encrypted-key configuration.</p>
  <fieldset><legend>Purpose-limited access</legend>
   <label>Candidate UUID <input value={bankCandidateId} onChange={e=>{setBankCandidateId(e.target.value);setRevealedBank(null)}}/></label>
   <label>Access purpose (20+ characters) <textarea value={bankAccessPurpose} onChange={e=>{setBankAccessPurpose(e.target.value);setRevealedBank(null)}}/></label>
   <button type="button" disabled={busy||bankAccessPurpose.trim().length<20||!bankCandidateId} onClick={()=>void run(async()=>setRevealedBank(await adminRevealPaymentDetails(bankCandidateId,bankAccessPurpose)))}>Record access and reveal details</button>
   {revealedBank&&<div role="region" aria-label="Sensitive payment data"><strong>Restricted view, do not copy into exports:</strong><p>Account holder: {revealedBank.holder}</p><p>Account number: {revealedBank.account}</p><p>IFSC: {revealedBank.ifsc}</p><button type="button" onClick={()=>setRevealedBank(null)}>Hide payment details</button></div>}
  </fieldset>
  <h2>Private appointment letter</h2>
  <fieldset><legend>Selected candidate, saved revision and signed PDF</legend>
   <p>Create an approved appointment revision first, then upload a candidate-specific PDF. The server checks final selection and performs an immutable file readback.</p>
   <label>Application UUID <input value={trainingApplication} onChange={e=>setTrainingApplication(e.target.value)}/></label>
   <label>Saved appointment revision UUID <input value={appointmentRevision} onChange={e=>setAppointmentRevision(e.target.value)}/></label>
   <label>Appointment PDF <input type="file" accept="application/pdf" onChange={e=>setAppointmentFile(e.target.files?.[0]||null)}/></label>
   <button type="button" disabled={busy||!appointmentFile} onClick={()=>void run(async()=>{if(!appointmentFile)throw new Error('PDF_REQUIRED');await uploadExtendedAppointment(trainingApplication,appointmentRevision,appointmentFile)})}>Upload private PDF and verify readback</button>
   <button type="button" disabled={busy||!appointmentRevision} onClick={()=>void run(async()=>{const r=await readBackDocumentRevision(appointmentRevision);setAppointmentDigest(r.content_sha256)})}>Read back saved appointment</button>
   <button type="button" disabled={busy||!appointmentRevision||!appointmentDigest} onClick={()=>void run(()=>verifyExtendedDocumentRevision(appointmentRevision,appointmentDigest))}>Verify saved appointment revision</button>
   <button type="button" disabled={busy||!appointmentRevision} onClick={()=>void run(()=>publishExtendedAppointment(appointmentRevision,crypto.randomUUID()))}>Publish verified appointment (release-gated)</button>
  </fieldset>
  <h2>My export jobs</h2><ul>{jobs.map(j=><li key={j.id}>{j.format} / {j.state}</li>)}</ul>
  <p>Admit-card publication, training payments and official document exports remain disabled until immutable PDF rendering and authenticated runtime checks pass. No browser-only save can publish.</p>
 </section></main>;
}
