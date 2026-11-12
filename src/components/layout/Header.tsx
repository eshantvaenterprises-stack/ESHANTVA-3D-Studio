'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { mainNavigation } from '../../data/navigation';
import { Button } from '../ui/Button';
import { getCartIndicatorCount, getCartIndicatorServerSnapshot, subscribeToCartIndicator } from '@/lib/cartIndicator';
import { getAccountSession, isAnonymousUser, onAccountAuthChange } from '@/lib/accountAuth';
import { retailVisibility } from '@/config/retailVisibility';
import { supabasePublicConfig } from '@/config/supabase';

type HeaderProps = { onSearch: () => void };

export function Header({ onSearch }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [permanentAccount, setPermanentAccount] = useState(false);
  const pathname = usePathname();
  const accountActive = pathname === '/account' || pathname.startsWith('/account/');
  const cartCount = useSyncExternalStore(subscribeToCartIndicator, getCartIndicatorCount, getCartIndicatorServerSnapshot);
  const accountHref = permanentAccount ? '/account/dashboard' : '/account';

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    // A customer-only static preview without explicit backend configuration
    // must not throw from the shared header or silently use production Auth.
    if (!supabasePublicConfig.url || !supabasePublicConfig.publishableKey) {
      return;
    }
    let active = true;
    let authRevision = 0;
    const initialRevision = authRevision;
    void getAccountSession().then(({ data }) => {
      if (!active || initialRevision !== authRevision) return;
      const user = data.session?.user;
      setPermanentAccount(Boolean(user && !isAnonymousUser(user)));
    });
    const { data: listener } = onAccountAuthChange((_event, session) => {
      authRevision += 1;
      const user = session?.user;
      setPermanentAccount(Boolean(user && !isAnonymousUser(user)));
    });
    return () => { active = false; authRevision += 1; listener.subscription.unsubscribe(); };
  }, []);

  return (
    <header className="site-header">
      <div className="header-inner shell">
        <Link href="/" className="wordmark" aria-label="ESHANTVA 3D Studio home">
          <span>ESHANTVA</span>
          <small>3D STUDIO</small>
        </Link>

        <nav className="desktop-nav" aria-label="Main navigation">
          {mainNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href || pathname.startsWith(`${item.href}/`) ? 'active' : undefined}
              aria-current={pathname === item.href ? 'page' : undefined}
            >{item.label}</Link>
          ))}
        </nav>

        <div className="header-actions">
          {retailVisibility.isInternal && <button className="icon-button" onClick={onSearch} aria-label="Open product search">
            <Search size={19} />
          </button>}
          <Link className="icon-button desktop-action" href={accountHref} aria-label={permanentAccount ? 'Open dashboard' : 'Open account'} aria-current={accountActive ? 'page' : undefined}>
            <UserRound size={19} />
          </Link>
          {retailVisibility.isInternal && <Link className="icon-button cart-button" href="/cart" aria-label={`Open cart, ${cartCount} items`}>
            <ShoppingBag size={19} />
            <span aria-hidden="true">{cartCount}</span>
          </Link>}
          <Button to="/custom-order" className="header-cta">Start a Custom Order</Button>
          <button
            className="icon-button menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      <div className={`mobile-menu ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
        <div className="mobile-menu-top">
          <span className="wordmark"><span>ESHANTVA</span><small>3D STUDIO</small></span>
          <button className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Close navigation menu">
            <X size={23} />
          </button>
        </div>
        <nav aria-label="Mobile navigation">
          {mainNavigation.map((item, index) => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
              <small>{String(index + 1).padStart(2, '0')}</small>{item.label}
            </Link>
          ))}
        </nav>
        <Link className="mobile-account-link" href={accountHref} aria-current={accountActive ? 'page' : undefined} onClick={() => setMenuOpen(false)}><UserRound size={18} /> {permanentAccount ? 'Dashboard' : 'Account access'}</Link>
        <Button to="/custom-order" className="mobile-menu-cta">Start a Custom Order</Button>
        <div className="mobile-menu-meta">Biswanath Chariali · Assam · India</div>
      </div>
    </header>
  );
}
