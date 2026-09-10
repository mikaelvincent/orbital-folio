import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2] || process.cwd()),
  file = resolve(
    process.argv[3] || join(root, 'components/spacecraft-model.ts'),
  ),
  output = resolve(process.argv[4] || '/tmp/stairs-hover-critic-audit.json');
const hash = () =>
    createHash('sha256').update(readFileSync(file)).digest('hex'),
  sha = hash(),
  req = createRequire(join(root, 'package.json')),
  T = await import(pathToFileURL(req.resolve('three')).href),
  { createSpacecraft } = await import(pathToFileURL(file).href);
const names = (o) => o.userData.parts || [o.name];
const values = (o) => [
  ...o.material.color.toArray(),
  ...o.material.emissive.toArray(),
  o.material.emissiveIntensity,
];
const delta = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
const report = {
  sourceSha256: sha,
  scope:
    'Selected-room doorway material invariance through animated stairs hover, leave, reversal, and separately enabled portal tint. Actual model material state; rear boundary rays target the union of rear-wall meshes, not all-scene visibility. Not a pixel/GPU claim.',
  cases: [],
  failures: [],
};
for (const layout of ['wide', 'compact'])
  for (const room of ['projects', 'about']) {
    const model = createSpacecraft(T, { projects: [], caseStudies: [] });
    model.setLayout(layout);
    const portalId = room + ':' + (room === 'projects' ? 'about' : 'projects');
    const state = {
      activeRoom: room,
      travelling: false,
      transitRoom: '',
      transitWalkway: false,
      reading: false,
      hoveredWalkway: false,
      hoveredPortal: '',
      delta: 1 / 60,
    };
    model.update(0, '', true, state);
    const meshes = [];
    model.group.traverse((o) => {
      if (o.isMesh && !o.userData.isInteractionProxy) meshes.push(o);
    });
    const neutral = meshes.filter(
      (o) =>
        (o.userData.section === room &&
          !names(o).includes('open-hatch-painted-route-trim')) ||
        names(o).includes('walkway-' + room + '-doorway-reveal-interior') ||
        o.material.userData.linkedRooms?.includes(room),
    );
    const rearReturn = meshes.filter((o) =>
      names(o).includes('walkway-' + room + '-rear-return-interior'),
    );
    const rearMeshes = meshes.filter(
      (o) =>
        names(o).includes('walkway-continuous-rear-liner') ||
        names(o).some((n) => n.endsWith('-rear-return-interior')),
    );
    const boundarySamples = [];
    const ray = new T.Raycaster();
    const scale = layout === 'wide' ? 1.4 : 1,
      wx = model.group.userData.walkwayAnchor[0],
      row = room === 'projects' ? 1.7 : -1.7;
    model.group.updateMatrixWorld(true);
    for (const x of [0.572, 0.652, 0.6715, 0.6725, 0.692, 0.772])
      for (const dy of [-0.3, 0, 0.3]) {
        ray.set(
          new T.Vector3(wx + x * scale, row + dy, 0.5),
          new T.Vector3(0, 0, -1),
        );
        ray.near = 0;
        ray.far = 3;
        const hit = ray.intersectObjects(rearMeshes, false)[0];
        boundarySamples.push({
          x,
          dy,
          expectedOwner: x < 0.672 ? 'walkway' : room,
          hit,
        });
      }
    const reveal = meshes.filter((o) =>
      names(o).includes('walkway-' + room + '-doorway-reveal-interior'),
    );
    const ladder = meshes.filter(
      (o) =>
        names(o).includes('walkway-continuous-rear-liner') ||
        names(o).includes('walkway-twin-open-room-wall-interior'),
    );
    const accent = meshes.find(
      (o) => o.material.name === 'route-paint-' + portalId,
    );
    const base = new Map(neutral.map((o) => [o.uuid, values(o)])),
      accentBase = values(accent),
      revealLevel = reveal.map(
        (o) => o.material.color.r / o.material.userData.baseColor.r,
      );
    const c = {
      layout,
      room,
      neutralMeshes: neutral.length,
      revealMeshes: reveal.length,
      rearReturnMeshes: rearReturn.length,
      boundarySamples: boundarySamples.map(({ x, dy, expectedOwner, hit }) => ({
        x,
        dy,
        expectedOwner,
        parts: hit && names(hit.object),
        point: hit?.point.toArray(),
      })),
      maxBoundaryMaterialError: 0,
      revealInitialLevels: revealLevel,
      ladderMeshes: ladder.length,
      frames: 0,
      maxNeutralDelta: 0,
      maxLadderTrackingError: 0,
      maxAccentDeltaWithoutPortal: 0,
      portalTintChanged: false,
      portalEmissionStayedZero: true,
      stages: [],
      failures: [],
    };
    if (reveal.length !== 1 || rearReturn.length !== 1 || !ladder.length)
      c.failures.push('Missing separately owned reveal or ladder surface');
    if (revealLevel.some((x) => Math.abs(x - 1) > 1e-9))
      c.failures.push('Selected reveal not at full selected brightness');
    for (const { expectedOwner, hit } of boundarySamples) {
      const expectedPart =
        expectedOwner === 'walkway'
          ? 'walkway-continuous-rear-liner'
          : 'walkway-' + room + '-rear-return-interior';
      if (!hit || !names(hit.object).includes(expectedPart))
        c.failures.push('Incorrect rear boundary ownership: ' + expectedOwner);
    }
    let time = 0;
    for (const stage of [
      { name: 'off', hover: false, portal: false, frames: 3 },
      { name: 'hover-on', hover: true, portal: false, frames: 45 },
      { name: 'hover-off', hover: false, portal: false, frames: 45 },
      { name: 'reverse-on', hover: true, portal: false, frames: 5 },
      { name: 'reverse-off', hover: false, portal: false, frames: 5 },
      { name: 'reverse-on-settle', hover: true, portal: false, frames: 45 },
      { name: 'portal-tint', hover: true, portal: true, frames: 45 },
      { name: 'portal-leave', hover: false, portal: false, frames: 45 },
    ]) {
      const levels = [];
      for (let i = 0; i < stage.frames; i++) {
        time += 1 / 60;
        model.update(time, stage.portal ? portalId : '', false, {
          ...state,
          hoveredWalkway: stage.hover,
          hoveredPortal: stage.portal ? portalId : '',
        });
        c.frames++;
        const level = model.group.userData.lightingState.walkway.level;
        levels.push(level);
        for (const { expectedOwner, hit } of boundarySamples) {
          if (!hit) continue;
          const expected = hit.object.material.userData.baseColor
            .clone()
            .multiplyScalar(expectedOwner === 'walkway' ? level : 1)
            .toArray();
          c.maxBoundaryMaterialError = Math.max(
            c.maxBoundaryMaterialError,
            delta(expected, hit.object.material.color.toArray()),
          );
        }
        for (const o of neutral)
          c.maxNeutralDelta = Math.max(
            c.maxNeutralDelta,
            delta(base.get(o.uuid), values(o)),
          );
        for (const o of ladder) {
          const expected = o.material.userData.baseColor
            .clone()
            .multiplyScalar(level)
            .toArray();
          c.maxLadderTrackingError = Math.max(
            c.maxLadderTrackingError,
            delta(expected, o.material.color.toArray()),
          );
        }
        if (!stage.portal && !stage.name.startsWith('portal-'))
          c.maxAccentDeltaWithoutPortal = Math.max(
            c.maxAccentDeltaWithoutPortal,
            delta(accentBase, values(accent)),
          );
        if (stage.portal && delta(accentBase, values(accent)) > 0.001)
          c.portalTintChanged = true;
        if (
          accent.material.emissive.toArray().some((v) => Math.abs(v) > 1e-15) ||
          accent.material.emissiveIntensity !== 0
        )
          c.portalEmissionStayedZero = false;
      }
      c.stages.push({
        name: stage.name,
        frames: stage.frames,
        firstLadderLevel: levels[0],
        lastLadderLevel: levels.at(-1),
        min: Math.min(...levels),
        max: Math.max(...levels),
      });
    }
    if (c.maxBoundaryMaterialError > 1e-9)
      c.failures.push('Rear boundary material did not obey its owner');
    if (c.maxNeutralDelta > 1e-9)
      c.failures.push('Selected neutral surface changed during hover');
    if (c.maxLadderTrackingError > 1e-9)
      c.failures.push('Ladder material did not track its own dimmer');
    if (c.maxAccentDeltaWithoutPortal > 1e-9)
      c.failures.push('Portal trim changed without portal hover');
    if (!c.portalTintChanged || !c.portalEmissionStayedZero)
      c.failures.push('Portal tint/emission policy incorrect');
    if (
      c.stages.find((s) => s.name === 'hover-on').lastLadderLevel !== 1 ||
      c.stages.find((s) => s.name === 'hover-off').lastLadderLevel !== 0.5
    )
      c.failures.push('Ladder failed to reach bright/dim endpoints');
    report.cases.push(c);
    report.failures.push(
      ...c.failures.map((message) => ({ layout, room, message })),
    );
  }
report.sourceUnchangedDuringAudit = hash() === sha;
report.passed =
  report.failures.length === 0 && report.sourceUnchangedDuringAudit;
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      sourceSha256: sha,
      passed: report.passed,
      cases: report.cases.map(
        ({ stages: _stages, boundarySamples: _boundarySamples, ...c }) => c,
      ),
      failures: report.failures,
    },
    null,
    2,
  ),
);
