import type { AdminOrderStatus, AdminOrderSort, AdminPaymentStatus, AdminDeliveryMethod } from '@/types/adminOrders';

const refPattern=/^ESHA-[0-9]{4}-[A-Z0-9]{8}$/;
export const ADMIN_ORDERS_PAGE_SIZE=20;
export function isAdminOrderReference(value:string){return refPattern.test(value)}
export function extractAdminOrderReference(pathname:string,basePath=''){
  const base=basePath&&basePath!=='/'?basePath.replace(/\/$/,''):'';
  const without=base&&pathname.startsWith(base)?pathname.slice(base.length):pathname;
  const match=without.match(/^\/admin\/orders\/([^/?#]+)\/?$/); if(!match)return null;
  try{return decodeURIComponent(match[1]).toUpperCase()}catch{return match[1].toUpperCase()}
}
export function isAdminOrderDetailPath(pathname:string,basePath=''){return extractAdminOrderReference(pathname,basePath)!==null}
export function sanitizeAdminOrderSearch(value:string){return value.trim().toUpperCase().slice(0,40).replace(/[^A-Z0-9-]/g,'')}
export function normalizePage(value:number){return Number.isInteger(value)&&value>0?Math.min(value,5000):1}
export function normalizeSort(value:string):AdminOrderSort{return value==='oldest'?'oldest':'newest'}
export function isRequestCurrent(current:{epoch:number;userId:string|null;identity:string|null},expected:{epoch:number;userId:string;identity:string}){return current.epoch===expected.epoch&&current.userId===expected.userId&&current.identity===expected.identity}
export type AdminTransitionRequest={key:string;requestId:string};
export function getOrCreateAdminTransitionRequest(current:AdminTransitionRequest|null,key:string,createRequestId:()=>string):AdminTransitionRequest{return current?.key===key?current:{key,requestId:createRequestId()}}
export function isAdminMutationCurrent(current:{epoch:number;userId:string|null;identity:string|null;requestId:string|null},expected:{epoch:number;userId:string;identity:string;requestId:string}){return current.epoch===expected.epoch&&current.userId===expected.userId&&current.identity===expected.identity&&current.requestId===expected.requestId}
export type AdminOrdersFilterInput={search:string;status:AdminOrderStatus|null;paymentStatus:AdminPaymentStatus|null;deliveryMethod:AdminDeliveryMethod|null;sort:AdminOrderSort;page:number};
