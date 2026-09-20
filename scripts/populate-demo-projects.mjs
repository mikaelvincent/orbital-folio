/** Explicit local-only demo update. Dry-run by default; pass --apply to upload
 * managed assets and publish only untouched known sample projects. */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { seeds } from '../lib/content/seed.ts';
import {
  localBase,
  canonical,
  samplePopulationPlan,
} from './demo-projects/population-plan.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const base = localBase(process.env.TEST_BASE_URL || 'http://localhost:3000');
const apply = process.argv.includes('--apply');
const manifest = JSON.parse(
  await readFile(
    resolve(root, 'scripts/assets/project-demos/manifest.json'),
    'utf8',
  ),
);
const request = async (path, init = {}) => {
  const response = await fetch(base + path, {
    ...init,
    redirect: 'error',
    headers: { Cookie: '__sites_local_auth=1', ...init.headers },
  });
  if (!response.ok)
    throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response;
};
const refresh = async () =>
  (await (await request('/api/admin')).json()).records;
const action = async (body) =>
  await (
    await request('/api/admin', {
      method: 'POST',
      headers: { Origin: base, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  ).json();
let records = await refresh();
const ids = {},
  existingAssets = new Map();
function metadata(asset, id) {
  return {
    title: asset.title,
    alt: asset.alt,
    url: '/media/' + id,
    mime: asset.mime,
    size: asset.size,
    order: 0,
    ...(asset.poster ? { posterMediaId: ids[asset.poster] } : {}),
    ...(asset.captions ? { captionsMediaId: ids[asset.captions] } : {}),
  };
}
for (const asset of manifest.assets) {
  for (const record of records.filter(
    (r) =>
      r.kind === 'media' &&
      r.draft.title === asset.title &&
      r.draft.mime === asset.mime &&
      r.draft.size === asset.size,
  )) {
    if (canonical(record.draft) !== canonical(metadata(asset, record.id)))
      continue;
    if (
      record.published &&
      canonical(record.published) !== canonical(record.draft)
    )
      continue;
    const bytes = await (await request('/media/' + record.id)).arrayBuffer();
    if (
      createHash('sha256').update(new Uint8Array(bytes)).digest('hex') !==
      asset.sha256
    )
      continue;
    ids[asset.key] = record.id;
    existingAssets.set(asset.key, record);
    break;
  }
}
let plan = samplePopulationPlan(records, seeds, ids);
if (!apply) {
  console.log(
    JSON.stringify(
      {
        mode: 'dry-run',
        projects: plan.update.map((p) => ({
          slug: p.slug,
          unchanged: p.unchanged,
        })),
        skipped: plan.skipped,
        missingAssets: manifest.assets
          .filter((a) => !ids[a.key])
          .map((a) => a.file),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
const eligible = new Set(plan.update.map((p) => p.slug));
const needed = manifest.assets.filter(
  (a) =>
    eligible.has(a.key) ||
    (eligible.has('relay') && a.key.startsWith('relay-')),
);
let uploaded = 0,
  publishedAssets = 0,
  updatedProjects = 0;
for (const asset of needed) {
  let record = existingAssets.get(asset.key);
  if (!record) {
    const bytes = await readFile(
      resolve(root, 'scripts/assets/project-demos', asset.file),
    );
    if (
      bytes.length !== asset.size ||
      createHash('sha256').update(bytes).digest('hex') !== asset.sha256
    )
      throw new Error('Generated asset does not match manifest: ' + asset.file);
    const form = new FormData();
    form.set('file', new File([bytes], asset.file, { type: asset.mime }));
    form.set('alt', asset.alt);
    const uploadedResult = await (
      await request('/api/admin/upload', {
        method: 'POST',
        headers: { Origin: base },
        body: form,
      })
    ).json();
    ids[asset.key] = uploadedResult.id;
    records = await refresh();
    record = records.find((r) => r.id === uploadedResult.id);
    const saved = await action({
      action: 'save',
      id: record.id,
      revision: record.revision,
      data: metadata(asset, record.id),
    });
    records = saved.records;
    record = records.find((r) => r.id === record.id);
    uploaded++;
  }
  if (!record.published) {
    const result = await action({
      action: 'publish',
      id: record.id,
      revision: record.revision,
    });
    records = result.records;
    publishedAssets++;
  }
}
// Re-check exact revisions and owner changes after uploads, before touching any project.
records = await refresh();
plan = samplePopulationPlan(records, seeds, ids);
for (const item of plan.update) {
  if (item.unchanged) continue;
  const saved = await action({
    action: 'save',
    id: item.id,
    revision: item.revision,
    data: item.data,
  });
  const record = saved.records.find((r) => r.id === item.id);
  await action({ action: 'publish', id: item.id, revision: record.revision });
  updatedProjects++;
}
const final = await refresh();
const categories = { systems: 0, interfaces: 0, experiments: 0 };
for (const r of final.filter((r) => r.kind === 'project' && r.published))
  for (const category of r.published.categories || [])
    if (category in categories) categories[category]++;
console.log(
  JSON.stringify(
    {
      mode: 'applied',
      uploaded,
      publishedAssets,
      updatedProjects,
      categories,
      skipped: plan.skipped,
      mediaBytes: needed.reduce((n, a) => n + a.size, 0),
    },
    null,
    2,
  ),
);
