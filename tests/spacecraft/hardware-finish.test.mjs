import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PALETTE } from '../../lib/palette.ts';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';

// Observe the actual source passed through roomMat and into the iris builder.
// The final status lens deliberately overrides its source's roughness/metalness.
const routePaintSources = new Set();
class ObservedMaterial extends THREE.MeshStandardMaterial {
  clone() {
    if (this.name.startsWith('route-paint-')) routePaintSources.add(this);
    return super.clone();
  }
}
const model = createSpacecraft({
  ...THREE,
  MeshStandardMaterial: ObservedMaterial,
});
const layouts = ['wide', 'compact'];
let time = 0;

function materials(visible = false) {
  const result = new Set();
  model.group[visible ? 'traverseVisible' : 'traverse']((object) => {
    for (const material of [].concat(object.material || []))
      result.add(material);
  });
  return [...result];
}

const finish = (material) => [
  material.roughness,
  material.metalness,
  material.envMapIntensity,
];
const authored = (material) => ({
  baseColor:
    material.userData.baseColor?.toArray?.() ?? material.userData.baseColor,
  baseEmissive:
    material.userData.baseEmissive?.toArray?.() ??
    material.userData.baseEmissive,
  baseIntensity: material.userData.baseIntensity,
  highlightScale: material.userData.highlightScale,
  exterior: material.userData.exterior,
  surfaceOnly: material.userData.surfaceOnly,
  map: material.map,
  emissiveMap: material.emissiveMap,
  bumpMap: material.bumpMap,
  onBeforeCompile: material.onBeforeCompile,
  customProgramCacheKey: material.customProgramCacheKey,
});
const initial = new Map(
  materials().map((material) => [material, authored(material)]),
);
const named = (all, name) =>
  all.filter(
    (material) =>
      material.name === name || material.name.startsWith(name + '-'),
  );

function step(state = {}, active = '') {
  model.update(++time, active, true, {
    activeRoom: 'home',
    hoveredObject: '',
    hoveredPortal: '',
    hoveredWalkway: false,
    travelling: false,
    transitRoom: '',
    transitWalkway: false,
    reading: false,
    openPortalIds: [],
    immediateDoors: true,
    ...state,
  });
}

const hardwareFamilies = {
  alloy: [
    'brushed-titanium',
    'case-archive-fasteners',
    'projects-workshop-satin-fasteners',
    ...['all', 'systems', 'interfaces', 'experiments'].map(
      (kind) => `projects-workshop-satin-fasteners-projects-screen-${kind}`,
    ),
    'contact-flight-satin-alloy',
    'personal-study-satin-fixings',
    'outboard-communications-brushed-alloy',
    'outboard-recorder-brushed-alloy',
    'service-spine-satin-alloy',
    'docking-shoulder-tool-satin-alloy',
    'ladder-web-satin-alloy',
    ...['projects', 'experience', 'about', 'contact'].map(
      (room) => `${room}-utility-alloy`,
    ),
  ],
  bronze: [
    'signal-amber',
    'case-archive-amber-retainers',
    'projects-workshop-bench-amber',
    ...['all', 'systems', 'interfaces', 'experiments'].map(
      (kind) => `projects-workshop-amber-latches-projects-screen-${kind}`,
    ),
    'contact-flight-amber',
    'personal-study-amber-hardware',
    'outboard-communications-bronze',
    'outboard-recorder-bronze',
    'service-spine-anodized-grips',
    'docking-shoulder-tool-retention-markers',
    'ladder-web-captive-handles',
    ...['projects', 'experience', 'contact'].map(
      (room) => `${room}-utility-retainers`,
    ),
  ],
};

for (const layout of layouts) {
  test(`${layout}: assembled hardware keeps a common finish through layout, room and interaction updates`, () => {
    model.setLayout(layout);
    const states = [
      {},
      { activeRoom: 'projects', hoveredObject: 'projects-screen-all' },
      { activeRoom: 'experience', hoveredObject: 'case-study-screen-product' },
      { activeRoom: 'contact', hoveredObject: 'contact-social-left' },
      { activeRoom: 'about', hoveredObject: 'about-notebook' },
      { activeRoom: 'projects', hoveredPortal: 'about', hoveredWalkway: true },
      {
        activeRoom: 'about',
        travelling: true,
        transitRoom: 'projects',
        transitWalkway: true,
      },
    ];
    for (const state of states) {
      step(state);
      const visible = materials(true);
      // Presence checks include the bench and every removable display: filtering
      // only by the new tag would miss an accidentally unconverted material.
      for (const [kind, names] of Object.entries(hardwareFamilies)) {
        for (const name of names) {
          const matches = named(visible, name);
          assert.ok(matches.length, `${layout}: visible ${name} exists`);
          for (const material of matches)
            assert.equal(material.userData.hardwareFinish, kind, material.name);
        }
      }
      for (const material of visible.filter((m) => m.userData.hardwareFinish)) {
        const kind = material.userData.hardwareFinish;
        assert.ok(kind === 'alloy' || kind === 'bronze');
        assert.deepEqual(
          finish(material),
          [0.46, kind === 'alloy' ? 0.6 : 0.2, 0.35],
          material.name,
        );
        assert.equal(
          material.userData.baseColor.getHexString(),
          new THREE.Color(PALETTE[kind]).getHexString(),
          material.name,
        );
        assert.deepEqual(
          authored(material),
          initial.get(material),
          `${material.name}: finish does not replace paint, emission, textures or feedback metadata`,
        );
      }
    }
  });
}

