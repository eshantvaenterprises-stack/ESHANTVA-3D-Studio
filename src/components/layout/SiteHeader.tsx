'use client';

import { useState } from 'react';
import { AnnouncementBar } from './AnnouncementBar';
import { Header } from './Header';
import { SearchOverlay } from './SearchOverlay';
import { retailVisibility } from '@/config/retailVisibility';

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <AnnouncementBar />
      <Header onSearch={() => setSearchOpen(true)} />
      {retailVisibility.isInternal && <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />}
    </>
  );
}
