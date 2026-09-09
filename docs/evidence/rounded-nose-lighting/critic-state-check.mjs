import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const root = resolve(process.argv[2] || process.cwd());
const req = createRequire(pathToFileURL(join(root, 'package.json')));
const THREE = await import(pathToFileURL(req.resolve('three')).href);
const { createSpacecraft } = await import(
  pathToFileURL(join(root, 'components/spacecraft-model.ts')).href
);
const model = createSpacecraft(THREE, { projects: [], caseStudies: [] });
const base = {
  activeRoom: 'home',
  travelling: false,
  transitRoom: '',
  transitWalkway: false,
  hoveredWalkway: false,
  reading: false,
  hoveredPortal: '',
};
const materials = new Map();
model.group.traverse((o) => {
  if (o.material) materials.set(o.material.uuid, o.material);
});
const exterior = [...materials.values()].filter((m) => m.userData.exterior);
const exteriorSnapshot = () =>
  exterior.map((m) => ({
    id: m.uuid,
    color: m.color.toArray(),
    emissive: m.emissive.toArray(),
    intensity: m.emissiveIntensity,
  }));
const expectedExterior = exteriorSnapshot();
const records = [];
function check(name, state, hover, expected) {
  model.update(0, hover, true, { ...base, ...state });
  const levels = Object.fromEntries(
    Object.entries(model.group.userData.lightingState).map(([s, x]) => [
      s,
      x.level,
    ]),
  );
  assert.deepEqual(levels, expected, name);
  assert.deepEqual(
    exteriorSnapshot(),
    expectedExterior,
    'Exterior invariant ' + name,
  );
  records.push({ name, levels, exteriorInvariant: true });
}
const idle = {
  projects: 0.5,
  experience: 0.5,
  about: 0.5,
  contact: 0.5,
  walkway: 0.5,
};
assert.deepEqual(
  Object.fromEntries(
    Object.entries(model.group.userData.lightingState).map(([s, x]) => [
      s,
      x.level,
    ]),
  ),
  idle,
  'Constructor initializes half brightness before first frame',
);
check('idle', {}, '', idle);
check('hover Projects', {}, 'projects', { ...idle, projects: 1 });
check('About selected plus Contact hover', { activeRoom: 'about' }, 'contact', {
  ...idle,
  about: 1,
  contact: 1,
});
check('walkway hover rejected at overview', { hoveredWalkway: true }, '', idle);
check(
  'walkway hover inside About',
  { activeRoom: 'about', hoveredWalkway: true },
  '',
  { ...idle, about: 1, walkway: 1 },
);
check(
  'room crossed before eventual Contact',
  { activeRoom: 'contact', travelling: true, transitRoom: 'projects' },
  'contact',
  { ...idle, projects: 1 },
);
check(
  'actual walkway crossing',
  { activeRoom: 'contact', travelling: true, transitWalkway: true },
  'contact',
  { ...idle, walkway: 1 },
);
check(
  'hover flag ignored while in unoccupied transit',
  { activeRoom: 'contact', travelling: true, hoveredWalkway: true },
  'contact',
  idle,
);
check('settled Contact', { activeRoom: 'contact' }, '', {
  ...idle,
  contact: 1,
});
check('return to overview', {}, '', idle);
const geometry = [];
for (const layout of ['wide', 'compact']) {
  model.setLayout(layout);
  const d = model.group.userData;
  assert.equal(d.portals.length, 6);
  for (const p of d.portals) {
    assert.deepEqual(p.symbolSides, ['left', 'right']);
    assert.equal(
      p.directionSymbol,
      p.via
        ? p.to === 'projects'
          ? 'ladder-up'
          : 'ladder-down'
        : 'door-forward-up',
    );
  }
  geometry.push({
    layout,
    overviewBounds: d.overviewBounds,
    walkwayProfile: d.walkwayProfile,
    portals: d.portals.map((p) => ({
      id: p.id,
      directionSymbol: p.directionSymbol,
      symbolSides: p.symbolSides,
      open: p.open,
    })),
  });
}
const result = {
  scope:
    'Independent focused current-source state checks; no canvas or GPU image-quality claim; empty data fixtures do not test readers',
  constructorIdleCorrect: true,
  exteriorMaterialCount: exterior.length,
  records,
  geometry,
  passed: true,
};
writeFileSync(
  process.argv[3] || '/tmp/rounded-nose-independent.json',
  JSON.stringify(result, null, 2),
);
console.log(
  JSON.stringify({
    passed: true,
    states: records.length,
    layouts: geometry.length,
    exteriorMaterialCount: exterior.length,
  }),
);
