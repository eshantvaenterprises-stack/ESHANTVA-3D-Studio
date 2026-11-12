'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Check, ClipboardCheck, Copy, MapPin, Minus, PackageCheck, Plus, Share2, ShoppingBag, Truck, X } from 'lucide-react';
import type { Product, ProductOption, SelectedProductOption } from '@/types/product';
import { formatCurrency } from '@/lib/currency';
import { calculateConfiguredProductPrice } from '@/lib/productPricing';
import { addConfiguredProductToCart, isProductPurchasable } from '@/lib/cart';
import { getPublicProductAvailability } from '@/services/publicAvailability';
import { siteConfig } from '@/config/site';
import { trackCatalogEvent } from '@/lib/analytics';

type SelectionState = Record<string, string | boolean>;

function initialSelections(product: Product) {
  const initial: SelectionState = {};
  for (const option of product.productOptions || []) {
    if ('values' in option && option.values.filter((value) => !value.unavailable).length === 1) initial[option.id] = option.values.find((value) => !value.unavailable)!.id;
    if (option.type === 'boolean') initial[option.id] = false;
  }
  return initial;
}

function normalizePlainText(value: string, maximum: number) {
  return value.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').slice(0, maximum);
}

export function ProductConfigurator({ product }: { product: Product }) {
  const [selections, setSelections] = useState<SelectionState>(() => initialSelections(product));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [quantity, setQuantity] = useState(product.minimumQuantity || 1);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  const availability = getPublicProductAvailability(product);
  const options = useMemo(() => product.productOptions || [], [product.productOptions]);

  const selectedOptions = useMemo(() => options.flatMap((option): SelectedProductOption[] => {
    const selected = selections[option.id];
    if (option.type === 'text') {
      const value = typeof selected === 'string' ? selected.trim() : '';
      return value ? [{ optionId: option.id, label: option.label, valueLabel: value, priceModifier: option.priceModifier || 0 }] : [];
    }
    if ('values' in option) {
      const value = option.values.find((candidate) => candidate.id === selected);
      return value ? [{ optionId: option.id, label: option.label, valueId: value.id, valueLabel: value.label, priceModifier: value.priceModifier || 0 }] : [];
    }
    if (option.type === 'boolean' && selected === true) return [{ optionId: option.id, label: option.label, valueId: 'yes', valueLabel: 'Yes', priceModifier: option.priceModifier || 0 }];
    return [];
  }), [options, selections]);

  const pricing = calculateConfiguredProductPrice(product, selectedOptions, quantity);
  const missing = options.find((option) => option.required && (
    option.type === 'boolean' ? selections[option.id] !== true :
      option.type === 'file' ? true :
        typeof selections[option.id] !== 'string' || !(selections[option.id] as string).trim()
  ));
  const canAdd = isProductPurchasable(product) && availability.availableForOrdering && product.orderMode !== 'request_only' && !missing;
  const maxQuantity = product.maximumQuantity || 99;

  function select(option: ProductOption, value: string | boolean) {
    setSelections((current) => ({ ...current, [option.id]: value }));
    setTouched((current) => ({ ...current, [option.id]: true }));
    trackCatalogEvent('select_item_option', { product: product.slug, option: option.id });
  }

  function addToCart() {
    setTouched(Object.fromEntries(options.map((option) => [option.id, true])));
    if (!canAdd) return;
    addConfiguredProductToCart({ product, quantity, unitPrice: pricing.unitPrice, selectedOptions });
    trackCatalogEvent('add_to_cart', { product: product.slug, quantity, value: pricing.lineTotal });
    setFeedbackOpen(true);
  }

  async function shareProduct() {
    const shareData = { title: product.name, text: product.shortDescription, url: location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(location.href); setShareStatus('Link copied'); }
      trackCatalogEvent('share_product', { product: product.slug });
    } catch { setShareStatus('Share cancelled'); }
    window.setTimeout(() => setShareStatus(''), 1800);
  }

  const primaryLabel = product.isSample || siteConfig.catalogMode !== 'live' ? 'Not available to purchase'
    : product.publicAvailability === 'out_of_stock' ? 'Out of Stock'
      : product.orderMode === 'request_only' ? 'Request This Product'
        : missing ? `${missing.type === 'text' ? 'Enter' : 'Select'} ${missing.label}`
          : 'Add to Cart';

  return (
    <div className="pdp-info-panel">
      <div className="pdp-heading-row"><span>{product.category}{product.subcategory ? ` / ${product.subcategory}` : ''}</span>{product.isSample && <strong>SAMPLE PRODUCT</strong>}</div>
      <h1>{product.name}</h1>
      <p className="pdp-short-description">{product.shortDescription}</p>
      <div className="pdp-price-status"><strong>{formatCurrency(pricing.unitPrice)}</strong><span className={`availability availability-${product.publicAvailability}`}>{availability.label}</span></div>
      {availability.customerMessage && <p className="availability-message">{availability.customerMessage}</p>}

      {options.length > 0 && <div className="pdp-options" aria-label="Product options">{options.map((option) => (
        <ProductOptionControl key={option.id} option={option} value={selections[option.id]} touched={Boolean(touched[option.id])} onSelect={(value) => select(option, value)} />
      ))}</div>}

      {pricing.modifiers.length > 0 && <div className="pricing-breakdown" aria-live="polite"><div><span>Base product</span><strong>{formatCurrency(pricing.baseUnitPrice)}</strong></div>{pricing.modifiers.map((modifier) => <div key={modifier.label}><span>{modifier.label}</span><strong>+{formatCurrency(modifier.amount)}</strong></div>)}<div className="pricing-total"><span>Configured unit price</span><strong>{formatCurrency(pricing.unitPrice)}</strong></div></div>}

      {product.customisable && <p className="change-warning"><ClipboardCheck size={17} />Please review your personalisation carefully. Changes after production begins may involve additional charges; changes after manufacturing may require a reprint.</p>}

      {product.orderMode !== 'request_only' && product.publicAvailability !== 'out_of_stock' && <div className="quantity-row"><span>Quantity</span><div className="quantity-control"><button onClick={() => setQuantity((value) => Math.max(product.minimumQuantity || 1, value - 1))} aria-label="Decrease quantity"><Minus size={16} /></button><input value={quantity} onChange={(event) => setQuantity(Math.min(maxQuantity, Math.max(product.minimumQuantity || 1, Math.floor(Number(event.target.value) || 1))))} inputMode="numeric" aria-label="Quantity" /><button onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))} aria-label="Increase quantity"><Plus size={16} /></button></div></div>}

      {product.orderMode === 'request_only' ? <Link className="button button-primary pdp-primary-action" href={`/custom-order?sourceProduct=${encodeURIComponent(product.slug)}`} onClick={() => trackCatalogEvent('custom_order_click', { product: product.slug })}>{primaryLabel}</Link>
        : <button className="button button-primary pdp-primary-action" disabled={!canAdd} onClick={addToCart}><ShoppingBag size={17} />{primaryLabel}</button>}
      {product.bulkThreshold && quantity >= product.bulkThreshold && <Link className="bulk-link" href={`/bulk-order?product=${encodeURIComponent(product.slug)}`} onClick={() => trackCatalogEvent('bulk_enquiry_click', { product: product.slug })}>Need a larger quantity? Request Bulk Order</Link>}
      <button className="share-product" onClick={shareProduct}><Share2 size={16} /> Share product</button>{shareStatus && <span className="share-status" role="status"><Copy size={13} />{shareStatus}</span>}

      <div className="pdp-trust-list"><span><Truck size={18} /><span><strong>Pan-India Delivery</strong><small>Applicable shipping charges apply.</small></span></span>{siteConfig.localPickup && <span><MapPin size={18} /><span><strong>Local Pickup</strong><small>Biswanath, by applicable arrangement.</small></span></span>}{siteConfig.features.accountPortal && <span><PackageCheck size={18} /><span><strong>Customer Account</strong><small>Order overview is available through the customer dashboard.</small></span></span>}</div>

      {feedbackOpen && <div className="cart-feedback" role="status" aria-live="polite"><button onClick={() => setFeedbackOpen(false)} aria-label="Close cart confirmation"><X size={18} /></button><Check size={24} /><strong>Product added</strong><span>{product.name} · Qty {quantity}</span>{selectedOptions.length > 0 && <small>{selectedOptions.map((option) => `${option.label}: ${option.valueLabel}`).join(' · ')}</small>}<div><Link className="button button-primary" href="/cart">View Cart</Link><button onClick={() => setFeedbackOpen(false)}>Continue Shopping</button></div></div>}

      {availability.availableForOrdering && product.orderMode !== 'request_only' && <div className="mobile-purchase-bar"><div><small>{product.name}</small><strong>{formatCurrency(pricing.lineTotal)}</strong></div><button className="button button-primary" disabled={!canAdd} onClick={addToCart}>{primaryLabel}</button></div>}
    </div>
  );
}