test('Iris route paint is separate from bronze hardware through source cloning and visible feedback', () => {
  assert.ok(routePaintSources.size, 'Observe the real route-paint clone chain');
  for (const source of routePaintSources) {
    assert.equal(source.userData.hardwareFinish, undefined, source.name);
    assert.deepEqual(finish(source), [0.25, 0.055, 1], source.name);
    assert.equal(source.userData.highlightScale, 0, source.name);
    assert.equal(source.userData.surfaceOnly, true, source.name);
  }
  for (const layout of layouts) {
    model.setLayout(layout);
    for (const state of [
      {},
      { activeRoom: 'experience', hoveredPortal: 'projects' },
      { activeRoom: 'projects', hoveredPortal: 'about' },
      {
        activeRoom: 'about',
        travelling: true,
        transitWalkway: true,
        openPortalIds: ['about:projects'],
      },
      {},
    ]) {
      step(state);
      for (const hatch of model.group.userData.irisHatches) {
        const lenses = new Set();
        hatch.traverse((object) => {
          if (object.name.startsWith('iris-status-lens-'))
            lenses.add(object.material);
        });
        assert.ok(
          lenses.size,
          'Each physical iris retains visible status lenses',
        );
        const highlight = hatch.userData.highlight;
        for (const lens of lenses) {
          assert.equal(lens.userData.hardwareFinish, undefined);
          assert.deepEqual(
            finish(lens),
            [0.4, 0, 1],
            'Indicator lenses keep the original paint response',
          );
          const expected = new THREE.Color(PALETTE.bronze).multiplyScalar(
            0.34 + highlight * 0.66,
          );
          assert.ok(
            lens.color.equals(expected),
            'Route brightness follows its existing highlight',
          );
          assert.equal(
            lens.emissive.getHexString(),
            new THREE.Color(PALETTE.bronze).getHexString(),
          );
          assert.equal(lens.emissiveIntensity, 0.07 + highlight * 1.6);
        }
      }
    }
  }
});

test('Bright treads, natural study materials, carbon, screens, solar and light optics remain distinct', () => {
  // These are the protected material families most exposed to a factory-wide
  // override. Check their real emitted descendants, including interactive clones.
  /** @type {Array<[string, number[], boolean?]>} */
  const exceptions = [
    ['plain-cabin-enamel', [0.82, 0, 1]],
    ['plain-carbon-deck', [0.68, 0.04, 1]],
    ['service-spine-brushed-tread-alloy', [0.5, 0.25, 0.1]],
    ['service-spine-control-index-paint', [1, 0, 0.1]],
    ['personal-study-navy-cloth', [0.97, 0, 0.07]],
    ['personal-study-oatmeal-weave', [0.99, 0, 0.07]],
    ['personal-study-stored-quilt', [0.99, 0, 0.07]],
    ['personal-study-page-edges', [0.98, 0, 0.07]],
    ['personal-study-warm-composite-writing-insert', [0.7, 0.02, 0.07]],
    ['projects-workshop-graphite-enclosure', [0.69, 0.12, 0.06]],
    ['projects-workshop-all-screen', [1, 1, 0]],
    ['case-archive-terminal-screen-ink', [1, 0, 0]],
    ['contact-flight-screen', [0.76, 0.02, 0.06]],
    ['solar-cells', [0.49, 0.16, 1], true],
    ['solar-cells-alt', [0.52, 0.16, 1]],
    ['solar-conductors', [0.56, 0.3, 1]],
    ['warm-light', [0.3, 0, 1]],
    ['projects-workshop-task-diffuser', [0.55, 0, 1]],
    ['personal-study-reading-lamp-lens', [0.68, 0, 0.07]],
    ['service-spine-protected-diffuser', [0.6, 0, 0.1]],
    ['outboard-communications-instrument-glass', [0.4, 0, 1]],
    ['window-perimeter-signal', [0.55, 0, 1]],
  ];
  for (const layout of layouts) {
    model.setLayout(layout);
    for (const activeRoom of [
      'home',
      'about',
      'contact',
      'projects',
      'experience',
    ]) {
      step({ activeRoom });
      for (const [name, profile, exact] of exceptions) {
        const matches = materials().filter(
          (material) =>
            material.name === name ||
            (!exact && material.name.startsWith(name + '-')),
        );
        assert.ok(matches.length, `${name} remains present`);
        for (const material of matches) {
          assert.equal(
            material.userData.hardwareFinish,
            undefined,
            material.name,
          );
          assert.deepEqual(finish(material), profile, material.name);
          assert.deepEqual(
            authored(material),
            initial.get(material),
            `${material.name}: preserve authored paint, emission, artwork and shader hooks`,
          );
        }
      }
    }
  }
});
