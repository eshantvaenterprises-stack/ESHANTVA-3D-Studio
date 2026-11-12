'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, CreditCard, MapPin, PackageCheck, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clearCart, getCart, subscribeToCart, validateCart, type CartLine } from '@/lib/cart';
import { checkoutConfig, enabledCheckoutDeliveryMethods } from '@/config/checkout';
import { checkoutAddressSchema, checkoutContactSchema, type CheckoutAddress, type CheckoutContact, type CheckoutDeliveryMethod, type CheckoutReviewResponse, type CheckoutSubmission } from '@/types/checkout';
import { getCheckoutOrderStatus, prepareCheckout, reviewCheckout } from '@/lib/checkoutApi';

const emptyCart: CartLine[] = [];
const emptyContact: CheckoutContact = { fullName: '', email: '', mobile: '', companyName: '' };
const emptyAddress: CheckoutAddress = { recipientName: '', mobile: '', addressLine1: '', addressLine2: '', locality: '', city: '', district: '', state: '', pinCode: '', country: 'India' };
type Feedback = { type: 'error' | 'info' | 'success'; message: string } | null;

function formatPaise(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: value % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(value / 100);
}
function makeIntent(lines: CartLine[]) {
  return lines.map((line) => ({ productId: line.productId, slug: line.slug, configurationSignature: line.configurationSignature, quantity: line.quantity, selectedOptions: line.selectedOptions.map((option) => ({ optionId: option.optionId, valueId: option.valueId, valueLabel: option.valueLabel })) }));
}
function safeUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function idempotencyKeyFor(fingerprint: string) {
  if (typeof window === 'undefined') return safeUuid();
  const key = 'eshantva-checkout-idempotency-v1';
  try {
    const existing = JSON.parse(sessionStorage.getItem(key) || 'null') as { fingerprint?: string; value?: string } | null;
    if (existing?.fingerprint === fingerprint && existing.value) return existing.value;
  } catch {}
  const value = safeUuid();
  sessionStorage.setItem(key, JSON.stringify({ fingerprint, value }));
  return value;
}
function clearIdempotencyKey() { if (typeof window !== 'undefined') sessionStorage.removeItem('eshantva-checkout-idempotency-v1'); }

