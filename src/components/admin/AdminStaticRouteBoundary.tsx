'use client';
import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { siteConfig } from '@/config/site';
import { AdminOrderDetailClient } from '@/components/admin/AdminOrderDetailClient';
import { AdminCustomerDetailClient } from '@/components/admin/AdminCustomerDetailClient';
import { AdminRequestDetailClient } from '@/components/admin/AdminRequestDetailClient';
import { isAdminOrderDetailPath } from '@/lib/adminOrdersRoute';
import { extractAdminBulkRequestReference, extractAdminCustomerReference, extractAdminCustomRequestReference } from '@/lib/adminPhase3Routes';
function subscribe(cb:()=>void){window.addEventListener('popstate',cb);return()=>window.removeEventListener('popstate',cb)}
function snap(){const path=window.location.pathname;if(isAdminOrderDetailPath(path,siteConfig.basePath))return'order';if(extractAdminCustomerReference(path,siteConfig.basePath))return'customer';if(extractAdminCustomRequestReference(path,siteConfig.basePath))return'custom';if(extractAdminBulkRequestReference(path,siteConfig.basePath))return'bulk';return'none'}
export function AdminStaticRouteBoundary({children}:{children:ReactNode}){const route=useSyncExternalStore(subscribe,snap,()=> 'none');if(route==='order')return <AdminOrderDetailClient/>;if(route==='customer')return <AdminCustomerDetailClient/>;if(route==='custom')return <AdminRequestDetailClient mode="custom"/>;if(route==='bulk')return <AdminRequestDetailClient mode="bulk"/>;return children}
