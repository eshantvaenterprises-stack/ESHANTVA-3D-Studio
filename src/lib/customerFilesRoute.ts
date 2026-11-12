export function extractOrderFilesReferenceFromPath(pathname: string, basePath = '') {
  const normalizedBase = basePath && basePath !== '/' ? basePath.replace(/\/$/, '') : '';
  const withoutBase = normalizedBase && pathname.startsWith(normalizedBase) ? pathname.slice(normalizedBase.length) : pathname;
  const match = withoutBase.match(/^\/account\/orders\/([^/?#]+)\/files\/?$/);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return match[1]; }
}

export function isOrderFilesPath(pathname: string, basePath = '') {
  return extractOrderFilesReferenceFromPath(pathname, basePath) !== null;
}

export function isFilesRequestCurrent(
  current: { epoch:number; userId:string|null; reference:string|null; artifactReference?:string|null },
  expected: { epoch:number; userId:string; reference:string; artifactReference?:string|null },
) {
  return current.epoch === expected.epoch
    && current.userId === expected.userId
    && current.reference === expected.reference
    && (expected.artifactReference === undefined || current.artifactReference === expected.artifactReference);
}
