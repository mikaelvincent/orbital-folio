import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
const root = resolve(process.argv[2] || process.cwd());
const modelPath = resolve(
  process.argv[3] || join(root, 'components/spacecraft-model.ts'),
);
const outputPath = resolve(
  process.argv[4] || '/tmp/spacecraft-model-v9-peek-audit.json',
);
const req = createRequire(pathToFileURL(join(root, 'package.json')));
const THREE = await import(pathToFileURL(req.resolve('three')).href);
const { createSpacecraft } = await import(pathToFileURL(modelPath).href);
const m = createSpacecraft(THREE, {
  projects: Array.from({ length: 9 }, (_, i) => ({
    title: 'Project',
    slug: 'p' + i,
  })),
  layout: 'wide',
});
m.update(0, '', true, { activeRoom: 'projects', reading: false });
const visible = [];
m.group.traverseVisible((o) => {
  if (
    o.isMesh &&
    o.material.visible !== false &&
    !o.userData.isInteractionProxy
  )
    visible.push(o);
});
const out = [];
for (const p of m.group.userData.portals) {
  const room = m.group.userData.roomAnchors[p.from];
  for (const yaw of [-0.045, 0, 0.045]) {
    const target = new THREE.Vector3(room[0], room[1] + 0.17, 0.16),
      camera = new THREE.PerspectiveCamera(38, 1.44, 0.5, 80);
    camera.position
      .copy(target)
      .addScaledVector(
        new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, yaw, 0)),
        3.5204126,
      );
    camera.lookAt(target);
    camera.updateMatrixWorld(true);
    const sign = p.edge === 'right' ? 1 : -1;
    const hits = [];
    for (const y of [-0.65, 0, 0.65])
      for (const z of [-0.74, -0.5, -0.25, 0, 0.25, 0.5, 0.74]) {
        const point = new THREE.Vector3(
            room[0] + sign * 2.1,
            room[1] + 0.04 + y,
            z,
          ),
          screen = point.clone().project(camera),
          direction = point.clone().sub(camera.position).normalize();
        if (Math.abs(screen.x) > 1 || Math.abs(screen.y) > 1) continue;
        const first = new THREE.Raycaster(
          camera.position,
          direction,
          0.001,
          20,
        ).intersectObjects(visible, false)[0];
        let actualNeighbor = false;
        for (let a = first?.object; a; a = a.parent)
          if (a.name === (p.via ? 'left-vertical-walkway' : p.to + '-assembly'))
            actualNeighbor = true;
        hits.push({
          y,
          z,
          screen: screen.toArray(),
          section: first?.object.userData.section,
          name: first?.object.name,
          point: first?.point.toArray(),
          actualNeighbor,
        });
      }
    out.push({
      portal: p.id,
      yaw,
      inViewport: hits.length,
      neighborHits: hits.filter((x) => x.actualNeighbor),
      all: hits,
    });
  }
}
const report = {
  modelPath,
  distance: 3.5204126,
  fov: 38,
  aspect: 1.44,
  views: out,
  summary: m.group.userData.portals.map((p) => ({
    portal: p.id,
    hasBoundedNeighborPeek: out.some(
      (v) => v.portal === p.id && v.neighborHits.length,
    ),
  })),
};
writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary, null, 2));
if (report.summary.some((v) => !v.hasBoundedNeighborPeek))
  throw new Error(
    'No visible neighbor surface within bounded desktop cursor views',
  );
