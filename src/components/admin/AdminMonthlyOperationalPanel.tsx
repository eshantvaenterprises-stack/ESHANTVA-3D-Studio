'use client';
import { useEffect, useRef, useState } from 'react';
import { Download, LoaderCircle, RefreshCw } from 'lucide-react';
import { loadAdminMonthlyOperationalSummary, type AdminMonthlyOperationalSummary } from '@/lib/adminApi';
import type { AdminRole } from '@/types/admin';
const currentISTMonth=()=>new Date(Date.now()+19800000).toISOString().slice(0,7);
const names:Record<keyof AdminMonthlyOperationalSummary['counts'],string>={
 ordersCreated:'Orders created',customRequestsSubmitted:'Custom requests submitted',bulkRequestsSubmitted:'Bulk requests submitted',
 customStatusEvents:'Custom request status events',bulkStatusEvents:'Bulk request status events',
 customAttachmentAccessIssued:'Custom file access issued',bulkAttachmentAccessIssued:'Bulk file access issued',
};
export function AdminMonthlyOperationalPanel({role}:{role:AdminRole}){
 const [month,setMonth]=useState(currentISTMonth),[data,setData]=useState<AdminMonthlyOperationalSummary|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const epoch=useRef(0);
 useEffect(()=>()=>{epoch.current++},[]);
 async function load(){if(role!=='ADMIN')return;const id=++epoch.current;setBusy(true);setError('');setData(null);try{const next=await loadAdminMonthlyOperationalSummary(month);if(epoch.current===id)setData(next)}catch(err){if(epoch.current===id)setError(err instanceof Error?err.message:'Report unavailable. Retry.')}finally{if(epoch.current===id)setBusy(false)}}
 function downloadCsv(){if(!data||role!=='ADMIN')return;
  const rows=[['Report month',data.month],['Time zone',data.timeZone],['Window start UTC',data.windowUtc.start],['Window end UTC',data.windowUtc.end],['Scope','Operational counts only; no payment or tax reconciliation'],...Object.entries(data.counts).map(([key,value])=>[names[key as keyof AdminMonthlyOperationalSummary['counts']],String(value)])];
  // Values are only fixed labels, ISO timestamps and numeric counts. No customer data.
  const text=rows.map(row=>row.map(cell=>`"${cell.replaceAll('"','""')}"`).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`eshantva-operations-${data.month}.csv`;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 if(role!=='ADMIN')return null;
 return <section className="admin-order-panel" aria-labelledby="admin-monthly-heading"><span className="admin-kicker">SERVER COUNTS</span><h2 id="admin-monthly-heading">Monthly operational report</h2>
  <p>India Standard Time. No customer names, private files or payment claims appear in this export.</p>
  <div className="admin-top-actions"><label htmlFor="admin-month-select">Reporting month</label><input id="admin-month-select" type="month" value={month} min="2026-01" onChange={event=>{epoch.current++;setBusy(false);setMonth(event.target.value);setData(null);setError('')}}/>
   <button type="button" onClick={()=>void load()} disabled={busy||!month}><RefreshCw size={15}/> {busy?'Loading…':'Load report'}</button>
   {data?<button type="button" onClick={downloadCsv}><Download size={15}/> Download CSV</button>:null}
  </div>
  {busy?<p role="status"><LoaderCircle size={16}/> Querying authorized monthly counts…</p>:null}
  {error?<p role="alert" className="admin-mutation-error">{error}</p>:null}
  {data?<><dl className="admin-spec-grid">{Object.entries(data.counts).map(([key,value])=><div key={key}><dt>{names[key as keyof AdminMonthlyOperationalSummary['counts']]}</dt><dd>{value}</dd></div>)}</dl>
    <p className="admin-helper-copy">{data.definition} Date range: {data.windowUtc.start} through {data.windowUtc.end} (exclusive).</p></>:null}
 </section>;
}
