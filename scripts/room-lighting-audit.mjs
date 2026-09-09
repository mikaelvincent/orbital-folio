import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2] || process.cwd());
const req = createRequire(pathToFileURL(join(root, 'package.json')));
const THREE = await import(pathToFileURL(req.resolve('three')).href);
globalThis.document = {
  // oxlint-disable-next-line typescript/no-deprecated -- Scoped CPU canvas stub.
  createElement() {
    const ctx = new Proxy(
      {},
      {
        get(t, k) {
          if (k in t) return t[k];
          if (k === 'measureText')
            return (text) => ({
              width:
                text.length *
                Number((t.font || '10px').match(/[\d.]+(?=px)/)?.[0] || 10) *
                0.58,
            });
          if (k === 'createLinearGradient')
            return () => ({ addColorStop() {} });
          return () => {};
        },
      },
    );
    return {
      width: 0,
      height: 0,
      getContext() {
        return ctx;
      },
    };
  },
};
const file = join(root, 'components/spacecraft-model.ts');
const { createSpacecraft } = await import(pathToFileURL(file).href);
const fixture = Array.from({ length: 9 }, (_, i) => ({
  title: `Dummy ${i + 1}`,
  slug: `dummy-${i + 1}`,
}));
const model = createSpacecraft(THREE, {
  projects: fixture,
  caseStudies: fixture,
  labels: {
    experience: 'Case studies',
    projects: 'Projects',
    about: 'About',
    contact: 'Contact',
  },
  vesselName: 'Review fixture',
});
delete globalThis.document;
const checks = [];
const rows = [
  [
    'idle',
    '',
    { activeRoom: 'home', travelling: false, transitRoom: '' },
    [0.1, 0.1, 0.1, 0.1],
  ],
  [
    'hover-case-studies',
    'experience',
    { activeRoom: 'home', travelling: false, transitRoom: '' },
    [0.5, 0.1, 0.1, 0.1],
  ],
  [
    'selected-case-studies',
    '',
    { activeRoom: 'experience', travelling: false, transitRoom: '' },
    [1, 0.1, 0.1, 0.1],
  ],
  [
    'transit-projects-destination-contact',
    'experience',
    { activeRoom: 'contact', travelling: true, transitRoom: 'projects' },
    [0.1, 0.5, 0.1, 0.1],
  ],
  [
    'transit-left-passage',
    'contact',
    { activeRoom: 'contact', travelling: true, transitRoom: '' },
    [0.1, 0.1, 0.1, 0.1],
  ],
  [
    'transit-about',
    '',
    { activeRoom: 'contact', travelling: true, transitRoom: 'about' },
    [0.1, 0.1, 0.5, 0.1],
  ],
  [
    'arrived-contact',
    '',
    { activeRoom: 'contact', travelling: false, transitRoom: '' },
    [0.1, 0.1, 0.1, 1],
  ],
];
const order = ['experience', 'projects', 'about', 'contact'];
for (const [name, hover, state, expected] of rows) {
  model.update(0, hover, true, state);
  const metadata = structuredClone(model.group.userData.lightingState);
  for (const [i, key] of order.entries()) {
    assert.equal(metadata[key].targetLevel, expected[i]);
    assert.equal(metadata[key].level, expected[i]);
    assert.equal(metadata[key].exteriorColor, 1);
  }
  checks.push({
    name,
    levels: order.map((key) => metadata[key].level),
    metadata,
  });
}
assert.deepEqual(model.group.userData.circulation, order);
assert.deepEqual(
  model.portalTargets.map((p) => [p.from, p.to, p.edge]),
  [
    ['experience', 'projects', 'left'],
    ['projects', 'experience', 'right'],
    ['projects', 'about', 'left'],
    ['about', 'projects', 'left'],
    ['about', 'contact', 'right'],
    ['contact', 'about', 'left'],
  ],
);
assert.equal(model.group.userData.branding.length, 1);
const output = {
  scope:
    'Bounded independent current-model checks; no browser or UI workflow, Canvas text is a stub',
  sourceHash: createHash('sha256').update(readFileSync(file)).digest('hex'),
  passed: true,
  lightingStates: checks,
  circulation: model.group.userData.circulation,
  portals: model.portalTargets.map((p) => ({
    from: p.from,
    to: p.to,
    edge: p.edge,
  })),
  branding: model.group.userData.branding,
};
writeFileSync(
  process.argv[3] || '/tmp/room-lighting-audit.json',
  JSON.stringify(output, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    {
      passed: true,
      sourceHash: output.sourceHash,
      states: checks.map(({ name, levels }) => ({ name, levels })),
      circulation: output.circulation,
      portalCount: output.portals.length,
      brandCount: output.branding.length,
    },
    null,
    2,
  ),
);
