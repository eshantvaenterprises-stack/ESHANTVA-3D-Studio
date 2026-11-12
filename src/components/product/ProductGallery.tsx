'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import type { Product, ProductMedia } from '@/types/product';
import { withBasePath } from '@/config/site';

export function ProductGallery({ product }: { product: Product }) {
  const media: ProductMedia[] = product.media || product.images.map((image) => ({ type: 'image', ...image }));
  const images = media.filter((item): item is Extract<ProductMedia, { type: 'image' }> => item.type === 'image');
  const imageCount = images.length;
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const touchStart = useRef<number | null>(null);
  const current = images[active] || { src: product.thumbnail, alt: product.name };

  const move = useCallback((direction: number) => {
    setActive((index) => (index + direction + imageCount) % imageCount);
  }, [imageCount]);

  function openLightbox() {
    previousFocus.current = document.activeElement as HTMLElement;
    setLightboxOpen(true);
  }

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    window.setTimeout(() => previousFocus.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft' && imageCount > 1) move(-1);
      if (event.key === 'ArrowRight' && imageCount > 1) move(1);
      if (event.key === 'Tab') {
        const controls = [...document.querySelectorAll<HTMLElement>('.product-lightbox button')];
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = ''; };
  }, [closeLightbox, lightboxOpen, imageCount, move]);

  function endSwipe(clientX: number) {
    if (touchStart.current === null || images.length < 2) return;
    const distance = clientX - touchStart.current;
    if (Math.abs(distance) > 45) move(distance > 0 ? -1 : 1);
    touchStart.current = null;
  }

  return (
    <div className="pdp-gallery" aria-label={`${product.name} media gallery`}>
      <button className="pdp-main-media" onClick={openLightbox} aria-label={`Enlarge ${current.alt}`} onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={(event) => endSwipe(event.changedTouches[0].clientX)}>
        <Image src={withBasePath(current.src)} alt={current.alt} fill sizes="(max-width: 900px) 100vw, 58vw" priority />
        <span className="zoom-hint"><Expand size={16} /> View larger</span>
        {product.isSample && <span className="sample-badge">SAMPLE PRODUCT</span>}
      </button>
      {images.length > 1 && <div className="pdp-thumbnails" role="list" aria-label="Choose product view">{images.map((image, index) => (
        <button key={`${image.src}-${index}`} role="listitem" className={active === index ? 'is-active' : ''} onClick={() => setActive(index)} aria-label={`Show image ${index + 1}: ${image.alt}`} aria-current={active === index ? 'true' : undefined}>
          <Image src={withBasePath(image.src)} alt="" fill sizes="90px" />
        </button>
      ))}</div>}
      {lightboxOpen && <div className="product-lightbox" role="dialog" aria-modal="true" aria-label={`${product.name} enlarged image`}>
        <button ref={closeRef} className="lightbox-close" onClick={closeLightbox} aria-label="Close image viewer"><X size={24} /></button>
        {images.length > 1 && <button className="lightbox-prev" onClick={() => move(-1)} aria-label="Previous image"><ChevronLeft size={28} /></button>}
        <div className="lightbox-image"><Image src={withBasePath(current.src)} alt={current.alt} fill sizes="100vw" /></div>
        {images.length > 1 && <button className="lightbox-next" onClick={() => move(1)} aria-label="Next image"><ChevronRight size={28} /></button>}
        <span className="lightbox-count">{active + 1} / {images.length}</span>
      </div>}
    </div>
  );
}
