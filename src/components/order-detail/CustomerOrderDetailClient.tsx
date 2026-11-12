'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import {
  ArrowLeft,
  ArrowRight,
  Box,
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  CreditCard,
  LogOut,
  MapPin,
  PackageCheck,
  RefreshCw,
  ReceiptText,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { siteConfig } from '@/config/site';
import { retailVisibility } from '@/config/retailVisibility';
import { getAccountSession, isAnonymousUser, onAccountAuthChange, signOutAccount } from '@/lib/accountAuth';
import { extractOrderReferenceFromPath, isOrderRequestCurrent, isPublicOrderReference, loadCustomerOrderDetail } from '@/lib/orderDetailApi';
import type { CustomerOrderDetail } from '@/types/orderDetail';

function withBase(path: string) {
  return `${siteConfig.basePath}${path}`;
}

function formatMoney(paise: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(paise / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

function toneForStatus(status: string) {
  const normalized = status.toLowerCase();
  if (['delivered', 'confirmed', 'paid', 'ready_for_pickup'].includes(normalized)) return 'success';
  if (['cancelled', 'refunded', 'failed'].includes(normalized)) return 'muted';
  return 'active';
}

function OrderDetailSkeleton() {
  return (
    <div className="order-detail-shell shell" aria-busy="true" aria-live="polite">
      <h1 className="sr-only">Order details.</h1>
      <div className="order-detail-skeleton is-heading" />
      <div className="order-detail-skeleton-grid"><i /><i /></div>
      <div className="order-detail-skeleton is-panel" />
      <span className="sr-only">Loading order details.</span>
    </div>
  );
}

function OrderUnavailable() {
  return (
    <section className="order-detail-shell order-detail-access shell">
      <span className="section-kicker">ORDER</span>
      <h1>Order unavailable.</h1>
      <div className="order-detail-access-card">
        <ReceiptText size={30} />
        <div>
          <strong>This order cannot be opened.</strong>
          <p>Return to your dashboard and choose an order available to this account.</p>
        </div>
        <Link className="button button-primary" href="/account/dashboard">Back to Dashboard</Link>
      </div>
    </section>
  );
}

function AnonymousAccess() {
  return (
    <section className="order-detail-shell order-detail-access shell">
      <span className="section-kicker">ACCOUNT REQUIRED</span>
      <h1>Order details.</h1>
      <div className="order-detail-access-card">
        <CircleUserRound size={30} />
        <div>
          <strong>Complete account access.</strong>
          <p>Permanent account access is required before customer order details can be opened.</p>
        </div>
        <Link className="button button-primary" href="/account">Account access</Link>
      </div>
    </section>
  );
}

function DeliverySummary({ order }: { order: CustomerOrderDetail }) {
  if (order.deliveryMethod === 'pickup') {
    return (
      <div className="order-detail-delivery-copy">
        <PackageCheck size={24} />
        <div><strong>{order.deliveryLabel}</strong><p>Pickup is the confirmed delivery method for this order.</p></div>
      </div>
    );
  }

  if (!order.delivery) {
    return (
      <div className="order-detail-delivery-copy">
        <Truck size={24} />
        <div><strong>{order.deliveryLabel}</strong><p>Delivery details are not available in this customer view.</p></div>
      </div>
    );
  }

  const address = order.delivery;
  return (
    <div className="order-detail-delivery-copy">
      <MapPin size={24} />
      <address>
        <strong>{address.recipientName}</strong>
        <span>{address.addressLine1}</span>
        {address.addressLine2 ? <span>{address.addressLine2}</span> : null}
        <span>{address.locality}, {address.city}</span>
        <span>{address.district}, {address.state} {address.pinCode}</span>
        <span>{address.country}</span>
      </address>
    </div>
  );
}

export function CustomerOrderDetailClient() {
  const [authState, setAuthState] = useState<'loading' | 'signed_out' | 'anonymous' | 'permanent'>('loading');
  const [reference, setReference] = useState<string | null>(null);
  const [order, setOrder] = useState<CustomerOrderDetail | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState('');
  const requestEpoch = useRef(0);
  const activeUserId = useRef<string | null>(null);
  const activeReference = useRef<string | null>(null);

  const invalidateRequest = useCallback(() => {
    requestEpoch.current += 1;
    activeReference.current = null;
    setOrder(null);
    setUnavailable(false);
    setError('');
    setLoadingOrder(false);
  }, []);

  const readReference = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return extractOrderReferenceFromPath(window.location.pathname, siteConfig.basePath);
  }, []);

  const loadOrder = useCallback(async (expectedUserId: string, expectedReference: string) => {
    const epoch = ++requestEpoch.current;
    const expectedRequest = { epoch, userId: expectedUserId, reference: expectedReference };
    activeReference.current = expectedReference;
    setOrder(null);
    setUnavailable(false);
    setError('');
    setLoadingOrder(true);

    const requestIsCurrent = () => isOrderRequestCurrent(
      { epoch: requestEpoch.current, userId: activeUserId.current, reference: activeReference.current },
      expectedRequest,
    );

    if (!isPublicOrderReference(expectedReference)) {
      if (requestIsCurrent()) {
        setUnavailable(true);
        setLoadingOrder(false);
      }
      return;
    }

    try {
      const result = await loadCustomerOrderDetail(expectedReference, expectedUserId);
      if (!requestIsCurrent()) return;
      if (result.kind === 'unavailable') {
        setUnavailable(true);
        setOrder(null);
      } else {
        setOrder(result.data);
        setUnavailable(false);
      }
    } catch {
      if (!requestIsCurrent()) return;
      setOrder(null);
      setError('Unable to load this order right now.');
    } finally {
      if (requestIsCurrent()) setLoadingOrder(false);
    }
  }, []);

  const syncForUser = useCallback((user: User | null | undefined) => {
    invalidateRequest();
    activeUserId.current = null;
    if (!user) {
      setAuthState('signed_out');
      window.location.replace(withBase('/account/'));
      return;
    }
    if (isAnonymousUser(user)) {
      setAuthState('anonymous');
      return;
    }
    const nextReference = readReference();
    setReference(nextReference);
    activeUserId.current = user.id;
    setAuthState('permanent');
    if (nextReference) void loadOrder(user.id, nextReference);
    else setUnavailable(true);
  }, [invalidateRequest, loadOrder, readReference]);

  useEffect(() => {
    let active = true;
    let authRevision = 0;
    const sync = async () => {
      const initialRevision = authRevision;
      const { data } = await getAccountSession();
      if (!active || initialRevision !== authRevision) return;
      syncForUser(data.session?.user);
    };
    void sync();

    const { data: listener } = onAccountAuthChange((_event, session) => {
      authRevision += 1;
      syncForUser(session?.user);
    });

    const onPopState = () => {
      if (!activeUserId.current) return;
      const nextReference = readReference();
      requestEpoch.current += 1;
      activeReference.current = null;
      setOrder(null);
      setUnavailable(false);
      setError('');
      setLoadingOrder(false);
      setReference(nextReference);
      if (nextReference) void loadOrder(activeUserId.current, nextReference);
      else setUnavailable(true);
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      active = false;
      authRevision += 1;
      requestEpoch.current += 1;
      activeUserId.current = null;
      activeReference.current = null;
      listener.subscription.unsubscribe();
      window.removeEventListener('popstate', onPopState);
    };
  }, [loadOrder, readReference, syncForUser]);

  async function signOut() {
    requestEpoch.current += 1;
    activeUserId.current = null;
    activeReference.current = null;
    setOrder(null);
    setError('');
    setUnavailable(false);
    setLoadingOrder(false);
    setAuthState('loading');
    await signOutAccount();
    window.location.replace(withBase('/account/'));
  }

  if (authState === 'loading' || authState === 'signed_out') return <OrderDetailSkeleton />;
  if (authState === 'anonymous') return <AnonymousAccess />;
  if (loadingOrder && !order) return <OrderDetailSkeleton />;
  if (unavailable) return <OrderUnavailable />;

  if (error) {
    return (
      <section className="order-detail-shell order-detail-access shell">
        <span className="section-kicker">ORDER</span>
        <h1>Order details.</h1>
        <div className="order-detail-error" role="alert">
          <strong>{error}</strong>
          <span>Try again from your dashboard.</span>
          <div><button type="button" onClick={() => reference && activeUserId.current ? void loadOrder(activeUserId.current, reference) : undefined}><RefreshCw size={15} /> Try again</button><Link href="/account/dashboard">Back to Dashboard</Link></div>
        </div>
      </section>
    );
  }

  if (!order) return <OrderDetailSkeleton />;

  return (
    <div className="order-detail-shell shell">
      <div className="order-detail-topbar">
        <Link href="/account/dashboard"><ArrowLeft size={16} /> Back to Dashboard</Link>
        <button type="button" onClick={() => void signOut()}><LogOut size={16} /> Sign out</button>
      </div>

      <header className="order-detail-hero">
        <div>
          <span className="section-kicker">ORDER</span>
          <h1>{order.reference}</h1>
          <p>Placed {formatDate(order.createdAt)}</p>
        </div>
        <span className={`dashboard-status is-${toneForStatus(order.status)}`}>{order.statusLabel}</span>
      </header>

      <section className="order-detail-summary" aria-label="Order summary">
        <article><CalendarDays size={20} /><span>Placed</span><strong>{formatDate(order.createdAt)}</strong></article>
        <article><CreditCard size={20} /><span>Payment</span><strong>{order.paymentLabel}</strong></article>
        <article><Truck size={20} /><span>Delivery</span><strong>{order.deliveryLabel}</strong></article>
        <article><ReceiptText size={20} /><span>Total</span><strong>{formatMoney(order.totalPaise, order.currency)}</strong></article>
      </section>

      <div className="order-detail-main-grid">
        <section className="order-detail-panel order-detail-timeline" aria-labelledby="order-timeline-heading">
          <div className="order-detail-panel-head"><div><span className="section-kicker">TRACKING</span><h2 id="order-timeline-heading">Order timeline</h2></div><PackageCheck size={22} /></div>
          <ol>
            {order.timeline.map((item, index) => (
              <li key={item.key} className={index === order.timeline.length - 1 ? 'is-current' : undefined}>
                <span aria-hidden="true"><CheckCircle2 size={16} /></span>
                <div><strong>{item.label}</strong><time dateTime={item.occurredAt}>{formatDateTime(item.occurredAt)}</time></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="order-detail-panel order-detail-money" aria-labelledby="order-payment-heading">
          <div className="order-detail-panel-head"><div><span className="section-kicker">PAYMENT</span><h2 id="order-payment-heading">Payment summary</h2></div><CreditCard size={22} /></div>
          <dl>
            <div><dt>Items</dt><dd>{formatMoney(order.itemSubtotalPaise, order.currency)}</dd></div>
            <div><dt>Delivery</dt><dd>{formatMoney(order.shippingPaise, order.currency)}</dd></div>
            <div><dt>{order.taxLabel || 'Tax'}</dt><dd>{formatMoney(order.taxAmountPaise, order.currency)}</dd></div>
            <div className="is-total"><dt>Total</dt><dd>{formatMoney(order.totalPaise, order.currency)}</dd></div>
          </dl>
          <div className="order-detail-payment-state"><span className={`dashboard-status is-${toneForStatus(order.paymentStatus)}`}>{order.paymentLabel}</span>{order.paidAt ? <time dateTime={order.paidAt}>Confirmed {formatDateTime(order.paidAt)}</time> : null}</div>
        </section>
      </div>

      <section className="order-detail-panel order-detail-items" aria-labelledby="order-items-heading">
        <div className="order-detail-panel-head"><div><span className="section-kicker">ITEMS</span><h2 id="order-items-heading">What you ordered</h2></div><Box size={22} /></div>
        <div className="order-detail-item-list">
          {order.items.map((item, index) => (
            <article key={`${item.title}-${index}`}>
              <div className="order-detail-item-title"><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.title}</strong><small>Qty {item.quantity}</small></div><b>{formatMoney(item.lineSubtotalPaise, order.currency)}</b></div>
              {item.selectedOptions.length > 0 ? <dl>{item.selectedOptions.map((option) => <div key={`${option.label}-${option.value}`}><dt>{option.label}</dt><dd>{option.value}</dd></div>)}</dl> : <p className="order-detail-no-options">No additional configuration recorded.</p>}
              <div className="order-detail-unit"><span>Unit amount</span><strong>{formatMoney(item.unitPricePaise, order.currency)}</strong></div>
            </article>
          ))}
        </div>
      </section>

      <section className="order-detail-panel order-detail-delivery" aria-labelledby="order-delivery-heading">
        <div className="order-detail-panel-head"><div><span className="section-kicker">DELIVERY</span><h2 id="order-delivery-heading">Delivery summary</h2></div><MapPin size={22} /></div>
        <DeliverySummary order={order} />
      </section>

      <section className="order-detail-actions" aria-label="Order actions">
        <Link href="/account/dashboard"><ArrowLeft size={16} /> Back to Dashboard</Link>
        <Link href={withBase(`/account/orders/${encodeURIComponent(order.reference)}/files/`)}>Files & approvals <ArrowRight size={15} /></Link>
        {retailVisibility.isInternal ? <Link href="/shop"><ShoppingBag size={17} /> Continue Shopping <ArrowRight size={15} /></Link> : <Link href="/custom-order"><ShoppingBag size={17} /> Start Custom Order <ArrowRight size={15} /></Link>}
      </section>
    </div>
  );
}
