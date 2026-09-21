import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { projectApplicationLayout } from '../../features/spacecraft/navigation/project-application.ts';
import {
  CAMERA_RANGES,
  fitPerspectiveFrame,
  responsiveCameraFov,
} from '../../features/spacecraft/navigation/scene-controls.ts';

const caseStudies = [
  { title: 'Legacy', slug: 'legacy' },
  { title: 'Shared', slug: 'shared', categories: ['product', 'systems'] },
];

test('Archive choices share fixed terminal glass while retaining distinct physical category anchors', () => {
  const model = createSpacecraft(THREE, { caseStudies });
  const screens = model.group.userData.caseStudyScreens;
  const computer = model.group.userData.caseStudyComputer;
  assert.deepEqual(
    screens.map((s) => s.category),
    ['all', 'product', 'systems', 'research', 'interfaces'],
  );
  assert.deepEqual(
    screens.map((s) => s.available),
    [true, true, true, false, false],
  );
  assert.equal(
    model.group.getObjectByName('experience-deployable-reader'),
    undefined,
  );
  assert.ok(model.group.getObjectByName('about-deployable-reader'));
  assert.ok(Math.abs(computer.width / computer.height - 16 / 9) < 1e-12);
  assert.equal(computer.root.rotation.x, -0.55);
  const anchorMatrices = [];
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    for (const screen of screens.filter((s) => s.available)) {
      model.update(1, 'experience', true, {
        activeRoom: 'experience',
        reading: false,
        hoveredObject: screen.interactableId,
      });
      assert.equal(screen.root.userData.highlightLevel, 1.15);
      const roomFrame = structuredClone(model.group.userData.roomCameraFrame);
      const before = computer.anchor.matrixWorld.toArray();
      model.update(2, 'experience', true, {
        reading: true,
        caseStudyScreen: screen.category,
      });
      assert.equal(screen.anchor, computer.anchor);
      assert.equal(model.readerSurfaces.experience, computer.anchor);
      assert.equal(computer.anchor.userData.kind, 'computer');
      assert.equal(computer.anchor.userData.deployedPosition, undefined);
      assert.deepEqual(Object.keys(model.group.userData.readerAnchors), [
        'about',
      ]);
      assert.equal(computer.idleDisplay.visible, false);
      assert.equal(computer.desktopDisplay.visible, true);
      assert.deepEqual(computer.anchor.matrixWorld.toArray(), before);
      assert.deepEqual(model.group.userData.roomCameraFrame, roomFrame);
      assert.ok(computer.desktopDisplay.children.some((child) => child.isMesh));
      if (screen.category !== 'all')
        assert.notEqual(screen.interactionAnchor, screen.anchor);
    }
    anchorMatrices.push(computer.anchor.matrixWorld.toArray());
    model.update(3, 'experience', true, { reading: false });
    assert.equal(computer.idleDisplay.visible, true);
    assert.equal(computer.desktopDisplay.visible, false);
  }
  assert.ok(anchorMatrices.flat().every(Number.isFinite));
});

test('Empty archive categories remain passive and live content updates restore only their authored choices', () => {
  const model = createSpacecraft(THREE, { caseStudies });
  const screens = model.group.userData.caseStudyScreens;
  const computer = model.group.userData.caseStudyComputer;
  const research = screens.find((s) => s.category === 'research');
  model.update(1, 'experience', true, {
    activeRoom: 'experience',
    reading: false,
    hoveredObject: research.interactableId,
  });
  assert.equal(research.root.userData.highlightLevel, 1);
  assert.ok(research.root.visible);
  model.update(2, 'experience', true, {
    reading: true,
    caseStudyScreen: 'research',
  });
  assert.equal(computer.desktopDisplay.visible, false);
  model.setCaseStudies([
    { title: 'Experiment', slug: 'experiment', categories: ['research'] },
  ]);
  assert.deepEqual(
    screens.map((s) => s.available),
    [true, false, false, true, false],
  );
  model.update(3, 'experience', true, {
    reading: true,
    caseStudyScreen: 'research',
  });
  assert.equal(computer.desktopDisplay.visible, true);
  model.setCaseStudies([]);
  assert.ok(screens.every((s) => !s.available));
  assert.equal(computer.desktopDisplay.visible, false);
  assert.equal(computer.idleDisplay.visible, true);
});