export function CheckoutPageClient() {
  const lines = useSyncExternalStore(subscribeToCart, getCart, () => emptyCart);
  const reviews = useMemo(() => validateCart(lines), [lines]);
  const invalidReviews = reviews.filter((review) => review.needsReview);
  const [contact, setContact] = useState<CheckoutContact>(emptyContact);
  const [deliveryMethod, setDeliveryMethod] = useState<CheckoutDeliveryMethod>(enabledCheckoutDeliveryMethods[0] ?? 'pickup');
  const [address, setAddress] = useState<CheckoutAddress>(emptyAddress);
  const [review, setReview] = useState<CheckoutReviewResponse | null>(null);
  const [submitting, setSubmitting] = useState<'idle' | 'review' | 'payment' | 'status'>('idle');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<string | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const addressRequired = deliveryMethod !== 'pickup';
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const orderReference = new URLSearchParams(window.location.search).get('order');
    if (!orderReference || !/^ESHA-[0-9]{4}-[A-Z0-9]{8}$/.test(orderReference)) return;
    let cancelled = false;
    const statusFrame = requestAnimationFrame(() => {
      if (!cancelled) setSubmitting('status');
    });
    getCheckoutOrderStatus(orderReference).then((status) => {
      if (cancelled) return;
      if (status.paid) {
        clearCart(); clearIdempotencyKey(); setConfirmedOrder(status.orderReference);
        setFeedback({ type: 'success', message: 'Payment is confirmed and your order has been recorded.' });
      } else setFeedback({ type: 'info', message: 'Your order exists, but payment has not been confirmed yet. No duplicate order will be created if you retry the same checkout.' });
    }).catch(() => { if (!cancelled) setFeedback({ type: 'error', message: 'We could not verify the order status. Please try again.' }); }).finally(() => { if (!cancelled) setSubmitting('idle'); });
    return () => { cancelled = true; cancelAnimationFrame(statusFrame); };
  }, []);
  useEffect(() => { if (feedback) requestAnimationFrame(() => feedbackRef.current?.focus()); }, [feedback]);

  function updateContact<K extends keyof CheckoutContact>(key: K, value: CheckoutContact[K]) { setContact((current) => ({ ...current, [key]: value })); setReview(null); }
  function updateAddress<K extends keyof CheckoutAddress>(key: K, value: CheckoutAddress[K]) { setAddress((current) => ({ ...current, [key]: value })); setReview(null); }
  function changeDelivery(value: CheckoutDeliveryMethod) { setDeliveryMethod(value); setReview(null); }
  function buildSubmission(withIdempotency: boolean): CheckoutSubmission | Omit<CheckoutSubmission, 'idempotencyKey'> {
    const parsedContact = checkoutContactSchema.parse(contact);
    const parsedAddress = addressRequired ? checkoutAddressSchema.parse(address) : null;
    const base = { contact: parsedContact, deliveryMethod, address: parsedAddress, cart: makeIntent(lines) };
    if (!withIdempotency) return base;
    return { ...base, idempotencyKey: idempotencyKeyFor(JSON.stringify(base)) };
  }
  async function onReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFeedback(null);
    if (lines.length === 0 || invalidReviews.length > 0) return;
    if (!enabledCheckoutDeliveryMethods.includes(deliveryMethod)) { setFeedback({ type: 'error', message: 'Choose an available delivery method.' }); return; }
    setSubmitting('review');
    try {
      const resolved = await reviewCheckout(buildSubmission(false) as Omit<CheckoutSubmission, 'idempotencyKey'>);
      setReview(resolved); setFeedback({ type: 'info', message: 'Order details were revalidated. Review the confirmed amounts before continuing to payment.' });
    } catch (error) {
      setReview(null); setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'We could not validate this checkout. Please review your details and try again.' });
    } finally { setSubmitting('idle'); }
  }
  async function onPayment() {
    if (!review || submitting !== 'idle') return;
    setFeedback(null); setSubmitting('payment');
    try {
      const prepared = await prepareCheckout(buildSubmission(true) as CheckoutSubmission);
      if (!prepared.payment.redirectUrl || prepared.payment.mode !== 'redirect') throw new Error('Secure payment could not be started. Please try again.');
      window.location.assign(prepared.payment.redirectUrl);
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'We could not continue to payment. Please try again.' }); setSubmitting('idle');
    }
  }

  if (confirmedOrder) return <section className="ck-confirmation" aria-labelledby="ck-confirmation-title"><CheckCircle2 size={38} /><span className="section-kicker">ORDER CONFIRMED</span><h2 id="ck-confirmation-title">Payment confirmed.</h2><p>Your order reference is <code>{confirmedOrder}</code>. Keep this reference for future support and order updates.</p><div className="ck-empty-actions"><Link className="button button-primary" href="/shop">Continue Shopping</Link><Link className="text-link" href="/contact">Contact ESHANTVA</Link></div></section>;
  if (lines.length === 0) return <section className="ck-empty" aria-labelledby="ck-empty-title"><ShoppingBag size={38} /><h2 id="ck-empty-title">Your cart is empty.</h2><p>Add an available product before starting checkout.</p><div className="ck-empty-actions"><Link className="button button-primary" href="/shop">Browse Shop</Link><Link className="text-link" href="/cart">Back to Cart</Link></div></section>;
  if (invalidReviews.length > 0) return <section className="ck-blocked" aria-labelledby="ck-blocked-title"><AlertCircle size={34} /><span className="section-kicker">REVIEW REQUIRED</span><h2 id="ck-blocked-title">Your cart needs attention before checkout.</h2><p>{invalidReviews.length} cart {invalidReviews.length === 1 ? 'item needs' : 'items need'} review because product availability, configuration or current pricing no longer matches the saved cart intent.</p><Link className="button button-primary" href="/cart"><ArrowLeft size={15} /> Review Cart</Link></section>;

  return <>
    {feedback && <div ref={feedbackRef} tabIndex={-1} className={`ck-feedback is-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.type === 'success' ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}<p>{feedback.message}</p></div>}
    <div className="ck-layout">
      <form className="ck-form" onSubmit={onReview}>
        <section className="ck-card" aria-labelledby="ck-contact-title"><div className="ck-card-heading"><span>01</span><div><small>CONTACT</small><h2 id="ck-contact-title">Who should we contact?</h2></div></div><div className="ck-two-cols"><label>Full name <span>*</span><input autoComplete="name" required minLength={2} maxLength={checkoutConfig.limits.fullName} value={contact.fullName} onChange={(e) => updateContact('fullName', e.target.value)} /></label><label>Email <span>*</span><input type="email" autoComplete="email" required maxLength={checkoutConfig.limits.email} value={contact.email} onChange={(e) => updateContact('email', e.target.value)} /></label></div><div className="ck-two-cols"><label>Mobile number <span>*</span><input type="tel" autoComplete="tel" required maxLength={checkoutConfig.limits.mobile} value={contact.mobile} onChange={(e) => updateContact('mobile', e.target.value)} /></label><label>Company / business <em>Optional</em><input autoComplete="organization" maxLength={checkoutConfig.limits.companyName} value={contact.companyName ?? ''} onChange={(e) => updateContact('companyName', e.target.value)} /></label></div></section>
        <section className="ck-card" aria-labelledby="ck-delivery-title"><div className="ck-card-heading"><span>02</span><div><small>DELIVERY</small><h2 id="ck-delivery-title">How should the order reach you?</h2></div></div><fieldset className="ck-delivery-options"><legend className="sr-only">Delivery method</legend>{checkoutConfig.deliveryMethods.pickup.enabled && <DeliveryOption value="pickup" checked={deliveryMethod === 'pickup'} onChange={changeDelivery} icon={PackageCheck} label={checkoutConfig.deliveryMethods.pickup.label} description={checkoutConfig.deliveryMethods.pickup.description} />}{checkoutConfig.deliveryMethods.localDelivery.enabled && <DeliveryOption value="local_delivery" checked={deliveryMethod === 'local_delivery'} onChange={changeDelivery} icon={MapPin} label={checkoutConfig.deliveryMethods.localDelivery.label} description={checkoutConfig.deliveryMethods.localDelivery.description} />}{checkoutConfig.deliveryMethods.shipping.enabled && <DeliveryOption value="shipping" checked={deliveryMethod === 'shipping'} onChange={changeDelivery} icon={Truck} label={checkoutConfig.deliveryMethods.shipping.label} description={checkoutConfig.deliveryMethods.shipping.description} />}</fieldset>{addressRequired && <div className="ck-address-fields"><div className="ck-two-cols"><label>Recipient name <span>*</span><input required value={address.recipientName} onChange={(e) => updateAddress('recipientName', e.target.value)} /></label><label>Recipient mobile <span>*</span><input type="tel" required value={address.mobile} onChange={(e) => updateAddress('mobile', e.target.value)} /></label></div><label>Address line 1 <span>*</span><input required value={address.addressLine1} onChange={(e) => updateAddress('addressLine1', e.target.value)} /></label><label>Address line 2 <em>Optional</em><input value={address.addressLine2 ?? ''} onChange={(e) => updateAddress('addressLine2', e.target.value)} /></label><div className="ck-two-cols"><label>Locality / village / town <span>*</span><input required value={address.locality} onChange={(e) => updateAddress('locality', e.target.value)} /></label><label>City <span>*</span><input required value={address.city} onChange={(e) => updateAddress('city', e.target.value)} /></label></div><div className="ck-two-cols"><label>District <span>*</span><input required value={address.district} onChange={(e) => updateAddress('district', e.target.value)} /></label><label>State <span>*</span><input required value={address.state} onChange={(e) => updateAddress('state', e.target.value)} /></label></div><div className="ck-two-cols"><label>PIN code <span>*</span><input inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} required value={address.pinCode} onChange={(e) => updateAddress('pinCode', e.target.value.replace(/\D/g, '').slice(0, 6))} /></label><label>Country<input value="India" readOnly /></label></div></div>}</section>
        <section className="ck-card" aria-labelledby="ck-review-title"><div className="ck-card-heading"><span>03</span><div><small>ORDER REVIEW</small><h2 id="ck-review-title">Revalidate before payment.</h2></div></div><p className="ck-card-copy">ESHANTVA checks the current product, selected configuration, quantity, price, delivery amount and applicable tax on the server. Browser cart prices are not accepted as final order truth.</p><Button type="submit" disabled={submitting !== 'idle'}>{submitting === 'review' ? 'Validating Order…' : <>Review Order <ArrowRight size={15} /></>}</Button></section>
      </form>
      <aside className="ck-summary" aria-label="Checkout summary"><span className="section-kicker">ORDER SUMMARY</span><div className="ck-summary-meta"><span>Items</span><strong>{itemCount}</strong></div>{review ? <><div className="ck-authoritative"><ShieldCheck size={17} /><span>Server-validated order review</span></div><ul className="ck-review-lines">{review.items.map((item) => <li key={`${item.productId}:${item.selectedOptions.map((o) => `${o.optionId}:${o.valueId ?? o.valueLabel}`).join('|')}`}><div><strong>{item.title}</strong><small>Qty {item.quantity}</small></div><span>{formatPaise(item.lineSubtotalPaise)}</span></li>)}</ul><div className="ck-summary-row"><span>Item subtotal</span><strong>{formatPaise(review.totals.itemSubtotalPaise)}</strong></div><div className="ck-summary-row"><span>{review.deliveryLabel}</span><strong>{formatPaise(review.totals.shippingPaise)}</strong></div><div className="ck-summary-row"><span>{review.taxLabel}</span><strong>{formatPaise(review.totals.taxAmountPaise)}</strong></div><div className="ck-summary-total"><span>Total payable</span><strong>{formatPaise(review.totals.totalPaise)}</strong></div><div className="ck-payment-note"><CreditCard size={18} /><p>Standard Shop checkout uses full payment. Payment status is confirmed only by the secure order/payment service.</p></div><Button type="button" onClick={onPayment} disabled={submitting !== 'idle'}>{submitting === 'payment' ? 'Starting Secure Payment…' : <>Continue to Secure Payment <ArrowRight size={15} /></>}</Button><button className="ck-edit-details" type="button" onClick={() => { setReview(null); setFeedback(null); }}>Edit checkout details</button></> : <><p className="ck-summary-placeholder">Final delivery, applicable tax and total payable appear here only after server validation.</p><Link className="text-link" href="/cart"><ArrowLeft size={14} /> Back to Cart</Link></>}</aside>
    </div>
  </>;
}

function DeliveryOption({ value, checked, onChange, icon: Icon, label, description }: { value: CheckoutDeliveryMethod; checked: boolean; onChange: (value: CheckoutDeliveryMethod) => void; icon: typeof PackageCheck; label: string; description: string }) {
  return <label className={checked ? 'is-selected' : ''}><input type="radio" name="delivery-method" value={value} checked={checked} onChange={() => onChange(value)} /><Icon size={19} /><span><strong>{label}</strong><small>{description}</small></span></label>;
}
