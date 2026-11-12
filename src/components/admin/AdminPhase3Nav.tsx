import Link from 'next/link';
import { Boxes, ClipboardList, FileText, LayoutDashboard, Users } from 'lucide-react';
import { siteConfig } from '@/config/site';

export type AdminNavKey='dashboard'|'orders'|'customers'|'custom'|'bulk'|'recruitment'|'content';
const withBase=(path:string)=>`${siteConfig.basePath}${path}`;
export function AdminPhase3Nav({active}:{active:AdminNavKey}){
  const items=[
    ...(siteConfig.features.websiteFeatures?[{key:'content' as const,href:'/admin/content/',label:'Content',icon:FileText}]:[]),
    {key:'dashboard' as const,href:'/admin/',label:'Dashboard',icon:LayoutDashboard},
    {key:'orders' as const,href:'/admin/orders/',label:'Orders',icon:ClipboardList},
    {key:'customers' as const,href:'/admin/customers/',label:'Customers',icon:Users},
    {key:'custom' as const,href:'/admin/requests/custom/',label:'Custom Requests',icon:FileText},
    {key:'bulk' as const,href:'/admin/requests/bulk/',label:'Bulk Requests',icon:Boxes},
  ];
  return <nav aria-label="Admin navigation">{items.map(({key,href,label,icon:Icon})=><Link key={key} className={active===key?'is-active':undefined} href={withBase(href)}><Icon size={17}/>{label}</Link>)}</nav>;
}
