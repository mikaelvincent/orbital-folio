import test from 'node:test';
import assert from 'node:assert/strict';
import { createSceneRenderLoop } from '../../features/spacecraft/scene-render-loop.ts';

function fixture() {
  let time = 0;
  let id = 0;
  const queued = new Map();
  const draws = [];
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

test('a visible scene keeps animating beyond the former idle deadline without input', () => {
  const f = fixture();
  f.loop.wake();
  f.frame();
  f.frame(15_000);
  assert.equal(f.queued.size, 1);
  const count = f.draws.length;
  f.frame(60_000);
  assert.equal(f.draws.length, count + 1);
  assert.equal(f.queued.size, 1);
  f.frame();
  assert.ok(Math.abs(f.draws.at(-1)[1] - 1 / 60) < 1e-8);
});

test('repeated input coalesces without resetting an active animation clock', () => {
  const f = fixture();
  f.loop.wake();
  f.frame();
  f.elapse(100);
  f.loop.wake();
  f.loop.wake();
  f.frame(200);
  assert.equal(f.queued.size, 1);
  assert.equal(
    f.draws.at(-1)[1],
    0.05,
    'long active frames retain the delta cap',
  );
  f.frame(15_000);
  assert.equal(f.queued.size, 1);
});

test('visibility lost during a draw stops the loop even with ambient motion enabled', () => {
  const f = fixture();
  f.duringDraw(() => {
    f.state.visible = false;
  });
  f.loop.wake();
  f.frame();
  assert.equal(f.queued.size, 0);
  f.frame(60_000);
  assert.equal(f.draws.length, 1);
});

test('browser suspension without a visibility event resumes from the held animation time', () => {
  const f = fixture();
  f.loop.wake();
  f.frame();
  f.frame(60_000);
  assert.deepEqual(f.draws.at(-1).slice(1), [0, 60]);
  assert.equal(f.queued.size, 1);
  f.frame();
  assert.ok(Math.abs(f.draws.at(-1)[1] - 1 / 60) < 1e-8);
});

test('reduced motion renders on demand while required travel can still finish', () => {
  const f = fixture();
  f.state.ambient = false;
  f.loop.wake();
  f.frame();
  assert.equal(f.queued.size, 0);
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
