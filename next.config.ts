import type { NextConfig } from 'next';

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? '';
const basePath = rawBasePath && rawBasePath !== '/'
  ? `/${rawBasePath.replace(/^\/+|\/+$/g, '')}`
  : '';
const internalRetailBuild = process.env.NEXT_PUBLIC_RETAIL_SURFACE?.trim().toLowerCase() === 'internal';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  allowedDevOrigins: ['terminal.local'],
  turbopack: { resolveAlias: internalRetailBuild ? {} : { '@/data/products': './src/data/publicProducts.ts' } },
};

export default nextConfig;
