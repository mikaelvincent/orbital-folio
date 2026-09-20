import { createHash } from 'node:crypto';
import { sampleProjectData } from '../../lib/content/sample-projects.mjs';
// Exact pre-rich-story shipped seed data. IDs are intentionally excluded: the
// existing local grid fixtures were imported through Studio and received UUIDs.
export const ORIGINAL_SAMPLE_HASHES = {
  relay: '0abf4d82e70715915529341f6b4f1e0e9139d8e26a6bd753bc7fbe586c1ee23f',
  fieldnotes:
    '525a6a220a44d3741b327b170efd1034e652d484bebe637b949db4682d6f00b8',
  meter: 'd81a2e617597ad6f5e8636a56612838518da07eda4cb982611a780f4c0d02cdf',
  beacon: 'e15fbeffd036602d8778bf1ad6f63e80da25fcd80251c5c9ba1fc8dee8a66eb4',
  parcel: '58e17cff68ecc42bea571a8e54894613ed452280fa369ba8c863e19b71f21639',
  tempo: '9fff5ac3cdbd2d6b079a4cea41c818b00addb24949c9abd29fe4ad4810b9f28b',
  ledger: '8d5f7cc1c2e05632da4056aaaa0d60def891c6f51aba2f7933ca616ea6743e0b',
  harbor: '1b068fa6dffa591be5c337cdd60225d03c8b003a20831de0da40969b3ac44633',
  atlas: 'ad02fb0283e8170ce975901b7673ddcae32df6314c0357b1e8933123149e673a',
};
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => JSON.stringify(key) + ':' + canonical(v))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
export const contentHash = (value) =>
  createHash('sha256').update(canonical(value)).digest('hex');
export function localBase(value = 'http://localhost:3000') {
  const url = new URL(value);
  if (
    url.protocol !== 'http:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password
  )
    throw new Error(
      'Demo population is restricted to an HTTP loopback development server.',
    );
  return url.origin;
}
export function samplePopulationPlan(records, seeds, assets = {}) {
  const update = [],
    skipped = [];
  for (const seed of seeds.filter(
    (s) => s.kind === 'project' && s.data.sample,
  )) {
    const current = records.find(
      (r) => r.kind === 'project' && r.draft.slug === seed.data.slug,
    );
    if (!current) {
      skipped.push({
        slug: seed.data.slug,
        reason:
          'No existing published seed; no owner records are created or replaced.',
      });
      continue;
    }
    if (
      !current.draft.sample ||
      !current.published?.sample ||
      canonical(current.draft) !== canonical(current.published)
    ) {
      skipped.push({
        slug: seed.data.slug,
        reason: 'Unpublished, non-sample or contains private draft changes.',
      });
      continue;
    }
    const rich = sampleProjectData(seed.data, assets);
    const hash = contentHash(current.draft);
    if (
      ![
        ORIGINAL_SAMPLE_HASHES[seed.data.slug],
        contentHash(seed.data),
        contentHash(rich),
      ].includes(hash)
    ) {
      skipped.push({
        slug: seed.data.slug,
        reason:
          'Content differs from known shipped/demo data; preserve owner edits.',
      });
      continue;
    }
    update.push({
      id: current.id,
      slug: seed.data.slug,
      revision: current.revision,
      data: rich,
      unchanged: canonical(current.draft) === canonical(rich),
    });
  }
  return { update, skipped };
}
