import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { siteConfig } from '../src/config/site';
import { enabledPublicColors, enabledPublicMaterials, materialNeeds, publicMaterialStatusLabels } from '../src/data/materials';
import { getPublicMaterialAvailability } from '../src/lib/publicMaterialAvailability';

assert.equal(materialNeeds.length, 6, 'Choose by Need must contain six routes.');
assert.equal(enabledPublicMaterials.length, 3, 'The public guide must contain the three configured categories.');
assert.deepEqual(enabledPublicMaterials.map((item) => item.name), ['PLA-Based Material', 'ABS', 'Flexible TPU']);
assert.equal(new Set(enabledPublicMaterials.map((item) => item.id)).size, enabledPublicMaterials.length);
assert.deepEqual(Object.values(publicMaterialStatusLabels), ['Available', 'Limited', 'On Request', 'Unavailable']);
assert.equal(siteConfig.features.materials.liveAvailabilityEnabled, false, 'Live availability must remain off until a sanitized source is connected.');
assert.equal(enabledPublicMaterials.every((item) => item.publicStatus === undefined), true, 'No current material availability may be invented.');
assert.equal(enabledPublicColors.every((item) => item.developmentPlaceholder && item.publicStatus === undefined), true, 'Current colour examples must remain non-live placeholders.');
assert.equal(enabledPublicMaterials.every((item) => getPublicMaterialAvailability(item).status === null), true);
assert.equal(getPublicMaterialAvailability(enabledPublicMaterials[0]).customerMessage, 'Availability confirmed when ordering');

const forbiddenRuntimeKeys = ['supplier', 'supplierName', 'vendor', 'sku', 'purchasePrice', 'landedCost', 'stockKg', 'spoolCount', 'remainingWeight', 'reorderAtKg', 'purchaseUrl', 'machineModel', 'nozzleSize', 'layerHeight', 'infill', 'printSpeed', 'costPerGram', 'margin'];
for (const record of [...enabledPublicMaterials, ...enabledPublicColors]) {
  for (const key of forbiddenRuntimeKeys) assert.equal(key in record, false, `Public material record leaked ${key}.`);
}

const publicFiles = await Promise.all([
  'app/materials/page.tsx',
  'src/data/materials.ts',
  'src/lib/publicMaterialAvailability.ts',
  'src/components/materials/MaterialsHero.tsx',
  'src/components/materials/NeedBasedMaterialGuide.tsx',
  'src/components/materials/MaterialOverview.tsx',
  'src/components/materials/ColorAndAvailability.tsx',
  'src/components/materials/MaterialComparison.tsx',
  'src/components/materials/MaterialGuidance.tsx',
].map((file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
const publicSource = publicFiles.join('\n');
assert.doesNotMatch(publicSource, /Amazon|Flipkart|Bambu|supplier\s*(?:name|:)|purchasePrice|landedCost|stockKg|spoolCount|reorderAtKg|costPerGram/i);
assert.doesNotMatch(publicSource, /\b\d+(?:\.\d+)?\s*°[CF]\b|\b\d+(?:\.\d+)?\s*mm\s*(?:layer|nozzle)/i);
assert.match(publicSource, /Availability confirmed when ordering/);

console.log('Materials public data, fallback availability and privacy-boundary tests passed.');
