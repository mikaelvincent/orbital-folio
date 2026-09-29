import type * as Three from 'three';
import { localBounds } from './local-bounds.ts';

type Rect = [number, number, number, number];
const whole: Rect = [0, 0, 1, 1];
const overlaps = (a: Rect, b: Rect) =>
  a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];

/** Conservative screen bounds. A near-plane crossing retains the full viewport. */
export function projectedBox(
  T: typeof Three,
  box: Three.Box3,
  camera: any,
): Rect {
  const rect: Rect = [Infinity, Infinity, -Infinity, -Infinity];
  const p = new T.Vector3();
  for (let i = 0; i < 8; i++) {
    p.set(
      i & 1 ? box.max.x : box.min.x,
      i & 2 ? box.max.y : box.min.y,
      i & 4 ? box.max.z : box.min.z,
    ).applyMatrix4(camera.matrixWorldInverse);
    if (camera.isPerspectiveCamera && p.z >= -camera.near) return [...whole];
    p.applyMatrix4(camera.projectionMatrix);
    const x = p.x * 0.5 + 0.5,
      y = p.y * 0.5 + 0.5;
    rect[0] = Math.min(rect[0], x);
    rect[1] = Math.min(rect[1], y);
    rect[2] = Math.max(rect[2], x);
    rect[3] = Math.max(rect[3], y);
  }
  return rect;
}

export function expandRect(rect: Rect, x: number, y = x): Rect {
  return [rect[0] - x, rect[1] - y, rect[2] + x, rect[3] + y];
}

/** Option B: a full-sweep influence region, repaired without changing projection,
 * shading shaders, animation cadence, shadow quality or AO sample positions. */
