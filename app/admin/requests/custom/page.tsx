import type { Metadata } from 'next';
import { AdminRequestListClient } from '@/components/admin/AdminRequestListClient';
export const metadata:Metadata={title:'Admin Custom Requests',description:'ESHANTVA 3D Studio custom request operations.',robots:{index:false,follow:false}};
export default function AdminCustomRequestsPage(){return <AdminRequestListClient mode="custom"/>}
