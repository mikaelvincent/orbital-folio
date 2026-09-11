import test from 'node:test';
import assert from 'node:assert/strict';
import { requiredPortalIds } from '../lib/iris-navigation.ts';

const portal = (from, to, x, y) => ({
  id: `${from}:${to}`,
  from,
  to,
  position: [x, y, 0],
  size: [0.28, 1.84, 1.84],
});

// Ordered C-shaped cabin layout with separate upper/lower ladder entrances.
const portals = [
  portal('experience', 'projects', 0.12, 1.7),
  portal('projects', 'experience', -0.12, 1.7),
  portal('projects', 'about', -3.12, 1.7),
  portal('about', 'projects', -3.12, -1.7),
  portal('about', 'contact', -0.12, -1.7),
  portal('contact', 'about', 0.12, -1.7),
];

test('An adjacent cabin route opens both door faces and no other connection', () => {
  assert.deepEqual(
    requiredPortalIds(portals, [
      [1.7, 1.7, 0],
      [-1.7, 1.7, 0],
    ]),
    ['experience:projects', 'projects:experience'],
  );
});

test('Ladder passage opens both physically separate entrances', () => {
  assert.deepEqual(
    requiredPortalIds(portals, [
      [-1.7, 1.7, 0],
      [-4, 1.7, 0],
      [-4, -1.7, 0],
      [-1.7, -1.7, 0],
    ]),
    ['projects:about', 'about:projects'],
  );
});

test('A full nonadjacent itinerary opens every C-route connection', () => {
  assert.deepEqual(
    requiredPortalIds(portals, [
      [1.7, 1.7, 0],
      [-1.7, 1.7, 0],
      [-4, 1.7, 0],
      [-4, 0, 0],
      [-4, -1.7, 0],
      [-1.7, -1.7, 0],
      [1.7, -1.7, 0],
    ]),
    portals.map((p) => p.id),
  );
});

test('Retargeting inside a threshold keeps both faces clear without stale route doors', () => {
  assert.deepEqual(
    requiredPortalIds(portals, [
      [0.4, 1.7, 0],
      [1.7, 1.7, 0],
    ]),
    ['experience:projects', 'projects:experience'],
  );
  assert.deepEqual(
    requiredPortalIds(portals, [
      [0.6, 1.7, 0],
      [1.7, 1.7, 0],
    ]),
    [],
    'Once outside the threshold clearance, the old connection can close',
  );
});

test('Retargeting from within the ladder retains only its entrance pair', () => {
  assert.deepEqual(
    requiredPortalIds(portals, [
      [-4, 0, 0],
      [-4, 1.7, 0],
      [-1.7, 1.7, 0],
    ]),
    ['projects:about', 'about:projects'],
  );
});

test('Plane crossing outside the circular aperture does not open a door', () => {
  const one = [portal('a', 'b', 0, 0)];
  assert.deepEqual(
    requiredPortalIds(one, [
      [-2, 0.8, 0.8],
      [2, 0.8, 0.8],
    ]),
    [],
  );
  assert.deepEqual(
    requiredPortalIds(one, [
      [-2, 0, 1.1],
      [2, 0, 1.1],
    ]),
    [],
  );
  assert.deepEqual(
    requiredPortalIds(one, [
      [-2, 0.5, 0.5],
      [2, 0.5, 0.5],
    ]),
    ['a:b'],
  );
});

test('Coplanar movement through the opening and exact endpoints are recognized', () => {
  const one = [portal('a', 'b', 0, 0)];
  assert.deepEqual(
    requiredPortalIds(one, [
      [0, -2, 0],
      [0, 2, 0],
    ]),
    ['a:b'],
  );
  assert.deepEqual(
    requiredPortalIds(one, [
      [-2, 0, 0],
      [0, 0, 0],
    ]),
    ['a:b'],
  );
  assert.deepEqual(
    requiredPortalIds(one, [
      [0, -2, 1],
      [0, 2, 1],
    ]),
    [],
  );
});

test('No itinerary, invalid points, and stationary distant paths require no doors', () => {
  for (const points of [
    [],
    [[0, 0, 0]],
    [
      [2, 1.7, 0],
      [2, 1.7, 0],
    ],
    [
      [NaN, 0, 0],
      [0, 0, 0],
    ],
  ])
    assert.deepEqual(requiredPortalIds(portals, points), []);
});

test('Clear opening size overrides larger pick-box bounds', () => {
  const one = [{ ...portal('a', 'b', 0, 0), openingSize: [1, 1] }];
  assert.deepEqual(
    requiredPortalIds(one, [
      [-2, 0.6, 0],
      [2, 0.6, 0],
    ]),
    [],
  );
  assert.deepEqual(
    requiredPortalIds(one, [
      [-2, 0.4, 0],
      [2, 0.4, 0],
    ]),
    ['a:b'],
  );
});
