import test from 'node:test';
import assert from 'node:assert/strict';
import { Matrix4 } from 'three';
import { createHtmlUpdateGate } from '../../features/spacecraft/html-update-gate.ts';

test('HTML update inputs snapshot mutable transforms and refresh on view, state, resize and explicit invalidation', () => {
  const gate = createHtmlUpdateGate();
  const camera = new Matrix4(),
    projection = new Matrix4(),
    model = new Matrix4();
  const matrices = [camera, projection, model];
  const state = ['about', false, '', 1280, 720, 0, 1];
  assert.equal(gate.changed(state, matrices), true);
  for (let i = 0; i < 120; i++)
    assert.equal(gate.changed([...state], matrices), false);
  for (const matrix of matrices) {
    matrix.elements[12] += 0.1;
    assert.equal(
      gate.changed(state, matrices),
      true,
      'in-place transforms must invalidate',
    );
    assert.equal(gate.changed(state, matrices), false);
  }
  for (const [index, value] of [
    [1, true],
    [2, 'about-notebook'],
    [3, 390],
    [4, 844],
    [5, 1],
    [6, 0.75],
  ]) {
    state[index] = value;
    assert.equal(gate.changed(state, matrices), true);
    assert.equal(gate.changed(state, matrices), false);
  }
  gate.invalidate();
  assert.equal(gate.changed(state, matrices), true);
  assert.equal(gate.changed(state, matrices.slice(1)), true);
});
