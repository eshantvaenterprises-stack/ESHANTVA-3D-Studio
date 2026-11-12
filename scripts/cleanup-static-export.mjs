import { access, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const emptyPortfolioBuildRoute = resolve(
  process.cwd(),
  'out',
  'our-work',
  '__empty-portfolio-build__',
);

await rm(emptyPortfolioBuildRoute, { recursive: true, force: true });

try {
  await access(emptyPortfolioBuildRoute);
  throw new Error('Build-only empty portfolio route is still present after cleanup.');
} catch (error) {
  if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
}

console.log('Removed the build-only empty portfolio route from the static export.');

const internalRetailBuild = process.env.NEXT_PUBLIC_RETAIL_SURFACE?.trim().toLowerCase() === 'internal';
if (!internalRetailBuild) {
  const productAssets = resolve(process.cwd(), 'out', 'images', 'products');
  const buildOnlyShop = resolve(process.cwd(), 'out', 'shop', '__retail-disabled-build__');
  // Repeat once after the exporter has released all asset-copy work. This also
  // turns a late reappearance into a verified cleanup rather than a race.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await rm(productAssets, { recursive: true, force: true });
    await rm(buildOnlyShop, { recursive: true, force: true });
    if (attempt === 0) await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  for (const removedPath of [productAssets, buildOnlyShop]) {
    try {
      await access(removedPath);
      throw new Error(`Public retail cleanup failed: ${removedPath}`);
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
    }
  }
  console.log('Removed unfinished retail product assets from the public static export.');
}
