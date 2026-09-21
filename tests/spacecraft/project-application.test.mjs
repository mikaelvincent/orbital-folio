import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { projectApplicationLayout } from '../../features/spacecraft/navigation/project-application.ts';
import { destinationFromURL } from '../../features/spacecraft/navigation/flight.ts';
import {
  CAMERA_RANGES,
  fitPerspectiveFrame,
  responsiveCameraFov,
} from '../../features/spacecraft/navigation/scene-controls.ts';

await test('Project screens retain independent real display anchors, inset feedback and reversible application content', () => {
  const model = createSpacecraft(THREE);
  const screens = model.group.userData.projectScreens;
  assert.deepEqual(
    screens.map((s) => s.category),
    ['all', 'systems', 'interfaces', 'experiments'],
  );
  assert.equal(
    model.group.getObjectByName('projects-deployable-reader'),
    undefined,
  );
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    for (const screen of screens) {
      model.update(1, 'projects', true, {
        activeRoom: 'projects',
        reading: false,
        hoveredObject: screen.interactableId,
      });
      assert.equal(screen.root.userData.highlightLevel, 1.15);
      model.update(2, 'projects', true, {
        activeRoom: 'projects',
        reading: true,
        projectScreen: screen.category,
      });
      assert.equal(model.readerSurfaces.projects, screen.anchor);
      assert.equal(screen.idleDisplay.visible, false);
      assert.ok(
        screens.filter((s) => s !== screen).every((s) => s.idleDisplay.visible),
      );
      assert.equal(screen.anchor.userData.kind, 'computer');
      assert.ok(screen.root.getObjectById(screen.idleDisplay.id));
      assert.ok(
        screen.idleDisplay.children.some((child) => child.isMesh),
        'The rendered batch stays under the hideable display group',
      );
      let rim;
      screen.root.traverse((o) => {
        if (o.material?.name === `${screen.interactableId}-hover-rim`) rim = o;
      });
      rim.geometry.computeBoundingBox();
      assert.ok(rim.geometry.boundingBox.min.x > -screen.width / 2);
      assert.ok(rim.geometry.boundingBox.max.x < screen.width / 2);
      assert.ok(rim.geometry.boundingBox.min.y > -screen.height / 2);
      assert.ok(rim.geometry.boundingBox.max.y < screen.height / 2);
      const pos = screen.anchor.getWorldPosition(new THREE.Vector3());
      assert.ok(pos.toArray().every(Number.isFinite));
    }
    model.update(3, 'projects', true, {
      activeRoom: 'projects',
      reading: false,
    });
    assert.ok(screens.every((s) => s.idleDisplay.visible));
  }
});

await test('A roomier landscape window preserves the established camera framing rectangle', () => {
  const desktop = projectApplicationLayout(1470, 830, 1.01, 0.57);
  assert.ok(Math.abs(desktop.framing.width - 0.95) < 1e-10);
  assert.ok(Math.abs(desktop.framing.height - 0.51) < 1e-10);
  assert.ok(desktop.width > desktop.framing.width);
  assert.ok(desktop.height > desktop.framing.height);
  const portrait = projectApplicationLayout(390, 844, 1.01, 0.57, 132);
  assert.equal(portrait.width, portrait.framing.width);
  assert.equal(portrait.height, portrait.framing.height);
});

await test('Portrait application preserves readable pixels inside the unchanged monitor glass', () => {
  for (const [w, h] of [
    [390, 844],
    [768, 1024],
    [1280, 800],
    [1920, 1080],
  ]) {
    const app = projectApplicationLayout(w, h, 1.01, 0.57, h > w ? 132 : 80);
    assert.ok(app.width < 1.01 && app.height < 0.57);
    assert.ok(app.pixelsWidth >= 240 && app.pixelsWidth <= w);
    assert.ok(
      Math.abs(app.width / app.height - app.pixelsWidth / app.pixelsHeight) <
        1e-10,
    );
    if (h > w) assert.ok(app.pixelsHeight > app.pixelsWidth);
    else assert.ok(app.pixelsWidth >= 900);
  }
});

