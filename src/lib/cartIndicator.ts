'use client';
const CART_STORAGE_KEY = 'eshantva-cart-v1';
const CART_EVENT = 'eshantva-cart-updated';
function readCount() { if (typeof window === 'undefined') return 0; try { const parsed: unknown = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || 'null'); if (!parsed || typeof parsed !== 'object' || !('lines' in parsed) || !Array.isArray(parsed.lines)) return 0; return parsed.lines.reduce((total, line) => { if (!line || typeof line !== 'object' || !('quantity' in line)) return total; const quantity = Number(line.quantity); return total + (Number.isInteger(quantity) && quantity > 0 ? quantity : 0); }, 0); } catch { return 0; } }
export function getCartIndicatorCount() { return readCount(); }
export function getCartIndicatorServerSnapshot() { return 0; }
export function subscribeToCartIndicator(callback: () => void) { if (typeof window === 'undefined') return () => undefined; const onStorage = (event: StorageEvent) => { if (event.key === CART_STORAGE_KEY) callback(); }; window.addEventListener('storage', onStorage); window.addEventListener(CART_EVENT, callback); return () => { window.removeEventListener('storage', onStorage); window.removeEventListener(CART_EVENT, callback); }; }
