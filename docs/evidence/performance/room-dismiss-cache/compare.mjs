import * as THREE from 'three';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { createSpacecraft } from './features/spacecraft/spacecraft-model.ts';
import { createContactRoomDismissPicker as candidate } from './features/spacecraft/navigation/contact-room-dismiss.ts';
import { createContactRoomDismissPicker as reference } from './.room-dismiss-reference.ts';
const model = createSpacecraft(THREE, {
  journal: [{ title: 'One' }, { title: 'Two' }],
  projects: [{ title: 'Project', slug: 'project' }],
  caseStudies: [{ title: 'Study', slug: 'study', categories: ['product'] }],
});
const data = model.group.userData;
const rooms = {
  contact: data.contactComputer.consoleRoot,
  projects: data.projectWorkshop,
  experience: data.caseStudyArchive,
  about: data.personalStudy,
};
const cases = [];
for (const [room, root] of Object.entries(rooms)) {
  const state = {
    activeRoom: room,
    reading: true,
    travelling: false,
    notebookChapter: 0,
    delta: 1 / 60,
    reducedMotion: false,
  };
  model.update(0, '', true, state);
  const walls = [],
    blockers = [];
  model.group.traverse((o) => {
    if (
      o.isMesh &&
      (room === 'contact'
        ? o.material?.userData.contactRoomWall
        : o.material?.userData.applicationRoomWall === room)
    )
      walls.push(o);
  });
  root.traverse((o) => {
    if (o.isMesh && !o.userData.isInteractionProxy) blockers.push(o);
  });
  const geometryBefore = data.geometryRevision - data.dishGeometryRevision;
  const trace = [];
  for (let frame = 0; frame < 1080; frame++) {
    model.update(frame / 60, '', true, state);
    assert.equal(
      data.geometryRevision - data.dishGeometryRevision,
      geometryBefore,
    );
    trace.push([
      data.geometryRevision,
      data.geometryRevision - data.dishGeometryRevision,
    ]);
  }
  const [x, y] = data.roomAnchors[room];
  const points = [['wall', -1.5, 0.75]];
  if (room === 'contact')
    points.push(
      ['blocker', 0, -0.25],
      ['sky', 8, 8],
      ['moving-ray', -1.5, 0.75],
    );
  for (const [kind, dx, dy] of points) {
    const ray = new THREE.Raycaster(
      new THREE.Vector3(x + dx, y + dy, 4),
      new THREE.Vector3(0, 0, -1),
    );
    const raw = reference(walls, blockers);
    const cached = candidate(walls, blockers);
    const hit = !!raw.pick(ray);
    assert.equal(hit, kind === 'wall' || kind === 'moving-ray');
    const lastRay = new THREE.Ray();
    let lastRevision = -1,
      lastHit = false,
      referencePicks = 0;
    const reset = () => {
      model.update(0, '', true, state);
      lastRevision = -1;
      cached.invalidate();
      referencePicks = 0;
    };
    const run = (variant, count = false) => {
      if (variant === 'A') lastRevision = -1;
      else cached.invalidate();
      let hits = 0;
      const before = variant === 'A' ? referencePicks : cached.raycasts;
      for (let i = 0; i < trace.length; i++) {
        ray.ray.origin.x =
          x + dx + (kind === 'moving-ray' ? (i % 2) * 0.01 : 0);
        if (variant === 'A') {
          if (lastRevision !== trace[i][0] || !lastRay.equals(ray.ray)) {
            lastHit = !!raw.pick(ray);
            lastRevision = trace[i][0];
            lastRay.copy(ray.ray);
            referencePicks++;
          }
          hits += lastHit ? 1 : 0;
        } else hits += cached.pick(ray, trace[i][1]) ? 1 : 0;
      }
      if (count)
        return {
          hits,
          picks: (variant === 'A' ? referencePicks : cached.raycasts) - before,
        };
      return hits;
    };
    reset();
    const a = run('A', true);
    reset();
    const b = run('B', true);
    assert.equal(a.hits, b.hits);
    cases.push({
      name: `${room}-${kind}`,
      room,
      walls: walls.length,
      blockers: blockers.length,
      count: { A: a, B: b },
      trace,
      reset,
      run,
    });
  }
}
console.log(
  JSON.stringify({
    prepared: cases.map(({ name, walls, blockers, count }) => ({
      name,
      walls,
      blockers,
      count,
    })),
  }),
);
if (process.argv.includes('--counts-only')) process.exit(0);
const results = {
  source:
    'pre-change raw picker and runtime cache vs picker-owned cache excluding dish revision',
  device: {
    node: process.version,
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    cpu: os.cpus()[0].model,
  },
  method: {
    scope:
      'CPU picking kernel only; actual 1080-frame model revision trace over 18 seconds at 60Hz; preparation/rendering/DOM excluded',
    orders: ['ABBA', 'BAAB'],
    warmupMs: 100,
    sampleMinMs: 200,
    initialRestMs: 30000,
    sampleRestMs: 1000,
    blockRestMs: 5000,
    claim:
      'No frame, GPU or energy claim. No timing qualification gate or retry.',
  },
  cases: [],
};
await sleep(30000);
for (const fixture of cases) {
  const entry = {
    name: fixture.name,
    walls: fixture.walls,
    blockers: fixture.blockers,
    count: fixture.count,
    blocks: [],
  };
  for (const order of results.method.orders) {
    const telemetry = JSON.parse(
      execFileSync('/tmp/orbital-picking-thermal', { encoding: 'utf8' }),
    );
    if (['serious', 'critical'].includes(telemetry.thermalState)) {
      results.stopped = { reason: 'thermal pressure', telemetry };
      writeFileSync(
        '/tmp/orbital-room-picking-results.json',
        JSON.stringify(results, null, 2),
      );
      console.log(JSON.stringify(results.stopped));
      process.exit(0);
    }
    const samples = [];
    for (const variant of order) {
      fixture.reset();
      const start = performance.now();
      while (performance.now() - start < 100) fixture.run(variant);
      fixture.reset();
      let cycles = 0,
        checksum = 0;
      const batches = [];
      const t0 = performance.now();
      do {
        const b0 = performance.now();
        checksum += fixture.run(variant);
        batches.push(performance.now() - b0);
        cycles++;
      } while (performance.now() - t0 < 200);
      const elapsedMs = performance.now() - t0;
      const batchPerPick = batches.map((x) => x / 1080).sort((a, b) => a - b);
      samples.push({
        variant,
        cycles,
        operations: cycles * 1080,
        elapsedMs,
        meanMs: elapsedMs / (cycles * 1080),
        batchMeanP95Ms: batchPerPick[Math.ceil(batchPerPick.length * 0.95) - 1],
        checksum,
      });
      await sleep(1000);
    }
    const mean = (v) =>
      samples
        .filter((s) => s.variant === v)
        .reduce((sum, s) => sum + s.meanMs, 0) / 2;
    entry.blocks.push({
      order,
      telemetry,
      samples,
      A: mean('A'),
      B: mean('B'),
      differenceMs: mean('B') - mean('A'),
      relative: mean('B') / mean('A') - 1,
    });
    await sleep(5000);
  }
  const refs = entry.blocks.flatMap((b) =>
    b.samples.filter((s) => s.variant === 'A').map((s) => s.meanMs),
  );
  const sorted = refs.toSorted((a, b) => a - b);
  const med = (sorted[1] + sorted[2]) / 2;
  entry.referenceSpread = (Math.max(...refs) - Math.min(...refs)) / med;
  results.cases.push(entry);
  writeFileSync(
    '/tmp/orbital-room-picking-results.json',
    JSON.stringify(results, null, 2),
  );
  console.log(
    JSON.stringify({
      name: entry.name,
      count: entry.count,
      blocks: entry.blocks.map(({ order, A, B, relative }) => ({
        order,
        A,
        B,
        relative,
      })),
      referenceSpread: entry.referenceSpread,
    }),
  );
}
