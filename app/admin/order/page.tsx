import type { Metadata } from 'next';
import { AdminOrderDetailClient } from '@/components/admin/AdminOrderDetailClient';
export const metadata:Metadata={title:'Admin Order',description:'ESHANTVA 3D Studio admin order detail.',robots:{index:false,follow:false}};
export default function AdminOrderShellPage(){return <AdminOrderDetailClient/>}