await test('Real portrait monitor projection fills the readable app area without crossing the close camera plane', () => {
  const model = createSpacecraft(THREE);
  for (const [width, height] of [
    [320, 568],
    [360, 800],
    [390, 844],
    [430, 932],
    [768, 1024],
  ]) {
    model.setLayout(width < 700 ? 'compact' : 'wide');
    model.group.updateMatrixWorld(true);
    const bottom = width < 700 ? 132 : 80;
    const safe = {
      left: -1 + 32 / width,
      right: 1 - 32 / width,
      top: 1 - 128 / height,
      bottom: -1 + (2 * bottom) / height,
    };
    const fov = responsiveCameraFov(width / height);
    for (const screen of model.group.userData.projectScreens) {
      const label = `${screen.category} at ${width}×${height}`;
      const app = projectApplicationLayout(
        width,
        height,
        screen.width,
        screen.height,
        bottom,
      );
      const points = [];
      for (const x of [-app.width / 2, app.width / 2])
        for (const y of [-app.height / 2, app.height / 2])
          points.push(screen.anchor.localToWorld(new THREE.Vector3(x, y, 0)));
      const view = {
        target: screen.anchor.getWorldPosition(new THREE.Vector3()).toArray(),
        direction: [0, 0, 1],
      };
      const fit = fitPerspectiveFrame(
        points.map((point) => point.toArray()),
        view,
        fov,
        width / height,
        safe,
        0.1,
      );
      const target = new THREE.Vector3(...fit.target);
      const camera = new THREE.PerspectiveCamera(
        fov,
        width / height,
        0.08,
        500,
      );
      camera.position.copy(target).add(new THREE.Vector3(0, 0, fit.distance));
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
      const projected = points.map((point) => point.clone().project(camera));
      assert.ok(
        projected.every(
          (point) =>
            point.x >= safe.left - 1e-8 &&
            point.x <= safe.right + 1e-8 &&
            point.y >= safe.bottom - 1e-8 &&
            point.y <= safe.top + 1e-8 &&
            point.z > -1 &&
            point.z < 1,
        ),
        `${label}: the complete application must fit above the dock and below the header`,
      );
      const projectedWidth =
        ((Math.max(...projected.map((p) => p.x)) -
          Math.min(...projected.map((p) => p.x))) *
          width) /
        2;
      const projectedHeight =
        ((Math.max(...projected.map((p) => p.y)) -
          Math.min(...projected.map((p) => p.y))) *
          height) /
        2;
      assert.ok(
        projectedWidth >= app.pixelsWidth * 0.98,
        `${label}: CSS text must not shrink on its physical monitor`,
      );
      assert.ok(
        projectedHeight >= app.pixelsHeight * 0.98,
        `${label}: portrait app must use the available height`,
      );

      // The earlier 0.5 fitting floor passed abstract layout tests while reducing
      // a 390px phone application to only ~229px of its requested 358px width.
      if (width === 390) {
        const previous = fitPerspectiveFrame(
          points.map((p) => p.toArray()),
          view,
          fov,
          width / height,
          safe,
        );
        assert.ok(
          previous.distance > fit.distance * 1.4,
          `${label}: the regression fixture must distinguish the former distant camera`,
        );
      }
      for (const pitch of [
        -CAMERA_RANGES.computer.pitch,
        0,
        CAMERA_RANGES.computer.pitch,
      ])
        for (const yaw of [
          -CAMERA_RANGES.computer.yaw,
          0,
          CAMERA_RANGES.computer.yaw,
        ]) {
          const direction = new THREE.Vector3(0, 0, 1).applyEuler(
            new THREE.Euler(pitch, yaw, 0),
          );
          camera.position.copy(target).addScaledVector(direction, fit.distance);
          camera.lookAt(target);
          camera.updateMatrixWorld(true);
          assert.ok(
            points.every(
              (point) =>
                -point.clone().applyMatrix4(camera.matrixWorldInverse).z >
                camera.near,
            ),
            `${label}: bounded hover/drag must not clip the application against near=0.08`,
          );
        }
    }
  }
});

