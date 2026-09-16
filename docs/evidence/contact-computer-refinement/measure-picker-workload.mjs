/** Functional CPU workload sizing; not a browser or thermal performance test.
 * Run: node docs/evidence/contact-computer-refinement/measure-picker-workload.mjs /tmp/new-picker-workload.json
 * Preserve the output and source hashes for each measured revision.
 */
import * as THREE from 'three';
import { createSpacecraft } from '../../../features/spacecraft/spacecraft-model.ts';
import { createContactRoomDismissPicker } from '../../../features/spacecraft/navigation/contact-room-dismiss.ts';
import { createRoomNavigationTargets } from '../../../features/spacecraft/navigation/room-navigation-targets.ts';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const output = resolve(process.argv[2] || '/tmp/contact-picker-workload.json');
const noop = () => {};
globalThis.Path2D = class Path2D {};
const canvasDocument = {
  createElement() {
    const canvas = { width: 300, height: 150 };
    const ctx = new Proxy(
      {
        canvas,
        font: '10px sans-serif',
        measureText(t) {
          return {
            width:
              t.length * Number(/([\d.]+)px/.exec(this.font)?.[1] || 10) * 0.55,
            actualBoundingBoxAscent: 10,
            actualBoundingBoxDescent: 3,
          };
        },
        createLinearGradient: () => ({ addColorStop: noop }),
        createRadialGradient: () => ({ addColorStop: noop }),
      },
      { get: (target, key) => (key in target ? target[key] : noop) },
    );
    canvas.getContext = () => ctx;
    return canvas;
  },
};
globalThis.document = canvasDocument;
const model = createSpacecraft(THREE),
  computer = model.group.userData.contactComputer;
model.update(0, 'contact', true, { reading: true, activeRoom: 'contact' });
model.group.updateMatrixWorld(true);
const walls = [],
  blockers = [];
model.group.traverse((o) => {
  if (o.isMesh && o.material?.userData.contactRoomWall) walls.push(o);
});
computer.consoleRoot.traverse((o) => {
  if (o.isMesh && !o.userData.isInteractionProxy) blockers.push(o);
});
const picker = createContactRoomDismissPicker(walls, blockers),
  previous = createRoomNavigationTargets(THREE, model.group);
previous.sync(model.group.userData.layoutScale);
model.group.updateMatrixWorld(true);
const eye = computer.anchor
  .getWorldPosition(new THREE.Vector3())
  .add(new THREE.Vector3(0, 0.36, 3));
const targets = {
  rearWall: computer.consoleRoot.localToWorld(
    new THREE.Vector3(-1.72, 1.8, -1.1),
  ),
  desk: computer.consoleRoot.localToWorld(new THREE.Vector3(0.5, 0.64, 0.4)),
  keyboard: computer.keyboard.root.localToWorld(new THREE.Vector3(0, 0, 0)),
  sky: eye.clone().add(new THREE.Vector3(0, 8, -3)),
};
const rays = Object.fromEntries(
  Object.entries(targets).map(([name, p]) => [
    name,
    new THREE.Raycaster(eye, p.clone().sub(eye).normalize(), 0.5, 80),
  ]),
);
const workloads = {};
for (const [name, ray] of Object.entries(rays)) {
  workloads[`new_${name}`] = () => picker.pick(ray);
  workloads[`existing_room_${name}`] = () =>
    previous.select(ray, {
      active: 'contact',
      reading: false,
      portalTargets: model.portalTargets,
      roomIntent: () => null,
      canUsePortal: () => true,
    });
}
const data = {
  capturedAt: new Date().toISOString(),
  node: process.version,
  arch: process.arch,
  platform: process.platform,
  method:
    'Node-only functional workload sizing. Inert canvas preserves legend geometry; visible browser may render concurrently. No controlled thermal or browser CPU/GPU comparison, and no user-facing speedup is inferred. Current app formerly skipped feedback before picking, so this legacy room-picker comparison measures distinct functions rather than before/after app frame work.',
  counts: {
    walls: walls.length,
    blockers: blockers.length,
    wallTriangles: walls.reduce(
      (s, o) =>
        s +
        ((o.geometry.index?.count || o.geometry.attributes.position.count) /
          3) *
          (o.count || 1),
      0,
    ),
    blockerTriangles: blockers.reduce(
      (s, o) =>
        s +
        ((o.geometry.index?.count || o.geometry.attributes.position.count) /
          3) *
          (o.count || 1),
      0,
    ),
  },
  results: {},
  functionHashes: {},
};
for (const p of [
  'features/spacecraft/navigation/contact-room-dismiss.ts',
  'features/spacecraft/navigation/room-navigation-targets.ts',
  'features/spacecraft/spacecraft-model.ts',
])
  data.functionHashes[p] = createHash('sha256')
    .update(await readFile(`${root}/${p}`))
    .digest('hex');
for (const [name, fn] of Object.entries(workloads)) {
  const hit = fn();
  data.results[name] = {
    result: hit?.object?.name ?? hit?.section ?? null,
    perCallMs: [],
  };
  for (let i = 0; i < 200; i++) fn();
}
for (let round = 0; round < 6; round++) {
  const entries = Object.entries(workloads);
  if (round % 2) entries.reverse();
  for (const [name, fn] of entries) {
    const start = performance.now();
    for (let i = 0; i < 300; i++) fn();
    data.results[name].perCallMs.push((performance.now() - start) / 300);
  }
}
for (const r of Object.values(data.results)) {
  const sorted = [...r.perCallMs].sort((a, b) => a - b);
  r.medianMs = (sorted[2] + sorted[3]) / 2;
  r.minMs = sorted[0];
  r.maxMs = sorted.at(-1);
}
await writeFile(output, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(data, null, 2));
