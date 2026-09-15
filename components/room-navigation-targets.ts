import type * as Three from 'three';
import { thinChassisOutline } from './thin-chassis-outline.ts';
import { PRESSURE_FACE_FRONT } from '../lib/spacecraft-wall-layout.ts';

/** Pick only through the visible rounded cutaway openings, rather than boxes
 * that include the opaque dividers, curved corners and space behind a cabin.
 * Four small front-facing polygons replace the old volumes; no detailed scene
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
  return {
    targets,
    pick(ray: Three.Raycaster) {
      const opening = ray.intersectObjects(openings, false)[0];
      return {
        section: opening?.object.userData.section || '',
        // The vessel is fixed in world space. A frontward eye must look through
        // a real cutaway before a doorway behind the pressure face is eligible.
        blockedByFace:
          !opening &&
          ray.ray.origin.z > PRESSURE_FACE_FRONT &&
          ray.ray.direction.z < 0,
      };
    },
    sync(scale: number) {
      if (scale === currentScale) return;
      currentScale = scale;
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
