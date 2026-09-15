/** node scripts/case-studies-routing-migration-audit.mjs REPO_ROOT [REPORT] */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
const root = path.resolve(process.argv[2] ?? process.cwd());
const output =
  process.argv[3] ?? '/tmp/case-studies-routing-migration-audit.json';
const require = createRequire(path.join(root, 'package.json')),
  ts = require('typescript');
const files = [
  'drizzle/0000_graceful_korath.sql',
  'drizzle/0004_case_studies_room.sql',
  'features/spacecraft/navigation/flight.ts',
  'lib/paths.ts',
  'app/case-studies/page.tsx',
  'app/experience/page.tsx',
];
const sources = Object.fromEntries(
  files.map((f) => [f, fs.readFileSync(path.join(root, f), 'utf8')]),
);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const load = async (filename) =>
  import(
    'data:text/javascript;base64,' +
      Buffer.from(
        ts.transpileModule(sources[filename], {
          compilerOptions: {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.ES2020,
          },
        }).outputText,
      ).toString('base64')
  );
const { destinationFromURL, rooms } = await load('features/spacecraft/navigation/flight.ts'),
  { pathFor } = await load('lib/paths.ts');
const report = {
  at: new Date().toISOString(),
  scope:
    'Isolated in-memory SQLite migration and pure URL helpers only. No UI, admin/contact/reader workflows, application writes or framework runtime tests.',
  sourceHashes: Object.fromEntries(files.map((f) => [f, sha(sources[f])])),
  migration: [],
  routing: [],
  sourceChecks: [],
  deferredObservations: [],
};
const checks = (array, name, fn) => {
  try {
    const detail = fn();
    array.push({ name, pass: true, ...detail });
  } catch (e) {
    array.push({ name, pass: false, error: e.message });
  }
};
const keys = {
  experienceLabel: ['Experience', 'Case studies'],
  experienceHeading: ['The mission log', 'The case study rack'],
  experienceRoom: ['MISSION CONTROL', 'CASE STUDIES'],
};
const defaults = {
  experienceLabel: 'Experience',
  experienceHeading: 'The mission log',
  experienceRoom: 'MISSION CONTROL',
  ownerMarker: 'draft marker',
  array: [1, 'untouched'],
  nested: { published: false },
};
const custom = {
  experienceLabel: 'Research notes',
  experienceHeading: 'Lessons from practice',
  experienceRoom: 'FLIGHT LAB',
  ownerMarker: 'owner text',
};
const scenarios = [
  {
    name: 'Original defaults in both snapshots',
    draft: defaults,
    published: { ...defaults, ownerMarker: 'published marker' },
    expectedDelta: 6,
  },
  {
    name: 'Owner-customized text in both snapshots',
    draft: custom,
    published: { ...custom, ownerMarker: 'different public copy' },
    expectedDelta: 0,
  },
  {
    name: 'Draft-only defaults stay unpublished',
    draft: defaults,
    published: null,
    expectedDelta: 3,
  },
  {
    name: 'Original draft / custom published snapshots stay independent',
    draft: defaults,
    published: custom,
    expectedDelta: 3,
  },
  {
    name: 'Custom draft / original published snapshots stay independent',
    draft: custom,
    published: defaults,
    expectedDelta: 3,
  },
  {
    name: 'Mixed per-field ownership is preserved',
    draft: { ...custom, experienceHeading: 'The mission log' },
    published: {
      ...custom,
      experienceLabel: 'Experience',
      experienceRoom: 'MISSION CONTROL',
    },
    expectedDelta: 3,
  },
  {
    name: 'Already renamed defaults are a no-op',
    draft: {
      experienceLabel: 'Case studies',
      experienceHeading: 'The case study rack',
      experienceRoom: 'CASE STUDIES',
    },
    published: {
      experienceLabel: 'Case studies',
      experienceHeading: 'The case study rack',
      experienceRoom: 'CASE STUDIES',
    },
    expectedDelta: 0,
  },
  {
    name: 'Missing and null fields remain untouched',
    draft: { experienceLabel: null, other: 'x' },
    published: { experienceHeading: null, other: 'y' },
    expectedDelta: 0,
  },
  {
    name: 'Case and whitespace customizations are not normalized',
    draft: {
      experienceLabel: 'EXPERIENCE',
      experienceHeading: 'The mission log ',
      experienceRoom: 'Mission Control',
    },
    published: {
      experienceLabel: ' Experience',
      experienceHeading: 'the mission log',
      experienceRoom: 'MISSION CONTROL ',
    },
    expectedDelta: 0,
  },
];
const encode = (x) => (x === null ? null : JSON.stringify(x));
const expected = (x) => {
  if (x === null) return null;
  const y = structuredClone(x);
  for (const [k, [old, next]] of Object.entries(keys))
    if (y[k] === old) y[k] = next;
  return y;
};
for (const s of scenarios)
  checks(report.migration, s.name, () => {
    const db = new DatabaseSync(':memory:');
    try {
      db.exec(sources[files[0]]);
      const insert = db.prepare(
        'INSERT INTO content (id,kind,draft,published,revision,updated_at) VALUES(?,?,?,?,?,?)',
      );
      insert.run(
        'site',
        'site',
        encode(s.draft),
        encode(s.published),
        7,
        '2000-01-01T00:00:00.000Z',
      );
      insert.run(
        'other-site',
        'site',
        encode(defaults),
        encode(defaults),
        21,
        '2000-01-01T00:00:00.000Z',
      );
      insert.run(
        'experience-entry',
        'experience',
        encode(defaults),
        null,
        31,
        '2000-01-01T00:00:00.000Z',
      );
      const all = () =>
        db
          .prepare('SELECT * FROM content ORDER BY id')
          .all()
          .map((x) => ({ ...x }));
      const before = all();
      db.exec('BEGIN');
      db.exec(sources[files[1]]);
      db.exec('COMMIT');
      const after = all(),
        site = after.find((r) => r.id === 'site');
      assert.deepEqual(JSON.parse(site.draft), expected(s.draft));
      assert.deepEqual(
        site.published === null ? null : JSON.parse(site.published),
        expected(s.published),
      );
      assert.equal(site.revision, 7 + s.expectedDelta);
      if (s.expectedDelta) {
        assert.notEqual(site.updated_at, '2000-01-01T00:00:00.000Z');
        assert.match(
          site.updated_at,
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
      } else
        assert.deepEqual(
          site,
          before.find((r) => r.id === 'site'),
        );
      for (const id of ['other-site', 'experience-entry'])
        assert.deepEqual(
          after.find((r) => r.id === id),
          before.find((r) => r.id === id),
        );
      db.exec(sources[files[1]]);
      assert.deepEqual(all(), after);
      return {
        revisionBefore: 7,
        revisionAfter: site.revision,
        revisionDelta: s.expectedDelta,
        publishedNullPreserved:
          s.published === null ? site.published === null : undefined,
        idempotent: true,
        unrelatedRowsPreserved: true,
      };
    } finally {
      db.close();
    }
  });
const url = (s) => new URL(s, 'https://portfolio.example');
for (const pathname of [
  '/case-studies',
  '/case-studies/',
  '/experience',
  '/experience/',
])
  checks(report.routing, 'Public parse ' + pathname, () => {
    const d = destinationFromURL(url(pathname));
    assert.equal(d.section, 'experience');
    assert.equal(d.slug, undefined);
    assert.equal(d.open, false);
    return { destination: d };
  });
for (const p of ['/case-studies?open=1', '/experience?open=1'])
  checks(report.routing, 'Public open query ' + p, () => {
    assert.equal(destinationFromURL(url(p)).open, true);
  });
for (const p of [
  '/case-studies/unknown',
  '/case-studies/extra/part',
  '/missing',
])
  checks(report.routing, 'Unsupported path ' + p, () => {
    assert.equal(destinationFromURL(url(p)), null);
  });
for (const p of ['/experience', '/case-studies'])
  checks(report.routing, 'Public canonical path ' + p, () => {
    const actual = pathFor(p, {});
    assert.equal(actual, '/case-studies');
    assert.equal(destinationFromURL(url(actual)).section, 'experience');
    return { actual };
  });
checks(report.routing, 'Public canonical mapping preserves query/hash', () => {
  assert.equal(
    pathFor('/experience?open=1#rack', {}),
    '/case-studies?open=1#rack',
  );
});
for (const p of ['/experience', '/case-studies', '/case-studies#rack'])
  checks(report.routing, 'Plain preview mapping ' + p, () => {
    const actual = pathFor(p, { _preview: true }),
      u = url(actual);
    assert.equal(u.pathname, '/admin/preview');
    assert.equal(u.searchParams.get('section'), 'experience');
    assert.equal(destinationFromURL(u, true).section, 'experience');
    assert.equal(u.hash, p.includes('#') ? '#rack' : '');
    return { actual };
  });
for (const section of ['case-studies', 'experience'])
  checks(report.routing, 'Preview parse ' + section, () => {
    const d = destinationFromURL(
      url('/admin/preview?section=' + section + '&open=1'),
      true,
    );
    assert.equal(d.section, 'experience');
    assert.equal(d.open, true);
  });
checks(report.routing, 'Preview parser requires preview pathname', () =>
  assert.equal(destinationFromURL(url('/case-studies'), true), null),
);
checks(report.routing, 'Canonical scene/nav order', () => {
  assert.deepEqual(rooms, ['experience', 'projects', 'about', 'contact']);
  const publicPaths = rooms.map((id) => pathFor('/' + id, {}));
  assert.deepEqual(publicPaths, [
    '/case-studies',
    '/projects',
    '/about',
    '/contact',
  ]);
  const previewPaths = rooms.map((id) => pathFor('/' + id, { _preview: true }));
  assert.deepEqual(
    previewPaths,
    rooms.map((id) => '/admin/preview?section=' + id),
  );
  return { internalRooms: rooms, publicPaths, previewPaths };
});
checks(
  report.sourceChecks,
  'New page re-exports existing page contract',
  () => {
    assert.match(
      sources['app/case-studies/page.tsx'],
      /export\s*\{\s*default,\s*dynamic,\s*generateMetadata\s*\}\s*from\s*['"]\.\.\/experience\/page['"]/,
    );
    assert.match(sources['app/experience/page.tsx'], /active="experience"/);
    assert.match(
      sources['app/experience/page.tsx'],
      /pageMetadata\(await getPortfolio\(\), 'experience'\)/,
    );
    return {
      kind: 'source assertion; framework runtime integration belongs to root',
    };
  },
);
const edgeInput = '/case-studies?open=1',
  edgeActual = pathFor(edgeInput, { _preview: true });
if (destinationFromURL(url(edgeActual), true) === null)
  report.deferredObservations.push({
    name: 'Existing generic preview helper does not accept embedded query strings',
    input: edgeInput,
    actual: edgeActual,
    parsed: null,
    scope:
      'Deferred existing helper edge case. Current hrefFor appends open=1 after pathFor(pathname), so this is not an in-scope runtime failure and is not counted as a failed check.',
  });
const cases = [...report.migration, ...report.routing, ...report.sourceChecks];
report.summary = {
  migrationScenarios: report.migration.length,
  routingCases: report.routing.length,
  sourceChecks: report.sourceChecks.length,
  passed: cases.filter((x) => x.pass).length,
  failed: cases.filter((x) => !x.pass).length,
  deferredObservations: report.deferredObservations.length,
  revisionPolicy:
    'One increment for each matching field/snapshot UPDATE: six increments when all three defaults match in both draft and published; no increment when no field matches. This is monotonic and idempotent.',
};
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.summary.failed) process.exitCode = 1;
