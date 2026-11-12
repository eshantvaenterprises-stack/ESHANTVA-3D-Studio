import type { Metadata } from 'next';
import { AdminRequestListClient } from '@/components/admin/AdminRequestListClient';
export const metadata:Metadata={title:'Admin Bulk Requests',description:'ESHANTVA 3D Studio bulk request operations.',robots:{index:false,follow:false}};
export default function AdminBulkRequestsPage(){return <AdminRequestListClient mode="bulk"/>}
