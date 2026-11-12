'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, LoaderCircle, LogOut, Search, ShieldCheck } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { AdminApiError, loadAdminOrders, recordAdminSignOut } from '@/lib/adminApi';
import { getAdminAuthSession, onAdminAuthChange, signOutAdmin } from '@/lib/adminAuth';
import { ADMIN_ORDERS_PAGE_SIZE, isRequestCurrent, normalizePage, normalizeSort, sanitizeAdminOrderSearch } from '@/lib/adminOrdersRoute';
import type { AdminDeliveryMethod, AdminOrderSort, AdminOrderStatus, AdminOrdersListData, AdminPaymentStatus } from '@/types/adminOrders';
import { AdminPhase3Nav } from '@/components/admin/AdminPhase3Nav';

const statusOptions:AdminOrderStatus[]=['pending_payment','payment_processing','paid','under_review','confirmed','in_production','ready_for_pickup','shipped','delivered','cancelled','refunded'];
const paymentOptions:AdminPaymentStatus[]=['not_started','pending','processing','paid','failed','cancelled','refunded'];
const deliveryOptions:AdminDeliveryMethod[]=['pickup','local_delivery','shipping'];
function withBase(path:string){return `${siteConfig.basePath}${path}`}
function money(paise:number,currency='INR'){return new Intl.NumberFormat('en-IN',{style:'currency',currency}).format(paise/100)}
function dateTime(value:string){return new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}
function title(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,(c)=>c.toUpperCase())}

