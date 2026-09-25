import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import * as THREE from 'three';
import {
  responsiveCameraFov,
  overviewCameraDirection,
  overviewCameraRange,
  cursorViewSamples,
} from '../../features/spacecraft/navigation/scene-controls.ts';
import { createVesselCameraFrame } from '../../features/spacecraft/navigation/vessel-camera.ts';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';

const bundled = await build({
  entryPoints: ['features/spacecraft/overview-annotations.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});
const { createOverviewAnnotations } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);

class ElementFixture {
  children = [];
  dataset = {};
  style = {};
  attributes = {};
  offsetWidth = 100;
  offsetHeight = 36;
  classNames = new Set();
  classList = {
    toggle: (name, value) =>
      value ? this.classNames.add(name) : this.classNames.delete(name),
    contains: (name) => this.classNames.has(name),
  };
  appendChild(child) {
    this.children.push(child);
    child.parent = this;
    return child;
  }
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
  removeAttribute(name) {
    delete this.attributes[name];
  }
  remove() {
    if (this.parent)
      this.parent.children = this.parent.children.filter(
        (child) => child !== this,
      );
  }
}

void test('Overview identity remains at its measured layout position when the responsive lens changes', (t) => {
  const host = new ElementFixture();
  host.getBoundingClientRect = () => ({ left: 0, top: 0 });
  const identity = new ElementFixture();
  const flight = new ElementFixture();
  identity.querySelector = () => flight;
  identity.getBoundingClientRect = () => ({
    left: 20,
    top: 30,
    width: host.clientWidth - 40,
    height: 90,
  });
  const documentFixture = {
    createElement: () => new ElementFixture(),
    createElementNS: () => new ElementFixture(),
    querySelector: () => identity,
  };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: documentFixture,
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
  });
  const annotations = createOverviewAnnotations(
    THREE,
    host,
    {},
    { navigate() {} },
  );
  t.after(() => annotations.dispose());
  const model = new THREE.Group();
  model.userData.calloutAnchors = {};
  model.userData.calloutEdges = {};
  model.userData.overviewSupportBounds = [];
  for (const [index, room] of [
    'projects',
    'experience',
    'about',
    'contact',
  ].entries()) {
    const x = index % 2 ? 2 : -2;
    const y = index < 2 ? 2 : -2;
    model.userData.calloutAnchors[room] = [x, y, 0];
    model.userData.calloutEdges[room] = {
      top: [x, y + 0.5, 0],
      bottom: [x, y - 0.5, 0],
      left: [x - 0.5, y, 0],
      right: [x + 0.5, y, 0],
    };
  }
  const support = [
    [-3, -3, 0],
    [3, -3, 0],
    [-3, 3, 0],
    [3, 3, 0],
  ];
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
    [768, 1024],
    [1280, 720],
  ]) {
    host.clientWidth = width;
    host.clientHeight = height;
    const fov = responsiveCameraFov(width / height);
    const frame = {
      target: new THREE.Vector3(),
      direction: new THREE.Vector3(0, 0, 1),
      distance: 12,
      roll: height > width ? Math.PI / 2 : 0,
      fov,
    };
    model.rotation.z = frame.roll;
    model.updateMatrixWorld(true);
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.5, 200);
    camera.position.set(0, 0, frame.distance);
    camera.lookAt(frame.target);
    camera.updateMatrixWorld(true);
    annotations.layout(frame, support, model);
    annotations.update(camera, model, {
      home: true,
      travelling: false,
      reduced: true,
      delta: 0,
      hover: '',
    });
    const values = flight.style.transform
      .match(/translate\(([^p]+)px,([^p]+)px\) scale\(([^)]+)\)/)
      .slice(1)
      .map(Number);
    assert.ok(
      Math.abs(values[0]) < 1e-8 && Math.abs(values[1]) < 1e-8,
      `Identity must stay at its measured screen location for ${width}×${height}: ${values}`,
    );
    assert.ok(
      Math.abs(values[2] - 1) < 1e-8,
      'Neutral overview preserves identity scale',
    );
    assert.equal(flight.style.opacity, '1');
  }
});

const roomNames = ['projects', 'experience', 'about', 'contact'];
const longLabels = {
  projectsLabel: 'Projects and engineering explorations',
  experienceLabel: 'Case studies — systems & product design',
  aboutLabel: 'About the designer and developer',
  contactLabel: 'Contact and collaboration enquiries',
};

