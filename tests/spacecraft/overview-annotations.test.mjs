import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import * as THREE from 'three';
import { responsiveCameraFov } from '../../features/spacecraft/navigation/scene-controls.ts';

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
  classList = { toggle() {} };
  appendChild(child) {
    this.children.push(child);
  }
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
  removeAttribute(name) {
    delete this.attributes[name];
  }
  remove() {}
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
