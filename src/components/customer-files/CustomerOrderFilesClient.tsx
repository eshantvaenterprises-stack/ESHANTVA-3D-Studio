'use client';

/* eslint-disable @next/next/no-img-element -- Private previews use short-lived signed URLs and must bypass image optimization/caching. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import {
  ArrowLeft,
  CheckCircle2,
  CircleUserRound,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { siteConfig } from '@/config/site';
import { getAccountSession, isAnonymousUser, onAccountAuthChange, signOutAccount } from '@/lib/accountAuth';
import {
  loadArtifactAccess,
  loadCustomerOrderFiles,
  submitCustomerArtifactApproval,
} from '@/lib/customerFilesApi';
import { extractOrderFilesReferenceFromPath, isFilesRequestCurrent } from '@/lib/customerFilesRoute';
import type { ArtifactAccess, CustomerArtifact, CustomerOrderFilesData } from '@/types/customerFiles';

function withBase(path:string) { return `${siteConfig.basePath}${path}`; }
function formatDateTime(value:string) { return new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)); }
function formatBytes(bytes:number) { if(bytes<1024)return `${bytes} B`; if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`; return `${(bytes/(1024*1024)).toFixed(1)} MB`; }
function fileIcon(artifact:CustomerArtifact) { if(artifact.category==='verification_video')return <Video size={20}/>; if(artifact.mimeType.startsWith('image/'))return <ImageIcon size={20}/>; return <FileText size={20}/>; }

function FilesSkeleton() {
  return <div className="customer-files-shell shell" aria-busy="true" aria-live="polite"><h1 className="sr-only">Files and approvals.</h1><div className="customer-files-skeleton is-heading"/><div className="customer-files-skeleton-grid"><i/><i/></div><span className="sr-only">Loading customer files.</span></div>;
}

function Unavailable() {
  return <section className="customer-files-shell customer-files-access shell"><span className="section-kicker">FILES & APPROVALS</span><h1>File area unavailable.</h1><div className="customer-files-access-card"><ShieldCheck size={30}/><div><strong>This file area cannot be opened.</strong><p>Return to your dashboard and choose an order available to this account.</p></div><Link className="button button-primary" href="/account/dashboard">Back to Dashboard</Link></div></section>;
}

function AnonymousAccess() {
  return <section className="customer-files-shell customer-files-access shell"><span className="section-kicker">ACCOUNT REQUIRED</span><h1>Files & approvals.</h1><div className="customer-files-access-card"><CircleUserRound size={30}/><div><strong>Complete account access.</strong><p>Permanent account access is required before private customer files can be opened.</p></div><Link className="button button-primary" href="/account">Account access</Link></div></section>;
}

function ArtifactMeta({ artifact }: { artifact:CustomerArtifact }) {
  return <div className="customer-files-meta"><span>{artifact.categoryLabel}</span><span>{artifact.versionLabel || `Revision ${artifact.revision}`}</span><span>{formatBytes(artifact.sizeBytes)}</span><span>{formatDateTime(artifact.createdAt)}</span></div>;
}

export function CustomerOrderFilesClient() {
  const [authState,setAuthState]=useState<'loading'|'signed_out'|'anonymous'|'permanent'>('loading');
  const [reference,setReference]=useState<string|null>(null);
  const [data,setData]=useState<CustomerOrderFilesData|null>(null);
  const [loading,setLoading]=useState(false);
  const [unavailable,setUnavailable]=useState(false);
  const [error,setError]=useState('');
  const [access,setAccess]=useState<ArtifactAccess|null>(null);
  const [accessError,setAccessError]=useState('');
  const [accessLoading,setAccessLoading]=useState<string|null>(null);
  const [decision,setDecision]=useState<{artifact:CustomerArtifact;kind:'approve'|'request_revision'}|null>(null);
  const [revisionMessage,setRevisionMessage]=useState('');
  const [decisionError,setDecisionError]=useState('');
  const [decisionBusy,setDecisionBusy]=useState(false);
  const requestEpoch=useRef(0), signedEpoch=useRef(0), approvalEpoch=useRef(0);
  const activeUserId=useRef<string|null>(null), activeReference=useRef<string|null>(null), activeArtifact=useRef<string|null>(null), activeApprovalArtifact=useRef<string|null>(null);

  const clearPrivateState=useCallback(()=>{
    requestEpoch.current+=1; signedEpoch.current+=1; approvalEpoch.current+=1;
    activeReference.current=null; activeArtifact.current=null; activeApprovalArtifact.current=null;
    setData(null); setAccess(null); setAccessError(''); setAccessLoading(null); setDecision(null); setRevisionMessage(''); setDecisionError(''); setDecisionBusy(false); setUnavailable(false); setError(''); setLoading(false);
  },[]);

  const readReference=useCallback(()=>typeof window==='undefined'?null:extractOrderFilesReferenceFromPath(window.location.pathname,siteConfig.basePath),[]);

  const load=useCallback(async(userId:string,ref:string)=>{
    const epoch=++requestEpoch.current, expected={epoch,userId,reference:ref}; activeReference.current=ref;
    setData(null); setAccess(null); setUnavailable(false); setError(''); setLoading(true);
    const current=()=>isFilesRequestCurrent({epoch:requestEpoch.current,userId:activeUserId.current,reference:activeReference.current},expected);
    try{const result=await loadCustomerOrderFiles(ref,userId);if(!current())return;if(result.kind==='unavailable'){setUnavailable(true);return;}setData(result.data);}catch{if(current())setError('Unable to load customer files right now.');}finally{if(current())setLoading(false);}
  },[]);

  const syncUser=useCallback((user:User|null|undefined)=>{
    clearPrivateState(); activeUserId.current=null;
    if(!user){setAuthState('signed_out');window.location.replace(withBase('/account/'));return;}
    if(isAnonymousUser(user)){setAuthState('anonymous');return;}
    const ref=readReference(); setReference(ref); activeUserId.current=user.id; setAuthState('permanent');
    if(ref)void load(user.id,ref); else setUnavailable(true);
  },[clearPrivateState,load,readReference]);

  useEffect(()=>{
    let mounted=true,authRevision=0;
    const initial=async()=>{const revision=authRevision;const{data:sessionData}=await getAccountSession();if(!mounted||revision!==authRevision)return;syncUser(sessionData.session?.user);};void initial();
    const{data:listener}=onAccountAuthChange((_event,session)=>{authRevision+=1;syncUser(session?.user);});
    const pop=()=>{if(!activeUserId.current)return;const ref=readReference();clearPrivateState();setReference(ref);activeReference.current=ref;if(ref)void load(activeUserId.current,ref);else setUnavailable(true);};window.addEventListener('popstate',pop);
    return()=>{mounted=false;authRevision+=1;requestEpoch.current+=1;signedEpoch.current+=1;approvalEpoch.current+=1;activeUserId.current=null;activeReference.current=null;activeArtifact.current=null;activeApprovalArtifact.current=null;listener.subscription.unsubscribe();window.removeEventListener('popstate',pop);};
  },[clearPrivateState,load,readReference,syncUser]);

  const backToOrder=reference?`/account/orders/${encodeURIComponent(reference)}/`:'/account/dashboard';

  async function requestArtifact(artifact:CustomerArtifact,disposition:'preview'|'download') {
    if(!reference||!activeUserId.current)return;
    const epoch=++signedEpoch.current, userId=activeUserId.current, ref=reference, artifactRef=artifact.reference;
    activeArtifact.current=artifactRef; setAccess(null); setAccessError(''); setAccessLoading(`${artifactRef}:${disposition}`);
    const expected={epoch,userId,reference:ref,artifactReference:artifactRef};
    const current=()=>isFilesRequestCurrent({epoch:signedEpoch.current,userId:activeUserId.current,reference:activeReference.current,artifactReference:activeArtifact.current},expected);
    try{const result=await loadArtifactAccess(ref,artifactRef,disposition,userId);if(!current())return;if(disposition==='download'){window.open(result.signedUrl,'_blank','noopener,noreferrer');setAccess(null);}else if(result.mimeType==='application/pdf'){window.open(result.signedUrl,'_blank','noopener,noreferrer');setAccess(null);}else setAccess(result);}catch{if(current())setAccessError('File unavailable.');}finally{if(current())setAccessLoading(null);}
  }

  function openDecision(artifact:CustomerArtifact,kind:'approve'|'request_revision') {
    approvalEpoch.current+=1;
    activeApprovalArtifact.current=artifact.reference;
    setDecision({artifact,kind});setRevisionMessage('');setDecisionError('');setDecisionBusy(false);
  }

  function closeDecision() {
    approvalEpoch.current+=1;
    activeApprovalArtifact.current=null;
    setDecision(null);setRevisionMessage('');setDecisionError('');setDecisionBusy(false);
  }

  async function submitDecision() {
    if(!decision?.artifact.approval||!reference||!activeUserId.current)return;
    const message=revisionMessage.trim();
    if(decision.kind==='request_revision'&&(message.length<3||message.length>1000)){setDecisionError('Add a short revision note between 3 and 1,000 characters.');return;}
    const epoch=++approvalEpoch.current,userId=activeUserId.current,ref=reference,artifactRef=decision.artifact.reference;activeApprovalArtifact.current=artifactRef;setDecisionBusy(true);setDecisionError('');
    const current=()=>isFilesRequestCurrent({epoch:approvalEpoch.current,userId:activeUserId.current,reference:activeReference.current,artifactReference:activeApprovalArtifact.current},{epoch,userId,reference:ref,artifactReference:artifactRef});
    try{
      await submitCustomerArtifactApproval({reference:ref,artifactReference:artifactRef,approvalReference:decision.artifact.approval.reference,expectedRevision:decision.artifact.revision,decision:decision.kind,message},userId);
      if(!current())return;
      setDecision(null);setRevisionMessage('');setAccess(null);await load(userId,ref);
    }catch(err){if(!current())return;const e=err as Error & {code?:string};setDecisionError(e.message||'Approval could not be completed.');}
    finally{if(current())setDecisionBusy(false);}
  }

  async function signOut(){clearPrivateState();activeUserId.current=null;setAuthState('loading');await signOutAccount();window.location.replace(withBase('/account/'));}

  const latestAttention=useMemo(()=>data?.attention[0]||null,[data]);
  if(authState==='loading'||authState==='signed_out')return <FilesSkeleton/>;
  if(authState==='anonymous')return <AnonymousAccess/>;
  if(loading&&!data)return <FilesSkeleton/>;
  if(unavailable)return <Unavailable/>;
  if(error)return <section className="customer-files-shell customer-files-access shell"><span className="section-kicker">FILES & APPROVALS</span><h1>Files & approvals.</h1><div className="customer-files-error" role="alert"><strong>{error}</strong><div><button type="button" onClick={()=>reference&&activeUserId.current?void load(activeUserId.current,reference):undefined}><RefreshCw size={15}/> Try again</button><Link href="/account/dashboard">Back to Dashboard</Link></div></div></section>;
  if(!data)return <FilesSkeleton/>;

  return <div className="customer-files-shell shell">
    <div className="customer-files-topbar"><Link href={backToOrder}><ArrowLeft size={16}/> Back to Order</Link><button type="button" onClick={()=>void signOut()}><LogOut size={16}/> Sign out</button></div>
    <header className="customer-files-hero"><div><span className="section-kicker">FILES & APPROVALS</span><h1>{data.orderReference}</h1><p>Customer-visible files, approvals and verification media for this order.</p></div><span className={`customer-files-status is-${data.reviewStatus}`}>{data.reviewStatusLabel}</span></header>

    {latestAttention?<section className="customer-files-attention" aria-labelledby="attention-heading"><div><Clock3 size={22}/><span className="section-kicker">NEEDS YOUR ATTENTION</span><h2 id="attention-heading">Review this version</h2><p>{latestAttention.displayName} · {latestAttention.versionLabel||`Revision ${latestAttention.revision}`}</p></div><div className="customer-files-attention-actions"><button type="button" onClick={()=>void requestArtifact(latestAttention,'preview')} disabled={Boolean(accessLoading)||decisionBusy}><Eye size={16}/> Review file</button><button type="button" className="is-approve" onClick={()=>openDecision(latestAttention,'approve')} disabled={decisionBusy}><CheckCircle2 size={16}/> Approve this version</button><button type="button" onClick={()=>openDecision(latestAttention,'request_revision')} disabled={decisionBusy}><RefreshCw size={16}/> Request revision</button></div></section>:null}

    {decision?<section className="customer-files-confirm" aria-labelledby="approval-confirm-heading"><span className="section-kicker">CONFIRM ACTION</span><h2 id="approval-confirm-heading">{decision.kind==='approve'?'Approve this version':'Request revision'}</h2><p><strong>{decision.artifact.displayName}</strong> · {decision.artifact.versionLabel||`Revision ${decision.artifact.revision}`}</p>{decision.kind==='request_revision'?<label><span>Revision note</span><textarea value={revisionMessage} maxLength={1000} onChange={(e)=>setRevisionMessage(e.target.value)} placeholder="Describe what needs to change."/></label>:<p>This approval applies only to the exact version shown above.</p>}{decisionError?<p className="customer-files-inline-error" role="alert">{decisionError}</p>:null}<div><button type="button" onClick={closeDecision} disabled={decisionBusy}>Cancel</button><button type="button" className="button button-primary" onClick={()=>void submitDecision()} disabled={decisionBusy}>{decisionBusy?'Saving…':decision.kind==='approve'?'Approve this version':'Request revision'}</button></div></section>:null}

    {accessError?<div className="customer-files-inline-error" role="alert">{accessError}</div>:null}
    {access?<section className="customer-files-preview" aria-labelledby="secure-preview-heading"><div className="customer-files-panel-head"><div><span className="section-kicker">SECURE PREVIEW</span><h2 id="secure-preview-heading">{access.displayName}</h2></div><ShieldCheck size={22}/></div>{access.mimeType.startsWith('image/')?<img src={access.signedUrl} alt={access.displayName}/>:access.mimeType.startsWith('video/')?<video src={access.signedUrl} controls preload="metadata" aria-label={access.displayName}/>:null}<p>Temporary access expires {formatDateTime(access.expiresAt)}.</p></section>:null}

    <div className="customer-files-grid">
      <section className="customer-files-panel" aria-labelledby="latest-file-heading"><div className="customer-files-panel-head"><div><span className="section-kicker">LATEST FILE</span><h2 id="latest-file-heading">Latest customer-facing version</h2></div><FileCheck2 size={22}/></div>{data.latest?<article className="customer-file-card is-latest"><div className="customer-file-card-title">{fileIcon(data.latest)}<div><strong>{data.latest.displayName}</strong><small>{data.latest.versionLabel||`Revision ${data.latest.revision}`}</small></div></div>{data.latest.description?<p>{data.latest.description}</p>:null}<ArtifactMeta artifact={data.latest}/><div className="customer-file-actions"><button type="button" onClick={()=>void requestArtifact(data.latest!,'preview')}><Eye size={15}/> Preview</button><button type="button" onClick={()=>void requestArtifact(data.latest!,'download')}><Download size={15}/> Download</button></div></article>:<div className="customer-files-empty"><FileText size={24}/><strong>No customer files are available for this order yet.</strong></div>}</section>

      <section className="customer-files-panel" aria-labelledby="history-heading"><div className="customer-files-panel-head"><div><span className="section-kicker">APPROVAL HISTORY</span><h2 id="history-heading">Previous decisions</h2></div><Clock3 size={22}/></div>{data.history.length?<ol className="customer-files-history">{data.history.map((item)=><li key={`${item.approvalReference}-${item.occurredAt}`}><span className={`customer-files-history-mark is-${item.action.toLowerCase()}`}/><div><strong>{item.actionLabel}</strong><p>{item.displayName} · {item.versionLabel||`Revision ${item.revision}`}</p><time dateTime={item.occurredAt}>{formatDateTime(item.occurredAt)}</time></div></li>)}</ol>:<div className="customer-files-empty"><Clock3 size={24}/><strong>No approval history yet.</strong></div>}</section>
    </div>

    <section className="customer-files-panel customer-files-list" aria-labelledby="file-list-heading"><div className="customer-files-panel-head"><div><span className="section-kicker">FILES</span><h2 id="file-list-heading">Customer files</h2></div><FileText size={22}/></div>{data.files.length?<div className="customer-file-list">{data.files.map((artifact)=><article key={artifact.reference}><div className="customer-file-card-title">{fileIcon(artifact)}<div><strong>{artifact.displayName}</strong><small>{artifact.isLatest?'Latest revision':artifact.versionLabel||`Revision ${artifact.revision}`}</small></div></div><ArtifactMeta artifact={artifact}/>{artifact.approval?<span className={`customer-file-approval is-${artifact.approval.status.toLowerCase()}`}>{artifact.approval.statusLabel}</span>:null}<div className="customer-file-actions"><button type="button" onClick={()=>void requestArtifact(artifact,'preview')} disabled={Boolean(accessLoading)}><Eye size={15}/> Open securely</button><button type="button" onClick={()=>void requestArtifact(artifact,'download')} disabled={Boolean(accessLoading)}><Download size={15}/> Download</button></div></article>)}</div>:<div className="customer-files-empty"><FileText size={24}/><strong>No customer files are available for this order yet.</strong></div>}</section>

    <section className="customer-files-panel customer-files-media" aria-labelledby="media-heading"><div className="customer-files-panel-head"><div><span className="section-kicker">VERIFICATION MEDIA</span><h2 id="media-heading">Verification media</h2></div><ImageIcon size={22}/></div>{data.verificationMedia.length?<div className="customer-media-grid">{data.verificationMedia.map((artifact)=><article key={artifact.reference}>{fileIcon(artifact)}<strong>{artifact.displayName}</strong><span>{artifact.categoryLabel}</span><button type="button" onClick={()=>void requestArtifact(artifact,'preview')}><Eye size={15}/> View securely</button></article>)}</div>:<div className="customer-files-empty"><ImageIcon size={24}/><strong>No verification media is available for this order yet.</strong></div>}</section>

    <section className="customer-files-actions" aria-label="Files navigation"><Link href={backToOrder}><ArrowLeft size={16}/> Back to Order</Link><Link href="/account/dashboard">Customer Dashboard</Link></section>
  </div>;
}
