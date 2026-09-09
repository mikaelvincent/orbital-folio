import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
// Usage: node spacecraft-branding-audit.mjs <repo> [model.ts] [report.json]
const root = resolve(process.argv[2] || process.cwd());
const modelPath = resolve(
  process.argv[3] || join(root, 'components/spacecraft-model.ts'),
);
const outputPath = resolve(
  process.argv[4] || '/tmp/spacecraft-branding-audit.json',
);
const req = createRequire(pathToFileURL(join(root, 'package.json'))),
  THREE = await import(pathToFileURL(req.resolve('three')).href);
const { createSpacecraft } = await import(pathToFileURL(modelPath).href);
const { CAMERA_RANGES, cursorViewSamples, fitPerspectiveDistance } =
  await import(pathToFileURL(join(root, 'lib/scene-controls.ts')).href);
globalThis.document = {
  // oxlint-disable-next-line typescript/no-deprecated -- Scoped CPU canvas stub.
  createElement() {
    const ctx = new Proxy(
      {},
      {
        get(t, k) {
          if (k in t) return t[k];
          if (k === 'createLinearGradient')
            return () => ({ addColorStop() {} });
          if (k === 'measureText')
            return (text) => ({
              width:
                text.length *
                Number((t.font || '10px').match(/[\d.]+(?=px)/)?.[0] || 10) *
                0.58,
            });
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
const sources = [];
class AuditMesh extends THREE.Mesh {
  constructor(...a) {
    super(...a);
    sources.push(this);
  }
  removeFromParent() {
    if (this.parent && !this.auditParent) this.auditParent = this.parent;
    return super.removeFromParent();
  }
}
const model = createSpacecraft(
  { ...THREE, Mesh: AuditMesh },
  {
    vesselName: 'mikaelvincent.dev',
    labels: {
      projects: 'Projects',
      experience: 'Experience',
      about: 'About',
      contact: 'Contact',
    },
    projects: [],
  },
);
delete globalThis.document;
const sourceMatrix = (o) =>
  o.auditParent
    ? o.auditParent.matrixWorld.clone().multiply(o.matrix)
    : o.matrixWorld.clone();
const sourceBounds = (o) => {
  o.geometry.computeBoundingBox();
  return o.geometry.boundingBox.clone().applyMatrix4(sourceMatrix(o));
};
const report = {
  modelPath,
  sha256: createHash('sha256').update(readFileSync(modelPath)).digest('hex'),
  views: [],
  mounts: [],
  bounds: [],
  metadata: [],
  capturedViews: [],
};
const vector = (a) => new THREE.Vector3(...a),
  direction = new THREE.Vector3(-0.18, 0.14, 1).normalize();
function targets() {
  const out = [];
  model.group.traverseVisible((o) => {
    if (
      o.isMesh &&
      !o.userData.isInteractionProxy &&
      o.material.visible !== false &&
      !['identification-label', 'portal-destination-label'].includes(
        o.material.name,
      )
    )
      out.push(o);
  });
  return out;
}
function auditView(camera, viewport, description) {
  const all = targets();
  for (const p of model.group.userData.branding) {
    const blocked = [],
      projected = [];
    for (const sx of [-0.94, -0.47, 0, 0.47, 0.94])
      for (const sy of [-0.6, 0, 0.6]) {
        const point = vector(p.position).add(
            new THREE.Vector3((sx * p.size[0]) / 2, (sy * p.size[1]) / 2, 0),
          ),
          d = point.clone().sub(camera.position),
          n = d.length();
        d.normalize();
        const hit = new THREE.Raycaster(
          camera.position,
          d,
          0.001,
          n - 0.003,
        ).intersectObjects(all, false)[0];
        if (hit)
          blocked.push({
            sx,
            sy,
            object: hit.object.name,
            parts: hit.object.userData.parts,
            point: hit.point.toArray(),
          });
        const ndc = point.clone().project(camera);
        projected.push([
          ((ndc.x + 1) * viewport[0]) / 2,
          ((1 - ndc.y) * viewport[1]) / 2,
        ]);
      }
    report.views.push({
      ...description,
      band: Math.sign(p.position[1]),
      camera: camera.position.toArray(),
      pixels: [
        Math.max(...projected.map((p) => p[0])) -
          Math.min(...projected.map((p) => p[0])),
        Math.max(...projected.map((p) => p[1])) -
          Math.min(...projected.map((p) => p[1])),
      ],
      blocked,
    });
  }
}
for (const [layout, viewport] of [
  ['wide', [1440, 1000]],
  ['compact', [390, 844]],
  ['compact', [320, 844]],
]) {
  model.setLayout(layout);
  model.update(0, '', true, {
    activeRoom: 'home',
    reading: false,
    hoveredPortal: null,
  });
  const bounds = model.group.userData.overviewBounds,
    center = vector(bounds.center),
    points = [];
  for (const x of [bounds.min[0], bounds.max[0]])
    for (const y of [bounds.min[1], bounds.max[1]])
      for (const z of [bounds.min[2], bounds.max[2]]) points.push([x, y, z]);
  const safe = {
    left: -1 + (2 * (layout === 'wide' ? 24 : 14)) / viewport[0],
    right: 1 - (2 * (layout === 'wide' ? 24 : 14)) / viewport[0],
    top: 1 - 48 / viewport[1],
    bottom: -1 + 160 / viewport[1],
  };
  const views = cursorViewSamples(
    { target: center.toArray(), direction: direction.toArray() },
    4,
    CAMERA_RANGES.overview,
  );
  let distance = Math.max(
    ...views.map((v) =>
      fitPerspectiveDistance(points, v, 38, viewport[0] / viewport[1], safe),
    ),
  );
  if (layout === 'compact') {
    const cp = [];
    for (const b of [
      ...Object.values(model.group.userData.roomBounds),
      model.group.userData.walkwayBounds,
    ])
      for (const sx of [-1, 1])
        for (const sy of [-1, 1])
          for (const sz of [-1, 1])
            cp.push([
              b.center[0] + (sx * b.size[0]) / 2,
              b.center[1] + (sy * b.size[1]) / 2,
              b.center[2] + (sz * b.size[2]) / 2,
            ]);
    distance = Math.max(
      ...views.map((v) =>
        fitPerspectiveDistance(cp, v, 38, viewport[0] / viewport[1], safe),
      ),
      ...views.map((v) =>
        fitPerspectiveDistance(points, v, 38, viewport[0] / viewport[1], {
          ...safe,
          left: -1.3,
          right: 1.3,
        }),
      ),
    );
  }
  report.bounds.push({
    layout,
    viewport,
    distance,
    bounds: structuredClone(bounds),
  });
  for (const hover of ['', ...Object.keys(model.group.userData.roomAnchors)])
    for (const py of [-1, 0, 1])
      for (const px of [-1, 0, 1]) {
        const target = center.clone();
        if (hover) {
          const a = model.group.userData.roomAnchors[hover];
          target.x += (a[0] - center.x) * 0.022;
          target.y += (a[1] - center.y) * 0.022;
        }
        const camera = new THREE.PerspectiveCamera(
          38,
          viewport[0] / viewport[1],
          0.01,
          100,
        );
        camera.position
          .copy(target)
          .addScaledVector(
            direction
              .clone()
              .applyEuler(new THREE.Euler(py * 0.025, px * 0.045, 0)),
            distance * (hover ? 0.975 : 1),
          );
        camera.lookAt(target);
        camera.updateMatrixWorld();
        auditView(camera, viewport, {
          layout,
          viewport,
          hover,
          pointer: [px, py],
          distance,
        });
      }
  for (const plate of model.group.userData.branding) {
    const ink = sources.find(
      (o) =>
        o.name === 'vessel-nameplate-ink' &&
        Math.sign(sourceBounds(o).getCenter(new THREE.Vector3()).y) ===
          Math.sign(plate.position[1]),
    );
    assert(ink);
    assert(
      sourceBounds(ink)
        .getCenter(new THREE.Vector3())
        .distanceTo(vector(plate.position)) < 1e-5,
    );
    report.metadata.push({
      layout,
      viewport,
      position: plate.position,
      correct: true,
    });
  }
  for (const band of sources.filter(
    (o) => o.name === 'vessel-nameplate-integrated-hull-band',
  )) {
    const b = sourceBounds(band),
      sign = Math.sign(b.getCenter(new THREE.Vector3()).y),
      supports = sources.filter(
        (o) =>
          o.name ===
            (sign > 0
              ? 'rounded-front-pressure-collar'
              : 'reinforced-lower-nameplate-collar') &&
          Math.sign(sourceBounds(o).getCenter(new THREE.Vector3()).y) === sign,
      ),
      contacts = supports
        .map((o) => ({
          section: o.userData.section,
          overlap: b
            .clone()
            .intersect(sourceBounds(o))
            .getSize(new THREE.Vector3())
            .toArray(),
        }))
        .filter((o) => o.overlap.every((v) => v > 0));
    assert.equal(contacts.length, 2);
    report.mounts.push({ layout, viewport, band: sign, bounds: b, contacts });
  }
}
// The screenshot that exposed the original upper-band overlap supplies an
// additional exact browser camera, when its evidence exists in the repository.
try {
  const qa = JSON.parse(
      readFileSync(
        join(root, 'docs/evidence/natural-orbit-revision/browser-qa.json'),
      ),
    ),
    saved = qa.find((p) => p.name === 'final-first-cloud');
  if (saved) {
    model.setLayout(saved.scene.layout);
    const c = new THREE.PerspectiveCamera(
      38,
      saved.viewport[0] / saved.viewport[1],
      0.01,
      100,
    );
    c.position.fromArray(saved.scene.cameraPosition.split(',').map(Number));
    c.quaternion
      .fromArray(saved.scene.cameraQuaternion.split(',').map(Number))
      .normalize();
    c.updateMatrixWorld();
    auditView(c, saved.viewport, {
      layout: saved.scene.layout,
      viewport: saved.viewport,
      pose: 'captured-final-first-cloud',
    });
    report.capturedViews.push('final-first-cloud');
  }
} catch {}
report.failed = report.views.filter((v) => v.blocked.length);
report.summary = {
  views: report.views.length,
  inkRays: report.views.length * 15,
  physicalBandMounts: report.mounts.length,
  metadataMatches: report.metadata.length,
  failedViews: report.failed.length,
  passed: report.failed.length === 0,
};
writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      modelPath,
      outputPath,
      summary: report.summary,
      failed: report.failed.map((v) => ({
        layout: v.layout,
        viewport: v.viewport,
        hover: v.hover,
        pointer: v.pointer,
        band: v.band,
        first: v.blocked[0],
      })),
    },
    null,
    2,
  ),
);
assert(report.summary.passed, 'Branding ink occlusion; inspect report.');
