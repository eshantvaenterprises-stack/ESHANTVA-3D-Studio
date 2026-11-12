'use client';

import { useEffect } from 'react';

export function ServiceAnchorHandler() {
  useEffect(() => {
    const moveToHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      window.requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'auto', block: 'start' });
      });
    };

    moveToHash();
    const layoutTimer = window.setTimeout(moveToHash, 250);
    document.fonts?.ready.then(moveToHash).catch(() => undefined);
    window.addEventListener('hashchange', moveToHash);
    window.addEventListener('load', moveToHash);
    return () => {
      window.clearTimeout(layoutTimer);
      window.removeEventListener('hashchange', moveToHash);
      window.removeEventListener('load', moveToHash);
    };
  }, []);

  return null;
}
