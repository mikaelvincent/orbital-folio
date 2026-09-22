import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { buildCaseStudyArchive } from '../../features/spacecraft/rooms/case-study-archive.ts';
import { createModelPrimitives } from '../../features/spacecraft/geometry/model-primitives.ts';
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
  assert.equal(
    model.group.getObjectByName('about-deployable-reader'),
    undefined,
  );
  assert.equal(
    model.readerSurfaces.about,
    model.group.userData.aboutNotebook.anchor,
  );
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

test('Only populated archive categories are interactive, and emptied cartridges return to their dark face', () => {
  const model = createSpacecraft(THREE, { caseStudies: [] });
  const screens = model.group.userData.caseStudyScreens;
  const computer = model.group.userData.caseStudyComputer;
  let time = 0;
  const fixtures = [
    { entries: [], enabled: [] },
    { entries: caseStudies, enabled: ['all', 'product', 'systems'] },
    {
      entries: [
        { title: 'Unassigned', slug: 'unassigned', categories: ['retired'] },
      ],
      enabled: ['all'],
    },
    { entries: [], enabled: [] },
    { entries: caseStudies, enabled: ['all', 'product', 'systems'] },
  ];
  for (const { entries, enabled } of fixtures) {
    model.setCaseStudies(entries);
    assert.equal(screens.length, 5);
    for (const screen of screens) {
      const available = enabled.includes(screen.category);
      assert.equal(
        screen.available,
        available,
        `${screen.category}: availability`,
      );
      model.update(++time, 'experience', true, {
        activeRoom: 'experience',
        reading: false,
        hoveredObject: screen.interactableId,
      });
      assert.equal(screen.root.userData.highlightLevel, available ? 1.15 : 1);
      assert.ok(screen.root.visible, 'Empty hardware remains installed');
      const rim = screen.root.children.find(
        (object) =>
          object.material?.name === `${screen.interactableId}-hover-rim`,
      );
      assert.equal(rim.material.opacity, available ? 0.95 : 0);
      if (screen.category !== 'all') {
        const jacket = screen.root.children.find((object) =>
          object.userData.parts?.includes(
            'case-archive-cartridge-label-jacket',
          ),
        );
        const expected = new THREE.Color(
          available ? 0xdfd6c5 : 0x283440,
        ).multiplyScalar(available ? 1.15 : 1);
        assert.ok(
          Math.max(
            ...['r', 'g', 'b'].map((channel) =>
              Math.abs(jacket.material.color[channel] - expected[channel]),
            ),
          ) < 1e-10,
          `${screen.category}: displayed jacket follows availability after lighting and highlight updates`,
        );
      }
      if (available) {
        model.update(++time, 'experience', true, {
          reading: true,
          caseStudyScreen: screen.category,
        });
        assert.equal(computer.desktopDisplay.visible, true);
        assert.equal(computer.idleDisplay.visible, false);
      }
    }
  }
  model.update(++time, 'experience', true, {
    reading: true,
    caseStudyScreen: 'all',
  });
  assert.equal(computer.desktopDisplay.visible, true);
  // Content removal closes the physical desktop rather than leaving an empty
  // category looking active until another pointer event arrives.
  model.setCaseStudies([]);
  assert.equal(computer.desktopDisplay.visible, false);
  assert.equal(computer.idleDisplay.visible, true);
  model.update(++time, 'experience', true, { reading: false });
  assert.equal(computer.desktopDisplay.visible, false);
  assert.equal(computer.idleDisplay.visible, true);
});

test('The archive shelf closes directly below its fourth cartridge with its cable junction attached', () => {
  const archive = new THREE.Group();
  archive.userData.section = 'experience';
  const helpers = createModelPrimitives(THREE, archive, undefined, {
    experience: [],
  });
  buildCaseStudyArchive(THREE, helpers, archive);
  const boxInArchive = (object) => {
    object.geometry.computeBoundingBox();
    return object.geometry.boundingBox
      .clone()
      .applyMatrix4(
        new THREE.Matrix4()
          .copy(archive.matrixWorld)
          .invert()
          .multiply(object.matrixWorld),
      );
  };
  for (const scale of [1, 0.84]) {
    archive.scale.setScalar(scale);
    archive.updateMatrixWorld(true);
    const cartridges = archive.children.filter((child) =>
      /^case-archive-cartridge-\d+$/.test(child.name),
    );
    assert.equal(cartridges.length, 4);
    const bottomRow = Math.min(
      ...cartridges.map((cartridge) => cartridge.position.y),
    );
    const crossmembers = archive.children.filter(
      (child) => child.name === 'case-archive-rack-crossmember',
    );
    const bottom = crossmembers
      .map(boxInArchive)
      .sort((a, b) => a.min.y - b.min.y)[0];
    const back = boxInArchive(
      archive.getObjectByName('case-archive-closed-rack-backplane'),
    );
    const junction = boxInArchive(
      archive.getObjectByName('case-archive-loom-rack-junction'),
    );
    const lowerRunner = archive.children
      .filter((child) => child.name === 'case-archive-slot-support-rail')
      .map(boxInArchive)
      .sort((a, b) => a.min.y - b.min.y)[0];
    assert.ok(
      bottom.max.y >= lowerRunner.min.y,
      'Bottom crossmember meets the lowest cartridge runner',
    );
    assert.ok(
      bottom.min.y > bottomRow - 0.25,
      'The removed fifth cartridge leaves no empty shelf bay',
    );
    assert.ok(
      back.min.y >= lowerRunner.min.y,
      'The closed back stops at the final supported row',
    );
    assert.ok(
      junction.min.y >= bottom.min.y && junction.max.y <= back.max.y,
      'The terminal cable junction remains attached to the shortened rack',
    );
    assert.equal(
      archive.children.filter(
        (child) => child.name === 'case-archive-rack-anchored-foot',
      ).length,
      2,
    );
  }
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