export function createDishInfluenceCache({
  three: T,
  renderer,
  scene,
  camera,
  model,
  key,
  ao,
}: {
  three: typeof Three;
  renderer: Three.WebGLRenderer;
  scene: Three.Scene;
  camera: Three.PerspectiveCamera;
  model: { group: Three.Group };
  key: Three.DirectionalLight;
  ao: any;
}) {
  const dish = model.group.getObjectByName(
    'service-mounted-communications-dish',
  );
  const dynamic = new Set<Three.Object3D>();
  dish?.traverse((o) => dynamic.add(o));
  // The pixel cache guards topology before reusing this fixed inventory. Read
  // the descendants' current matrices each frame; only root rotation is exempt.
  const descendants = [...dynamic].filter((o) => o !== dish);
  const meshes: any[] = [];
  scene.traverse((o: any) => {
    if (o.isMesh) meshes.push(o);
  });
  const receivers = new Set<any>();
  let shadowExcluded: any[] = [],
    normalExcluded: any[] = [];
  let shadowRect: Rect = [...whole],
    normalRect: Rect = [...whole];
  let aoRect: Rect = [...whole],
    denoiseRect: Rect = [...whole];
  let ready = false,
    shadowRepairs = 0,
    aoRepairs = 0,
    aoSkips = 0;
  let radius = 0;

  function bounds(o: any) {
    return localBounds(o).clone().applyMatrix4(o.matrixWorld);
  }
  function supported() {
    // A full sweep uses the current world scale only when the parent preserves
    // angles and has uniform scale. Nonuniform ancestry can shear as the dish
    // rotates, making a pose-specific maximum column length underestimate it.
    const e = dish?.parent?.matrixWorld.elements;
    if (e) {
      const lengths = [0, 4, 8].map(
        (i) => e[i] * e[i] + e[i + 1] * e[i + 1] + e[i + 2] * e[i + 2],
      );
      const tolerance = Math.max(...lengths) * 1e-10;
      if (
        Math.min(...lengths) <= 0 ||
        Math.max(...lengths) - Math.min(...lengths) > tolerance ||
        [
          [0, 4],
          [0, 8],
          [4, 8],
        ].some(
          ([a, b]) =>
            Math.abs(e[a] * e[b] + e[a + 1] * e[b + 1] + e[a + 2] * e[b + 2]) >
            tolerance,
        )
      )
        return false;
    }
    return (
      !!dish &&
      key.castShadow &&
      key.shadow.camera.isOrthographicCamera &&
      renderer.shadowMap.type === T.PCFShadowMap &&
      !renderer.shadowMap.autoUpdate &&
      ao.gtaoMaterial.defines.SCREEN_SPACE_RADIUS === 0 &&
      ao.gtaoMaterial.uniforms.radius.value >= 0 &&
      ao.gtaoMaterial.uniforms.thickness.value >= 0
    );
  }
  function prepare() {
    ready = false;
    if (!supported()) return;
    // A sphere about the axle encloses every possible rotation, without sampled
    // angular gaps. Descendant geometry remains rigid relative to the moving root.
    radius = 0;
    const inverse = dish!.matrixWorld.clone().invert();
    const p = new T.Vector3();
    for (const o of meshes) {
      if (!dynamic.has(o)) continue;
      const box = localBounds(o)
        .clone()
        .applyMatrix4(new T.Matrix4().multiplyMatrices(inverse, o.matrixWorld));
      for (let i = 0; i < 8; i++) {
        p.set(
          i & 1 ? box.max.x : box.min.x,
          i & 2 ? box.max.y : box.min.y,
          i & 4 ? box.max.z : box.min.z,
        );
        radius = Math.max(radius, p.length());
      }
    }
    radius *= dish!.matrixWorld.getMaxScaleOnAxis();
    const center = new T.Vector3().setFromMatrixPosition(dish!.matrixWorld);
    const sweep = new T.Box3().setFromCenterAndSize(
      center,
      new T.Vector3().setScalar(radius * 2),
    );
    key.shadow.updateMatrices(key);
    const mapSize = key.shadow.mapSize;
    const shadowCamera = key.shadow.camera;
    const filterPad = Math.ceil(key.shadow.radius * 2 + 4);
    const biasX =
      Math.abs(
        shadowCamera.projectionMatrix.elements[0] * key.shadow.normalBias,
      ) * 0.5;
    const biasY =
      Math.abs(
        shadowCamera.projectionMatrix.elements[5] * key.shadow.normalBias,
      ) * 0.5;
    shadowRect = expandRect(
      projectedBox(T, sweep, shadowCamera),
      filterPad / mapSize.x + biasX,
      filterPad / mapSize.y + biasY,
    );
    receivers.clear();
    shadowExcluded = [];
    normalExcluded = [];
    normalRect = projectedBox(T, sweep, camera);
    const w = ao.normalRenderTarget.width,
      h = ao.normalRenderTarget.height;
    normalRect = expandRect(normalRect, 2 / w, 2 / h);
    const viewCenter = center.clone().applyMatrix4(camera.matrixWorldInverse);
    const nearest =
      -viewCenter.z - radius - ao.gtaoMaterial.uniforms.thickness.value;
    if (nearest <= camera.near) {
      aoRect = [...whole];
      normalRect = [...whole];
      denoiseRect = [...whole];
    } else {
      // GTAO takes view-XY samples (offset.z=0) within radius and rejects depth
      // differences beyond thickness. Dilate the entire swept screen footprint,
      // including disoccluded background, then include the denoiser's support.
      const r = ao.gtaoMaterial.uniforms.radius.value;
      aoRect = expandRect(
        normalRect,
        (r * Math.abs(camera.projectionMatrix.elements[0])) / (2 * nearest) +
          2 / w,
        (r * Math.abs(camera.projectionMatrix.elements[5])) / (2 * nearest) +
          2 / h,
      );
      const pad = Math.ceil(ao.pdMaterial.uniforms.radius.value) + 2;
      denoiseRect = expandRect(aoRect, pad / w, pad / h);
    }
    for (const o of meshes) {
      if (dynamic.has(o)) {
        receivers.add(o);
        continue;
      }
      const b = bounds(o);
      const lightRect = projectedBox(T, b, shadowCamera);
      if (overlaps(lightRect, shadowRect)) receivers.add(o);
      else shadowExcluded.push(o);
      if (!overlaps(projectedBox(T, b, camera), normalRect))
        normalExcluded.push(o);
    }
    ready = true;
  }
  function mask(objects: any[], fn: () => void) {
    const masks = objects.map((o) => o.layers.mask);
    objects.forEach((o) => {
      o.layers.mask = 0;
    });
    try {
      fn();
    } finally {
      objects.forEach((o, i) => {
        o.layers.mask = masks[i];
      });
    }
  }
  function targetRegion(target: Three.RenderTarget, rect: Rect) {
    const original = target.scissor.clone(),
      test = target.scissorTest;
    const x = Math.max(
      0,
      Math.min(target.width, Math.floor(rect[0] * target.width)),
    );
    const y = Math.max(
      0,
      Math.min(target.height, Math.floor(rect[1] * target.height)),
    );
    const right = Math.max(
      x,
      Math.min(target.width, Math.ceil(rect[2] * target.width)),
    );
    const top = Math.max(
      y,
      Math.min(target.height, Math.ceil(rect[3] * target.height)),
    );
    target.scissor.set(x, y, right - x, top - y);
    target.scissorTest = true;
    return () => {
      target.scissor.copy(original);
      target.scissorTest = test;
    };
  }
  function shadow(render: () => void) {
    if (!ready || !key.shadow.map) return false;
    const restore = targetRegion(key.shadow.map, shadowRect);
    try {
      // The shadow pass's setRenderTarget reapplies the target scissor before
      // clear. Static occluders inside this region must also be redrawn.
      mask(shadowExcluded, render);
      shadowRepairs++;
    } finally {
      restore();
    }
    return true;
  }
  function occlusion(render: () => void) {
    if (!ready) {
      render();
      return;
    }
    if (!overlaps(denoiseRect, whole)) {
      aoSkips++;
      return;
    }
    const restore = [
      targetRegion(ao.normalRenderTarget, normalRect),
      targetRegion(ao.gtaoRenderTarget, aoRect),
      targetRegion(ao.pdRenderTarget, denoiseRect),
    ];
    try {
      mask(normalExcluded, render);
      aoRepairs++;
    } finally {
      for (const reset of restore) reset();
    }
  }
  return {
    supported,
    prepare,
    shadow,
    occlusion,
    canRepairShadow: () => ready && !!key.shadow.map,
    contains: (o: Three.Object3D) => receivers.has(o) || dynamic.has(o),
    dynamic: (o: Three.Object3D) => dynamic.has(o),
    invalidate() {
      ready = false;
    },
    signature(values: unknown[]) {
      values.push(
        dish!.position.x,
        dish!.position.y,
        dish!.position.z,
        dish!.scale.x,
        dish!.scale.y,
        dish!.scale.z,
      );
      if (dish!.parent) values.push(...dish!.parent.matrixWorld.elements);
      for (const o of descendants) values.push(...o.matrix.elements);
      values.push(
        key.shadow.mapSize.x,
        key.shadow.mapSize.y,
        key.shadow.radius,
        ...key.shadow.camera.projectionMatrix.elements,
        ao.gtaoMaterial.version,
        ao.pdMaterial.version,
        ao.gtaoMaterial.uniforms.radius.value,
        ao.gtaoMaterial.uniforms.thickness.value,
        ao.gtaoMaterial.uniforms.distanceExponent.value,
        ao.gtaoMaterial.uniforms.scale.value,
        ao.pdMaterial.uniforms.lumaPhi.value,
        ao.pdMaterial.uniforms.depthPhi.value,
        ao.pdMaterial.uniforms.normalPhi.value,
        ao.pdMaterial.uniforms.radius.value,
        ao.normalRenderTarget.width,
        ao.normalRenderTarget.height,
      );
    },
    stats: () => ({
      ready,
      radius,
      receivers: receivers.size,
      shadowRect,
      normalRect,
      aoRect,
      denoiseRect,
      shadowRepairs,
      aoRepairs,
      aoSkips,
      shadowCasters: meshes.length - shadowExcluded.length,
      normalMeshes: meshes.length - normalExcluded.length,
    }),
  };
}
