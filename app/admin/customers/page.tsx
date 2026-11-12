import type { Metadata } from 'next';
import { AdminCustomersListClient } from '@/components/admin/AdminCustomersListClient';
export const metadata:Metadata={title:'Admin Customers',description:'ESHANTVA 3D Studio customer operational context.',robots:{index:false,follow:false}};
export default function AdminCustomersPage(){return <AdminCustomersListClient/>}
