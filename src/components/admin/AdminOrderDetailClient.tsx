'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LoaderCircle, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { AdminApiError, loadAdminOrderDetail, recordAdminSignOut, transitionAdminOrder } from '@/lib/adminApi';
import { getAdminAuthSession, onAdminAuthChange, signOutAdmin } from '@/lib/adminAuth';
import { extractAdminOrderReference, getOrCreateAdminTransitionRequest, isAdminMutationCurrent, isAdminOrderReference, isRequestCurrent, type AdminTransitionRequest } from '@/lib/adminOrdersRoute';
import type { AdminOrderDetailData, AdminOrderStatus } from '@/types/adminOrders';
import { AdminPhase3Nav } from '@/components/admin/AdminPhase3Nav';
import { AdminOrderArtifactsPanel } from '@/components/admin/AdminOrderArtifactsPanel';

function withBase(path:string){return `${siteConfig.basePath}${path}`}
function money(paise:number,currency='INR'){return new Intl.NumberFormat('en-IN',{style:'currency',currency}).format(paise/100)}
function dateTime(value:string){return new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}
function title(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,(c)=>c.toUpperCase())}

export function AdminOrderDetailClient(){
  const [state,setState]=useState<'loading'|'ready'|'denied'|'unavailable'|'error'>('loading');
  const [data,setData]=useState<AdminOrderDetailData|null>(null);
  const [reference,setReference]=useState<string|null>(null);
  const [target,setTarget]=useState<AdminOrderStatus|null>(null);
  const [mutating,setMutating]=useState(false);
  const [feedback,setFeedback]=useState('');
  const epoch=useRef(0),mutationEpoch=useRef(0),userId=useRef<string|null>(null),identity=useRef<string|null>(null),transitionRequest=useRef<AdminTransitionRequest|null>(null);
  const invalidateMutation=useCallback(()=>{mutationEpoch.current++;transitionRequest.current=null;setMutating(false)},[]);

  const load=useCallback(async(uid:string,ref:string)=>{
    invalidateMutation();const e=++epoch.current,id=`detail:${ref}`;identity.current=id;setState('loading');setData(null);setFeedback('');setTarget(null);
    if(!isAdminOrderReference(ref)){setState('unavailable');return}
    try{const next=await loadAdminOrderDetail(ref);if(!isRequestCurrent({epoch:epoch.current,userId:userId.current,identity:identity.current},{epoch:e,userId:uid,identity:id}))return;setData(next);setState('ready')}
    catch(error){if(!isRequestCurrent({epoch:epoch.current,userId:userId.current,identity:identity.current},{epoch:e,userId:uid,identity:id}))return;if(error instanceof AdminApiError&&(error.status===401||error.status===403))setState('denied');else if(error instanceof AdminApiError&&error.code==='ORDER_UNAVAILABLE')setState('unavailable');else setState('error')}
  },[invalidateMutation]);

  const sync=useCallback((u:{id:string;is_anonymous?:boolean}|null|undefined)=>{epoch.current++;invalidateMutation();userId.current=null;identity.current=null;setData(null);setTarget(null);setFeedback('');if(!u){window.location.replace(withBase('/admin/login/'));return}if(u.is_anonymous){setState('denied');return}const ref=(new URLSearchParams(window.location.search).get('reference') || extractAdminOrderReference(window.location.pathname,siteConfig.basePath));setReference(ref);userId.current=u.id;if(!ref){setState('unavailable');return}void load(u.id,ref)},[invalidateMutation,load]);

  useEffect(()=>{let mounted=true,rev=0;const initial=async()=>{const r=rev;try{const{data,error:sessionError}=await getAdminAuthSession();if(sessionError)throw sessionError;if(!mounted||r!==rev)return;sync(data.session?.user)}catch{if(!mounted||r!==rev)return;epoch.current++;invalidateMutation();userId.current=null;identity.current=null;setData(null);setState('error')}};void initial();const{data:l}=onAdminAuthChange((_e,s)=>{if(!mounted)return;rev++;sync(s?.user)});const pop=()=>{const u=userId.current;if(!u)return;const ref=(new URLSearchParams(window.location.search).get('reference') || extractAdminOrderReference(window.location.pathname,siteConfig.basePath));setReference(ref);epoch.current++;invalidateMutation();identity.current=null;setData(null);setTarget(null);setFeedback('');if(ref)void load(u,ref);else setState('unavailable')};window.addEventListener('popstate',pop);return()=>{mounted=false;rev++;invalidateMutation();userId.current=null;identity.current=null;l.subscription.unsubscribe();window.removeEventListener('popstate',pop)}},[invalidateMutation,load,sync]);

  async function signOut(){epoch.current++;invalidateMutation();userId.current=null;identity.current=null;setData(null);await recordAdminSignOut();await signOutAdmin();window.location.replace(withBase('/admin/login/'))}
  async function confirmTransition(){if(!data||!target||data.admin.role!=='ADMIN'||mutating)return;const expected=data.order.status,ref=data.order.reference,actor=userId.current;if(!actor)return;const key=`${ref}:${expected}:${target}`,request=getOrCreateAdminTransitionRequest(transitionRequest.current,key,()=>crypto.randomUUID());transitionRequest.current=request;const m=++mutationEpoch.current,detailIdentity=`detail:${ref}`;setMutating(true);setFeedback('');try{await transitionAdminOrder({reference:ref,expectedStatus:expected,targetStatus:target,requestId:request.requestId});if(!isAdminMutationCurrent({epoch:mutationEpoch.current,userId:userId.current,identity:identity.current,requestId:transitionRequest.current?.requestId??null},{epoch:m,userId:actor,identity:detailIdentity,requestId:request.requestId}))return;transitionRequest.current=null;await load(actor,ref)}catch(error){if(!isAdminMutationCurrent({epoch:mutationEpoch.current,userId:userId.current,identity:identity.current,requestId:transitionRequest.current?.requestId??null},{epoch:m,userId:actor,identity:detailIdentity,requestId:request.requestId}))return;setMutating(false);if(error instanceof AdminApiError)transitionRequest.current=null;setFeedback(error instanceof AdminApiError?error.message:'Unable to update this order. Retry will safely reuse the same request.')}}

  if(state==='loading')return <main className="admin-page"><div className="admin-state-card" role="status" aria-live="polite"><LoaderCircle className="admin-spin"/><h1>Order detail.</h1><p>Loading authorized order data…</p></div></main>;
  if(state==='denied')return <main className="admin-page"><section className="admin-state-card"><ShieldCheck/><h1>Admin access unavailable.</h1><button onClick={()=>void signOut()}>Sign out</button></section></main>;
  if(state==='unavailable')return <main className="admin-page"><section className="admin-state-card"><h1>Order unavailable.</h1><p>This order reference cannot be opened from the current Admin session.</p><Link href={withBase('/admin/orders/')}>Back to orders</Link></section></main>;
  if(state==='error'||!data)return <main className="admin-page"><section className="admin-state-card"><h1>Unable to load order.</h1><button onClick={()=>{const u=userId.current,r=reference;if(!u){window.location.reload();return;}if(u&&r)void load(u,r)}}>Try again</button></section></main>;

  const o=data.order;
  return <div className="admin-app-shell">
    <aside className="admin-sidebar"><div className="admin-wordmark"><span>ESHANTVA</span><small>ADMIN</small></div><AdminPhase3Nav active="orders"/><div className="admin-coming"><small>ORDER OPERATIONS</small><p>Status changes are server-validated and audited.</p></div></aside>
    <main className="admin-main admin-order-detail-main"><header className="admin-topbar"><div><Link className="admin-back-inline" href={withBase('/admin/orders/')}><ArrowLeft size={15}/> Orders</Link><span className="admin-kicker">ORDER / {o.reference}</span><h1>Order {o.reference}</h1></div><div className="admin-top-actions"><div className="admin-session-badge"><ShieldCheck size={16}/><span>{data.admin.displayName||'Authorized user'}</span><b>{data.admin.role}</b></div><button onClick={()=>{const u=userId.current;if(!u){window.location.reload();return;}if(u)void load(u,o.reference)}}><RefreshCw size={16}/> Refresh</button><button onClick={()=>void signOut()}><LogOut size={16}/> Sign out</button></div></header>

    <section className="admin-order-summary-grid"><article><span>Order status</span><strong>{o.statusLabel}</strong></article><article><span>Payment</span><strong>{o.paymentLabel}</strong></article><article><span>Delivery</span><strong>{o.deliveryLabel}</strong></article><article><span>Total</span><strong>{money(o.totalPaise,o.currency)}</strong></article><article><span>Created</span><strong>{dateTime(o.createdAt)}</strong></article></section>

    <div className="admin-order-detail-grid"><section className="admin-order-panel"><h2>Amounts</h2><dl><div><dt>Items</dt><dd>{money(o.itemSubtotalPaise,o.currency)}</dd></div><div><dt>Shipping / delivery</dt><dd>{money(o.shippingPaise,o.currency)}</dd></div><div><dt>{o.taxLabel}</dt><dd>{money(o.taxAmountPaise,o.currency)}</dd></div><div className="is-total"><dt>Total</dt><dd>{money(o.totalPaise,o.currency)}</dd></div></dl></section><section className="admin-order-panel"><h2>Fulfillment</h2><p><strong>{o.contactName}</strong></p><p>{o.contactMobile}</p>{o.delivery?<address><span>{o.delivery.addressLine1}</span>{o.delivery.addressLine2?<span>{o.delivery.addressLine2}</span>:null}<span>{o.delivery.locality}, {o.delivery.city}</span><span>{o.delivery.district}, {o.delivery.state} {o.delivery.pinCode}</span><span>{o.delivery.country}</span></address>:<p>{o.deliveryMethod==='pickup'?'Pickup order. No delivery address required.':'No delivery address snapshot available.'}</p>}</section></div>

    <section className="admin-order-panel"><h2>Items</h2><div className="admin-order-items">{o.items.map((item,index)=><article key={`${item.title}-${index}`}><div><strong>{item.title}</strong><span>Qty {item.quantity}</span></div>{item.selectedOptions.length?<ul>{item.selectedOptions.map(option=><li key={`${option.label}-${option.value}`}><span>{option.label}</span><b>{option.value}</b></li>)}</ul>:null}<footer><span>{money(item.unitPricePaise,o.currency)} each</span><strong>{money(item.lineSubtotalPaise,o.currency)}</strong></footer></article>)}</div></section>

    <AdminOrderArtifactsPanel reference={o.reference} role={data.admin.role}/>

    <section className="admin-order-panel"><h2>Order timeline</h2>{o.timeline.length?<ol className="admin-order-timeline">{o.timeline.map((event,index)=><li key={`${event.occurredAt}-${index}`}><div><strong>{event.label}</strong>{event.fromStatus&&event.toStatus?<span>{title(event.fromStatus)} → {title(event.toStatus)}</span>:null}</div><time>{dateTime(event.occurredAt)}</time></li>)}</ol>:<p>No customer-safe order events are available yet.</p>}</section>

    <section className="admin-order-panel admin-transition-panel" aria-labelledby="admin-transition-heading"><div><span className="admin-kicker">TRUSTED STATE CHANGE</span><h2 id="admin-transition-heading">Order status</h2></div>{data.admin.role==='STAFF'?<p>STAFF access is read-only in Admin Phase 2.</p>:o.allowedTransitions.length===0?<p>No permitted operational status change is available from <strong>{o.statusLabel}</strong>.</p>:<>{target?<div className="admin-transition-confirm"><p><span>Current</span><strong>{o.statusLabel}</strong></p><p><span>Change to</span><strong>{title(target)}</strong></p><div><button type="button" onClick={()=>setTarget(null)} disabled={mutating}>Cancel</button><button className="admin-danger-action" type="button" onClick={()=>void confirmTransition()} disabled={mutating}>{mutating?'Updating…':'Confirm status change'}</button></div></div>:<div className="admin-transition-actions">{o.allowedTransitions.map(next=><button key={next} type="button" onClick={()=>setTarget(next)}>Change to {title(next)}</button>)}</div>}{feedback?<p className="admin-mutation-error" role="alert">{feedback}</p>:null}</>}</section>
    </main></div>
}
