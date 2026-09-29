/** Current-model CPU comparison; run from a disposable checkout.
 * --baseline-dir=<source root> must contain the original spacecraft-model.ts
 * and navigation/iris-hatch.ts at their repository-relative paths.
 * --out=<json> is required; --verify-only skips timing. Optional
 * --telemetry=<compiled mac-thermal-snapshot> records conditions outside bursts.
 * Includes model update, scene synchronization and six callbacks per hatch.
 * No DOM textures, WebGL, frame pacing, GPU or energy measurement.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { setTimeout as rest } from 'node:timers/promises';
import os from 'node:os';
import * as THREE from 'three';
import { createSpacecraft } from '../features/spacecraft/spacecraft-model.ts';
import { updateRenderSceneMatrices } from '../features/spacecraft/scene-matrices.ts';

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.slice(2).split('=');
    return [key, value.length ? value.join('=') : true];
  }),
);
assert.ok(
  args.get('baseline-dir') && args.get('out'),
  '--baseline-dir and --out required',
);
const temporary = [];
const report = {
  recordedAt: new Date().toISOString(),
  node: process.version,
  three: THREE.REVISION,
  platform: `${os.platform()} ${os.release()} ${os.arch()}`,
  cpu: os.cpus()[0]?.model,
  method:
    '600 matched steps per capture; 300 warmup steps each; 30s initial rest; AA controls then ABBA, BAAB per state; 5s between controls, 1s between captures, 10s between blocks; no retries; 10min total timing budget',
  scope:
    'Node model update + forced scene sync + all 24 iris callbacks. Counts are separate. Settled pixel-cache draws may invoke fewer callbacks in the browser. No browser/frame-rate/GPU/energy claim.',
  hashes: {},
  verification: [],
  captures: [],
  telemetry: [],
};
const save = () =>
  writeFile(resolve(args.get('out')), JSON.stringify(report, null, 2) + '\n');
const hash = (source) => createHash('sha256').update(source).digest('hex');
async function baseline() {
  const suffix = `.iris-sync-${process.pid}`;
  for (const name of ['navigation/iris-hatch.ts', 'spacecraft-model.ts']) {
    const relative = `features/spacecraft/${name}`;
    let source = await readFile(
      resolve(args.get('baseline-dir'), relative),
      'utf8',
    );
    report.hashes[`reference/${relative}`] = hash(source);
    report.hashes[`candidate/${relative}`] = hash(
      await readFile(resolve(relative)),
    );
    const path = resolve(
      'features/spacecraft',
      name.replace('.ts', `${suffix}.ts`),
    );
    if (name === 'spacecraft-model.ts') {
      assert.ok(
        source.includes("'./navigation/iris-hatch.ts'"),
        'Reference model must import its reference hatch module',
      );
      source = source.replace(
        "'./navigation/iris-hatch.ts'",
        `'./navigation/iris-hatch${suffix}.ts'`,
      );
    }
    await writeFile(path, source, { flag: 'wx' });
    temporary.push(path);
  }
  report.hashes.lockfile = hash(await readFile('package-lock.json'));
  report.hashes.sceneMatrices = hash(
    await readFile('features/spacecraft/scene-matrices.ts'),
  );
  report.hashes.runner = hash(await readFile(new URL(import.meta.url)));
  return (await import(pathToFileURL(temporary.at(-1)))).createSpacecraft;
}
function fixture(create) {
  const model = create(THREE),
    scene = new THREE.Scene();
  scene.add(model.group);
  scene.matrixWorldAutoUpdate = false;
  const objects = [],
    leaves = [];
  scene.traverse((object) => {
    objects.push(object);
    if (object.name === 'iris-rigid-leaf') leaves.push(object);
  });
  function frame(mode, i, instant = false) {
    const editing = mode === 'layout';
    const state = {
      activeRoom: 'projects',
      delta: 1 / 60,
      hoveredPortal: mode === 'doors' && i % 120 < 60 ? 'experience' : '',
      openPortalIds: [],
      reading: false,
      immediateDoors: instant,
      ...(editing ? { layout: i % 240 < 120 ? 'wide' : 'compact' } : {}),
    };
    scene.position.x = editing ? Math.sin(i / 60) * 0.2 : 0;
    model.update(5 + i / 60, '', instant, state, true);
    updateRenderSceneMatrices(scene);
    for (const leaf of leaves) leaf.onBeforeRender();
  }
  function reset(mode) {
    model.setLayout('wide');
    frame(mode, 0, true);
    for (let i = 0; i < 300; i++) frame(mode, i);
  }
  return { model, scene, objects, frame, reset };
}
function verify(a, b, mode) {
  a.reset(mode);
  b.reset(mode);
  assert.equal(a.objects.length, b.objects.length);
  for (let i = 0; i < 240; i++) {
    a.frame(mode, i);
    b.frame(mode, i);
    a.objects.forEach((object, j) => {
      assert.deepEqual(
        b.objects[j].matrixWorld.elements,
        object.matrixWorld.elements,
      );
      assert.equal(b.objects[j].visible, object.visible);
      if (object.name === 'iris-occlusion-silhouette')
        assert.deepEqual(
          b.objects[j].geometry.attributes.position.array,
          object.geometry.attributes.position.array,
        );
    });
    assert.deepEqual(
      b.model.group.userData.portals,
      a.model.group.userData.portals,
    );
  }
  const compositions = [];
  for (const fixture of [a, b]) {
    let count = 0;
    const originals = fixture.objects.map((object) => object.updateMatrix);
    fixture.objects.forEach((object, j) => {
      object.updateMatrix = function () {
        count++;
        return originals[j].call(this);
      };
    });
    try {
      fixture.frame(mode, 241);
    } finally {
      fixture.objects.forEach((object, j) => {
        object.updateMatrix = originals[j];
      });
    }
    compositions.push(count);
  }
  return {
    mode,
    frames: 240,
    worldMatricesPerFrame: a.objects.length,
    compositions: { reference: compositions[0], candidate: compositions[1] },
  };
}
function telemetry(label) {
  if (!args.get('telemetry')) return;
  const reading = JSON.parse(
    execFileSync(resolve(args.get('telemetry')), ['--pmset', '--settings'], {
      encoding: 'utf8',
    }),
  );
  report.telemetry.push({ label, reading });
  assert.ok(
    !/"(?:serious|critical)"/i.test(JSON.stringify(reading)),
    'Stop at serious/critical thermal pressure',
  );
}
try {
  const a = fixture(await baseline()),
    b = fixture(createSpacecraft);
  const modes = ['settled', 'doors', 'layout'];
  for (const mode of modes) report.verification.push(verify(a, b, mode));
  await save();
  if (!args.get('verify-only')) {
    const deadline = Date.now() + 600000;
    await rest(30000);
    for (const mode of modes) {
      telemetry(`${mode}:before`);
      for (const [block, order] of [
        ['controls', 'AA'],
        ['ABBA', 'ABBA'],
        ['BAAB', 'BAAB'],
      ]) {
        for (const variant of order) {
          assert.ok(Date.now() < deadline, 'Timing budget exhausted');
          const fixture = variant === 'A' ? a : b;
          fixture.reset(mode);
          const start = performance.now();
          for (let i = 0; i < 600; i++) fixture.frame(mode, i);
          report.captures.push({
            mode,
            block,
            variant,
            frames: 600,
            meanMs: (performance.now() - start) / 600,
          });
          await save();
          await rest(block === 'controls' ? 5000 : 1000);
        }
        telemetry(`${mode}:${block}`);
        if (block === 'ABBA') await rest(10000);
      }
      console.log(
        JSON.stringify({
          mode,
          captures: report.captures.filter((capture) => capture.mode === mode),
        }),
      );
    }
  }
} finally {
  await save();
  for (const path of temporary) await unlink(path);
}
