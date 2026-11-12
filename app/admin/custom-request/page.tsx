import type { Metadata } from 'next';
import { AdminRequestDetailClient } from '@/components/admin/AdminRequestDetailClient';
export const metadata:Metadata={title:'Admin Custom Request',description:'ESHANTVA 3D Studio custom request detail.',robots:{index:false,follow:false}};
export default function AdminCustomRequestShellPage(){return <AdminRequestDetailClient mode="custom"/>}
