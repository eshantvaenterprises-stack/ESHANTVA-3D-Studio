import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve, relative, dirname, extname, sep } from 'node:path';

// Dependency-free source import audit; NOT a replacement for Next export/HTTP verification.
const root = process.cwd();
const sources = new Map();
const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.mjs']);
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, {withFileTypes:true})) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && allowedExtensions.has(extname(entry.name))) sources.set(resolve(full), readFileSync(full, 'utf8'));
  }
}
walk(join(root,'app'));
walk(join(root,'src'));
const importRe = /(?:import\s+(?:[^'";]*?\s+from\s+)?|export\s+[^'";]*?from\s+|import\s*\(\s*|require\s*\(\s*)['"]([^'"\n]+)['"]/g;
const candidatePaths = /(?:^|\/)(?:recruitment|candidate)(?:\/|[A-Z]|\.|$)|(?:^|\/)adminRecruitment/;
function resolveSource(importer, specifier) {
  const base = specifier.startsWith('@/') ? join(root,'src',specifier.slice(2)) : specifier.startsWith('.') ? resolve(dirname(importer),specifier) : null;
  if (!base) return null;
  for (const path of [base,...['.ts','.tsx','.js','.mjs'].map(ext=>base+ext),...['.ts','.tsx','.js','.mjs'].map(ext=>join(base,'index'+ext))]) {
    if (sources.has(resolve(path))) return resolve(path);
  }
  return null;
}
let publicEntries = 0, graphNodes = new Set(), refsChecked = 0;
for (const file of sources.keys()) {
  if (!file.startsWith(resolve(root,'app')+sep)) continue;
  publicEntries++;
  const seen = new Set(), work = [file];
  while (work.length) {
    const current = work.pop();
    if (seen.has(current)) continue;
    seen.add(current); graphNodes.add(current);
    const code = sources.get(current);
    for (const [, specifier] of code.matchAll(importRe)) {
      refsChecked++;
      const dependency = resolveSource(current,specifier);
      if (!dependency) continue;
      const relativeDep = relative(root,dependency).replaceAll('\\','/');
      assert.ok(!candidatePaths.test(relativeDep), `Recruitment module reachable from public entry: ${relative(root,file)} -> ${relativeDep}`);
      if (!seen.has(dependency)) work.push(dependency);
    }
  }
}
assert.ok(publicEntries > 20, 'Unexpectedly few public application entry files');
const currentLegal = readFileSync(join(root,'src/data/legalPolicies.ts'),'utf8');
assert.doesNotMatch(currentLegal, /slug:\s*['"]recruitment-(privacy|terms)['"]/, 'Recruitment-only policies remain in public importable data module');
const publicCss = readFileSync(join(root,'src/styles.css'),'utf8');
assert.doesNotMatch(publicCss, /\.(?:candidate-layout|candidate-form|recruit-grid|admin-recruit-table)(?:[\s.,:{>]|$)/, 'Recruitment CSS selectors remain in globally bundled customer stylesheet');
const archivePresent = existsSync(join(root,'deferred-recruitment'));
if (archivePresent) {
const archivedCss = readFileSync(join(root,'deferred-recruitment/styles.recruitment.css'),'utf8');
assert.match(archivedCss, /\.candidate-layout/);
assert.match(archivedCss, /\.admin-recruit-table/);
const archivedLegal = readFileSync(join(root,'deferred-recruitment/legalPolicies.original.ts'),'utf8');
assert.match(archivedLegal, /slug:\s*['"]recruitment-privacy['"]/);
assert.match(archivedLegal, /slug:\s*['"]recruitment-terms['"]/);
} else console.log('ARCHIVE_ABSENT: deferred recruitment preservation NOT_VERIFIED; live boundary checks remain mandatory.');
for (const page of ['candidate/page.tsx','careers/page.tsx','verify-interview/page.tsx','admin/recruitment/page.tsx']) {
  assert.ok(!existsSync(join(root,'app',page)),`Public candidate page returned: ${page}`);
  if (archivePresent) assert.ok(existsSync(join(root,'deferred-recruitment/app',page)),`Archived candidate page missing: ${page}`);
}
console.log(`PASS CUSTOMER_ONLY_BOUNDARY_STATIC: app_entries=${publicEntries} traversed_nodes=${graphNodes.size} import_edges_checked=${refsChecked}; archive=${archivePresent ? 'checked' : 'NOT_VERIFIED (absent in capture)'}`);
