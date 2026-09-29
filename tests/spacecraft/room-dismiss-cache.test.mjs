import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { createContactRoomDismissPicker } from '../../features/spacecraft/navigation/contact-room-dismiss.ts';

const model = createSpacecraft(THREE, {
  journal: [{ title: 'One' }, { title: 'Two' }],
  projects: [{ title: 'Project', slug: 'project' }],
  caseStudies: [{ title: 'Study', slug: 'study', categories: ['product'] }],
});
const data = model.group.userData;
const revision = () => data.geometryRevision - data.dishGeometryRevision;
const roots = {
  contact: data.contactComputer.consoleRoot,
  projects: data.projectWorkshop,
  experience: data.caseStudyArchive,
  about: data.personalStudy,
};
function targets(room) {
  const walls = [],
    blockers = [];
  // Match syncSceneTargets, including Contact's extra outboard wall marker.
  model.group.traverse((object) => {
    if (
      object.isMesh &&
      (room === 'contact'
        ? object.material?.userData.contactRoomWall
        : object.material?.userData.applicationRoomWall === room)
    )
      walls.push(object);
  });
  roots[room].traverse((object) => {
    if (object.isMesh && !object.userData.isInteractionProxy)
      blockers.push(object);
  });
  return { walls, blockers };
}
function update(room, time, state = {}, instant = true) {
  model.update(time, '', instant, {
    activeRoom: room,
    reading: true,
    travelling: false,
    hoveredObject: null,
    notebookChapter: 0,
    delta: 1 / 60,
    reducedMotion: false,
    ...state,
  });
}
function view(room, dx, dy) {
  const [x, y] = data.roomAnchors[room];
  return new THREE.Raycaster(
    new THREE.Vector3(x + dx, y + dy, 4),
    new THREE.Vector3(0, 0, -1),
  );
}
const hitValue = (hit) =>
  hit ? [hit.object.uuid, hit.distance, hit.instanceId] : null;

test('all four real picker sets exclude the moving dish and reuse identical hits and misses through its full cycle', () => {
  const dish = new Set();
  model.group
    .getObjectByName('service-mounted-communications-dish')
    .traverse((object) => dish.add(object));
  for (const room of Object.keys(roots)) {
    update(room, 0);
    const { walls, blockers } = targets(room);
    assert.ok(walls.length && blockers.length, room);
    assert.ok(
      [...walls, ...blockers].every((mesh) => !dish.has(mesh)),
      room,
    );
    const inputs = () =>
      [...walls, ...blockers].map((mesh) => [
        mesh.matrixWorld.toArray(),
        mesh.visible,
        mesh.layers.mask,
        mesh.geometry.uuid,
        mesh.geometry.attributes.position.version,
        mesh.instanceMatrix?.version,
      ]);
    const before = inputs();
    const baseRevision = revision();
    const broadRevision = data.geometryRevision;
    const rays = [
      view(room, -1.5, 0.75),
      view(room, 0, -0.25),
      view(room, 8, 8),
    ];
    const cached = rays.map(() =>
      createContactRoomDismissPicker(walls, blockers),
    );
    const fresh = createContactRoomDismissPicker(walls, blockers);
    assert.ok(fresh.pick(rays[0]), `${room} fixture includes an exposed wall`);
    assert.equal(fresh.pick(rays[2]), null, `${room} fixture includes sky`);
    for (const time of [
      0, 0.5, 1, 2, 3.25, 4, 5, 8, 9, 10, 11, 12.75, 17, 18,
    ]) {
      update(room, time);
      assert.equal(revision(), baseRevision, `${room} dish-only time ${time}`);
      assert.deepEqual(
        inputs(),
        before,
        `${room} actual picker geometry stays put`,
      );
      rays.forEach((ray, i) =>
        assert.deepEqual(
          hitValue(cached[i].pick(ray, revision())),
          hitValue(fresh.pick(ray)),
        ),
      );
    }
    assert.ok(
      data.geometryRevision > broadRevision,
      'The old cache would invalidate',
    );
    assert.deepEqual(
      cached.map((picker) => picker.raycasts),
      [1, 1, 1],
    );
  }
});

test('real keyboard instances and notebook leaves invalidate even alongside a moving dish and on final snaps', () => {
  for (const room of ['contact', 'about']) {
    update(room, 1);
    const { walls, blockers } = targets(room);
    const picker = createContactRoomDismissPicker(walls, blockers);
    const fresh = createContactRoomDismissPicker(walls, blockers);
    const ray = view(room, 0, -0.25);
    picker.pick(ray, revision());
    if (room === 'contact') data.contactComputer.keyboard.press('KeyA');
    for (const instant of [false, true]) {
      const before = revision();
      const count = picker.raycasts;
      update(
        room,
        instant ? 2.1 : 2,
        { notebookChapter: room === 'about' ? 1 : 0 },
        instant,
      );
      assert.ok(revision() > before, `${room} relevant motion`);
      assert.deepEqual(
        hitValue(picker.pick(ray, revision())),
        hitValue(fresh.pick(ray)),
      );
      assert.equal(picker.raycasts, count + 1);
    }
    if (room === 'contact') data.contactComputer.keyboard.release('KeyA');
  }
});

test('screen visibility, cartridge rearrangement and layout edits survive the dish exclusion', () => {
  for (const room of Object.keys(roots)) {
    update(room, 1);
    const before = revision();
    update(room, 2, { reading: false });
    assert.ok(revision() > before, `${room} closing application`);
  }
  const before = revision();
  model.setCaseStudies([
    { title: 'Research', slug: 'research', categories: ['research'] },
  ]);
  assert.ok(
    revision() > before,
    'Physical cartridge positions follow availability',
  );
  const wide = revision();
  model.setLayout('compact');
  assert.ok(revision() > wide, 'Layout geometry changes still invalidate');
  model.setLayout('wide');
});

test('notebook content replacement publishes flag transforms before refreshing a cached pick', () => {
  update('about', 0);
  update('about', 0.1, { notebookChapter: 1 }, false);
  const book = data.aboutNotebook;
  const { walls, blockers } = targets('about');
  const picker = createContactRoomDismissPicker(walls, blockers);
  const fresh = createContactRoomDismissPicker(walls, blockers);
  const ray = view('about', 0, 0.25);
  picker.pick(ray, revision());
  const before = revision();
  const matrices = blockers.map((mesh) => mesh.matrixWorld.clone());
  book.setChapters([{ title: 'Replacement' }]);
  // This standalone setter is outside model.update, as in api.notebook.
  assert.equal(revision(), before);
  book.root.updateWorldMatrix(true, true);
  picker.invalidate();
  assert.ok(blockers.some((mesh, i) => !mesh.matrixWorld.equals(matrices[i])));
  assert.deepEqual(
    hitValue(picker.pick(ray, revision())),
    hitValue(fresh.pick(ray)),
  );
  assert.equal(picker.raycasts, 2);
});

after(() => {
  const geometries = new Set(),
    materials = new Set();
  model.group.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [object.material].flat().filter(Boolean))
      materials.add(material);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
});
