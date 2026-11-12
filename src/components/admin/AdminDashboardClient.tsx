'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Boxes, ClipboardCheck, FileText, LayoutDashboard, LoaderCircle, LogOut, PackageCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { AdminApiError, loadAdminDashboard, recordAdminSignOut } from '@/lib/adminApi';
import { getAdminAuthSession, onAdminAuthChange, signOutAdmin } from '@/lib/adminAuth';
import type { AdminDashboardData } from '@/types/admin';
import { AdminPhase3Nav } from '@/components/admin/AdminPhase3Nav';
import { AdminMonthlyOperationalPanel } from './AdminMonthlyOperationalPanel';

function withBase(path: string) { return `${siteConfig.basePath}${path}`; }

function AdminLoading() {
  return <main className="admin-page"><div className="admin-state-card" role="status" aria-live="polite"><LoaderCircle className="admin-spin" size={24} /><h1>Admin dashboard.</h1><p>Verifying admin access…</p></div></main>;
}

export function AdminDashboardClient() {
  const [state, setState] = useState<'loading'|'ready'|'denied'|'error'>('loading');
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const requestEpoch = useRef(0);
  const activeUserId = useRef<string | null>(null);

  const load = useCallback(async (userId: string) => {
    const epoch = ++requestEpoch.current;
    setRefreshing(true);
    try {
      const next = await loadAdminDashboard();
      if (epoch !== requestEpoch.current || activeUserId.current !== userId) return;
      setData(next);
      setState('ready');
    } catch (error) {
      if (epoch !== requestEpoch.current || activeUserId.current !== userId) return;
      setData(null);
      setState(error instanceof AdminApiError && (error.status === 401 || error.status === 403) ? 'denied' : 'error');
    } finally {
      if (epoch === requestEpoch.current && activeUserId.current === userId) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let authRevision = 0;
    const sync = async () => {
      const revision = authRevision;
      try {
      const { data: sessionData, error: sessionError } = await getAdminAuthSession();
      if (sessionError) throw sessionError;
      if (!mounted || revision !== authRevision) return;
      const user = sessionData.session?.user;
      requestEpoch.current += 1;
      activeUserId.current = null;
      setData(null);
      if (!user) { window.location.replace(withBase('/admin/login/')); return; }
      if (user.is_anonymous) { setState('denied'); return; }
      activeUserId.current = user.id;
      setState('loading');
      void load(user.id);
      } catch {
        if (!mounted || revision !== authRevision) return;
        requestEpoch.current += 1;
        activeUserId.current = null;
        setData(null);
        setRefreshing(false);
        setState('error');
      }
    };
    void sync();
    const { data: listener } = onAdminAuthChange((_event, session) => {
      if (!mounted) return;
      authRevision += 1;
      requestEpoch.current += 1;
      activeUserId.current = null;
      setData(null);
      const user = session?.user;
      if (!user) { window.location.replace(withBase('/admin/login/')); return; }
      if (user.is_anonymous) { setState('denied'); return; }
      activeUserId.current = user.id;
      setState('loading');
      void load(user.id);
    });
    return () => { mounted = false; authRevision += 1; requestEpoch.current += 1; activeUserId.current = null; listener.subscription.unsubscribe(); };
  }, [load]);

  async function signOut() {
    requestEpoch.current += 1;
    activeUserId.current = null;
    setData(null);
    setState('loading');
    await recordAdminSignOut();
    await signOutAdmin();
    window.location.replace(withBase('/admin/login/'));
  }

  if (state === 'loading') return <AdminLoading />;

  if (state === 'denied') return (
    <main className="admin-page"><section className="admin-state-card"><ShieldCheck size={30} /><h1>Admin access unavailable.</h1><p>This session is not authorized for the Admin Plane.</p><div><Link href={withBase('/')}>Back to website</Link><button type="button" onClick={() => void signOut()}>Sign out</button></div></section></main>
  );

  if (state === 'error' || !data) return (
    <main className="admin-page"><section className="admin-state-card"><h1>Unable to load dashboard.</h1><p>Admin authorization could not be verified right now.</p><button type="button" onClick={() => { const id = activeUserId.current; if (id) void load(id); else window.location.reload(); }}>Try again</button></section></main>
  );

  const cards = [
    { label: 'Total orders', value: data.summary.totalOrders, icon: PackageCheck },
    { label: 'Active orders', value: data.summary.activeOrders, icon: LayoutDashboard },
    { label: 'Custom requests', value: data.summary.customRequests, icon: FileText },
    { label: 'Bulk requests', value: data.summary.bulkRequests, icon: Boxes },
    { label: 'Pending approvals', value: data.summary.pendingApprovals, icon: ClipboardCheck },
  ];

  return (
    <div className="admin-app-shell">
      <aside className="admin-sidebar">
        <div className="admin-wordmark"><span>ESHANTVA</span><small>ADMIN</small></div>
        <AdminPhase3Nav active="dashboard"/>
        <div className="admin-coming"><small>OPERATIONS</small><p>Orders, Customers and Request operations are available. Later Admin modules remain unavailable.</p></div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <div><span className="admin-kicker">OPERATIONS</span><h1>Admin dashboard.</h1></div>
          <div className="admin-top-actions"><div className="admin-session-badge"><ShieldCheck size={16} /><span>{data.admin.displayName || 'Authorized user'}</span><b>{data.admin.role}</b></div><button type="button" onClick={() => { const id = activeUserId.current; if (id) void load(id); }} disabled={refreshing}><RefreshCw className={refreshing ? 'admin-spin' : ''} size={16} /> Refresh</button><button type="button" onClick={() => void signOut()}><LogOut size={16} /> Sign out</button></div>
        </header>

        <section className="admin-summary" aria-labelledby="admin-summary-heading">
          <div className="admin-section-head"><div><span className="admin-kicker">SUMMARY</span><h2 id="admin-summary-heading">Operational snapshot</h2></div><p>Authoritative server-side counts only.</p></div>
          <div className="admin-metric-grid">{cards.map(({ label, value, icon: Icon }) => <article key={label}><Icon size={20} /><span>{label}</span><strong>{value}</strong></article>)}</div>
        </section>

        <section className="admin-attention" aria-labelledby="admin-attention-heading">
          <div><span className="admin-kicker">ATTENTION</span><h2 id="admin-attention-heading">Customer approvals</h2><p>{data.summary.pendingApprovals > 0 ? `${data.summary.pendingApprovals} customer approval request${data.summary.pendingApprovals === 1 ? '' : 's'} currently pending.` : 'No customer approval requests are currently pending.'}</p></div>
          <ClipboardCheck size={28} />
        </section>

        <AdminMonthlyOperationalPanel role={data.admin.role}/>

        <section className="admin-phase-note" aria-labelledby="admin-phase-heading">
          <div><span className="admin-kicker">OPERATIONS</span><h2 id="admin-phase-heading">Operational modules</h2><p>Open a real server-authorized module. No placeholder links are shown.</p></div>
          <div className="admin-dashboard-actions"><Link className="admin-dashboard-link" href={withBase('/admin/orders/')}>View orders</Link><Link className="admin-dashboard-link" href={withBase('/admin/customers/')}>Customers</Link><Link className="admin-dashboard-link" href={withBase('/admin/requests/custom/')}>Custom Requests</Link><Link className="admin-dashboard-link" href={withBase('/admin/requests/bulk/')}>Bulk Requests</Link></div>
        </section>
      </main>
    </div>
  );
}
