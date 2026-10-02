import type * as Three from 'three';
import type { roomNavigationIntent } from './room-navigation.ts';
import { thinChassisOutline } from '../geometry/thin-chassis-outline.ts';
import { PRESSURE_FACE_FRONT } from '../geometry/spacecraft-wall-layout.ts';

type NavigationPick = {
  section: string;
  portalId?: string;
  roomTarget?: boolean;
  walkway: boolean;
};
type NavigationOptions = {
  active: string;
  reading: boolean;
  /** Covers target geometry/transforms. Omit for consumers without revision ownership. */
  geometryRevision?: number;
  portalTargets: readonly {
    from: string;
    id: string;
    object: Three.Object3D;
  }[];
  roomIntent: (destination: string) => ReturnType<typeof roomNavigationIntent>;
  canUsePortal: (id: string) => boolean;
};

/** Pick only through the visible rounded cutaway openings, rather than boxes
 * that include the opaque dividers, curved corners and space behind a cabin.
 * Cabin and ladder aperture polygons replace the old volumes; no detailed scene
 * raycast or rendered geometry is added. Behind-the-face views use door targets.
 */
export function createRoomNavigationTargets(
  THREE: typeof Three,
  parent: Three.Group,
) {
  const material = new THREE.MeshBasicMaterial({ visible: false });
  const targets = ['about', 'projects', 'contact', 'experience'].map(
    (section) => {
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
      mesh.name = `${section}-visible-opening-pick`;
      mesh.position.z = PRESSURE_FACE_FRONT;
      mesh.visible = false;
      mesh.userData = { section, isInteractionProxy: true, excludePick: true };
      parent.add(mesh);
      return mesh;
    },
  );
  const walkway = new THREE.Mesh(new THREE.BufferGeometry(), material);
  walkway.name = 'walkway-visible-opening-pick';
  walkway.position.z = PRESSURE_FACE_FRONT;
  walkway.visible = false;
  walkway.userData = {
    section: 'walkway',
    isInteractionProxy: true,
    excludePick: true,
  };
  parent.add(walkway);
  const openings = [...targets, walkway];
  let currentScale = 0;
  let previousRay: Three.Ray | undefined;
  let previousRevision: number | undefined;
  let previousNear = 0,
    previousFar = 0,
    previousLayers = 0;
  const previousParent = new THREE.Matrix4();
  let openingResult = { section: '', blockedByFace: false };
  const portalObjects: Three.Object3D[] = [];
  let portalHit: Three.Intersection | undefined;
  let portalReady = false;
  function pick(ray: Three.Raycaster, revision?: number) {
    if (
      revision !== undefined &&
      previousRevision === revision &&
      previousNear === ray.near &&
      previousFar === ray.far &&
      previousLayers === ray.layers.mask &&
      previousRay?.equals(ray.ray) &&
      previousParent.equals(parent.matrixWorld)
    )
      return openingResult;
    previousRevision = revision;
    previousNear = ray.near;
    previousFar = ray.far;
    previousLayers = ray.layers.mask;
    if (previousRay) previousRay.copy(ray.ray);
    else previousRay = ray.ray.clone();
    previousParent.copy(parent.matrixWorld);
    portalReady = false;
    const opening = ray.intersectObjects(openings, false)[0];
    openingResult = {
      section: (opening?.object.userData.section || '') as string,
      // A frontward eye must look through a real cutaway before a doorway
      // behind the pressure face is eligible.
      blockedByFace:
        !opening &&
        ray.ray.origin.z > PRESSURE_FACE_FRONT &&
        ray.ray.direction.z < 0,
    };
    return openingResult;
  }
  return {
    targets,
    pick,
    select(ray: Three.Raycaster, options: NavigationOptions): NavigationPick {
      const { section, blockedByFace } = pick(ray, options.geometryRevision);
      const neutral = { section: '', walkway: false };
      if (blockedByFace || options.reading) return neutral;
      // The nearest opening owns the visible region. A bay volume behind a
      // cabin wall must never contribute hover feedback or steal a click.
      if (section && section !== options.active) {
        const intent = options.roomIntent(section);
        return intent ? { ...intent, walkway: section === 'walkway' } : neutral;
      }
      if (options.active !== 'home') {
        // Eligibility follows live travel/interlock state, even on a cached ray.
        let sameTargets = portalReady;
        let count = 0;
        for (const target of options.portalTargets) {
          if (
            target.from !== options.active ||
            !options.canUsePortal(target.id)
          )
            continue;
          if (portalObjects[count] !== target.object) sameTargets = false;
          portalObjects[count++] = target.object;
        }
        if (portalObjects.length !== count) sameTargets = false;
        portalObjects.length = count;
        if (!sameTargets) {
          portalHit = ray.intersectObjects(portalObjects, false)[0];
          portalReady = true;
        }
        const portal = portalHit;
        if (portal)
          return {
            section: portal.object.userData.portalDestination as string,
            portalId: portal.object.userData.portalId as string,
            walkway: false,
          };
      }
      return neutral;
    },
    sync(scale: number) {
      if (scale === currentScale) return;
      currentScale = scale;
      previousRevision = undefined;
      // Zero bevel gives the finished opening rather than the slightly wider
      // machining outline. Chords conservatively stay inside rounded corners.
      const { roomHoles, ladderHole } = thinChassisOutline(THREE, {
        scale,
        bevel: 0,
      });
      const holes = [...roomHoles, ladderHole];
      openings.forEach((mesh, i) => {
        mesh.geometry.dispose();
        mesh.geometry = new THREE.ShapeGeometry(
          new THREE.Shape(holes[i].getPoints(12)),
        );
      });
    },
  };
}
