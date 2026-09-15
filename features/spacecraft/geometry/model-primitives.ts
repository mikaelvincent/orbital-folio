import { clipGeometryPlane } from './clip-geometry-plane.ts';
import {
  LADDER_CENTER_Y,
  LADDER_HALF_STRAIGHT,
  DECK_HALF_PITCH,
  PASSAGE_CENTER_Y,
  PASSAGE_LADDER_Z,
  PASSAGE_CABIN_Z,
  PASSAGE_WALL_RADIUS,
} from './spacecraft-wall-layout.ts';

export type Transform = { p: number[]; s?: number[]; r?: number[] };

/** Shared materials, geometry cache and object builders for one spacecraft. */
export function createModelPrimitives(
  THREE: any,
  group: any,
  accent: string | undefined,
  roomMaterials: Record<string, any[]>,
) {
  const cache = new Map<string, any>();
  const materials = new Map<string, any>();
  // Preserve the owner's hue while making the material a rich painted accent
  // under filmic lighting rather than a pale yellow reflective finish.
  const configuredAccent = new THREE.Color(accent || '#e6a34c');
  const accentHSL = { h: 0, s: 0, l: 0 };
  configuredAccent.getHSL(accentHSL, THREE.SRGBColorSpace);
  const paintedAccent = new THREE.Color().setHSL(
    accentHSL.h,
    Math.min(1, accentHSL.s * 1.18 + 0.045),
    Math.min(0.47, accentHSL.l * 0.79),
    THREE.SRGBColorSpace,
  );
  const palette = {
    ivory: 0xe1d6c2,
    chalk: 0xeadfc9,
    edge: 0x9daba6,
    navy: 0x29394a,
    deep: 0x172635,
    slate: 0x6e7f80,
    amber: paintedAccent.getHex(),
    linen: 0xbab5a3,
    blue: 0x8ec5cf,
    green: 0x77907c,
  };
  const mat = (
    name: string,
    color: number,
    roughness = 0.5,
    metalness = 0.12,
    extra = {},
  ) => {
    const result = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      ...extra,
    });
    result.name = name;
    result.userData.highlightScale =
      name === 'signal-amber' ? 0.3 : name.includes('light') ? 0.05 : 0.018;
    return result;
  };
  const m = {
    shell: mat('ceramic-hull', palette.ivory, 0.38, 0.07),
    chalk: mat('interior-enamel', palette.chalk, 0.54, 0.04),
    liner: mat('warm-insulation', 0xc7bba2, 0.67, 0.01),
    wall: mat('plain-cabin-enamel', palette.ivory, 0.82, 0),
    gasket: mat('graphite-gasket', 0x2b3948, 0.63, 0.04),
    navy: mat('graphite-enamel', palette.navy, 0.37, 0.28),
    deep: mat('recess', palette.deep, 0.69, 0.12),
    metal: mat('brushed-titanium', palette.edge, 0.34, 0.63),
    slate: mat('sage-utility', palette.slate, 0.44, 0.25),
    amber: mat('signal-amber', palette.amber, 0.25, 0.055),
    linen: mat('woven-linen', palette.linen, 0.94, 0.0),
    blanket: mat('woven-ochre', 0xc89253, 0.96, 0.0, {
      side: THREE.DoubleSide,
    }),
    upholstery: mat('woven-blue', 0x354d69, 0.93, 0.0),
    paper: mat('warm-paper', 0xf0dfbc, 0.88, 0.0),
    glass: mat('blue-optical-glass', 0x244d5c, 0.18, 0.46, {
      emissive: 0x285362,
      emissiveIntensity: 0.14,
    }),
    display: mat('display-light', palette.blue, 0.38, 0.12, {
      emissive: palette.blue,
      emissiveIntensity: 0.38,
    }),
    screen: mat('screen', 0x163844, 0.3, 0.12, {
      emissive: 0x193b47,
      emissiveIntensity: 0.28,
    }),
    light: mat('warm-light', 0xfde5b1, 0.3, 0.0, {
      emissive: 0xffc574,
      emissiveIntensity: 1.1,
    }),
    windowReveal: mat('window-reveal-graphite', palette.navy, 0.63, 0.04),
    windowSignal: mat('window-perimeter-signal', palette.amber, 0.55, 0.0, {
      emissive: palette.amber,
      emissiveIntensity: 0.09,
    }),
    green: mat('sage-leaves', palette.green, 0.87, 0.0),
    leaf: mat('deep-leaves', 0x4d725c, 0.88, 0.0),
    solar: mat('solar-cells', 0x143966, 0.49, 0.16),
    solarAlt: mat('solar-cells-alt', 0x204d7c, 0.52, 0.16),
    solarLine: mat('solar-conductors', 0x405c6b, 0.56, 0.3),
  };
  m.windowReveal.userData.highlightScale = 0;
  m.windowSignal.userData.highlightScale = 0.3;

  // A tiny deterministic weave adds close-up material variation without assets.
  const weaveData = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const i = (y * 64 + x) * 4;
      const value =
        178 + (x % 4 < 2 !== y % 4 < 2 ? 45 : 0) + ((x * 17 + y * 31) % 11);
      weaveData[i] = weaveData[i + 1] = weaveData[i + 2] = value;
      weaveData[i + 3] = 255;
    }
  const weave = new THREE.DataTexture(weaveData, 64, 64);
  weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
  weave.magFilter = THREE.LinearFilter;
  weave.minFilter = THREE.LinearMipmapLinearFilter;
  weave.generateMipmaps = true;
  weave.anisotropy = 4;
  weave.repeat.set(7, 7);
  weave.needsUpdate = true;
  for (const fabric of [m.linen, m.blanket, m.upholstery]) {
    fabric.bumpMap = weave;
    fabric.bumpScale = 0.002;
  }

  function sectionOf(parent: any): string {
    return (
      parent.userData.section ||
      (parent.parent ? sectionOf(parent.parent) : 'about')
    );
  }
  function roomMat(
    original: any,
    section: string,
    exterior = false,
    surfaceOnly = false,
  ) {
    surfaceOnly ||= !!original.userData.surfaceOnly;
    const key =
      original.uuid + ':' + section + ':' + exterior + ':' + surfaceOnly;
    if (!materials.has(key)) {
      const clone = original.clone();
      clone.userData.exterior = exterior;
      clone.userData.surfaceOnly = surfaceOnly;
      clone.userData.baseEmissive = original.emissive.clone();
      clone.userData.baseColor = original.color.clone();
      clone.userData.baseIntensity = original.emissiveIntensity;
      clone.userData.highlightScale = original.userData.highlightScale ?? 0.035;
      if (original.name === m.wall.name || original.userData.neutralPaint) {
        // Keep diffuse shading and shadows, but suppress the blue rim / amber
        // key's color cast on cabin paint. Opposite faces should read as the
        // same ivory wall or white shutter, rather than different finishes.
        clone.onBeforeCompile = (shader: any) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            'vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',
            `vec3 paintIrradiance = totalDiffuse / max(diffuseColor.rgb, vec3(0.0001));
             float paintLuminance = dot(paintIrradiance, vec3(0.2126, 0.7152, 0.0722));
             totalDiffuse = mix(totalDiffuse, diffuseColor.rgb * paintLuminance, 0.9);
             vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;`,
          );
        };
        clone.customProgramCacheKey = () => 'neutral-cabin-paint-v1';
      }
      roomMaterials[section].push(clone);
      materials.set(key, clone);
    }
    return materials.get(key);
  }
  function surfaceOnlyScope(parent: any) {
    for (let p = parent; p; p = p.parent)
      if (p.userData.surfaceOnly) return true;
    return false;
  }
  function exteriorScope(parent: any, name = '', original?: any) {
    if (original?.userData.roomSurface || name.endsWith('-interior'))
      return false;
    for (let p = parent; p; p = p.parent)
      if (p.userData.roomSurface) return false;
    if (original?.userData.exterior || name.endsWith('-exterior')) return true;
    for (let p = parent; p; p = p.parent) if (p.userData.exterior) return true;
    return /^(rounded-front-pressure-collar|recessed-front-pressure-seal|hover-perimeter-light-guide|roof-latch|reinforced-|room-label-|side-label-|nameplate-amber-clasp|side-nameplate-amber-clasp|underside-service-keel|captive-collar-fasteners)/.test(
      name,
    );
  }
  function cached(key: string, make: () => any) {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  }
  // Segment placement is concentrated on the radiused edges of the cuboid.
  function roundedGeometry(w: number, h: number, d: number, radius = 0.04) {
    const r = Math.min(radius, w * 0.495, h * 0.495, d * 0.495);
    return cached(`rounded:${w}:${h}:${d}:${r}`, () => {
      // Keep every curved bevel sample; omit the redundant midpoint along
      // each straight core span. Odd segment counts connect -core to +core.
      const segments = Math.max(w, h, d) > 0.4 ? 9 : 5;
      const geometry = new THREE.BoxGeometry(
        w,
        h,
        d,
        segments,
        segments,
        segments,
      );
      const positions = geometry.attributes.position,
        normals = geometry.attributes.normal,
        uv = geometry.attributes.uv;
      const half = [w / 2, h / 2, d / 2],
        core = half.map((v: number) => v - r);
      const steps =
        segments === 9
          ? [-1, -0.8, -0.45, -0.18, 0, 0, 0.18, 0.45, 0.8, 1]
          : [-1, -0.45, 0, 0, 0.45, 1];
      for (let i = 0; i < positions.count; i++) {
        const original = [
          positions.getX(i),
          positions.getY(i),
          positions.getZ(i),
        ];
        const originalNormal = [
          normals.getX(i),
          normals.getY(i),
          normals.getZ(i),
        ];
        const p = original.map((v: number, a: number) => {
          const index = Math.round(((v / half[a] + 1) * segments) / 2);
          return (
            Math.sign(index - segments / 2) *
            (core[a] + Math.abs(steps[index]) * r)
          );
        });
        const c = p.map((v: number, a: number) =>
          Math.max(-core[a], Math.min(core[a], v)),
        );
        const n = new THREE.Vector3(
          p[0] - c[0],
          p[1] - c[1],
          p[2] - c[2],
        ).normalize();
        const px = c[0] + n.x * r,
          py = c[1] + n.y * r,
          pz = c[2] + n.z * r;
        positions.setXYZ(i, px, py, pz);
        // Face UVs follow the remapped physical position, so screens and fabric
        // occupy the whole face instead of a magnified central texture crop.
        if (originalNormal[0])
          uv.setXY(
            i,
            0.5 - (Math.sign(originalNormal[0]) * pz) / d,
            py / h + 0.5,
          );
        else if (originalNormal[1])
          uv.setXY(
            i,
            px / w + 0.5,
            0.5 - (Math.sign(originalNormal[1]) * pz) / d,
          );
        else
          uv.setXY(
            i,
            0.5 + (Math.sign(originalNormal[2]) * px) / w,
            py / h + 0.5,
          );
        normals.setXYZ(i, n.x, n.y, n.z);
      }
      geometry.computeBoundingSphere();
      return geometry;
    });
  }
  function mesh(geometry: any, material: any, parent: any, name = '') {
    const section = sectionOf(parent);
    const object = new THREE.Mesh(
      geometry,
      roomMat(
        material,
        section,
        exteriorScope(parent, name, material),
        surfaceOnlyScope(parent),
      ),
    );
    object.name = name || material.name;
    object.userData.section = section;
    for (let scope = parent; scope && scope !== group; scope = scope.parent) {
      if (scope.userData.openReader) object.userData.openReader = true;
      if (scope.userData.excludePick) object.userData.excludePick = true;
    }
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function pressureMesh(
    geometry: any,
    material: any,
    parent: any,
    name: string,
    side: number,
  ) {
    const key = `pressure-surfaces:${geometry.uuid}:${side}`;
    const pair = cached(key, () => {
      const source = geometry.index ? geometry.toNonIndexed() : geometry;
      const p = source.getAttribute('position'),
        n = source.getAttribute('normal'),
        uv = source.getAttribute('uv');
      const buckets = [
        { p: [] as number[], n: [] as number[], uv: [] as number[] },
        { p: [] as number[], n: [] as number[], uv: [] as number[] },
      ];
      for (let i = 0; i < p.count; i += 3) {
        const center = new THREE.Vector3(),
          normal = new THREE.Vector3();
        for (let j = 0; j < 3; j++) {
          center.add(new THREE.Vector3().fromBufferAttribute(p, i + j));
          normal.add(new THREE.Vector3().fromBufferAttribute(n, i + j));
        }
        center.multiplyScalar(1 / 3);
        normal.normalize();
        const outside = side
          ? normal.x * side > 0.1
          : normal.dot(center.sub(new THREE.Vector3(0, 0.05, 0))) >= -0.015;
        if (
          name === 'walkway-open-docking-wall' &&
          Math.abs(normal.x) < 0.001 &&
          (Math.abs(
            Math.abs(center.y - LADDER_CENTER_Y) - LADDER_HALF_STRAIGHT,
          ) < 1e-4 ||
            (normal.z < -0.999 && center.z < -1.1))
        )
          continue;
        // The continuous chassis owns the exterior. Do not leave old pod
        // roofs, square end caps, or differently lit divider rims under it.
        if (name.endsWith('-continuous-pressure-skin') && outside) continue;
        if (name.endsWith('-sealed-outboard-wall') && normal.x > -0.999)
          continue;
        if (
          /open-side-pressure-bulkhead|walkway-twin-open-room-wall/.test(name)
        ) {
          const ladderWall = name.startsWith('walkway-');
          const centers = ladderWall
            ? [
                DECK_HALF_PITCH + PASSAGE_CENTER_Y,
                -DECK_HALF_PITCH + PASSAGE_CENTER_Y,
              ]
            : [PASSAGE_CENTER_Y];
          const centerZ = ladderWall ? PASSAGE_LADDER_Z : PASSAGE_CABIN_Z;
          const passage = centers.some(
            (y) =>
              Math.abs(
                Math.hypot(center.y - y, center.z - centerZ) -
                  PASSAGE_WALL_RADIUS,
              ) < 0.025,
          );
          if (Math.abs(normal.x) < 0.999 && !passage) continue;
        }
        const frontClosure =
          name.endsWith('-continuous-pressure-skin') &&
          center.z > 1.2 &&
          normal.z > 0.5;
        const bucket = buckets[outside && !frontClosure ? 0 : 1];
        for (let j = 0; j < 3; j++) {
          bucket.p.push(p.getX(i + j), p.getY(i + j), p.getZ(i + j));
          bucket.n.push(n.getX(i + j), n.getY(i + j), n.getZ(i + j));
          bucket.uv.push(uv ? uv.getX(i + j) : 0, uv ? uv.getY(i + j) : 0);
        }
      }
      return buckets.map((bucket, index) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(bucket.p, 3),
        );
        g.setAttribute('normal', new THREE.Float32BufferAttribute(bucket.n, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(bucket.uv, 2));
        g.computeBoundingSphere();
        if (name === 'walkway-open-docking-wall' && index === 0) {
          const face = clipGeometryPlane(THREE, g, 2, -1.1);
          g.dispose();
          return face;
        }
        return g;
      });
    });
    const assembly = new THREE.Group();
    assembly.userData.section = sectionOf(parent);
    parent.add(assembly);
    // The common chassis replaces only the external faces of the former pods.
    // Their interior triangles retain their original geometry and materials.
    const cabinPartition =
      /open-side-pressure-bulkhead|walkway-twin-open-room-wall/.test(name);
    mesh(
      pair[0],
      cabinPartition
        ? material.userData.cabinPartitionPaint
          ? material
          : m.wall
        : material,
      assembly,
      name + (cabinPartition ? '-other-room-interior' : '-exterior'),
    );
    const insideMaterial =
      /continuous-pressure-skin|sealed-outboard-wall|open-side-pressure-bulkhead|walkway-(twin-open-room|open-docking)-wall/.test(
        name,
      )
        ? material.userData.cabinPartitionPaint
          ? material
          : m.wall
        : material;
    mesh(pair[1], insideMaterial, assembly, name + '-interior');
    return assembly;
  }
  function box(
    w: number,
    h: number,
    d: number,
    material: any,
    x: number,
    y: number,
    z: number,
    parent: any,
    radius = 0.035,
    name = '',
  ) {
    const result = mesh(
      roundedGeometry(w, h, d, radius),
      material,
      parent,
      name,
    );
    result.position.set(x, y, z);
    return result;
  }
  function cylinder(
    radius: number,
    length: number,
    material: any,
    x: number,
    y: number,
    z: number,
    parent: any,
    axis = 'y',
    radiusTop = radius,
    segments = Math.max(radius, radiusTop) <= 0.06
      ? 16
      : Math.max(radius, radiusTop) <= 0.18
        ? 24
        : Math.max(radius, radiusTop) <= 0.3
          ? 32
          : 40,
  ) {
    const geometry = cached(
      `cylinder:${radius}:${radiusTop}:${length}:${segments}`,
      () => new THREE.CylinderGeometry(radiusTop, radius, length, segments, 1),
    );
    const result = mesh(geometry, material, parent);
    result.position.set(x, y, z);
    if (axis === 'x') result.rotation.z = -Math.PI / 2;
    if (axis === 'z') result.rotation.x = Math.PI / 2;
    return result;
  }
  function torus(
    radius: number,
    tube: number,
    material: any,
    x: number,
    y: number,
    z: number,
    parent: any,
    axis = 'z',
  ) {
    const geometry = cached(
      `torus:${radius}:${tube}`,
      () =>
        new THREE.TorusGeometry(
          radius,
          tube,
          radius <= 0.25 ? (tube < 0.01 ? 6 : 8) : 10,
          radius <= 0.1 ? 24 : radius <= 0.25 ? 32 : 56,
        ),
    );
    const result = mesh(geometry, material, parent);
    result.position.set(x, y, z);
    if (axis === 'x') result.rotation.y = Math.PI / 2;
    if (axis === 'y') result.rotation.x = Math.PI / 2;
    return result;
  }
  function sphere(
    radius: number,
    material: any,
    x: number,
    y: number,
    z: number,
    parent: any,
  ) {
    const geometry = cached(
      `sphere:${radius}`,
      () => new THREE.SphereGeometry(radius, 16, 12),
    );
    const result = mesh(geometry, material, parent);
    result.position.set(x, y, z);
    return result;
  }
  function rod(
    from: number[],
    to: number[],
    radius: number,
    material: any,
    parent: any,
  ) {
    const a = new THREE.Vector3(...from),
      b = new THREE.Vector3(...to);
    const object = cylinder(radius, a.distanceTo(b), material, 0, 0, 0, parent);
    object.position.copy(a).add(b).multiplyScalar(0.5);
    object.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.sub(a).normalize(),
    );
    return object;
  }
  function instances(
    geometry: any,
    material: any,
    transforms: Transform[],
    parent: any,
    name: string,
  ) {
    if (!transforms.length) return;
    const section = sectionOf(parent);
    const object = new THREE.InstancedMesh(
      geometry,
      roomMat(
        material,
        section,
        exteriorScope(parent, name, material),
        surfaceOnlyScope(parent),
      ),
      transforms.length,
    );
    const dummy = new THREE.Object3D();
    transforms.forEach((t, i) => {
      dummy.position.set(...t.p);
      dummy.rotation.set(...(t.r || [0, 0, 0]));
      dummy.scale.set(...(t.s || [1, 1, 1]));
      dummy.updateMatrix();
      object.setMatrixAt(i, dummy.matrix);
    });
    object.instanceMatrix.needsUpdate = true;
    object.castShadow = object.receiveShadow = true;
    object.userData.section = section;
    object.name = name;
    parent.add(object);
    return object;
  }
  function roundedPath(path: any, w: number, h: number, r: number) {
    const x = -w / 2,
      y = -h / 2;
    path.moveTo(x + r, y);
    path.lineTo(x + w - r, y);
    path.quadraticCurveTo(x + w, y, x + w, y + r);
    path.lineTo(x + w, y + h - r);
    path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    path.lineTo(x + r, y + h);
    path.quadraticCurveTo(x, y + h, x, y + h - r);
    path.lineTo(x, y + r);
    path.quadraticCurveTo(x, y, x + r, y);
    return path;
  }
  function frameGeometry(
    w: number,
    h: number,
    r: number,
    thickness: number,
    depth: number,
    bevel = 0.018,
  ) {
    return cached(`frame:${w}:${h}:${r}:${thickness}:${depth}:${bevel}`, () => {
      const shape = roundedPath(new THREE.Shape(), w, h, r);
      shape.holes.push(
        roundedPath(
          new THREE.Path(),
          w - thickness * 2,
          h - thickness * 2,
          Math.max(0.02, r - thickness),
        ),
      );
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSize: bevel,
        bevelThickness: bevel,
        bevelSegments: 4,
        steps: 1,
        curveSegments: 16,
      });
      geometry.translate(0, 0, -depth / 2);
      return geometry;
    });
  }
  function panelGeometry(
    w: number,
    h: number,
    r: number,
    depth: number,
    bevel = 0.025,
  ) {
    return cached(`panel:${w}:${h}:${r}:${depth}:${bevel}`, () => {
      const shape = roundedPath(new THREE.Shape(), w, h, r);
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSize: bevel,
        bevelThickness: bevel,
        bevelSegments: 4,
        steps: 1,
        curveSegments: 16,
      });
      geometry.translate(0, 0, -depth / 2);
      return geometry;
    });
  }
  function axialHull(
    profile: number[][],
    material: any,
    x: number,
    y: number,
    z: number,
    parent: any,
    name: string,
  ) {
    const geometry = new THREE.LatheGeometry(
      profile.map(([r, offset]) => new THREE.Vector2(r, offset)),
      64,
    );
    geometry.rotateZ(-Math.PI / 2);
    const object = mesh(geometry, material, parent, name);
    object.position.set(x, y, z);
    return object;
  }
  return {
    palette,
    mat,
    m,
    sectionOf,
    roomMat,
    cached,
    roundedGeometry,
    mesh,
    pressureMesh,
    box,
    cylinder,
    torus,
    sphere,
    rod,
    instances,
    roundedPath,
    frameGeometry,
    panelGeometry,
    axialHull,
  };
}

export type ModelPrimitives = ReturnType<typeof createModelPrimitives>;
