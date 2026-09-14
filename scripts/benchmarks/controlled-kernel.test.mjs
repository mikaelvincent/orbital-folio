import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runControlledKernel,
  runUntimedPrelude,
} from './controlled-kernel.mjs';

function fixture(kind = 'steady') {
  const events = [];
  let time = 0;
  return {
    events,
    now: () => ++time,
    kernel: {
      kind,
      reset() {
        events.push('reset');
      },
      reference(i) {
        events.push(`A${i}`);
        return { stage: i };
      },
      candidate(i) {
        events.push(`B${i}`);
        return { stage: i };
      },
    },
  };
}

test('A selected-variant prelude resets logical inputs before unchanged measured work', () => {
  const f = fixture();
  const result = runControlledKernel(f.kernel, 'B', 3, {
    preludeMs: 5,
    now: f.now,
    processCpu: null,
    threadCpu: null,
  });
  assert.equal(result.prelude.applied, true);
  assert.equal(result.prelude.elapsedMs, 5);
  assert.equal(result.prelude.operations, 5);
  assert.deepEqual(f.events, [
    'reset',
    'B0',
    'B1',
    'B2',
    'B3',
    'B4',
    'reset',
    'B0',
    'B1',
    'B2',
  ]);
  assert.equal(result instanceof Promise, false);
});

test('Zero prelude preserves one reset and only the requested measured operations', () => {
  const f = fixture();
  const result = runControlledKernel(f.kernel, 'A', 3, {
    now: f.now,
    processCpu: null,
    threadCpu: null,
  });
  assert.deepEqual(f.events, ['reset', 'A0', 'A1', 'A2']);
  assert.equal(result.prelude.operations, 0);
  assert.equal(result.prelude.applied, false);
});

test('Startup excludes preludes and leaves the complete construction operation timed', () => {
  const f = fixture('construction');
  const result = runControlledKernel(f.kernel, 'B', 1, {
    preludeMs: 100,
    now: f.now,
    processCpu: null,
    threadCpu: null,
  });
  assert.deepEqual(f.events, ['reset', 'B0']);
  assert.equal(result.prelude.requestedMs, 100);
  assert.equal(result.prelude.applied, false);
  assert.equal(result.prelude.operations, 0);
  assert.deepEqual(result.stages, { stage: 0 });
});

test('CPU getter calls stay outside wall timing and their deltas remain descriptive', () => {
  const events = [];
  let time = 0,
    processCount = 0,
    threadCount = 0;
  const result = runControlledKernel(
    {
      kind: 'steady',
      reset() {
        events.push('reset');
      },
      reference() {
        events.push('work');
      },
    },
    'A',
    1,
    {
      now() {
        events.push('wall-clock');
        return ++time;
      },
      processCpu() {
        events.push('process-cpu');
        return { user: processCount++ * 3000, system: 500 };
      },
      threadCpu() {
        events.push('thread-cpu');
        return { user: threadCount++ * 200, system: 100 };
      },
    },
  );
  assert.deepEqual(events, [
    'reset',
    'process-cpu',
    'thread-cpu',
    'wall-clock',
    'work',
    'wall-clock',
    'thread-cpu',
    'process-cpu',
  ]);
  assert.equal(result.elapsedMs, 1);
  assert.equal(result.cpu.process.totalMs, 3);
  assert.equal(result.cpu.thread.totalMs, 0.2);
  assert.equal(result.meanMs, 1);
  assert.equal('accepted' in result, false);
});

test('Prelude helper warms either variant equally without allocating a measured sample', () => {
  const a = fixture(),
    b = fixture();
  const first = runUntimedPrelude(a.kernel, 'A', 4, a.now);
  const second = runUntimedPrelude(b.kernel, 'B', 4, b.now);
  assert.equal(first.elapsedMs, second.elapsedMs);
  assert.equal(first.operations, second.operations);
  assert.equal('meanMs' in first, false);
});