await test('Application edges stay inside the visible monitor bezel through responsive hover and drag', () => {
  const model = createSpacecraft(THREE);
  const ray = new THREE.Raycaster();
  for (const [width, height] of [
    [390, 844],
    [990, 1187],
    [990, 1298],
    [768, 768],
    [1280, 720],
    [1470, 830],
    [1920, 1080],
  ]) {
    model.setLayout(width < 700 ? 'compact' : 'wide');
    const portrait = height > width;
    const bottom = width < 700 ? 132 : 80;
    const fov = responsiveCameraFov(width / height);
    for (const screen of model.group.userData.projectScreens) {
      model.update(1, 'projects', true, {
        activeRoom: 'projects',
        reading: true,
        projectScreen: screen.category,
      });
      model.group.updateMatrixWorld(true);
      const label = `${screen.category} at ${width}×${height}`;
      // The static geometry batch replaces the original mesh while retaining
      // the display group, so inspect the rendered glass rather than its source.
      const glassCenter = new THREE.Box3()
        .setFromObject(screen.idleDisplay)
        .getCenter(new THREE.Vector3());
      assert.ok(
        screen.anchor
          .getWorldPosition(new THREE.Vector3())
          .distanceTo(glassCenter) < 1e-8,
        `${label}: HTML must share the display plane instead of floating over its rim`,
      );
      const app = projectApplicationLayout(
        width,
        height,
        screen.width,
        screen.height,
        bottom,
      );
      const framingCorners = [];
      for (const x of [-app.framing.width / 2, app.framing.width / 2])
        for (const y of [-app.framing.height / 2, app.framing.height / 2])
          framingCorners.push(screen.anchor.localToWorld(new THREE.Vector3(x, y, 0)));
      const perimeter = [];
      for (const x of [-1, 0, 1])
        for (const y of [-1, 0, 1]) {
          if (x === 0 && y === 0) continue;
          const point = screen.anchor.localToWorld(
            new THREE.Vector3((x * app.width) / 2, (y * app.height) / 2, 0),
          );
          perimeter.push(point);
        }
      const fit = fitPerspectiveFrame(
        framingCorners.map((point) => point.toArray()),
        {
          target: screen.anchor.getWorldPosition(new THREE.Vector3()).toArray(),
          direction: [0, 0, 1],
        },
        fov,
        width / height,
        {
          left: -1 + 32 / width,
          right: 1 - 32 / width,
          top: 1 - (2 * (portrait ? 64 : 30)) / height,
          bottom: -1 + (2 * bottom) / height,
        },
        0.1,
      );
      const target = new THREE.Vector3(...fit.target);
      for (const pitch of [-1, 0, 1])
        for (const yaw of [-1, 0, 1]) {
          const position = new THREE.Vector3(0, 0, 1)
            .applyEuler(
              new THREE.Euler(
                pitch * CAMERA_RANGES.computer.pitch,
                yaw * CAMERA_RANGES.computer.yaw,
                0,
              ),
            )
            .multiplyScalar(fit.distance * (portrait ? 1 : 1.06))
            .add(target);
          for (const point of perimeter) {
            ray.set(position, point.clone().sub(position).normalize());
            ray.far = point.distanceTo(position) - 1e-6;
            const blocker = ray
              .intersectObject(screen.root, true)
              .find((hit) => {
                for (let node = hit.object; node; node = node.parent)
                  if (!node.visible) return false;
                const materials = [hit.object.material].flat();
                return materials.some((material) => material.visible &&
                  (!material.transparent || material.opacity > 0));
              });
            // The selected monitor's hover rim is immediately disabled while
            // its application is active; only visible geometry can cover it.
            assert.equal(
              blocker,
              undefined,
              `${label}, pitch ${pitch}, yaw ${yaw}: app overlaps ${blocker?.object.name}`,
            );
          }
        }
    }
  }
});

await test('Project library links work in public and private preview without changing project detail routes', () => {
  assert.equal(
    destinationFromURL(new URL('https://example.test/projects?open=1')).open,
    true,
  );
  assert.equal(
    destinationFromURL(
      new URL('https://example.test/admin/preview?section=projects&open=1'),
      true,
    ).open,
    true,
  );
  const destination = destinationFromURL(
    new URL('https://example.test/projects/service'),
  );
  assert.equal(destination.section, 'projects');
  assert.equal(destination.slug, 'service');
});
