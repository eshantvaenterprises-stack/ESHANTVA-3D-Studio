import assert from 'node:assert/strict';
import { publicProjects } from '../src/data/projects';
import {
  getPublishedProjectBySlug,
  getPublishedProjects,
  isApprovedPublicProject,
  validateProjectRecords,
} from '../src/repositories/projectRepository';
import type { PublicProject } from '../src/types/project';

validateProjectRecords(publicProjects);

for (const project of getPublishedProjects()) {
  assert.equal(project.published, true);
  assert.equal(project.customerApprovedForPublication, true);
  assert.equal(project.isDevelopmentPlaceholder, undefined);
  assert.ok(project.media.length > 0);
  assert.equal(getPublishedProjectBySlug(project.slug)?.id, project.id);
}

assert.equal(getPublishedProjectBySlug('__private-or-missing__'), null);

const approvedFixture: PublicProject = {
  id: 'test-approved-project',
  slug: 'test-approved-project',
  title: 'Controlled publication-gate fixture',
  shortDescription: 'Test-only record that never enters the public project dataset.',
  category: 'Other',
  media: [{ type: 'image', src: '/test-only.jpg', alt: 'Test-only fixture' }],
  published: true,
  customerApprovedForPublication: true,
};

assert.equal(isApprovedPublicProject(approvedFixture), true);
assert.equal(isApprovedPublicProject({ ...approvedFixture, published: false }), false);
assert.equal(isApprovedPublicProject({ ...approvedFixture, customerApprovedForPublication: false }), false);
assert.equal(isApprovedPublicProject({ ...approvedFixture, isDevelopmentPlaceholder: true }), false);
assert.equal(getPublishedProjects().length, 0, 'Disabled realPortfolio flag must keep the public dataset empty.');
console.log('Our Work public-data tests passed.');
