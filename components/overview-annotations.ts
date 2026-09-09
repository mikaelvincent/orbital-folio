import type * as Three from 'three';
import { moveCameraAxis } from '@/lib/flight';

type Frame = {
  target: Three.Vector3;
  direction: Three.Vector3;
  distance: number;
  roll: number;
};

/** Native callouts are projected from the same space as the spacecraft. The
 * identity's untransformed wrapper is retained solely for stable layout sizing. */
export function createOverviewAnnotations(
  THREE: typeof Three,
  host: HTMLElement,
  site: Record<string, any>,
  callbacks: {
    hover: (section: string) => void;
    navigate: (section: string) => void;
  },
) {
  const ns = 'http://www.w3.org/2000/svg';
  const layer = document.createElement('div');
  layer.className = 'overview-annotations';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  layer.appendChild(svg);
  host.appendChild(layer);
  const entries = ['projects', 'experience', 'about', 'contact'].map(
    (section) => {
      const path = document.createElementNS(ns, 'path');
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('r', '2.5');
      svg.appendChild(path);
      svg.appendChild(dot);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'overview-callout';
      button.textContent = String(site[section + 'Label'] || '');
      button.dataset.section = section;
      button.dataset.targetKey = `room:${section}`;
      button.onclick = () => callbacks.navigate(section);
      button.onpointerenter = button.onfocus = () => callbacks.hover(section);
      button.onpointerleave = button.onblur = () => callbacks.hover('');
      layer.appendChild(button);
      return {
        section,
        path,
        dot,
        button,
        anchor: new THREE.Vector3(),
        world: new THREE.Vector3(),
        upper: false,
        lane: 0,
        width: 100,
        height: 36,
      };
    },
  );
  const reference = new THREE.PerspectiveCamera(38, 1, 0.5, 200);
  const identity = document.querySelector<HTMLElement>('.orbital-identity');
  const identityFlight = identity?.querySelector<HTMLElement>(
    '.orbital-identity-flight',
  );
  const identityWorld = new THREE.Vector3();
  const identityBase = new THREE.Vector2();
  const presence = { value: 1, velocity: 0 };
  let width = 1,
    height = 1,
    depth = 1,
    ready = false;
  const clamp = (x: number, low: number, high: number) =>
    Math.max(low, Math.min(high, x));
  const pointAtDepth = (x: number, y: number) => {
    const ray = new THREE.Vector3(
      (x / width) * 2 - 1,
      1 - (y / height) * 2,
      0.5,
    )
      .unproject(reference)
      .sub(reference.position);
    const forward = reference.getWorldDirection(new THREE.Vector3());
    return ray.multiplyScalar(depth / ray.dot(forward)).add(reference.position);
  };
  const project = (point: Three.Vector3, camera: Three.Camera) => {
    const p = point.clone().project(camera);
    return { x: ((p.x + 1) * width) / 2, y: ((1 - p.y) * height) / 2, z: p.z };
  };
  function layout(frame: Frame, support: number[][], model: Three.Group) {
    width = host.clientWidth;
    height = host.clientHeight;
    depth = frame.distance;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    reference.aspect = width / height;
    reference.far = Math.max(200, depth * 4);
    reference.position
      .copy(frame.target)
      .addScaledVector(frame.direction, depth);
    reference.lookAt(frame.target);
    reference.updateProjectionMatrix();
    reference.updateMatrixWorld(true);
    const rotated = (v: number[]) =>
      new THREE.Vector3(...(v as [number, number, number])).applyAxisAngle(
        new THREE.Vector3(0, 0, 1),
        frame.roll,
      );
    const projected = support.map((p) => project(rotated(p), reference));
    const upperY = Math.min(...projected.map((p) => p.y));
    const lowerY = Math.max(...projected.map((p) => p.y));
    const sorted = entries
      .map((entry) => {
        const center =
          model.userData.calloutAnchors?.[entry.section] ||
          model.userData.roomAnchors[entry.section];
        return { entry, p: project(rotated(center), reference) };
      })
      .sort((a, b) => a.p.y - b.p.y);
    for (const [index, item] of sorted.entries()) {
      const entry = item.entry;
      entry.upper = index < 2;
      const edge =
        Math.abs(frame.roll) > Math.PI / 4
          ? entry.upper
            ? 'right'
            : 'left'
          : entry.upper
            ? 'top'
            : 'bottom';
      const anchor =
        model.userData.calloutEdges?.[entry.section]?.[edge] ||
        model.userData.roomAnchors[entry.section];
      entry.anchor.set(...(anchor as [number, number, number]));
      entry.width = entry.button.offsetWidth;
      entry.height = entry.button.offsetHeight;
    }
    for (const row of [sorted.slice(0, 2), sorted.slice(2)]) {
      row.sort((a, b) => a.p.x - b.p.x);
      for (const [index, { entry, p }] of row.entries()) {
        entry.lane = index;
        // The two short rows leave the lateral silhouette free on narrow phones.
        const middle = width / 2,
          half = entry.width / 2;
        const x = clamp(
          p.x,
          index ? middle + half + 8 : half + 14,
          index ? width - half - 14 : middle - half - 8,
        );
        const y = entry.upper
          ? upperY - entry.height / 2 - 12
          : lowerY + entry.height / 2 + 12;
        entry.world.copy(pointAtDepth(x, y));
      }
    }
    if (identity) {
      const box = identity.getBoundingClientRect(),
        stage = host.getBoundingClientRect();
      identityBase.set(
        box.left + box.width / 2 - stage.left,
        box.top + box.height / 2 - stage.top,
      );
      identityWorld.copy(pointAtDepth(identityBase.x, identityBase.y));
    }
    ready = true;
  }
  function update(
    camera: Three.PerspectiveCamera,
    model: Three.Group,
    state: {
      home: boolean;
      travelling: boolean;
      reduced: boolean;
      delta: number;
      hover: string;
    },
  ) {
    if (!ready) return;
    if (state.reduced) {
      presence.value = state.home ? 1 : 0;
      presence.velocity = 0;
    } else
      moveCameraAxis(presence, state.home ? 1 : 0, state.delta, {
        frequency: 6,
        speed: 1.25,
        acceleration: 2.5,
      });
    const opacity = clamp(presence.value, 0, 1);
    layer.style.opacity = String(opacity);
    layer.inert = !state.home || state.travelling || opacity < 0.9;
    layer.setAttribute('aria-hidden', String(layer.inert));
    for (const entry of entries) {
      const p = project(entry.world, camera);
      const a = project(
        entry.anchor.clone().applyMatrix4(model.matrixWorld),
        camera,
      );
      const currentDepth = entry.world
        .clone()
        .sub(camera.position)
        .dot(camera.getWorldDirection(new THREE.Vector3()));
      let scale = clamp(depth / Math.max(0.1, currentDepth), 0.3, 2.5);
      if (state.home && !state.travelling) {
        // Keep live, projected callouts readable at the edges of a drag. Their
        // world anchors stay fixed; only the small label endpoint can slide.
        scale = Math.min(scale, (width / 2 - 24) / entry.width);
        const half = (entry.width * scale) / 2;
        p.x = clamp(
          p.x,
          entry.lane ? width / 2 + 8 + half : 12 + half,
          entry.lane ? width - 12 - half : width / 2 - 8 - half,
        );
      }
      entry.button.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%) scale(${scale})`;
      const endY = p.y + ((entry.upper ? 1 : -1) * entry.height * scale) / 2;
      const elbowY =
        a.y + (entry.upper ? -1 : 1) * Math.min(16, Math.abs(endY - a.y) / 2);
      entry.path.setAttribute(
        'd',
        `M ${a.x} ${a.y} L ${a.x} ${elbowY} L ${p.x} ${endY}`,
      );
      entry.dot.setAttribute('cx', String(a.x));
      entry.dot.setAttribute('cy', String(a.y));
      const highlighted = state.hover === entry.section;
      entry.button.classList.toggle('is-highlighted', highlighted);
      entry.path.classList.toggle('is-highlighted', highlighted);
      entry.dot.classList.toggle('is-highlighted', highlighted);
      const shown = p.z > -1 && p.z < 1 && currentDepth > 0;
      entry.button.style.visibility =
        entry.path.style.visibility =
        entry.dot.style.visibility =
          shown ? 'visible' : 'hidden';
    }
    if (identityFlight) {
      const p = project(identityWorld, camera);
      const currentDepth = identityWorld
        .clone()
        .sub(camera.position)
        .dot(camera.getWorldDirection(new THREE.Vector3()));
      const scale = clamp(depth / Math.max(0.1, currentDepth), 0.3, 3);
      identityFlight.style.transform = `translate(${p.x - identityBase.x}px,${p.y - identityBase.y}px) scale(${scale})`;
      identityFlight.style.opacity = String(
        currentDepth > 0 && p.z < 1 ? opacity : 0,
      );
      identityFlight.inert = !state.home || state.travelling || opacity < 0.9;
      identityFlight.setAttribute('aria-hidden', String(identityFlight.inert));
    }
    host.dataset.overviewPresence = opacity.toFixed(4);
  }
  return {
    layout,
    update,
    dispose() {
      layer.remove();
      if (identityFlight) {
        identityFlight.style.transform = '';
        identityFlight.style.opacity = '';
        identityFlight.inert = false;
        identityFlight.removeAttribute('aria-hidden');
      }
    },
  };
}
