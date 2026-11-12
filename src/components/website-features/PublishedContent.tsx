'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { websiteApi } from '@/lib/websiteApi';
import { siteConfig } from '@/config/site';
import type { ContentKind, ContentRecord } from '@/lib/websiteContracts';
/** Static pages retain their reviewed baseline; this optional layer reads approved revisions only. */
export function PublishedContent({kind,fallback=null}:{kind:ContentKind;fallback?:ReactNode}){
 const[snapshot,setSnapshot]=useState<{kind:ContentKind;rows:ContentRecord[]}|null>(null);
 const enabled=siteConfig.features.websiteFeatures&&(kind!=='project'||siteConfig.features.realPortfolio);
 const rows=snapshot?.kind===kind?snapshot.rows:[];
 useEffect(()=>{if(!enabled)return;const abort=new AbortController();void websiteApi<ContentRecord[]>('published-list',{kind},abort.signal).then(next=>{if(!abort.signal.aborted)setSnapshot({kind,rows:next})}).catch(()=>{});return()=>abort.abort()},[kind,enabled]);
 if(!enabled||!rows.length)return fallback;
 return <section className="shell section" aria-label={kind==='faq'?'Published FAQ':kind==='about'?'Published studio information':'Approved projects'}><h2>{kind==='faq'?'More answers':kind==='about'?'Studio information':'Approved projects'}</h2>{rows.map(r=><article className="dashboard-panel" key={r.key}>{kind==='faq'?<details><summary>{r.payload.title}</summary><p style={{whiteSpace:'pre-wrap'}}>{r.payload.body}</p></details>:<><h3>{r.payload.title}</h3><p style={{whiteSpace:'pre-wrap'}}>{r.payload.body}</p>{kind==='project'&&r.payload.image?<img src={r.payload.image} alt={r.payload.title} loading="lazy" style={{maxWidth:'100%',height:'auto'}}/>:null}</>}</article>)}</section>;
}
