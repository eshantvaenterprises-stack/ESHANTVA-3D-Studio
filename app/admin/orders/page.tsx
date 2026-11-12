import type { Metadata } from 'next';
import { AdminOrdersListClient } from '@/components/admin/AdminOrdersListClient';
export const metadata:Metadata={title:'Admin Orders',description:'ESHANTVA 3D Studio admin order operations.',robots:{index:false,follow:false}};
export default function AdminOrdersPage(){return <AdminOrdersListClient/>}
