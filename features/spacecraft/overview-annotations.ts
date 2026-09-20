import type * as Three from 'three';
import { moveCameraAxis } from '@/features/spacecraft/navigation/flight';

type Frame = {
  target: Three.Vector3;
  direction: Three.Vector3;
  distance: number;
  roll: number;
  fov: number;
};

/** Native callouts are projected from the same space as the spacecraft. The
 * identity's untransformed wrapper is retained solely for stable layout sizing. */
export function createOverviewAnnotations(
  THREE: typeof Three,
  host: HTMLElement,
  site: Record<string, any>,
  callbacks: {
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
      dot.dataset.section = section;
      svg.appendChild(path);
      svg.appendChild(dot);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'overview-callout';
      button.textContent = String(site[section + 'Label'] || '');
      button.dataset.section = section;
      button.dataset.sceneRoom = section;
      button.dataset.targetKey = `room:${section}`;
      button.onclick = () => callbacks.navigate(section);
      layer.appendChild(button);
      return {
        section,
        path,
        dot,
        button,
        anchor: new THREE.Vector3(),
        world: new THREE.Vector3(),
        knee: new THREE.Vector3(),
        end: new THREE.Vector3(),
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
  const portraitArrival = { value: 1, velocity: 0 };
  let width = 1,
    height = 1,
    depth = 1,
    ready = false,
    portrait = false;
  let supportPoints: number[][] = [];
  const clamp = (x: number, low: number, high: number) =>
    Math.max(low, Math.min(high, x));
  const pointAtDepth = (x: number, y: number, view = reference) => {
    const ray = new THREE.Vector3(
      (x / width) * 2 - 1,
      1 - (y / height) * 2,
      0.5,
    )
      .unproject(view)
      .sub(view.position);
    const forward = view.getWorldDirection(new THREE.Vector3());
    return ray.multiplyScalar(depth / ray.dot(forward)).add(view.position);
  };
  const project = (point: Three.Vector3, camera: Three.Camera) => {
    const p = point.clone().project(camera);
    return { x: ((p.x + 1) * width) / 2, y: ((1 - p.y) * height) / 2, z: p.z };
  };
  type Point = { x: number; y: number };
  function railPosition(points: Point[]) {
    const left = Math.min(...points.map((p) => p.x));
    const right = Math.max(...points.map((p) => p.x));
    return Math.max(24, Math.min(left, width - right) - 12);
  }
  function route(
    anchors: Point[],
    supports: Point[],
    view: Three.PerspectiveCamera,
  ) {
    const rail = railPosition(supports);
    const top = Math.min(...supports.map((p) => p.y)) - 12;
    const bottom = Math.max(...supports.map((p) => p.y)) + 12;
    // Landscape labels sit at the outer corners of the projected vessel.
    // Share a longer diagonal departure, then continue horizontally to each
    // corner. Clamp the shared endpoints, not individual line segments.
    const leftCorner = Math.max(
      12 + Math.max(...entries.filter((e) => !e.lane).map((e) => e.width)),
      Math.min(...supports.map((p) => p.x)) - 12,
    );
    const rightCorner = Math.min(
      width -
        12 -
        Math.max(...entries.filter((e) => e.lane).map((e) => e.width)),
      Math.max(...supports.map((p) => p.x)) + 12,
    );
    const verticalRun = Math.max(
      36,
      ...anchors.map((a, i) => (entries[i].upper ? a.y - top : bottom - a.y)),
    );
    let diagonalRun = verticalRun;
    if (!portrait)
      for (const [i, a] of anchors.entries()) {
        const available = entries[i].lane
          ? rightCorner - a.x
          : a.x - leftCorner;
        diagonalRun = Math.min(diagonalRun, Math.max(0, available) * 0.45);
      }
    const labelScale = portrait
      ? Math.min(
          1,
          (width / 2 - rail + 4) / Math.max(...entries.map((e) => e.width)),
        )
      : 1;
    for (const [i, a] of anchors.entries()) {
      const e = entries[i],
        sx = e.lane ? 1 : -1,
        sy = e.upper ? -1 : 1;
      let knee: Point, end: Point, label: Point;
      if (portrait) {
        const x = e.lane ? width - rail : rail;
        // Leave along the cabin edge before turning up/down the outside rail.
        // A diagonal from the midpoint cuts across the solar panels or ladder.
        knee = { x, y: a.y };
        end = { x, y: e.upper ? top : bottom };
        // Meet the rounded pill 12px from its outer end; the pill extends inward.
        const radius = (e.height * labelScale) / 2;
        const cap = Math.sqrt(
          Math.max(0, radius * radius - (radius - 12) ** 2),
        );
        label = {
          x: x - sx * ((e.width * labelScale) / 2 - 12),
          y: end.y + sy * cap,
        };
      } else {
        knee = {
          x: a.x + sx * diagonalRun,
          y: a.y + sy * verticalRun,
        };
        end = { x: e.lane ? rightCorner : leftCorner, y: knee.y };
        label = { x: end.x + (sx * e.width) / 2, y: end.y };
      }
      e.knee.copy(pointAtDepth(knee.x, knee.y, view));
      e.end.copy(pointAtDepth(end.x, end.y, view));
      e.world.copy(pointAtDepth(label.x, label.y, view));
      e.button.dataset.labelScale = String(labelScale);
    }
    layer.dataset.connectorLayout = portrait
      ? 'mirrored-rails'
      : 'corner-leaders';
  }
  function layout(frame: Frame, support: number[][], model: Three.Group) {
    width = host.clientWidth;
    height = host.clientHeight;
    depth = frame.distance;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    // The reference unprojection must use the same lens as the rendered ship.
    // Otherwise a portrait lens change drags the identity into the vessel.
    reference.fov = frame.fov;
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
    portrait = Math.abs(frame.roll) > Math.PI / 4;
    supportPoints = support;
    const projected = support.map((p) => project(rotated(p), reference));
    const rail = railPosition(projected);
    const maxWidth = portrait
      ? Math.min((width - 48) / 2, width / 2 - rail + 4)
      : width * 0.22;
    const sorted = entries
      .map((entry) => ({
        entry,
        p: project(
          rotated(model.userData.calloutAnchors[entry.section]),
          reference,
        ),
      }))
      .sort((a, b) => a.p.y - b.p.y);
    for (const row of [sorted.slice(0, 2), sorted.slice(2)]) {
      row.sort((a, b) => a.p.x - b.p.x);
      for (const [lane, { entry }] of row.entries()) {
        entry.upper = sorted.slice(0, 2).some((item) => item.entry === entry);
        entry.lane = lane;
        const edges = model.userData.calloutEdges[entry.section];
        // Select the upper/lower midpoint after orientation, so portrait
        // callouts attach to an edge center too, never an arbitrary corner.
        const edge = portrait
          ? ['left', 'right'].sort(
              (a, b) =>
                project(rotated(edges[a]), reference).y -
                project(rotated(edges[b]), reference).y,
            )[entry.upper ? 0 : 1]
          : entry.upper
            ? 'top'
            : 'bottom';
        entry.anchor.set(...(edges[edge] as [number, number, number]));
        entry.dot.dataset.localAnchor = JSON.stringify(entry.anchor.toArray());
        entry.button.style.maxWidth = `${Math.max(64, maxWidth)}px`;
        entry.width = entry.button.offsetWidth;
        entry.height = entry.button.offsetHeight;
      }
    }
    route(
      entries.map((e) => project(rotated(e.anchor.toArray()), reference)),
      projected,
      reference,
    );
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
    // Portrait leaders are routed for the final, rotated overview. Keep the
    // whole callout group hidden while its room anchors are still moving.
    // This is separate from identity presence and the approved landscape fade.
    if (portrait && state.home && state.travelling) {
      portraitArrival.value = 0;
      portraitArrival.velocity = 0;
    } else if (!portrait || state.reduced) {
      portraitArrival.value = 1;
      portraitArrival.velocity = 0;
    } else if (state.home)
      moveCameraAxis(portraitArrival, 1, state.delta, {
        frequency: 8,
        speed: 2,
        acceleration: 8,
      });
    const calloutOpacity = opacity * clamp(portraitArrival.value, 0, 1);
    layer.style.opacity = String(calloutOpacity);
    layer.inert = !state.home || state.travelling || calloutOpacity < 0.9;
    layer.setAttribute('aria-hidden', String(layer.inert));
    if (state.home && !state.travelling) {
      const worldProject = (v: number[]) =>
        project(
          new THREE.Vector3(...(v as [number, number, number])).applyMatrix4(
            model.matrixWorld,
          ),
          camera,
        );
      route(
        entries.map((e) => worldProject(e.anchor.toArray())),
        supportPoints.map(worldProject),
        camera,
      );
      const panels = model.userData.overviewSupportBounds.filter((b: any) =>
        b.name.startsWith('solar-'),
      );
      layer.dataset.solarBounds = JSON.stringify(
        panels.map((b: any) => {
          const corners = [b.min[0], b.max[0]].flatMap((x) =>
            [b.min[1], b.max[1]].flatMap((y) =>
              [b.min[2], b.max[2]].map((z) => worldProject([x, y, z])),
            ),
          );
          return {
            name: b.name,
            left: Math.min(...corners.map((p) => p.x)),
            right: Math.max(...corners.map((p) => p.x)),
            top: Math.min(...corners.map((p) => p.y)),
            bottom: Math.max(...corners.map((p) => p.y)),
          };
        }),
      );
    }
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
      const scale =
        (state.home && !state.travelling
          ? 1
          : clamp(depth / Math.max(0.1, currentDepth), 0.3, 2.5)) *
        Number(entry.button.dataset.labelScale || 1);
      entry.button.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%) scale(${scale})`;
      const knee = project(entry.knee, camera),
        end = project(entry.end, camera);
      entry.path.setAttribute(
        'd',
        `M ${a.x} ${a.y} L ${knee.x} ${knee.y} L ${end.x} ${end.y}`,
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
    host.dataset.overviewCalloutPresence = calloutOpacity.toFixed(4);
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
