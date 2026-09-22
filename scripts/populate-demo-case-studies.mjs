/** Loopback-only, read-only plan by default. --apply uploads only required demo
 * assets and publishes exact-known samples; owner edits and private drafts stay.
 * Uses the existing synthetic project-media manifest without modifying Relay.
 */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { CASE_STUDY_SAMPLE_ASSETS } from '../lib/content/sample-case-studies.mjs';
import { localBase, canonical } from './demo-projects/population-plan.mjs';
import { caseStudyPopulationPlan } from './demo-case-studies/population-plan.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const base = localBase(process.env.TEST_BASE_URL || 'http://localhost:3000');
const apply = process.argv.includes('--apply');
const manifest = JSON.parse(
  await readFile(
    resolve(root, 'scripts/assets/project-demos/manifest.json'),
    'utf8',
  ),
);
const requiredKeys = new Set(Object.values(CASE_STUDY_SAMPLE_ASSETS).flat());
const assets = manifest.assets.filter((asset) => requiredKeys.has(asset.key));
if (assets.length !== requiredKeys.size)
  throw new Error('A required sample asset is missing from the manifest.');
const request = async (path, init = {}) => {
  const response = await fetch(base + path, {
    ...init,
    redirect: 'error',
    signal: AbortSignal.timeout(20000),
    headers: { Cookie: '__sites_local_auth=1', ...init.headers },
  });
  if (!response.ok)
    throw new Error(
      `${path}: ${response.status}; no subsequent records were changed.`,
    );
  return response;
};
const refresh = async () =>
  (await (await request('/api/admin')).json()).records;
const action = async (body) =>
  (
    await request('/api/admin', {
      method: 'POST',
      headers: { Origin: base, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  ).json();
const ids = {};
const metadata = (asset, id) => ({
  title: asset.title,
  alt: asset.alt,
  url: '/media/' + id,
  mime: asset.mime,
  size: asset.size,
  order: 0,
  ...(asset.poster ? { posterMediaId: ids[asset.poster] } : {}),
  ...(asset.captions ? { captionsMediaId: ids[asset.captions] } : {}),
});
let records = await refresh();
// Manifest order is dependency-first. Reuse only byte-verified, already-public
// media with an identical draft; never publish or rewrite somebody else's draft.
for (const asset of assets) {
  for (const record of records.filter(
    (r) =>
      r.kind === 'media' &&
      r.published &&
      canonical(r.draft) === canonical(r.published) &&
      canonical(r.draft) === canonical(metadata(asset, r.id)),
  )) {
    const bytes = await (await request('/media/' + record.id)).arrayBuffer();
    if (
      createHash('sha256').update(new Uint8Array(bytes)).digest('hex') ===
      asset.sha256
    ) {
      ids[asset.key] = record.id;
      break;
    }
  }
}
let plan = caseStudyPopulationPlan(records, ids);
const eligible = new Set(
  [...plan.update, ...plan.create].map((entry) => entry.slug),
);
const neededKeys = new Set(
  [...eligible].flatMap((slug) => CASE_STUDY_SAMPLE_ASSETS[slug]),
);
const needed = assets.filter((asset) => neededKeys.has(asset.key));
const missing = needed.filter((asset) => !ids[asset.key]);
const displayPlan = {
  mode: apply ? 'applying' : 'dry-run',
  base,
  create: plan.create.map(({ seedId, slug }) => ({ seedId, slug })),
  update: plan.update.map(({ id, slug, unchanged }) => ({
    id,
    slug,
    unchanged:
      unchanged && CASE_STUDY_SAMPLE_ASSETS[slug].every((key) => ids[key]),
  })),
  skipped: plan.skipped,
  reusableAssets: needed
    .filter((asset) => ids[asset.key])
    .map((asset) => asset.key),
  missingAssets: missing.map(({ key, file, size }) => ({ key, file, size })),
  intendedSampleCounts: {
    all: 6,
    product: 3,
    systems: 2,
    interfaces: 1,
    research: 0,
  },
  note: 'Owner records are preserved. Actual totals can differ when records are edited, skipped or additional content exists. New local records receive ordinary API-generated IDs; fresh databases use stable seed IDs.',
};
console.log(JSON.stringify(displayPlan, null, 2));
if (!apply) process.exit(0);

// Validate every planned upload before making any write.
const uploadBytes = new Map();
for (const asset of missing) {
  const bytes = await readFile(
    resolve(root, 'scripts/assets/project-demos', asset.file),
  );
  if (
    bytes.length !== asset.size ||
    createHash('sha256').update(bytes).digest('hex') !== asset.sha256
  )
    throw new Error(
      'Checked-in media differs from its manifest: ' + asset.file,
    );
  uploadBytes.set(asset.key, bytes);
}
let uploaded = 0,
  updated = 0,
  created = 0;
for (const asset of missing) {
  const form = new FormData();
  form.set(
    'file',
    new File([uploadBytes.get(asset.key)], asset.file, { type: asset.mime }),
  );
  form.set('alt', asset.alt);
  const result = await (
    await request('/api/admin/upload', {
      method: 'POST',
      headers: { Origin: base },
      body: form,
    })
  ).json();
  ids[asset.key] = result.id;
  records = await refresh();
  const record = records.find((r) => r.id === result.id);
  const saved = await action({
    action: 'save',
    id: record.id,
    revision: record.revision,
    data: metadata(asset, record.id),
  });
  const current = saved.records.find((r) => r.id === record.id);
  await action({
    action: 'publish',
    id: current.id,
    revision: current.revision,
  });
  uploaded++;
}
// Recompute before each story so revisions, edited drafts and newly occupied
// slugs are checked after uploads and after every earlier write.
for (const slug of eligible) {
  records = await refresh();
  plan = caseStudyPopulationPlan(records, ids);
  const update = plan.update.find((item) => item.slug === slug);
  const create = plan.create.find((item) => item.slug === slug);
  if (update?.unchanged || (!update && !create)) continue;
  const item = update || create;
  const saved = await action({
    action: 'save',
    kind: 'experience',
    ...(update ? { id: update.id, revision: update.revision } : {}),
    data: item.data,
  });
  const current = saved.records.find((r) => r.id === saved.id);
  // The save/publish boundary is revision-checked; concurrent owner edits fail
  // instead of publishing a different revision from the reviewed sample.
  await action({
    action: 'publish',
    id: current.id,
    revision: current.revision,
  });
  if (update) updated++;
  else created++;
}
records = await refresh();
plan = caseStudyPopulationPlan(records, ids);
const counts = { all: 0, product: 0, systems: 0, interfaces: 0, research: 0 };
for (const record of records.filter(
  (r) => r.kind === 'experience' && r.published,
)) {
  counts.all++;
  for (const category of record.published.categories || [])
    if (category !== 'all' && category in counts) counts[category]++;
}
console.log(
  JSON.stringify(
    {
      mode: 'applied',
      uploaded,
      updated,
      created,
      counts,
      skipped: plan.skipped,
    },
    null,
    2,
  ),
);
