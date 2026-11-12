'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { AlertCircle, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import {
  clearCart,
  getCart,
  getCartSubtotalPaise,
  paiseToRupees,
  removeCartLine,
  subscribeToCart,
  updateCartLineQuantity,
  validateCart,
  type CartLine,
} from '@/lib/cart';
import { formatCurrency } from '@/lib/currency';
import { withBasePath } from '@/config/site';

const emptyCart: CartLine[] = [];

export function CartPageClient() {
  const lines = useSyncExternalStore(subscribeToCart, getCart, () => emptyCart);
  const [announcement, setAnnouncement] = useState('');
  const reviews = useMemo(() => validateCart(lines), [lines]);
  const subtotalPaise = getCartSubtotalPaise(lines);
  const itemCount = lines.reduce((count, line) => count + line.quantity, 0);
  const hasReviewItems = reviews.some((review) => review.needsReview);

  function announce(message: string) {
    setAnnouncement(message);
    window.setTimeout(() => setAnnouncement(''), 1600);
  }

  if (lines.length === 0) {
    return (
      <>
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <div className="cart-empty">
        <ShoppingBag size={38} />
        <h2>Your cart is empty.</h2>
        <p>Browse available products, start a custom requirement, or plan a larger-quantity order.</p>
        <div className="cart-empty-actions">
          <Link className="button button-primary" href="/shop">Browse Shop</Link>
          <Link className="button button-secondary" href="/custom-order">Custom Order</Link>
          <Link className="text-link" href="/bulk-order">Bulk Order</Link>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <div className="cart-layout">
        <div className="cart-lines" aria-label="Cart items">
          <div className="cart-list-heading">
            <p>{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
            <button className="cart-clear" type="button" onClick={() => { clearCart(); announce('Cart cleared.'); }}>Clear cart</button>
          </div>
          {reviews.map(({ line, needsReview, reasons }) => (
            <article className={`cart-line${needsReview ? ' cart-line-review' : ''}`} key={line.id}>
              <Link href={`/shop/${line.slug}`} className="cart-line-image" aria-label={`Review ${line.name}`}>
                <Image src={withBasePath(line.image)} alt="" fill sizes="120px" />
              </Link>
              <div className="cart-line-main">
                <small>{line.productId}</small>
                <h2><Link href={`/shop/${line.slug}`}>{line.name}</Link></h2>
                {line.selectedOptions.length > 0 && (
                  <dl>
                    {line.selectedOptions.map((option) => (
                      <div key={option.optionId}>
                        <dt>{option.label}</dt>
                        <dd>{option.valueLabel}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <p className="cart-unit-price">Unit price {formatCurrency(paiseToRupees(line.unitPricePaise))}</p>
                {needsReview && (
                  <div className="cart-review-note" role="status">
                    <AlertCircle size={17} />
                    <div>
                      <strong>This item needs to be reviewed before checkout.</strong>
                      <ul>{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                      <Link href={`/shop/${line.slug}`}>Review product</Link>
                    </div>
                  </div>
                )}
                <div className="cart-line-actions">
                  <div className="quantity-control cart-quantity" aria-label={`Quantity for ${line.name}`}>
                    <button type="button" onClick={() => { updateCartLineQuantity(line.id, line.quantity - 1); announce(`${line.name} quantity updated.`); }} aria-label={`Decrease ${line.name} quantity`}><Minus size={15} /></button>
                    <input
                      value={line.quantity}
                      inputMode="numeric"
                      aria-label={`${line.name} quantity`}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (Number.isFinite(next) && next >= 1) updateCartLineQuantity(line.id, next);
                      }}
                    />
                    <button type="button" onClick={() => { updateCartLineQuantity(line.id, line.quantity + 1); announce(`${line.name} quantity updated.`); }} aria-label={`Increase ${line.name} quantity`}><Plus size={15} /></button>
                  </div>
                  <Link className="cart-review-link" href={`/shop/${line.slug}`}>Edit / review</Link>
                  <button className="remove-line" type="button" onClick={() => { removeCartLine(line.id); announce(`${line.name} removed from cart.`); }} aria-label={`Remove ${line.name} from cart`}><Trash2 size={15} /> Remove</button>
                </div>
              </div>
              <strong className="cart-line-total">{formatCurrency(paiseToRupees(line.unitPricePaise * line.quantity))}</strong>
            </article>
          ))}
        </div>

        <aside className="cart-summary" aria-label="Cart summary">
          <span className="section-kicker">CART SUMMARY</span>
          <div><span>Items</span><strong>{itemCount}</strong></div>
          <div className="cart-subtotal"><span>Subtotal</span><strong>{formatCurrency(paiseToRupees(subtotalPaise))}</strong></div>
          <p>Delivery, shipping and any applicable final tax are confirmed from the delivery and order details at checkout. Product configuration and pricing are revalidated before an order is created.</p>
          {hasReviewItems ? (
            <div className="cart-checkout-blocked" role="status">
              <AlertCircle size={17} /> Review the highlighted item{reviews.filter((review) => review.needsReview).length > 1 ? 's' : ''} before checkout.
            </div>
          ) : (
            <Link className="button button-primary" href="/checkout">Proceed to Checkout</Link>
          )}
          <Link className="text-link" href="/shop">Continue Shopping</Link>
        </aside>
      </div>
    </>
  );
}