// These are explicit DOM measurement inputs, not estimates of browser fonts.
// Live CSS sizing and ellipsis are verified separately in the browser evidence.
function annotationFixture(t) {
  const host = new ElementFixture(),
    identity = new ElementFixture(),
    flight = new ElementFixture();
  host.getBoundingClientRect = () => ({ left: 0, top: 0 });
  identity.querySelector = () => flight;
  identity.getBoundingClientRect = () => ({
    left: 20,
    top: 30,
    width: host.clientWidth - 40,
    height: 64,
  });
  const createElement = (tag) => {
    const element = new ElementFixture();
    element.tagName = tag;
    if (tag === 'button') {
      Object.defineProperty(element, 'offsetWidth', {
        get() {
          const natural =
            {
              projects: 146,
              experience: 240,
              about: 132,
              contact: 152,
            }[element.dataset.section] || 100;
          return Math.min(
            parseFloat(element.style.width) || natural,
            parseFloat(element.style.maxWidth) || Infinity,
          );
        },
      });
      element.offsetHeight = 48;
    }
    return element;
  };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement,
      createElementNS: (_, tag) => createElement(tag),
      querySelector: () => identity,
    },
  });
  const visited = [];
  const annotations = createOverviewAnnotations(THREE, host, longLabels, {
    navigate: (section) => visited.push(section),
  });
  t.after(() => {
    annotations.dispose();
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
  });
  const layer = host.children[0],
    svg = layer.children[0],
    buttons = layer.children.filter((element) => element.tagName === 'button'),
    paths = svg.children.filter((element) => element.tagName === 'path'),
    dots = svg.children.filter((element) => element.tagName === 'circle');
  return { host, flight, layer, buttons, paths, dots, visited, annotations };
}

// Construct the source model before the annotation-only document fixture exists.
const spacecraft = createSpacecraft(THREE);
function projectedFixture(fixture, layout, width, height) {
  spacecraft.setLayout(layout);
  spacecraft.group.updateMatrixWorld(true);
  fixture.host.clientWidth = width;
  fixture.host.clientHeight = height;
  const roll = height > width ? Math.PI / 2 : 0;
  const frame = {
    target: new THREE.Vector3(
      ...spacecraft.group.userData.overviewBounds.center,
    ).applyAxisAngle(new THREE.Vector3(0, 0, 1), roll),
    direction: new THREE.Vector3(
      ...overviewCameraDirection(width / height),
    ).normalize(),
    distance: height > width ? 28 : 32,
    roll,
    fov: responsiveCameraFov(width / height),
  };
  const camera = new THREE.PerspectiveCamera(
    frame.fov,
    width / height,
    0.5,
    200,
  );
  const rig = createVesselCameraFrame(THREE);
  rig.projectionModel.userData = spacecraft.group.userData;
  rig.apply(camera, frame.target, frame.direction, frame.distance, frame.roll);
  fixture.annotations.layout(
    frame,
    spacecraft.group.userData.overviewSupportPoints,
    rig.projectionModel,
  );
  const update = (state = {}) =>
    fixture.annotations.update(rig.virtualCamera, rig.projectionModel, {
      home: true,
      travelling: false,
      reduced: true,
      delta: 0,
      hover: '',
      ...state,
    });
  return { camera, rig, frame, update };
}

function transformOf(button) {
  const values = button.style.transform.match(
    /translate\(([^p]+)px,([^p]+)px\).*scale\(([^)]+)\)/,
  );
  assert.ok(values, 'The native button has a finite projected transform');
  const [x, y, scale] = values.slice(1).map(Number);
  assert.ok([x, y, scale].every(Number.isFinite));
  return {
    x,
    y,
    scale,
    width: button.offsetWidth * scale,
    height: button.offsetHeight * scale,
  };
}

