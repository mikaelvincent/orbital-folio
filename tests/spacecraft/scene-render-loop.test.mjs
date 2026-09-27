import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSceneRenderLoop,
  SCENE_IDLE_DELAY_MS,
} from '../../features/spacecraft/scene-render-loop.ts';

function fixture() {
  let time = 0;
  let id = 0;
  const queued = new Map();
  const draws = [];
  const rests = [];
  const state = { visible: true, ambient: true, busy: false, once: false };
  let duringDraw = () => {};
  const loop = createSceneRenderLoop({
    draw: (...sample) => {
      draws.push(sample);
      duringDraw();
    },
    canRender: () => state.visible,
    ambientMotion: () => state.ambient,
    keepAwake: () => state.busy,
    renderOnce: () => state.once,
    onRest: (value) => rests.push(value),
    now: () => time,
    requestFrame: (callback) => {
      queued.set(++id, callback);
      return id;
    },
    cancelFrame: (key) => queued.delete(key),
  });
  return {
    loop,
    state,
    queued,
    draws,
    rests,
    duringDraw: (callback) => {
      duringDraw = callback;
    },
    elapse: (ms) => {
      time += ms;
    },
    frame: (ms = 1000 / 60) => {
      time += ms;
      const callbacks = [...queued.values()];
      queued.clear();
      for (const callback of callbacks) callback(time);
      assert.ok(queued.size <= 1, 'only one render callback may be queued');
    },
  };
}

test('a visible scene rests without a pending callback and resumes without clock catch-up', () => {
  const f = fixture();
  f.loop.wake();
  f.frame();
  f.frame(SCENE_IDLE_DELAY_MS - 100);
  assert.equal(f.queued.size, 1);
  f.frame(100);
  assert.equal(f.queued.size, 0);
  assert.deepEqual(f.rests, [true]);
  const count = f.draws.length;
  f.frame(60_000);
  assert.equal(f.draws.length, count);
  f.loop.wake();
  assert.equal(f.queued.size, 1);
  assert.deepEqual(f.rests, [true, false]);
  f.frame();
  assert.deepEqual(f.draws.at(-1).slice(1), [0, 0]);
  f.frame();
  assert.ok(Math.abs(f.draws.at(-1)[1] - 1 / 60) < 1e-8);
});

test('new input extends the deadline without resetting an active animation clock', () => {
  const f = fixture();
  f.loop.wake();
  f.frame();
  f.elapse(SCENE_IDLE_DELAY_MS - 100);
  f.loop.wake();
  f.frame(200);
  assert.equal(f.queued.size, 1);
  assert.equal(
    f.draws.at(-1)[1],
    0.05,
    'long active frames retain the delta cap',
  );
  f.frame(SCENE_IDLE_DELAY_MS);
  assert.equal(f.queued.size, 0);
});

test('unfinished navigation or inspection outlives the deadline, then rests', () => {
  const f = fixture();
  f.state.busy = true;
  f.loop.wake();
  f.frame(SCENE_IDLE_DELAY_MS * 2);
  assert.equal(f.queued.size, 1);
  f.state.busy = false;
  f.frame();
  assert.equal(f.queued.size, 0);
  assert.deepEqual(f.rests, [true]);
});

test('reduced motion renders on demand while required travel can still finish', () => {
  const f = fixture();
  f.state.ambient = false;
  f.loop.wake();
  f.frame();
  assert.equal(f.queued.size, 0);
  assert.deepEqual(f.rests, [], 'reduced motion is not automatic inactivity');
  f.state.busy = true;
  f.loop.wake();
  f.frame();
  assert.equal(f.queued.size, 1);
  f.state.busy = false;
  f.frame();
  assert.equal(f.queued.size, 0);
});

test('the render-once diagnostic overrides continuous inspection', () => {
  const f = fixture();
  f.state.busy = true;
  f.state.once = true;
  f.loop.wake();
  f.frame();
  assert.equal(f.queued.size, 0);
  assert.deepEqual(f.rests, []);
});

test('hidden scenes cancel pending work and resume with zero elapsed hidden time', () => {
  const f = fixture();
  f.loop.wake();
  f.frame();
  f.state.visible = false;
  f.loop.suspend();
  f.loop.wake();
  assert.equal(f.queued.size, 0);
  f.elapse(120_000);
  f.state.visible = true;
  f.loop.wake();
  f.frame();
  assert.deepEqual(f.draws.at(-1).slice(1), [0, 0]);
});

test('requests during a draw are coalesced without dropping an on-demand update', () => {
  const f = fixture();
  f.state.ambient = false;
  f.duringDraw(() => {
    f.loop.wake();
    f.loop.wake();
  });
  f.loop.wake();
  f.frame();
  assert.equal(f.queued.size, 1);
  f.duringDraw(() => {});
  f.frame();
  assert.equal(f.draws.length, 2);
  assert.equal(f.queued.size, 0);
});

test('dispose during rendering or with a pending frame cannot revive the loop', () => {
  for (const duringDraw of [false, true]) {
    const f = fixture();
    f.loop.wake();
    if (duringDraw) {
      f.duringDraw(() => f.loop.dispose());
      f.frame();
    } else f.loop.dispose();
    f.loop.wake();
    assert.equal(f.queued.size, 0);
  }
});
