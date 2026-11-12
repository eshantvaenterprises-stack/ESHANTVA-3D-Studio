import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { retailVisibility } from '../src/config/retailVisibility';
import { mainNavigation, footerNavigation } from '../src/data/navigation';
import { legalPolicies } from '../src/data/legalPolicies';
import { startingPoints } from '../src/data/startingPoints';
import { enabledServiceCapabilities } from '../src/data/services';

const migrationPath = new URL('../supabase/migrations/20261010120000_recruitment_security_foundation.sql', import.meta.url);
const migration = await readFile(migrationPath, 'utf8');

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

for (const required of [
  'candidate_registration_intents', 'candidate_profiles', 'candidate_applications',
  'candidate_notice_acceptances', 'candidate_files', 'recruitment_audit_events',
  'recruitment_current_user_is_permanent', "coalesce(u.is_anonymous, false) = false",
  'u.email_confirmed_at is not null', 'enable row level security', 'force row level security',
  "values('recruitment-files','recruitment-files',false", 'Intentionally no anon/authenticated storage.objects policies',
  'request UUID conflict', 'candidate_file_path_opaque', 'storage_path text not null unique',
]) assert.ok(migration.includes(required), `Missing recruitment security marker: ${required}`);

assert.equal(/create\s+policy[^;]*\bon\s+storage\.objects/i.test(migration), false, 'Recruitment bucket must not expose direct browser object policies.');
assert.equal(/grant\s+(insert|update|delete)[\s\S]*to\s+(anon|authenticated)/i.test(migration), false, 'Candidate mutations must remain server-controlled.');

console.log(`Stage 1 foundation tests passed (${retailVisibility.surface} retail surface).`);
