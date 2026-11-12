import { AdminStaticRouteBoundary } from '@/components/admin/AdminStaticRouteBoundary';
import { StaticOrderRouteBoundary } from '@/components/order-detail/StaticOrderRouteBoundary';

export default function NotFound() {
  return (
    <AdminStaticRouteBoundary>
      <StaticOrderRouteBoundary />
    </AdminStaticRouteBoundary>
  );
}
