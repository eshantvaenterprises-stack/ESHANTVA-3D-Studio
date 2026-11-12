import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { capabilityStatusDescriptions, capabilityStatusLabels, enabledServiceCapabilities, serviceCapabilities } from '../src/data/services';
import { startingPoints } from '../src/data/startingPoints';
import { pathToProduct } from '../src/data/pathToProduct';
import { retailVisibility } from '../src/config/retailVisibility';

assert.equal(serviceCapabilities.length, 6, 'Services must expose six primary capability records.');
assert.equal(enabledServiceCapabilities.length, retailVisibility.isInternal ? 6 : 5, 'Public mode must hide the retail personalisation surface without deleting its source record.');
assert.equal(startingPoints.length, retailVisibility.isInternal ? 6 : 4, 'Public mode must hide Shop-only starting points.');
assert.equal(pathToProduct.length, 6, 'Path-to-Product must contain six steps.');

assert.deepEqual(Object.keys(capabilityStatusLabels).sort(), ['available', 'case_by_case', 'review_required', 'selected_requests']);
assert.equal(capabilityStatusLabels.selected_requests, 'Selected Requests');
assert.equal(capabilityStatusLabels.review_required, 'Review Required');
assert.equal(capabilityStatusDescriptions.available.includes('normally proceed'), true);

assert.equal(new Set(serviceCapabilities.map((service) => service.id)).size, 6, 'Service IDs must be unique.');
assert.equal(new Set(serviceCapabilities.map((service) => service.anchor)).size, 6, 'Service anchors must be unique.');
assert.deepEqual(serviceCapabilities.map((service) => service.anchor), [
  'custom-3d-printing', 'personalisation', 'design-support', 'prototyping', 'functional-parts', 'small-batch',
]);
assert.equal(serviceCapabilities.every((service) => service.tags.length > 0), true, 'Each service needs searchable tags.');
assert.equal(serviceCapabilities.find((service) => service.id === 'small-batch')?.primaryCta.href, '/bulk-order');
assert.equal(serviceCapabilities.find((service) => service.id === 'personalisation')?.primaryCta.href, '/shop?customisable=true');

const customStartingPoints = startingPoints.filter((point) => point.href.startsWith('/custom-order'));
assert.equal(customStartingPoints.length, 4);
assert.equal(customStartingPoints.every((point) => point.href === '/custom-order'), true, 'Services must not invent request-type query values unsupported by Page 4.');

const sourceFiles = await Promise.all([
  'app/services/page.tsx',
  'src/data/services.ts',
  'src/data/startingPoints.ts',
  'src/data/pathToProduct.ts',
  'src/components/services/ServicesHero.tsx',
  'src/components/services/ServiceDetails.tsx',
  'src/components/services/ServiceCtas.tsx',
  'src/components/services/ServicesFAQ.tsx',
].map((file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
const publicSource = sourceFiles.join('\n');

for (const [label, pattern] of [
  ['tolerance value', /(?:±|\+\/-)\s*\d+(?:\.\d+)?\s*mm/i],
  ['fixed turnaround', /\b\d+\s*(?:day|days|hour|hours)\s*(?:turnaround|delivery|dispatch)/i],
  ['fixed MOQ', /\bMOQ\s*[:=-]?\s*\d+/i],
  ['discount percentage', /\b\d+(?:\.\d+)?%\s*(?:discount|off)/i],
  ['machine count', /\b\d+\s+(?:printers?|machines?)\b/i],
  ['rating claim', /\b\d(?:\.\d)?\s*(?:star|stars|\/5)\b/i],
] as const) {
  assert.equal(pattern.test(publicSource), false, `Public Services source contains an invented ${label}.`);
}

assert.match(publicSource, /REPLACE WITH ACTUAL ESHANTVA PRODUCT PHOTOGRAPHY BEFORE PUBLIC LAUNCH/);
assert.match(publicSource, /Biswanath, Assam/);
assert.doesNotMatch(publicSource, /printer\s+(?:brand|model)|scanner\s+(?:brand|model)|freelancer|supplier\s+name/i);

console.log('Services data, routing, capability transparency and claim-boundary tests passed.');
