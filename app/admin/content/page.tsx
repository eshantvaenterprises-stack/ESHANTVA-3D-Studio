import type { Metadata } from 'next';
import { AdminContentClient } from '@/components/website-features/AdminContentClient';
export const metadata:Metadata={title:'Content Management',robots:{index:false,follow:false}};
export default function AdminContentPage(){return <AdminContentClient/>;}
