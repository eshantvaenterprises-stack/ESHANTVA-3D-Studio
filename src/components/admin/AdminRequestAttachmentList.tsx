'use client';
/* eslint-disable @next/next/no-img-element -- Private temporary Blob preview. */
import { useEffect, useRef, useState } from 'react';
import { Download, Eye, FileText, LoaderCircle, X } from 'lucide-react';
import { readAdminRequestAttachment } from '@/lib/adminApi';
import type { AdminBulkRequestDetailData, AdminCustomRequestDetailData } from '@/types/adminPhase3';

type RequestFile=AdminCustomRequestDetailData['request']['files'][number]|AdminBulkRequestDetailData['request']['files'][number];
type Mode='custom'|'bulk';
const previewTypes=new Set(['application/pdf','image/jpeg','image/png','image/webp']);
const ready=(f:RequestFile)=>f.uploadStatus==='READY'&&['VALIDATED','UNVERIFIED_ALLOWED'].includes(f.signatureStatus)&&f.scanStatus!=='QUARANTINED';
const previewReady=(f:RequestFile)=>ready(f)&&f.scanStatus==='CLEAN'&&f.signatureStatus==='VALIDATED'&&previewTypes.has(f.mimeType);
const fileSize=(n:number)=>n<1024*1024?`${Math.max(1,Math.round(n/1024))} KB`:`${(n/(1024*1024)).toFixed(1)} MB`;
const safeName=(name:string)=>name.replace(/[\r\n\/\\\x00-\x1f]/g,'_').slice(0,180)||'attachment';
export function AdminRequestAttachmentList({mode,reference,files}:{mode:Mode;reference:string;files:RequestFile[]}){
 const [busy,setBusy]=useState<string|null>(null),[error,setError]=useState(''),[preview,setPreview]=useState<{url:string;mimeType:string;name:string}|null>(null);
 const abort=useRef<AbortController|null>(null),objectUrl=useRef<string|null>(null),epoch=useRef(0),dialogRef=useRef<HTMLDialogElement|null>(null);
 function closePreview(){if(objectUrl.current){URL.revokeObjectURL(objectUrl.current);objectUrl.current=null}setPreview(null)}
 useEffect(()=>()=>{epoch.current++;abort.current?.abort();if(objectUrl.current)URL.revokeObjectURL(objectUrl.current)},[]);
 
 useEffect(()=>{const dialog=dialogRef.current;if(!dialog)return;if(preview&&!dialog.open)dialog.showModal();else if(!preview&&dialog.open)dialog.close()},[preview]);
 async function open(f:RequestFile,disposition:'preview'|'download'){
  if(busy||!ready(f)||(disposition==='preview'&&!previewReady(f)))return;
  const id=++epoch.current;abort.current?.abort();abort.current=new AbortController();setBusy(`${f.fileReference}:${disposition}`);setError('');
  try{
   const bytes=await readAdminRequestAttachment({mode,reference,fileReference:f.fileReference,disposition},abort.current.signal);
   if(epoch.current!==id)return;
   // PDF/images render inside a sandboxed dialog only. STL/3MF are downloadable, not previewed.
   const url=URL.createObjectURL(disposition==='preview'?bytes:new Blob([bytes],{type:'application/octet-stream'}));
   if(disposition==='preview'){closePreview();objectUrl.current=url;setPreview({url,mimeType:f.mimeType,name:f.name})}
   else{const a=document.createElement('a');a.href=url;a.download=safeName(f.name);document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),60000)}
  }catch(err){if(epoch.current===id&&!abort.current?.signal.aborted)setError(err instanceof Error?err.message:'Attachment access failed. Retry or refresh.')}
  finally{if(epoch.current===id){setBusy(null);abort.current=null}}
 }
 return <section className="admin-order-panel" aria-label="Customer request attachments">
  <h2>Customer attachments</h2>
 {busy?<p role="status">Authorizing and retrieving private file…</p>:null}
  <p className="admin-helper-copy">Read access is checked against this request on every attempt. 3MF/STL files download without inline preview. Unscanned files have no inline preview.</p>
  {files.length?<ul className="admin-file-metadata">{files.map(f=><li key={f.fileReference}><FileText size={16}/><div><strong>{f.name}</strong><span>{f.mimeType} · {fileSize(f.sizeBytes)} · {f.uploadStatus} · Scan: {f.scanStatus}</span>
    {ready(f)?<div className="admin-artifact-actions">
      {previewReady(f)?<button type="button" onClick={()=>void open(f,'preview')} disabled={busy!==null} aria-label={`Preview ${f.name}`}><Eye size={15}/> Preview</button>:null}
      <button type="button" onClick={()=>void open(f,'download')} disabled={busy!==null} aria-label={`Download ${f.name}`}><Download size={15}/> {busy===`${f.fileReference}:download`?<LoaderCircle size={15}/>:null}Download</button>
    </div>:<span>File is not eligible for secure download.</span>}
  </div></li>)}</ul>:<p>No files attached.</p>}
  {error?<p role="alert" className="admin-mutation-error">{error} <button type="button" onClick={()=>setError('')}>Dismiss</button></p>:null}
  <dialog ref={dialogRef} onClose={closePreview} onCancel={closePreview} aria-label={preview?`Preview ${preview.name}`:"Attachment preview"} className="admin-order-panel" style={{width:'min(96vw,1100px)',maxWidth:'96vw',maxHeight:'94vh',padding:24,background:'#fff',overflow:'auto',border:'1px solid #ddd'}}>
  {preview?<>
     <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><h3>{preview.name}</h3><button type="button" onClick={closePreview} autoFocus><X size={18}/> Close preview</button></div>
     {preview.mimeType==='application/pdf'?<iframe title={`Preview ${preview.name}`} src={preview.url} sandbox="" style={{width:'100%',height:'75vh',border:0}}/>:<img src={preview.url} alt={`Preview of ${preview.name}`} style={{maxWidth:'100%',maxHeight:'75vh',objectFit:'contain'}}/>}
  </>:null}
  </dialog>
 </section>;
}
