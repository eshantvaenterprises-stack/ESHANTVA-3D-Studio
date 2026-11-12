export type RetailSurface = 'public' | 'internal';
const configuredSurface = process.env.NEXT_PUBLIC_RETAIL_SURFACE?.trim().toLowerCase();
const surface: RetailSurface = configuredSurface === 'internal' ? 'internal' : 'public';
export const retailVisibility = { surface, isInternal: surface === 'internal', isPublic: surface === 'public' } as const;
export function whenRetailInternal<T>(value: T, fallback: T): T { return retailVisibility.isInternal ? value : fallback; }