test('Real opening-edge leaders stay attached to the stationary vessel and native label borders across orientation and drag', (t) => {
  const fixture = annotationFixture(t);
  for (const layout of ['wide', 'compact'])
    for (const [width, height] of [
      [1440, 900],
      [844, 390],
      [390, 844],
      [768, 1024],
    ]) {
      const { camera, rig, frame, update } = projectedFixture(
        fixture,
        layout,
        width,
        height,
      );
      const edges = spacecraft.group.userData.calloutEdges;
      const chosen = fixture.dots.map((dot, index) => {
        const anchor = JSON.parse(dot.dataset.localAnchor);
        const admissible = frame.roll ? ['left', 'right'] : ['top', 'bottom'];
        assert.ok(
          admissible.some(
            (edge) =>
              new THREE.Vector3(...edges[roomNames[index]][edge]).distanceTo(
                new THREE.Vector3(...anchor),
              ) < 1e-9,
          ),
          'Leader uses a real opening midpoint in this orientation',
        );
        return anchor;
      });
      let minimumGap = Infinity;
      for (const view of cursorViewSamples(
        {
          target: frame.target.toArray(),
          direction: frame.direction.toArray(),
        },
        height > width ? 8 : 4,
        overviewCameraRange(width / height),
      )) {
        rig.apply(
          camera,
          new THREE.Vector3(...view.target),
          new THREE.Vector3(...view.direction),
          frame.distance,
          frame.roll,
        );
        update();
        for (const [index, button] of fixture.buttons.entries()) {
          const path = fixture.paths[index].attributes.d
            .match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)
            .map(Number);
          assert.ok(
            path.length >= 4 && path.every(Number.isFinite),
            'Leader remains finite',
          );
          const actual = new THREE.Vector3(...chosen[index]).project(camera);
          const x = ((actual.x + 1) * width) / 2,
            y = ((1 - actual.y) * height) / 2;
          assert.ok(
            Math.abs(path[0] - x) < 1e-7 && Math.abs(path[1] - y) < 1e-7,
            'Leader starts at the real stationary-hull point, including portrait camera roll',
          );
          assert.ok(
            Math.abs(Number(fixture.dots[index].attributes.cx) - x) < 1e-7,
          );
          assert.ok(
            Math.abs(Number(fixture.dots[index].attributes.cy) - y) < 1e-7,
          );
          const box = transformOf(button),
            dx = Math.abs(path.at(-2) - box.x),
            dy = Math.abs(path.at(-1) - box.y);
          assert.equal(
            box.scale,
            1,
            'Stable overview never shrinks the native hit target',
          );
          assert.ok(
            dx <= box.width / 2 + 1e-7 && dy <= box.height / 2 + 1e-7,
            'Leader reaches the native label box',
          );
          assert.ok(
            Math.min(
              Math.abs(dx - box.width / 2),
              Math.abs(dy - box.height / 2),
            ) < 1e-7,
            'Leader meets a straight label border rather than the superseded pill arc',
          );
        }
        const boxes = fixture.buttons
          .map(transformOf)
          .sort((a, b) => a.y - b.y);
        for (const row of [boxes.slice(0, 2), boxes.slice(2)]) {
          row.sort((a, b) => a.x - b.x);
          const gap = row[1].x - row[1].width / 2 - row[0].x - row[0].width / 2;
          minimumGap = Math.min(minimumGap, gap);
        }
      }
      assert.ok(
        minimumGap >= 16 - 1e-7,
        `${layout} ${width}×${height}: destination hit targets retain a 16px separation during drag (${minimumGap}px)`,
      );
      assert.deepEqual(
        spacecraft.group.rotation.toArray(),
        [0, 0, 0, 'XYZ'],
        'Annotations never rotate the physical spacecraft',
      );
    }
});

test('Overview preserves full accessible labels, native navigation, hover feedback and travel interaction boundaries', (t) => {
  const fixture = annotationFixture(t);
  const accessibleText = (element) =>
    element.attributes['aria-hidden'] === 'true'
      ? ''
      : (element.textContent || '') +
        element.children.map(accessibleText).join('');
  const { update } = projectedFixture(fixture, 'compact', 390, 844);
  update({ hover: 'experience' });
  assert.equal(fixture.layer.inert, false);
  assert.equal(fixture.layer.attributes['aria-hidden'], 'false');
  for (const [index, button] of fixture.buttons.entries()) {
    const section = roomNames[index];
    assert.equal(button.type, 'button');
    assert.equal(button.dataset.sceneRoom, section);
    assert.equal(button.dataset.targetKey, `room:${section}`);
    assert.equal(
      accessibleText(button),
      longLabels[section + 'Label'],
      'Long text stays complete in the accessibility tree',
    );
    assert.equal(
      button.classList.contains('is-highlighted'),
      section === 'experience',
    );
    assert.equal(
      fixture.paths[index].classList.contains('is-highlighted'),
      section === 'experience',
    );
    button.onclick();
  }
  assert.deepEqual(
    fixture.visited,
    roomNames,
    'Every native button forwards its unchanged room identity exactly once',
  );
  update({ home: false, travelling: true, reduced: false, delta: 1 / 60 });
  assert.equal(
    fixture.layer.inert,
    true,
    'Leaving overview immediately disables all callout interaction',
  );
  assert.equal(fixture.layer.attributes['aria-hidden'], 'true');
  assert.equal(fixture.flight.inert, true);
  update({ home: true, travelling: true, reduced: false, delta: 1 / 60 });
  assert.equal(
    Number(fixture.layer.style.opacity),
    0,
    'Portrait return hides leaders while their anchors are moving',
  );
  assert.equal(fixture.layer.inert, true);
  update({ home: true, travelling: false, reduced: false, delta: 0 });
  assert.equal(
    fixture.layer.inert,
    true,
    'Arrival does not expose invisible focus targets before presence returns',
  );
  for (let step = 0; step < 180; step++)
    update({ home: true, travelling: false, reduced: false, delta: 1 / 60 });
  assert.equal(fixture.layer.inert, false);
  update({ home: false, travelling: false, reduced: true });
  assert.equal(Number(fixture.layer.style.opacity), 0);
  assert.equal(fixture.layer.inert, true);
  update({ home: true, travelling: false, reduced: true });
  assert.equal(Number(fixture.layer.style.opacity), 1);
  assert.equal(
    fixture.layer.inert,
    false,
    'Reduced motion restores the native controls immediately',
  );
  fixture.annotations.dispose();
  assert.equal(fixture.host.children.length, 0);
  assert.equal(fixture.flight.inert, false);
  assert.equal(fixture.flight.style.transform, '');
  assert.equal(fixture.flight.style.opacity, '');
  assert.equal(fixture.flight.attributes['aria-hidden'], undefined);
});