test('Tilted archive terminal remains readable, clear of its hardware and beyond the camera near plane', () => {
  const model = createSpacecraft(THREE, { caseStudies });
  const screen = model.group.userData.caseStudyComputer;
  const ray = new THREE.Raycaster();
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [430, 932],
    [768, 1024],
    [990, 1187],
    [768, 768],
    [1280, 720],
    [1470, 830],
    [1920, 1080],
  ]) {
    model.setLayout(width < 700 ? 'compact' : 'wide');
    model.update(1, 'experience', true, {
      activeRoom: 'experience',
      reading: true,
      caseStudyScreen: 'all',
    });
    model.group.updateMatrixWorld(true);
    const portrait = height > width;
    const bottom = width < 700 ? 132 : 80;
    const app = projectApplicationLayout(
      width,
      height,
      screen.width,
      screen.height,
      bottom,
    );
    const framing = [],
      perimeter = [];
    for (const x of [-1, 0, 1])
      for (const y of [-1, 0, 1]) {
        if (!x && !y) continue;
        perimeter.push(
          screen.anchor.localToWorld(
            new THREE.Vector3((x * app.width) / 2, (y * app.height) / 2, 0),
          ),
        );
        if (x && y)
          framing.push(
            screen.anchor.localToWorld(
              new THREE.Vector3(
                (x * app.framing.width) / 2,
                (y * app.framing.height) / 2,
                0,
              ),
            ),
          );
      }
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(
      screen.anchor.getWorldQuaternion(new THREE.Quaternion()),
    );
    const fov = responsiveCameraFov(width / height);
    const safe = {
      left: -1 + 32 / width,
      right: 1 - 32 / width,
      top: 1 - (2 * (portrait ? 64 : 30)) / height,
      bottom: -1 + (2 * bottom) / height,
    };
    const fit = fitPerspectiveFrame(
      framing.map((p) => p.toArray()),
      {
        target: screen.anchor.getWorldPosition(new THREE.Vector3()).toArray(),
        direction: normal.toArray(),
      },
      fov,
      width / height,
      safe,
      0.1,
    );
    const target = new THREE.Vector3(...fit.target);
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.08, 500);
    for (const pitch of [-1, 0, 1])
      for (const yaw of [-1, 0, 1]) {
        const direction = normal
          .clone()
          .applyEuler(
            new THREE.Euler(
              pitch * CAMERA_RANGES.computer.pitch,
              yaw * CAMERA_RANGES.computer.yaw,
              0,
            ),
          );
        camera.position
          .copy(target)
          .addScaledVector(direction, fit.distance * (portrait ? 1 : 1.06));
        camera.lookAt(target);
        camera.updateMatrixWorld(true);
        const label = `${width}×${height}, pitch ${pitch}, yaw ${yaw}`;
        assert.ok(
          perimeter.every(
            (p) =>
              -p.clone().applyMatrix4(camera.matrixWorldInverse).z >
              camera.near,
          ),
          `${label}: near clipping`,
        );
        if (!pitch && !yaw && portrait) {
          const projected = framing.map((p) => p.clone().project(camera));
          assert.ok(
            projected.every(
              (p) =>
                p.x >= safe.left - 1e-8 &&
                p.x <= safe.right + 1e-8 &&
                p.y >= safe.bottom - 1e-8 &&
                p.y <= safe.top + 1e-8,
            ),
            `${label}: framing outside reserved viewport`,
          );
          const displayedWidth =
            ((Math.max(...projected.map((p) => p.x)) -
              Math.min(...projected.map((p) => p.x))) *
              width) /
            2;
          assert.ok(
            displayedWidth >= app.pixelsWidth * 0.98,
            `${label}: shrinking readable text`,
          );
        }
        for (const point of perimeter) {
          ray.set(
            camera.position,
            point.clone().sub(camera.position).normalize(),
          );
          ray.far = point.distanceTo(camera.position) - 1e-6;
          const blocker = ray
            .intersectObject(model.group.userData.caseStudyArchive, true)
            .find((hit) => {
              for (let node = hit.object; node; node = node.parent)
                if (!node.visible) return false;
              return [hit.object.material]
                .flat()
                .some(
                  (material) =>
                    material.visible &&
                    (!material.transparent || material.opacity > 0),
                );
            });
          assert.equal(
            blocker,
            undefined,
            `${label}: application obscured by ${blocker?.object.name}`,
          );
        }
      }
  }
});