function ProductOptionControl({ option, value, touched, onSelect }: { option: ProductOption; value: string | boolean | undefined; touched: boolean; onSelect: (value: string | boolean) => void }) {
  const missing = option.required && (option.type === 'file' || (typeof value !== 'string' && value !== true) || value === '');
  if (option.type === 'text') return <fieldset className="pdp-option"><legend>{option.label}{option.required && <span>Required</span>}</legend><input value={typeof value === 'string' ? value : ''} maxLength={option.maxLength} placeholder={option.placeholder} onChange={(event) => onSelect(normalizePlainText(event.target.value, option.maxLength))} aria-describedby={`${option.id}-help ${option.id}-error`} aria-invalid={touched && missing} /><div className="option-help" id={`${option.id}-help`}><span>{option.helpText}</span><span>{typeof value === 'string' ? value.length : 0}/{option.maxLength}</span></div>{touched && missing && <p className="option-error" id={`${option.id}-error`}>Enter {option.label.toLowerCase()}.</p>}</fieldset>;
  if (option.type === 'file') return <fieldset className="pdp-option"><legend>{option.label}{option.required && <span>Required</span>}</legend><button className="disabled-upload" disabled>Secure upload unavailable</button><p className="option-help">Accepted later: {option.acceptedTypes.join(', ')} · up to {option.maxSizeMB} MB. {option.helpText}</p></fieldset>;
  if (option.type === 'boolean') return <fieldset className="pdp-option"><legend>{option.label}{option.required && <span>Required</span>}</legend><label className="boolean-option"><input type="checkbox" checked={value === true} onChange={(event) => onSelect(event.target.checked)} />{option.description || option.label}{option.priceModifier ? ` (+${formatCurrency(option.priceModifier)})` : ''}</label>{touched && missing && <p className="option-error">Select this required option.</p>}</fieldset>;
  return <fieldset className="pdp-option"><legend>{option.label}{option.required && <span>Required</span>}</legend><div className={`option-values option-values-${option.type}`}>{option.values.map((candidate) => <label key={candidate.id} className={candidate.id === value ? 'is-selected' : ''}><input type="radio" name={option.id} value={candidate.id} checked={candidate.id === value} disabled={candidate.unavailable} onChange={() => onSelect(candidate.id)} /><span>{option.type === 'color' && <i style={{ background: candidate.colorHex }} aria-hidden="true" />}{candidate.label}{candidate.priceModifier ? <small>+{formatCurrency(candidate.priceModifier)}</small> : null}</span></label>)}</div>{option.helpText && <p className="option-help">{option.helpText}</p>}{touched && missing && <p className="option-error">Select {option.label.toLowerCase()}.</p>}</fieldset>;
}
