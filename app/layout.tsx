import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { siteConfig } from '@/config/site';
import { retailVisibility } from '@/config/retailVisibility';
import '@/styles.css';

const metadataBase = siteConfig.siteUrl ? new URL(siteConfig.siteUrl) : undefined;

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: retailVisibility.isInternal ? 'ESHANTVA 3D Studio | Internal Retail Development' : 'ESHANTVA 3D Studio | Custom 3D Printing & Production Requests',
    template: '%s | ESHANTVA 3D Studio',
  },
  description:
    'ESHANTVA 3D Studio in Biswanath, Assam — custom 3D printing, personalised products and reviewed custom orders.',
  applicationName: 'ESHANTVA 3D Studio',
  openGraph: {
    type: 'website',
    siteName: 'ESHANTVA 3D Studio',
    locale: 'en_IN',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f5f2eb',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: siteConfig.brand,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Biswanath',
      addressRegion: 'Assam',
      addressCountry: 'IN',
    },
  };

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness).replace(/</g, '\\u003c') }}
        />
      </body>
    </html>
  );
}
