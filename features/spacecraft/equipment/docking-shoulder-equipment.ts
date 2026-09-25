import { PALETTE } from '../../../lib/palette.ts';
import { applyHardwareFinish } from '../materials/hardware-finish.ts';

/** Matched maintenance spanners stow in open spring clips on the docking liner.
 * Their open alloy jaws and substantial dark grasps explain the tools without
 * labels, directional optics or anonymous storage housings.
 */
export function buildDockingShoulderEquipment(
  THREE: any,
  h: any,
  parent: any,
  wallContour: Array<{ x: number; y: number }>,
  centerY: number,
) {
  const prefix = 'docking-shoulder-';
  const root = new THREE.Group();
  root.name = prefix + 'maintenance-spanners';
  root.userData = {
    section: 'walkway',
    batchRoot: true,
    excludePick: true,
    static: true,
    equipmentKind: 'stowed-open-jaw-maintenance-spanners',
  };
  parent.add(root);
  const material = (
    name: string,
    color: number | string,
    roughness = 0.5,
    metalness = 0,
  ) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    m.name = prefix + name;
    m.envMapIntensity = 0.17;
    m.userData.highlightScale = 0.018;
    return m;
  };
  const m = {
    navy: material('tool-graphite', PALETTE.carbon, 0.64, 0.12),
    alloy: applyHardwareFinish(
      material('tool-satin-alloy', PALETTE.alloy),
      'alloy',
    ),
    amber: applyHardwareFinish(
      material('tool-retention-markers', PALETTE.bronze),
      'bronze',
    ),
  };
  const mounts: any[] = [],
    tools: any[] = [],
    parts: string[] = [];
  const wallX = (y: number) => {
    let left = Infinity;
    for (let i = 0; i < wallContour.length; i++) {
      const a = wallContour[i],
        b = wallContour[(i + 1) % wallContour.length];
      if (
        Math.abs(b.y - a.y) < 1e-10 ||
        y < Math.min(a.y, b.y) ||
        y > Math.max(a.y, b.y)
      )
        continue;
      left = Math.min(left, a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y));
    }
    if (!Number.isFinite(left))
      throw new RangeError('Tool clips must fit inside the docking contour');
    return left;
  };
  const xAxis = new THREE.Vector3(1, 0, 0),
    yAxis = new THREE.Vector3(0, 1, 0),
    zAxis = new THREE.Vector3(0, 0, 1);
  // The forged tool is drawn in its broad face (depth Z / height Y). Keeping
  // that plane facing into the cabin makes the open wrench jaw unmistakable.
  const faceBasis = new THREE.Matrix4().makeBasis(zAxis, yAxis, xAxis);
  for (const side of [-1, 1]) {
    const y = centerY + side * 1.66;
    const slope = (wallX(y + 0.006) - wallX(y - 0.006)) / 0.012;
    const axis = new THREE.Vector3(slope, 1, 0)
      .normalize()
      .multiplyScalar(side);
    const normal = new THREE.Vector3(1, -slope, 0).normalize();
    const origin = new THREE.Vector3(wallX(y), y, 0).addScaledVector(
      normal,
      0.17,
    );
    // Z stays fixed for a true top/bottom reflection, including release tabs.
    const matrix = new THREE.Matrix4()
      .makeBasis(normal, axis, zAxis)
      .setPosition(origin);
    const localPoint = (x: number, y: number, z: number) =>
      new THREE.Vector3(x, y, z).applyMatrix4(matrix);
    const emit = (
      geometry: any,
      material: any,
      name: string,
      transform?: any,
    ) => {
      if (transform) {
        geometry.applyMatrix4(transform);
        if (transform.determinant() < 0) {
          const index = geometry.index
            ? (Array.from(geometry.index.array) as number[])
            : Array.from(
                { length: geometry.attributes.position.count },
                (_, i) => i,
              );
          for (let i = 0; i < index.length; i += 3)
            [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]];
          geometry.setIndex(index);
        }
      }
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const object = h.mesh(geometry, material, root, prefix + name);
      object.userData.side = side;
      parts.push(name);
      return object;
    };
    const plate = (
      shape: any,
      thickness: number,
      bevel: number,
      material: any,
      name: string,
      normalOffset = 0,
    ) => {
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: thickness - 2 * bevel,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 3,
        curveSegments: 14,
        steps: 1,
      });
      geometry.translate(0, 0, -(thickness - 2 * bevel) / 2 + normalOffset);
      return emit(geometry, material, name, matrix.clone().multiply(faceBasis));
    };
    const rounded = (width: number, height: number, cy: number, r: number) => {
      const l = -width / 2,
        b = cy - height / 2,
        w = width,
        t = b + height;
      const shape = new THREE.Shape();
      shape.moveTo(l + r, b);
      shape.lineTo(l + w - r, b);
      shape.quadraticCurveTo(l + w, b, l + w, b + r);
      shape.lineTo(l + w, t - r);
      shape.quadraticCurveTo(l + w, t, l + w - r, t);
      shape.lineTo(l + r, t);
      shape.quadraticCurveTo(l, t, l, t - r);
      shape.lineTo(l, b + r);
      shape.quadraticCurveTo(l, b, l + r, b);
      shape.closePath();
      return shape;
    };
    const tube = (
      points: number[][],
      radius: number,
      material: any,
      name: string,
      segments = 24,
    ) => {
      const path = new THREE.CatmullRomCurve3(
        points.map((p) => new THREE.Vector3(...p)),
        false,
        'centripetal',
      );
      return emit(
        new THREE.TubeGeometry(path, segments, radius, 10, false),
        material,
        name,
        matrix,
      );
    };
    const blank = new THREE.Shape();
    blank.moveTo(0.063, 0.339);
    blank.quadraticCurveTo(0.125, 0.31, 0.126, 0.25);
    blank.quadraticCurveTo(0.128, 0.184, 0.078, 0.158);
    blank.lineTo(0.039, 0.131);
    blank.lineTo(0.025, -0.271);
    blank.quadraticCurveTo(0.025, -0.315, 0, -0.317);
    blank.quadraticCurveTo(-0.025, -0.315, -0.025, -0.271);
    blank.lineTo(-0.039, 0.131);
    blank.lineTo(-0.078, 0.158);
    blank.quadraticCurveTo(-0.128, 0.184, -0.126, 0.25);
    blank.quadraticCurveTo(-0.125, 0.31, -0.063, 0.339);
    // Flat opposing jaw faces and an open throat identify a real spanner.
    blank.lineTo(-0.057, 0.267);
    blank.lineTo(-0.033, 0.221);
    blank.lineTo(0.033, 0.221);
    blank.lineTo(0.057, 0.267);
    blank.lineTo(0.063, 0.339);
    blank.closePath();
    const tailEye = new THREE.Path();
    tailEye.absarc(0, -0.285, 0.012, 0, Math.PI * 2, true);
    blank.holes.push(tailEye);
    plate(blank, 0.052, 0.0045, m.alloy, 'forged-open-jaw-spanner');
    plate(
      rounded(0.077, 0.308, -0.074, 0.023),
      0.076,
      0.005,
      m.navy,
      'substantial-spanner-grasp',
      0.003,
    );
    for (const cy of [-0.215, 0.067])
      plate(
        rounded(0.077, 0.013, cy, 0.004),
        0.078,
        0.0015,
        m.amber,
        'grasp-end-index',
        0.003,
      );
    for (const cy of [-0.175, 0.052]) {
      // Open spring clips leave the main grip face exposed. Small resilient
      // pads contact the grasp sides; the tool cannot float inside its holder.
      tube(
        [
          [0.025, cy, -0.052],
          [-0.044, cy, -0.052],
          [-0.062, cy, -0.034],
          [-0.062, cy, 0.034],
          [-0.044, cy, 0.052],
          [0.025, cy, 0.052],
        ],
        0.009,
        m.alloy,
        'open-tool-retention-clip',
      );
      for (const z of [-0.042, 0.042]) {
        const pad = new THREE.BoxGeometry(0.048, 0.056, 0.012);
        pad.translate(-0.004, cy, z);
        emit(pad, m.navy, 'clip-contact-pad', matrix);
      }
      const back = localPoint(-0.071, cy, 0),
        skin = new THREE.Vector3(wallX(back.y), back.y, back.z);
      const n = new THREE.Vector3(
        1,
        -(wallX(back.y + 0.005) - wallX(back.y - 0.005)) / 0.01,
        0,
      ).normalize();
      const delta = back.clone().sub(skin),
        post = new THREE.CylinderGeometry(0.022, 0.022, delta.length(), 20);
      post.applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(
          yAxis,
          delta.clone().normalize(),
        ),
      );
      post.translate(...back.clone().add(skin).multiplyScalar(0.5).toArray());
      emit(post, m.alloy, 'clip-rigid-post');
      const foot = new THREE.CylinderGeometry(0.045, 0.045, 0.024, 24);
      foot.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(yAxis, n));
      foot.translate(...skin.clone().addScaledVector(n, 0.01).toArray());
      emit(foot, m.navy, 'clip-bonded-mount-foot');
      mounts.push({
        side,
        skin: skin.toArray(),
        normal: n.toArray(),
        postEnd: back.toArray(),
      });
    }
    tube(
      [
        [-0.063, -0.195, -0.035],
        [-0.063, 0.072, -0.035],
      ],
      0.01,
      m.navy,
      'open-holder-backbone',
    );
    tube(
      [
        [-0.063, -0.195, 0.035],
        [-0.063, 0.072, 0.035],
      ],
      0.01,
      m.navy,
      'open-holder-backbone',
    );
    const release = rounded(0.025, 0.082, 0.052, 0.009);
    const releaseGeometry = new THREE.ExtrudeGeometry(release, {
      depth: 0.018,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.003,
      bevelSegments: 2,
      curveSegments: 8,
    });
    releaseGeometry.translate(0.06, 0, 0.021);
    emit(
      releaseGeometry,
      m.amber,
      'spring-clip-release-tab',
      matrix.clone().multiply(faceBasis),
    );
    // A short retained loop passes through the forged heel eye and returns
    // to the lower clip, reinforcing that these are stowed maintenance tools.
    tube(
      [
        [0.02, -0.285, 0],
        [0.047, -0.323, 0.028],
        [-0.019, -0.321, 0.057],
        [-0.057, -0.226, 0.054],
        [-0.062, -0.175, 0.034],
      ],
      0.0045,
      m.navy,
      'retained-tool-tail-loop',
      36,
    );
    tools.push({
      side,
      center: origin.toArray(),
      axis: axis.toArray(),
      normal: normal.toArray(),
      jawGap: localPoint(0, 0.28, 0).toArray(),
      jawFaces: [
        localPoint(0, 0.27, -0.096).toArray(),
        localPoint(0, 0.27, 0.096).toArray(),
      ],
      grip: localPoint(0.03, -0.074, 0).toArray(),
    });
  }
  root.userData.layout = {
    symmetryCenterY: centerY,
    centerOffsetsY: [-1.66, 1.66],
    tools,
    mounts,
    parts,
    followsPressureLiner: true,
    noLightsOrControls: true,
    openToolClips: true,
  };
  return root;
}
