import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createObjectHighlight } from '../../features/spacecraft/navigation/interactable-object-highlight.ts';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { resolveSocialScreens } from '../../lib/content/social-links.ts';

test('Object highlights isolate shared materials and do not accumulate brightness', () => {
  const source = new THREE.MeshStandardMaterial({
    color: 0xd0bc94,
    emissive: 0x284363,
    emissiveIntensity: 0.3,
  });
  const build = (id) => {
    const group = new THREE.Group(),
      mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), source);
    group.add(mesh);
    return { group, mesh, highlight: createObjectHighlight(THREE, group, id) };
  };
  const left = build('left'),
    right = build('right');
  const base = source.color.clone();
  left.highlight.update(false, true, 1 / 60, true);
  right.highlight.update(false, true, 1 / 60, true);
  const rightIdle = right.mesh.material.color.clone();
  left.highlight.update(true, true, 1 / 60, true);
  assert.equal(left.group.userData.highlightLevel, 1.15);
  assert.ok(
    source.color.equals(base),
    'Shared room material must remain unchanged',
  );
  assert.ok(
    right.mesh.material.color.equals(rightIdle),
    'Other monitor must not brighten',
  );
  const highlighted = left.mesh.material.color.clone();
  for (let i = 0; i < 100; i++) left.highlight.update(true, true, 1 / 60);
  assert.ok(
    left.mesh.material.color.equals(highlighted),
    'Repeated frames must not accumulate brightness',
  );
  left.highlight.update(false, false, 1 / 60, true);
  assert.ok(
    left.mesh.material.color.equals(base),
    'Overview uses normal room lighting',
  );
  for (const target of [left, right]) {
    target.mesh.geometry.dispose();
    target.mesh.material.dispose();
  }
  source.dispose();
});

test('The shared brightness transition is smooth and independent of refresh rate', () => {
  const simulate = (hz) => {
    const root = new THREE.Group();
    const feedback = createObjectHighlight(THREE, root, 'test');
    for (let i = 0; i < hz / 5; i++) feedback.update(true, true, 1 / hz);
    const value = root.userData.hoverProgress;
    const before = value;
    feedback.update(false, true, 1 / hz);
    assert.ok(
      root.userData.hoverProgress < before && root.userData.hoverProgress > 0,
    );
    return value;
  };
  assert.ok(Math.abs(simulate(30) - simulate(60)) < 1e-12);
  assert.ok(Math.abs(simulate(60) - simulate(120)) < 1e-12);
});

test('Computer and social screens retain native anchors, independent feedback and portal navigation', () => {
  const model = createSpacecraft(THREE, {
    socials: resolveSocialScreens([
      {
        id: 'github',
        title: 'GitHub',
        url: 'https://github.com',
        screen: 'left',
        platform: 'github',
      },
      {
        id: 'linkedin',
        title: 'LinkedIn',
        url: 'https://www.linkedin.com',
        screen: 'right',
        platform: 'linkedin',
      },
    ]),
  });
  assert.equal(model.group.userData.socialScreens.length, 2);
  assert.deepEqual(
    model.group.userData.socialScreens.map((s) => s.interactableId),
    ['contact-social-left', 'contact-social-right'],
  );
  assert.ok(model.portalTargets.length > 0, 'Doors must remain navigable');
  assert.ok(
    model.interactionTargets.every((t) => t.object.userData.isPortal),
    'No furnishing pick proxies remain',
  );
  let openTargets = 0;
  model.group.traverse((o) => {
    if (o.userData.openReader) openTargets++;
  });
  assert.equal(
    openTargets,
    0,
    'Native screen controls do not add invisible furnishing pick volumes',
  );
  assert.ok(
    model.readerSurfaces.contact,
    'The Contact application retains a physical screen surface',
  );
  const computer = model.group.userData.contactComputer;
  assert.equal(model.readerSurfaces.contact, computer.anchor);
  model.update(0.5, 'contact', true, {
    activeRoom: 'contact',
    hoveredObject: 'contact-computer',
  });
  assert.equal(computer.root.userData.highlightLevel, 1.15);
  const revision = model.group.userData.geometryRevision;
  model.update(0.6, 'contact', true, { activeRoom: 'contact', reading: true });
  assert.equal(computer.idleDisplay.visible, false);
  assert.ok(
    model.group.userData.geometryRevision > revision,
    'Screen replacement invalidates contact shading',
  );
  model.update(1, 'contact', true, {
    activeRoom: 'contact',
    reading: false,
    hoveredObject: 'contact-social-left',
  });
  const [left, right] = model.group.userData.socialScreens;
  assert.equal(left.root.userData.highlightLevel, 1.15);
  assert.equal(right.root.userData.highlightLevel, 0.65);
  model.update(2, '', true, {
    activeRoom: 'contact',
    hoveredObject: 'contact-social-left',
    travelling: true,
  });
  assert.equal(
    left.root.userData.hoverProgress,
    0,
    'Travelling clears feedback even if focus was stale',
  );
  const geometries = new Set(),
    materials = new Set();
  model.group.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.material) materials.add(o.material);
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
});
