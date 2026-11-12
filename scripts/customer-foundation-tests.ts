import assert from 'node:assert/strict';
import { retailVisibility } from '../src/config/retailVisibility';
import { mainNavigation, footerNavigation } from '../src/data/navigation';
import { legalPolicies } from '../src/data/legalPolicies';
import { startingPoints } from '../src/data/startingPoints';
import { enabledServiceCapabilities } from '../src/data/services';

assert.ok(['public', 'internal'].includes(retailVisibility.surface));
if (retailVisibility.isPublic) {
  assert.equal(mainNavigation.some((item) => item.href === '/shop'), false);
  assert.equal(Object.values(footerNavigation).flat().some((item) => item.href === '/shop'), false);
  assert.equal(startingPoints.some((point) => point.href.startsWith('/shop')), false);
  assert.equal(enabledServiceCapabilities.some((service) => service.id === 'personalisation'), false);
} else {
  assert.equal(mainNavigation.some((item) => item.href === '/shop'), true);
  assert.equal(startingPoints.some((point) => point.href.startsWith('/shop')), true);
  assert.equal(enabledServiceCapabilities.some((service) => service.id === 'personalisation'), true);
}

// The two recruitment-only policies are preserved in deferred-recruitment/legalPolicies.original.ts.
assert.equal(legalPolicies.length, 10);
assert.equal(legalPolicies.some((policy) => policy.slug.startsWith('recruitment-')), false);
assert.equal(new Set(legalPolicies.map((policy) => policy.slug)).size, legalPolicies.length);
for (const policy of legalPolicies) {
  assert.equal(policy.version, 'draft-2026-10-10');
  assert.equal(policy.lastUpdated, '10 October 2026');
  assert.equal(policy.status, 'review_required');
  assert.ok(policy.sections.length > 0);
  assert.ok(policy.ownerDecisions.length > 0);
}

console.log(`Customer foundation tests passed; recruitment migration tests operator-only/NOT_PACKAGED (${retailVisibility.surface} retail surface).`);
