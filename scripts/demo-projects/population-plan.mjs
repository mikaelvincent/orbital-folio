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
// Exact rich-story version shipped through 4a1f715, before the nested examples.
// Populated hashes use demo-<asset key> IDs; local IDs are normalized only after
// the population command has verified their bytes and metadata against its
// managed-media manifest. Every other field must still match exactly.
const PREVIOUS_RICH_SAMPLE_HASHES = {
  relay: {
    seed: '9dde8b3592fe4b905d5fce72b79ad56d01b5dc141fceb39b083c4ce891187080',
    populated:
      'c13b7f0d2a7184c8b8c57bf9963eba889892401774944189ae626b1baf8998a0',
  },
  fieldnotes: {
    seed: '2aa84c251213e0661beb438ea84fe3c2164a032817ceab9768abb9cb4c935b62',
    populated:
      'ffa1d36a7951705367ccb658c6fee1099382f33b0961d8b18c9b76dcfeda0830',
  },
  meter: {
    seed: 'f31fb9774a9e0ff076374b276dfeb140e92db6c0e0186905339cfde60685eb82',
    populated:
      'f4a2afd2c9875ea7fb9c3aa4f00f00ee1e4cca8147934464b54d3ba094c49b25',
  },
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
function knownMediaHash(data, assets) {
  const normalizedIds = new Map(
    Object.entries(assets).map(([key, id]) => [id, 'demo-' + key]),
  );
  return contentHash({
    ...data,
    mediaId: normalizedIds.get(data.mediaId) || data.mediaId,
    body: String(data.body || '').replace(
      /\/media\/([a-zA-Z0-9_-]+)/g,
      (url, id) =>
        normalizedIds.has(id) ? '/media/' + normalizedIds.get(id) : url,
    ),
  });
}
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
    const previous = PREVIOUS_RICH_SAMPLE_HASHES[seed.data.slug];
    const knownPrevious =
      previous &&
      (hash === previous.seed ||
        knownMediaHash(current.draft, assets) === previous.populated);
    if (
      !knownPrevious &&
      ![
        ORIGINAL_SAMPLE_HASHES[seed.data.slug],
        contentHash(seed.data),
        contentHash(rich),
        // Exact last-shipped samples before project dates were retired. Keep
        // every other field in the fingerprint; edited dates are not a match.
        contentHash({ ...seed.data, period: 'Sample project · 2026' }),
        contentHash({ ...rich, period: 'Sample project · 2026' }),
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