export function AdminOrdersListClient(){
  const [state,setState]=useState<'loading'|'ready'|'denied'|'error'>('loading');
  const [data,setData]=useState<AdminOrdersListData|null>(null);
  const [searchInput,setSearchInput]=useState(''); const [search,setSearch]=useState('');
  const [status,setStatus]=useState<AdminOrderStatus|null>(null); const [paymentStatus,setPaymentStatus]=useState<AdminPaymentStatus|null>(null); const [deliveryMethod,setDeliveryMethod]=useState<AdminDeliveryMethod|null>(null); const [sort,setSort]=useState<AdminOrderSort>('newest'); const [page,setPage]=useState(1);
  const epoch=useRef(0),userId=useRef<string|null>(null),identity=useRef<string|null>(null);
  const invalidateRequests=useCallback(()=>{epoch.current++;userId.current=null;identity.current=null},[]);
  const queryIdentity=useMemo(()=>JSON.stringify({page,search,status,paymentStatus,deliveryMethod,sort}),[page,search,status,paymentStatus,deliveryMethod,sort]);

  const load=useCallback(async(uid:string,id:string,input:{page:number;search:string;status:AdminOrderStatus|null;paymentStatus:AdminPaymentStatus|null;deliveryMethod:AdminDeliveryMethod|null;sort:AdminOrderSort})=>{
    const e=++epoch.current; identity.current=id; setState('loading'); setData(null);
    try{const next=await loadAdminOrders(input);if(!isRequestCurrent({epoch:epoch.current,userId:userId.current,identity:identity.current},{epoch:e,userId:uid,identity:id}))return;setData(next);setState('ready')}
    catch(error){if(!isRequestCurrent({epoch:epoch.current,userId:userId.current,identity:identity.current},{epoch:e,userId:uid,identity:id}))return;setState(error instanceof AdminApiError&&(error.status===401||error.status===403)?'denied':'error')}
  },[]);

  useEffect(()=>{let mounted=true,rev=0;const sync=async()=>{const r=rev;try{const{data,error:sessionError}=await getAdminAuthSession();if(sessionError)throw sessionError;if(!mounted||r!==rev)return;const u=data.session?.user;invalidateRequests();setData(null);if(!u){window.location.replace(withBase('/admin/login/'));return}if(u.is_anonymous){setState('denied');return}userId.current=u.id;void load(u.id,queryIdentity,{page:normalizePage(page),search,status,paymentStatus,deliveryMethod,sort:normalizeSort(sort)})}catch{if(!mounted||r!==rev)return;invalidateRequests();setData(null);setState('error')}};void sync();const{data:l}=onAdminAuthChange((_e,s)=>{if(!mounted)return;rev++;invalidateRequests();setData(null);const u=s?.user;if(!u){window.location.replace(withBase('/admin/login/'));return}if(u.is_anonymous){setState('denied');return}userId.current=u.id;void load(u.id,queryIdentity,{page:normalizePage(page),search,status,paymentStatus,deliveryMethod,sort})});return()=>{mounted=false;rev++;invalidateRequests();l.subscription.unsubscribe()}},[deliveryMethod,invalidateRequests,load,page,paymentStatus,queryIdentity,search,sort,status]);

  async function signOut(){epoch.current++;userId.current=null;identity.current=null;setData(null);await recordAdminSignOut();await signOutAdmin();window.location.replace(withBase('/admin/login/'))}
  function submitSearch(event:FormEvent){event.preventDefault();setPage(1);setSearch(sanitizeAdminOrderSearch(searchInput))}
  function reset(){setSearchInput('');setSearch('');setStatus(null);setPaymentStatus(null);setDeliveryMethod(null);setSort('newest');setPage(1)}
  if(state==='denied')return <main className="admin-page"><section className="admin-state-card"><ShieldCheck/><h1>Admin access unavailable.</h1><p>This session is not authorized for Admin Orders.</p><button onClick={()=>void signOut()}>Sign out</button></section></main>;
  if(state==='error')return <main className="admin-page"><section className="admin-state-card"><h1>Unable to load orders.</h1><button onClick={()=>{const u=userId.current;if(!u){window.location.reload();return;}if(u)void load(u,queryIdentity,{page,search,status,paymentStatus,deliveryMethod,sort})}}>Try again</button></section></main>;

  return <div className="admin-app-shell">
    <aside className="admin-sidebar"><div className="admin-wordmark"><span>ESHANTVA</span><small>ADMIN</small></div><AdminPhase3Nav active="orders"/><div className="admin-coming"><small>ORDERS OPERATIONS</small><p>Customers and request operations are available. Payments, Files, Notes and Staff remain outside this phase.</p></div></aside>
    <main className="admin-main admin-orders-main"><header className="admin-topbar"><div><span className="admin-kicker">OPERATIONS / ORDERS</span><h1>Orders.</h1></div><div className="admin-top-actions">{data?<div className="admin-session-badge"><ShieldCheck size={16}/><span>{data.admin.displayName||'Authorized user'}</span><b>{data.admin.role}</b></div>:null}<button onClick={()=>void signOut()}><LogOut size={16}/> Sign out</button></div></header>
    <section className="admin-orders-tools" aria-label="Order filters"><form onSubmit={submitSearch}><label htmlFor="admin-order-search">Order reference</label><div><input id="admin-order-search" value={searchInput} onChange={e=>setSearchInput(e.target.value)} maxLength={40} placeholder="ESHA-2026-…"/><button type="submit"><Search size={16}/> Search</button></div></form><label>Status<select value={status||''} onChange={e=>{setPage(1);setStatus((e.target.value||null) as AdminOrderStatus|null)}}><option value="">All</option>{statusOptions.map(x=><option key={x} value={x}>{title(x)}</option>)}</select></label><label>Payment<select value={paymentStatus||''} onChange={e=>{setPage(1);setPaymentStatus((e.target.value||null) as AdminPaymentStatus|null)}}><option value="">All</option>{paymentOptions.map(x=><option key={x} value={x}>{title(x)}</option>)}</select></label><label>Delivery<select value={deliveryMethod||''} onChange={e=>{setPage(1);setDeliveryMethod((e.target.value||null) as AdminDeliveryMethod|null)}}><option value="">All</option>{deliveryOptions.map(x=><option key={x} value={x}>{title(x)}</option>)}</select></label><label>Sort<select value={sort} onChange={e=>{setPage(1);setSort(normalizeSort(e.target.value))}}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label><button className="admin-quiet-button" type="button" onClick={reset}>Reset</button></section>
    {state==='loading'?<div className="admin-orders-loading" role="status" aria-live="polite"><LoaderCircle className="admin-spin"/> Loading orders…</div>:data&&data.items.length?<><div className="admin-orders-meta"><span>{data.pagination.total} order{data.pagination.total===1?'':'s'}</span><span>Page {data.pagination.page} of {Math.max(1,data.pagination.totalPages)}</span></div><div className="admin-orders-table-wrap"><table className="admin-orders-table"><thead><tr><th>Order</th><th>Created</th><th>Status</th><th>Payment</th><th>Delivery</th><th>Total</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>{data.items.map(order=><tr key={order.reference}><td data-label="Order"><strong>{order.reference}</strong></td><td data-label="Created">{dateTime(order.createdAt)}</td><td data-label="Status"><span className="admin-status-pill">{order.statusLabel}</span></td><td data-label="Payment">{order.paymentLabel}</td><td data-label="Delivery">{order.deliveryLabel}</td><td data-label="Total">{money(order.totalPaise,order.currency)}</td><td><Link className="admin-row-link" href={withBase(`/admin/order/?reference=${encodeURIComponent(order.reference)}`)}>Open</Link></td></tr>)}</tbody></table></div><nav className="admin-pagination" aria-label="Orders pagination"><button disabled={data.pagination.page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Previous</button><span>{(data.pagination.page-1)*ADMIN_ORDERS_PAGE_SIZE+1}–{Math.min(data.pagination.page*ADMIN_ORDERS_PAGE_SIZE,data.pagination.total)} of {data.pagination.total}</span><button disabled={data.pagination.page>=data.pagination.totalPages} onClick={()=>setPage(p=>p+1)}>Next</button></nav></>:data?<section className="admin-empty-orders"><ClipboardList size={28}/><h2>No orders found.</h2><p>Adjust the reference search or filters. No production data is fabricated for this view.</p></section>:null}
    </main></div>
}
