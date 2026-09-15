import test from 'node:test';
import assert from 'node:assert/strict';
import { moveCameraAxis, PROJECTS_PER_PAGE } from '../../features/spacecraft/navigation/flight.ts';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

const limits = { frequency: 7, speed: 0.35, acceleration: 1.2 };
function simulate(hz) {
  const axis = { value: 0, velocity: 0 };
  const dt = 1 / hz;
  for (let frame = 0; frame < hz * 4; frame++) {
    const target = Math.floor(frame / (hz / 10)) % 2 ? -0.15 : 0.15;
    const before = { ...axis };
    moveCameraAxis(axis, target, dt, limits);
    assert.ok(Math.abs(axis.velocity) <= limits.speed + 1e-12);
    assert.ok(
      Math.abs(axis.velocity - before.velocity) <=
        limits.acceleration * dt + 1e-12,
    );
    assert.ok(Math.abs(axis.value - before.value) <= limits.speed * dt + 1e-12);
  }
  return axis;
}
test('Rapid hover reversals preserve velocity and respect speed/acceleration at30/60/120Hz', () => {
  const results = [30, 60, 120].map(simulate);
  assert.ok(Math.abs(results[0].value - results[2].value) < 1e-9);
  const axis = { value: 0, velocity: 0.2 };
  moveCameraAxis(axis, -1, 1 / 60, limits);
  assert.ok(
    axis.velocity > 0,
    'a new target must not reset or instantly reverse velocity',
  );
});
test('Camera springs converge and frozen/invalid deltas cannot advance motion', () => {
  const axis = { value: -4, velocity: 0 };
  for (let i = 0; i < 120 * 5; i++) moveCameraAxis(axis, 3, 1 / 120);
  assert.ok(Math.abs(axis.value - 3) < 0.0001);
  assert.ok(Math.abs(axis.velocity) < 0.001);
  const before = { ...axis };
  moveCameraAxis(axis, -7, 0);
  assert.deepEqual(axis, before);
  moveCameraAxis(axis, NaN, 0.02);
  assert.deepEqual(axis, before);
});
test('Interactive-view migration updates default labels without overwriting custom or unpublished content', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(
    'CREATE TABLE content(id TEXT,kind TEXT,draft TEXT,published TEXT,revision INTEGER)',
  );
  const insert = db.prepare('INSERT INTO content VALUES(?,?,?,?,?)');
  insert.run(
    'default',
    'site',
    JSON.stringify({ sceneLabel: 'Ship view', name: 'Existing owner' }),
    JSON.stringify({ sceneLabel: 'Ship view' }),
    7,
  );
  insert.run(
    'custom',
    'site',
    JSON.stringify({ sceneLabel: 'Flight deck' }),
    JSON.stringify({ sceneLabel: 'My world' }),
    4,
  );
  insert.run(
    'private',
    'site',
    JSON.stringify({ sceneLabel: 'Ship view' }),
    null,
    2,
  );
  db.exec(fs.readFileSync('drizzle/0003_interactive_view.sql', 'utf8'));
  const rows = db.prepare('SELECT * FROM content').all();
  assert.equal(JSON.parse(rows[0].draft).sceneLabel, 'Interactive view');
  assert.equal(JSON.parse(rows[0].draft).name, 'Existing owner');
  assert.equal(JSON.parse(rows[1].draft).sceneLabel, 'Flight deck');
  assert.equal(JSON.parse(rows[1].published).sceneLabel, 'My world');
  assert.equal(rows[1].revision, 4);
  assert.equal(rows[2].published, null);
  db.close();
  assert.equal(PROJECTS_PER_PAGE, 9);
});
