import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildContinuousExteriorSkin } from '../../features/spacecraft/geometry/continuous-exterior-skin.ts';
import { thinChassisOutline } from '../../features/spacecraft/geometry/thin-chassis-outline.ts';

for (const scale of [1, 1.4]) {
  test(`Exterior sampling preserves profile bends and shared rear returns at scale ${scale}`, () => {
    const outline = thinChassisOutline(THREE, { scale, bevel: 0 });
    const d = outline.datums;
    const frontZ = 1.2;
    const rearZ = -1.1 - d.thickness;
    // Dense collinear points include the lower profile's unrelated breakpoints.
    // The two upper bends must survive even though the rest can be simplified.
    const top = [
      [-frontZ, 1.6],
      [0.2, 1.6],
      [0.4, 1.52],
      [1.1, 1.2],
      [-rearZ, 1.2],
    ];
    const bottom = [
      [-rearZ, -1.2],
      [0.5, -1.2],
      [0.35, -1.4],
      [-frontZ, -1.4],
    ];
    const dense = (points) =>
      points.flatMap((a, i) => {
        const b = points[i + 1];
        return b
          ? Array.from({ length: 12 }, (_, j) =>
              new THREE.Vector2(...a).lerp(new THREE.Vector2(...b), j / 12),
            )
          : [new THREE.Vector2(...a)];
      });
    const skin = buildContinuousExteriorSkin(THREE, {
      datums: d,
      cabinExteriorProfile: [...dense(top), ...dense(bottom)],
      outerBow: outline.bowEnvelope.getPoints(64),
      frontZ,
    });
    const depths = skin.profiles.depthFractions.map(
      (f) => frontZ + (rearZ - frontZ) * f,
    );
    assert.ok(
      depths.length < 60,
      `Straight spans do not multiply the surface grid (${depths.length} rows)`,
    );
    for (const x of top.map(([x]) => x))
      assert.ok(
        depths.some((z) => Math.abs(z + x) < 1e-9),
        `Keep upper profile bend at ${x}`,
      );
    for (let i = 0; i <= 32; i++) {
      const z =
        rearZ + d.thickness - d.thickness * Math.sin((i * Math.PI) / 64);
      assert.ok(
        depths.some((value) => Math.abs(value - z) < 1e-9),
        'Every rear quarter-round sample remains shared',
      );
    }
    for (const upper of [true, false]) {
      const surface = skin.surfaces.find(
        ({ name }) => name === `continuous-exterior-${upper ? 'roof' : 'keel'}`,
      );
      const mesh = new THREE.Mesh(
        surface.geometry,
        new THREE.MeshBasicMaterial(),
      );
      const side = upper ? 1 : -1;
      for (const x of [d.bowTangentX + 0.03, d.stepStartX, d.stepEndX, 0])
        for (const z of [1, 0.21, -0.27, -0.63, -1.13, rearZ + 0.01]) {
          const expected = upper
            ? skin.profiles.roofAt(x, z)
            : skin.profiles.keelAt(x, z);
          const hit = new THREE.Raycaster(
            new THREE.Vector3(x, side * 10, z),
            new THREE.Vector3(0, -side, 0),
          ).intersectObject(mesh)[0];
          assert.ok(hit, 'The simplified crown has no holes');
          assert.ok(
            Math.abs(hit.point.y - expected) < 1e-6,
            'Flat crown spans retain the full depth profile',
          );
        }
      const normals = surface.geometry.attributes.normal;
      for (let i = 0; i < normals.count; i++)
        assert.ok(
          Math.abs(
            new THREE.Vector3().fromBufferAttribute(normals, i).length() - 1,
          ) < 1e-6,
        );
    }
  });
}
