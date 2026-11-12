'use client';

import { CustomerProfileEditor, RequestConversation } from '@/components/website-features/CustomerWebsitePanels';
import { retailVisibility } from '@/config/retailVisibility';


import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Boxes,
  CircleUserRound,
  Clock3,
  FilePenLine,
  LogOut,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { siteConfig } from '@/config/site';
import { getAccountSession, isAnonymousUser, onAccountAuthChange, signOutAccount } from '@/lib/accountAuth';
import { loadCustomerDashboard } from '@/lib/dashboardApi';
import type { CustomerDashboardData, DashboardOrder, DashboardRequest } from '@/types/dashboard';

const emptyData: CustomerDashboardData | null = null;

function withBase(path: string) {
  return `${siteConfig.basePath}${path}`;
}

function formatMoney(paise: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(paise / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function toneForStatus(status: string) {
  if (['delivered', 'confirmed', 'paid', 'accepted', 'converted_to_order'].includes(status.toLowerCase())) return 'success';
  if (['cancelled', 'refunded', 'declined', 'rejected'].includes(status.toLowerCase())) return 'muted';
  return 'active';
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-shell shell" aria-live="polite" aria-busy="true">
      <h1 className="sr-only">Customer dashboard.</h1>
      <div className="dashboard-skeleton dashboard-skeleton-title" />
      <div className="dashboard-skeleton-grid"><i /><i /><i /></div>
      <div className="dashboard-skeleton dashboard-skeleton-panel" />
      <span className="sr-only">Loading account dashboard.</span>
    </div>
  );
}

function EmptyCard({ title, copy, href, action }: { title: string; copy: string; href: string; action: string }) {
  return (
    <div className="dashboard-empty">
      <span className="dashboard-empty-mark" aria-hidden="true" />
      <strong>{title}</strong>
      <p>{copy}</p>
      <Link href={href}>{action} <ArrowRight size={14} /></Link>
    </div>
  );
}

function RequestList({ items, emptyTitle, emptyCopy, emptyHref, emptyAction }: { items: DashboardRequest[]; emptyTitle: string; emptyCopy: string; emptyHref: string; emptyAction: string }) {
  if (items.length === 0) return <EmptyCard title={emptyTitle} copy={emptyCopy} href={emptyHref} action={emptyAction} />;
  return (
    <div className="dashboard-compact-list">
      {items.map((item) => (
        <article key={item.reference}>
          <div><strong>{item.reference}</strong><span>{formatDate(item.submittedAt)}</span></div>
          <span className={`dashboard-status is-${toneForStatus(item.status)}`}>{item.statusLabel}</span>
        </article>
      ))}
    </div>
  );
}

function LatestOrder({ order }: { order: DashboardOrder }) {
  const futureHref = `/account/orders/${encodeURIComponent(order.reference)}/`;
  return (
    <article className="dashboard-latest-order">
      <div className="dashboard-order-head">
        <div><small>LATEST ORDER</small><strong>{order.reference}</strong></div>
        <span className={`dashboard-status is-${toneForStatus(order.status)}`}>{order.statusLabel}</span>
      </div>
      <dl>
        <div><dt>Placed</dt><dd>{formatDate(order.createdAt)}</dd></div>
        <div><dt>Payment</dt><dd>{order.paymentLabel}</dd></div>
        <div><dt>Total</dt><dd>{formatMoney(order.totalPaise)}</dd></div>
        <div><dt>Delivery</dt><dd>{order.deliveryLabel}</dd></div>
      </dl>
      <a className="dashboard-order-link" href={withBase(futureHref)}>View order <ArrowRight size={15} /></a>
    </article>
  );
}

export function CustomerDashboardClient() {
  const [authState, setAuthState] = useState<'loading' | 'signed_out' | 'anonymous' | 'permanent' | 'error'>('loading');
  const [data, setData] = useState<CustomerDashboardData | null>(emptyData);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  const requestEpoch = useRef(0);
  const activeUserId = useRef<string | null>(null);

  const refresh = useCallback(async (expectedUserId?: string) => {
    const userId = expectedUserId ?? activeUserId.current;
    if (!userId) return;
    const epoch = ++requestEpoch.current;
    setLoadingData(true);
    setError('');
    try {
      const next = await loadCustomerDashboard();
      if (epoch !== requestEpoch.current || activeUserId.current !== userId) return;
      setData(next);
    } catch {
      if (epoch !== requestEpoch.current || activeUserId.current !== userId) return;
      setData(null);
      setError('Unable to load your account activity.');
    } finally {
      if (epoch === requestEpoch.current && activeUserId.current === userId) setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let authRevision = 0;
    const sync = async () => {
      const syncRevision = authRevision;
      try {
      const { data: sessionData, error: sessionError } = await getAccountSession();
      if (sessionError) throw sessionError;
      if (!active || syncRevision !== authRevision) return;
      const user = sessionData.session?.user;
      requestEpoch.current += 1;
      activeUserId.current = null;
      setData(null);
      setError('');
      setLoadingData(false);
      if (!user) {
        setAuthState('signed_out');
        window.location.replace(withBase('/account/'));
        return;
      }
      if (isAnonymousUser(user)) {
        setAuthState('anonymous');
        return;
      }
      activeUserId.current = user.id;
      setAuthState('permanent');
      void refresh(user.id);
      } catch {
        if (!active || syncRevision !== authRevision) return;
        requestEpoch.current += 1;
        activeUserId.current = null;
        setData(null);
        setLoadingData(false);
        setError('Account session could not be checked. Please try again.');
        setAuthState('error');
      }
    };
    void sync();
    const { data: listener } = onAccountAuthChange((_event, session) => {
      if (!active) return;
      authRevision += 1;
      const user = session?.user;
      requestEpoch.current += 1;
      activeUserId.current = null;
      setData(null);
      setError('');
      setLoadingData(false);
      if (!user) {
        setAuthState('signed_out');
        window.location.replace(withBase('/account/'));
      } else if (isAnonymousUser(user)) {
        setAuthState('anonymous');
      } else {
        activeUserId.current = user.id;
        setAuthState('permanent');
        void refresh(user.id);
      }
    });
    return () => {
      active = false;
      authRevision += 1;
      requestEpoch.current += 1;
      activeUserId.current = null;
      listener.subscription.unsubscribe();
    };
  }, [refresh]);

  async function signOut() {
    requestEpoch.current += 1;
    activeUserId.current = null;
    setData(null);
    setError('');
    setLoadingData(false);
    setAuthState('loading');
    await signOutAccount();
    window.location.replace(withBase('/account/'));
  }

  if (authState === 'loading' || authState === 'signed_out') return <DashboardSkeleton />;

  if (authState === 'error') return (
    <section className="dashboard-shell dashboard-access-shell shell">
      <h1>Customer dashboard.</h1>
      <div className="dashboard-error" role="alert"><span>{error}</span><button type="button" onClick={() => window.location.reload()}>Try again</button></div>
    </section>
  );

  if (authState === 'anonymous') {
    return (
      <section className="dashboard-shell dashboard-access-shell shell">
        <span className="section-kicker">ACCOUNT REQUIRED</span>
        <h1>Customer dashboard.</h1>
        <div className="dashboard-access-card">
          <CircleUserRound size={30} />
          <div><strong>Complete account access.</strong><p>This browser currently has a guest session. The permanent customer dashboard opens after account access is completed.</p></div>
          <Link className="button button-primary" href="/account">Account access</Link>
        </div>
      </section>
    );
  }

  if (loadingData && !data) return <DashboardSkeleton />;

  return (
    <div className="dashboard-shell shell">
      <header className="dashboard-hero">
        <div><span className="section-kicker">CUSTOMER ACCOUNT</span><h1>Customer dashboard.</h1><p>Orders, requests and account activity in one concise workspace.</p></div>
        <div className="dashboard-hero-actions"><button type="button" onClick={() => void refresh()} disabled={loadingData}><RefreshCw size={16} /> Refresh</button><button type="button" onClick={() => void signOut()}><LogOut size={16} /> Sign out</button></div>
      </header>

      {error ? <div className="dashboard-error" role="alert"><strong>Unable to load your account activity.</strong><span>Try again.</span><button type="button" onClick={() => void refresh()}>Try again</button></div> : null}

      {data ? <>
        <section className="dashboard-account-card" aria-labelledby="dashboard-account-heading">
          <div><CircleUserRound size={24} /><span><small>ACCOUNT</small><strong id="dashboard-account-heading">{data.account.displayName || 'Customer account'}</strong></span></div>
          <div><span>{data.account.email}</span><b>{data.account.statusLabel}</b></div>
        </section>

        <CustomerProfileEditor onSaved={displayName=>setData(current=>current?{...current,account:{...current.account,displayName}}:current)}/>
        <RequestConversation onChanged={()=>void refresh()}/>
        <section className="dashboard-metrics" aria-label="Account overview">
          <article><PackageCheck size={21} /><span>Orders</span><strong>{data.orders.total}</strong><small>{data.orders.active} active</small></article>
          <article><FilePenLine size={21} /><span>Custom requests</span><strong>{data.customRequests.total}</strong><small>{data.customRequests.recent.length > 0 ? 'Recent activity available' : 'No submitted requests'}</small></article>
          <article><Boxes size={21} /><span>Bulk requests</span><strong>{data.bulkRequests.total}</strong><small>{data.bulkRequests.recent.length > 0 ? 'Recent activity available' : 'No submitted requests'}</small></article>
        </section>

        <div className="dashboard-primary-grid">
          <section className="dashboard-panel" aria-labelledby="dashboard-orders-heading">
            <div className="dashboard-panel-head"><div><span className="section-kicker">ORDERS</span><h2 id="dashboard-orders-heading">Orders overview</h2></div><ShoppingBag size={22} /></div>
            {data.orders.latest ? <LatestOrder order={data.orders.latest} /> : <EmptyCard title="No orders yet." copy={retailVisibility.isInternal ? "Orders placed through the verified Shop checkout will appear here." : "Your confirmed orders will appear here when available. For a new requirement, start with a Custom Order."} href={retailVisibility.isInternal ? "/shop" : "/custom-order"} action={retailVisibility.isInternal ? "Browse Shop" : "Start a Custom Order"} />}
          </section>

          <section className="dashboard-panel dashboard-activity-panel" aria-labelledby="dashboard-activity-heading">
            <div className="dashboard-panel-head"><div><span className="section-kicker">RECENT ACTIVITY</span><h2 id="dashboard-activity-heading">Latest account activity</h2></div><Clock3 size={22} /></div>
            {data.activity.length > 0 ? <div className="dashboard-activity-list">{data.activity.map((item) => <article key={item.id}><span className="dashboard-activity-dot" aria-hidden="true" /><div><strong>{item.label}</strong><span>{item.reference}</span></div><time dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time></article>)}</div> : <div className="dashboard-empty compact"><strong>No recent activity.</strong><p>Customer-visible account activity will appear here as it occurs.</p></div>}
          </section>
        </div>

        <section className="dashboard-request-grid" aria-label="Requests overview">
          <article className="dashboard-panel"><div className="dashboard-panel-head"><div><span className="section-kicker">CUSTOM</span><h2>Custom requests</h2></div><FilePenLine size={22} /></div><RequestList items={data.customRequests.recent} emptyTitle="No Custom requests." emptyCopy="Submit your design, reference files or technical requirements for a Custom Order." emptyHref="/custom-order" emptyAction="Custom Order" /></article>
          <article className="dashboard-panel"><div className="dashboard-panel-head"><div><span className="section-kicker">BULK</span><h2>Bulk requests</h2></div><Boxes size={22} /></div><RequestList items={data.bulkRequests.recent} emptyTitle="No Bulk requests." emptyCopy="Use the Bulk Order route for quantity, repeat or organization requirements." emptyHref="/bulk-order" emptyAction="Bulk Order" /></article>
        </section>

        <section className="dashboard-quick" aria-labelledby="dashboard-quick-heading">
          <div><span className="section-kicker">QUICK ACTIONS</span><h2 id="dashboard-quick-heading">Go where you need next.</h2></div>
          <nav aria-label="Dashboard quick actions">
            {retailVisibility.isInternal && <Link href="/shop"><ShoppingBag size={18} /><span>Shop</span><ArrowRight size={15} /></Link>}
            <Link href="/custom-order"><FilePenLine size={18} /><span>Custom Order</span><ArrowRight size={15} /></Link>
            <Link href="/bulk-order"><Boxes size={18} /><span>Bulk Order</span><ArrowRight size={15} /></Link>
            {retailVisibility.isInternal && <Link href="/cart"><Sparkles size={18} /><span>Cart</span><ArrowRight size={15} /></Link>}
            <Link href="/account"><CircleUserRound size={18} /><span>Account</span><ArrowRight size={15} /></Link>
          </nav>
        </section>
      </> : null}
    </div>
  );
}
