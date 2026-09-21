import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { projectCategoryCount } from '../../lib/content/project-content.ts';

test('only explicitly populated collections are available, including legacy and shared projects', () => {
  const projects = [
    { title: 'Legacy', slug: 'legacy', category: 'Experiments' },
    {
      title: 'Shared',
      slug: 'shared',
      categories: ['systems', 'interfaces', 'systems'],
    },
  ];
  assert.equal(projectCategoryCount(projects, 'all'), 2);
  assert.equal(projectCategoryCount(projects, 'systems'), 1);
  assert.equal(projectCategoryCount(projects, 'interfaces'), 1);
  assert.equal(projectCategoryCount(projects, 'experiments'), 0);

  const model = createSpacecraft(THREE, { projects });
  const screens = model.group.userData.projectScreens;
  const empty = screens.find((screen) => screen.category === 'experiments');
  const populated = screens.find((screen) => screen.category === 'systems');
  assert.deepEqual(
    screens.map((screen) => screen.available),
    [true, true, true, false],
  );
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    model.update(1, 'projects', true, {
      activeRoom: 'projects',
      reading: false,
      hoveredObject: empty.interactableId,
    });
    assert.equal(empty.root.userData.highlightLevel, 1);
    assert.ok(
      empty.root.visible,
      'The dormant monitor remains installed and blocks wall clicks',
    );
    model.update(2, 'projects', true, {
      reading: true,
      projectScreen: empty.category,
    });
    assert.equal(
      empty.desktopDisplay.visible,
      false,
      'Stale selection cannot power an empty screen',
    );
    assert.equal(empty.idleDisplay.visible, true);
    model.update(3, 'projects', true, {
      reading: false,
      hoveredObject: populated.interactableId,
    });
    assert.equal(populated.root.userData.highlightLevel, 1.15);
  }

  model.setProjects([
    { title: 'New', slug: 'new', categories: ['experiments'] },
  ]);
  assert.deepEqual(
    screens.map((screen) => screen.available),
    [true, false, false, true],
  );
  model.update(4, 'projects', true, {
    reading: true,
    projectScreen: 'experiments',
  });
  assert.equal(
    empty.desktopDisplay.visible,
    true,
    'New content restores a dormant screen',
  );
  model.setProjects([]);
  assert.ok(screens.every((screen) => !screen.available));
  assert.ok(screens.every((screen) => !screen.desktopDisplay.visible));
  model.update(5, 'projects', true, { projectScreen: 'all' });
  assert.ok(screens.every((screen) => screen.idleDisplay.visible));
});
