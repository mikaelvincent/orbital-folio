import test from 'node:test';
import assert from 'node:assert/strict';
import {
  requiredPortalIds,
  interlockLadderPortals,
  isLadderExitLeg,
  approachingLadderPortalIds,
  ladderExitHoldPoint,
} from '../lib/iris-navigation.ts';
import { planCabinItinerary } from '../lib/cabin-itinerary.ts';

const portal = (from, to, x, y, via = null) => ({
  id: `${from}:${to}`,
  from,
  to,
  position: [x, y, 0],
  size: [0.28, 1.84, 1.84],
  via,
});

// Ordered C-shaped cabin layout with separate upper/lower ladder entrances.
const portals = [
  portal('experience', 'projects', 0.12, 1.7),
  portal('projects', 'experience', -0.12, 1.7),
  portal('projects', 'about', -3.12, 1.7, 'walkway'),
  portal('about', 'projects', -3.12, -1.7, 'walkway'),
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

test('Ladder route identifies both entrances without coupling their individual legs', () => {
  assert.deepEqual(
    requiredPortalIds(portals, [
      [-1.7, 1.7, 0],
      [-4, 1.7, 0],
    ]),
    ['projects:about'],
  );
  assert.deepEqual(
    requiredPortalIds(portals, [
      [-4, -1.7, 0],
      [-1.7, -1.7, 0],
    ]),
    ['about:projects'],
  );
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

test('A full nonadjacent itinerary identifies every C-route connection', () => {
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

test('Retargeting from within the ladder retains only the approached entrance', () => {
  assert.deepEqual(
    requiredPortalIds(portals, [
      [-4, 0, 0],
      [-4, 1.7, 0],
      [-1.7, 1.7, 0],
    ]),
    ['projects:about'],
  );
});

test('Live travel releases crossed doorways before arrival while retaining threshold clearance', () => {
  for (const [start, end, inside, cleared, expected] of [
    [
      [-1.7, 1.7, 0],
      [1.7, 1.7, 0],
      [0.2, 1.7, 0],
      [0.6, 1.7, 0],
      ['experience:projects', 'projects:experience'],
    ],
    [
      [1.7, 1.7, 0],
      [-1.7, 1.7, 0],
      [-0.2, 1.7, 0],
      [-0.6, 1.7, 0],
      ['experience:projects', 'projects:experience'],
    ],
    [
      [-1.7, 1.7, 0],
      [-4, 1.7, 0],
      [-3.25, 1.7, 0],
      [-3.6, 1.7, 0],
      ['projects:about'],
    ],
    [
      [-4, -1.7, 0],
      [-1.7, -1.7, 0],
      [-3, -1.7, 0],
      [-2.6, -1.7, 0],
      ['about:projects'],
    ],
  ]) {
    assert.deepEqual(requiredPortalIds(portals, [start, end]), expected);
    assert.deepEqual(
      requiredPortalIds(portals, [inside, end]),
      expected,
      'Both faces stay clear while the camera is inside the threshold',
    );
    const remaining = requiredPortalIds(portals, [cleared, end]);
    assert.deepEqual(
      remaining,
      [],
      'The door can close before reaching the room center',
    );
    const states = portals.map((p) => ({
      ...p,
      openProgress: expected.includes(p.id) ? 0.8 : 0,
    }));
    assert.deepEqual(
      interlockLadderPortals(states, remaining),
      { openPortalIds: [], waiting: false },
      'A closing door behind the camera must not restart the ladder exit pause',
    );
    assert.deepEqual(
      requiredPortalIds(portals, [cleared, start]),
      expected,
      'A reversal reopens the doorway that is ahead of the camera again',
    );
  }
});

test('Ladder interlock closes the entrance before opening the exit', () => {
  const states = portals.map((p) => ({
    ...p,
    openProgress: p.id === 'projects:about' ? 0.3 : 0,
  }));
  assert.deepEqual(interlockLadderPortals(states, ['about:projects']), {
    openPortalIds: [],
    waiting: true,
  });
  assert.deepEqual(
    interlockLadderPortals(states, []),
    { openPortalIds: [], waiting: false },
    'Door-free ladder travel continues during closure',
  );
  states.find((p) => p.id === 'projects:about').openProgress = 0;
  assert.deepEqual(interlockLadderPortals(states, ['about:projects']), {
    openPortalIds: ['about:projects'],
    waiting: true,
  });
  states.find((p) => p.id === 'about:projects').openProgress = 1;
  assert.deepEqual(interlockLadderPortals(states, ['about:projects']), {
    openPortalIds: ['about:projects'],
    waiting: false,
  });
});

test('A retarget through the current physical hatch does not close it', () => {
  const states = portals.map((p) => ({
    ...p,
    openProgress: p.id === 'projects:about' ? 0.7 : 0,
  }));
  assert.deepEqual(interlockLadderPortals(states, ['projects:about']), {
    openPortalIds: ['projects:about'],
    waiting: true,
  });
});

test('Ordinary cabin doors open immediately without waiting for any other door', () => {
  const states = portals.map((p) => ({
    ...p,
    openProgress: ['contact:about', 'projects:about'].includes(p.id) ? 0.7 : 0,
  }));
  const requested = ['experience:projects', 'projects:experience'];
  assert.deepEqual(interlockLadderPortals(states, requested), {
    openPortalIds: requested,
    waiting: false,
  });
  assert.equal(
    isLadderExitLeg(portals, requested, [1.7, 1.7, 0], [-1.7, 1.7, 0]),
    false,
  );
});

test('Both ladder requests select only one physical hatch, preferring the hatch already open', () => {
  const requested = ['projects:about', 'about:projects'];
  const states = portals.map((p) => ({ ...p, openProgress: 0 }));
  assert.deepEqual(interlockLadderPortals(states, requested), {
    openPortalIds: ['projects:about'],
    waiting: true,
  });
  states.find((p) => p.id === 'about:projects').openProgress = 0.6;
  assert.deepEqual(interlockLadderPortals(states, requested), {
    openPortalIds: ['about:projects'],
    waiting: true,
  });
  states.find((p) => p.id === 'projects:about').openProgress = 0.2;
  assert.deepEqual(
    interlockLadderPortals(states, requested),
    {
      openPortalIds: [],
      waiting: true,
    },
    'If a stale state has both open, close the competing hatch before reopening',
  );
});

test('An adjacent request remains open while the ladder exit waits', () => {
  const states = portals.map((p) => ({
    ...p,
    openProgress: p.id === 'projects:about' ? 1 : 0,
  }));
  assert.deepEqual(
    interlockLadderPortals(states, [
      'about:projects',
      'about:contact',
      'contact:about',
    ]),
    {
      openPortalIds: ['about:contact', 'contact:about'],
      waiting: true,
    },
  );
});

test('Only ladder exit legs hold the camera; entry and vertical travel proceed immediately', () => {
  const legs = [
    { start: [-1.7, 1.7, 0], end: [-4, 1.7, 0], exit: false },
    { start: [-4, 1.7, 0], end: [-4, -1.7, 0], exit: false },
    { start: [-4, -1.7, 0], end: [-1.7, -1.7, 0], exit: true },
    { start: [-1.7, -1.7, 0], end: [-4, -1.7, 0], exit: false },
    { start: [-4, -1.7, 0], end: [-4, 1.7, 0], exit: false },
    { start: [-4, 1.7, 0], end: [-1.7, 1.7, 0], exit: true },
  ];
  for (const { start, end, exit } of legs) {
    const requested = requiredPortalIds(portals, [start, end]);
    const gate = interlockLadderPortals(portals, requested);
    assert.equal(isLadderExitLeg(portals, requested, start, end), exit);
    assert.equal(
      isLadderExitLeg(portals, requested, start, end) && gate.waiting,
      exit,
    );
  }
});

test('Near-threshold reversals preserve the requested ladder hatch without a closure pulse', () => {
  const states = portals.map((p) => ({
    ...p,
    openProgress: p.id === 'projects:about' ? 1 : 0,
  }));
  for (const x of [-3.4, -3.12, -2.9]) {
    const start = [x, 1.7, 0];
    const exit = [-1.7, 1.7, 0];
    const requested = requiredPortalIds(portals, [start, exit]);
    assert.equal(isLadderExitLeg(portals, requested, start, exit), true);
    assert.deepEqual(interlockLadderPortals(states, requested), {
      openPortalIds: ['projects:about'],
      waiting: false,
    });
    const entry = [-4, 1.7, 0];
    assert.equal(
      isLadderExitLeg(
        portals,
        requiredPortalIds(portals, [start, entry]),
        start,
        entry,
      ),
      false,
    );
  }
});

test('Ladder exits pre-open on center departure in either direction, without opening distant cabin doors', () => {
  for (const direction of [-1, 1]) {
    const entry = [-4, -direction * 1.7, 0];
    const center = [-4, 0, 0];
    const landing = [-4, direction * 1.7, 0];
    const cabin = [-1.7, direction * 1.7, 0];
    const exitId = direction > 0 ? 'projects:about' : 'about:projects';
    assert.deepEqual(
      approachingLadderPortalIds(portals, entry, center, landing),
      [],
    );
    assert.deepEqual(
      approachingLadderPortalIds(portals, center, landing, cabin),
      [exitId],
    );
    assert.deepEqual(
      approachingLadderPortalIds(
        portals,
        [-4, direction * 0.7, 0],
        landing,
        cabin,
      ),
      [exitId],
    );
    assert.deepEqual(
      approachingLadderPortalIds(portals, landing, cabin, [
        1.7,
        direction * 1.7,
        0,
      ]),
      [],
    );
    assert.deepEqual(approachingLadderPortalIds(portals, center, landing), []);
  }
});

test('Anticipation still waits for the entry seal, and a mid-bay reversal discards the old exit', () => {
  const upper = ['projects:about'];
  const lower = ['about:projects'];
  const states = portals.map((p) => ({
    ...p,
    openProgress: p.id === upper[0] ? 0.4 : 0,
  }));
  const downward = approachingLadderPortalIds(
    states,
    [-4, 0, 0],
    [-4, -1.7, 0],
    [-1.7, -1.7, 0],
  );
  assert.deepEqual(downward, lower);
  assert.deepEqual(interlockLadderPortals(states, downward).openPortalIds, []);
  states.find((p) => p.id === upper[0]).openProgress = 0;
  assert.deepEqual(
    interlockLadderPortals(states, downward).openPortalIds,
    lower,
  );
  states.find((p) => p.id === lower[0]).openProgress = 0.2;
  assert.deepEqual(
    approachingLadderPortalIds(states, [-4, -0.5, 0], [-4, 0, 0], [-4, 1.7, 0]),
    [],
  );
  const upward = approachingLadderPortalIds(
    states,
    [-4, 0, 0],
    [-4, 1.7, 0],
    [-1.7, 1.7, 0],
  );
  assert.deepEqual(upward, upper);
  assert.deepEqual(interlockLadderPortals(states, upward).openPortalIds, []);
});

test('A pending ladder exit permits approach up to the threshold margin without backing up a reversal', () => {
  for (const y of [-1.7, 1.7]) {
    const start = [-4, y, 0];
    const end = [-1.7, y, 0];
    const ids = requiredPortalIds(portals, [start, end]);
    assert.deepEqual(ladderExitHoldPoint(portals, ids, start, end), [
      -3.47,
      y,
      0,
    ]);
    assert.deepEqual(ladderExitHoldPoint(portals, ids, [-3.2, y, 0], end), [
      -3.2,
      y,
      0,
    ]);
    assert.equal(ladderExitHoldPoint(portals, ids, end, start), null);
    assert.equal(ladderExitHoldPoint(portals, [], start, end), null);
  }
  assert.equal(
    ladderExitHoldPoint(
      portals,
      ['about:contact', 'contact:about'],
      [-1.7, -1.7, 0],
      [1.7, -1.7, 0],
    ),
    null,
  );
});

test('Mid-bay retargeting gates only the final exit in either direction', () => {
  const nodes = [
    { room: 'experience', position: [1.7, 1.7, 0] },
    { room: 'projects', position: [-1.7, 1.7, 0] },
    { position: [-4, 1.7, 0] },
    { position: [-4, 0, 0] },
    { position: [-4, -1.7, 0] },
    { room: 'about', position: [-1.7, -1.7, 0] },
    { room: 'contact', position: [1.7, -1.7, 0] },
  ];
  for (const destination of ['experience', 'projects', 'about', 'contact']) {
    const start = [-4, -0.35, 0];
    const plan = planCabinItinerary(nodes, start, destination);
    let prior = start;
    const held = [];
    for (const point of plan.points) {
      const requested = requiredPortalIds(portals, [prior, point]);
      if (isLadderExitLeg(portals, requested, prior, point))
        held.push(requested);
      prior = point;
    }
    assert.deepEqual(held, [
      [
        ['experience', 'projects'].includes(destination)
          ? 'projects:about'
          : 'about:projects',
      ],
    ]);
  }
});

test('Empty immediate or overview door intent has no wait, even with a ladder hatch open', () => {
  const states = portals.map((p) => ({ ...p, openProgress: 1 }));
  assert.deepEqual(interlockLadderPortals(states, []), {
    openPortalIds: [],
    waiting: false,
  });
  assert.equal(
    isLadderExitLeg(portals, [], [-4, 1.7, 0], [-1.7, 1.7, 0]),
    false,
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
