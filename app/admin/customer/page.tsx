import type { Metadata } from 'next';
import { AdminCustomerDetailClient } from '@/components/admin/AdminCustomerDetailClient';
export const metadata:Metadata={title:'Admin Customer',description:'ESHANTVA 3D Studio customer operational detail.',robots:{index:false,follow:false}};
export default function AdminCustomerShellPage(){return <AdminCustomerDetailClient/>}
