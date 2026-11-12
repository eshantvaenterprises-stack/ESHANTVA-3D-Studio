import type { Metadata } from 'next';
import { AdminRequestDetailClient } from '@/components/admin/AdminRequestDetailClient';
export const metadata:Metadata={title:'Admin Bulk Request',description:'ESHANTVA 3D Studio bulk request detail.',robots:{index:false,follow:false}};
export default function AdminBulkRequestShellPage(){return <AdminRequestDetailClient mode="bulk"/>}
