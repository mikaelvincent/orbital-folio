import test from 'node:test';
import assert from 'node:assert/strict';
import {
  seededRandom,
  balancedOrders,
  controlStability,
  thermalIssue,
  summarizeBlocks,
} from './controlled-protocol.mjs';

test('A seeded schedule counterbalances both version positions without changing work counts', () => {
  const first = balancedOrders(8, seededRandom(123));
  assert.deepEqual(first, balancedOrders(8, seededRandom(123)));
  assert.equal(first.filter((o) => o.join('') === 'ABBA').length, 4);
  assert.equal(first.filter((o) => o.join('') === 'BAAB').length, 4);
  for (const order of first) {
    assert.equal(order.filter((v) => v === 'A').length, 2);
    assert.equal(order.filter((v) => v === 'B').length, 2);
  }
  assert.throws(() => balancedOrders(3, seededRandom(1)));
});

test('Controls reject broad variation and sustained drift while retaining measured values', () => {
  assert.equal(controlStability([100, 102, 99]).stable, true);
  const broad = controlStability([100, 108, 101]);
  assert.equal(broad.stable, false);
  assert.equal(broad.reason, 'control-spread-exceeds-limit');
  const trend = controlStability([100, 101.5, 103]);
  assert.equal(trend.stable, false);
  assert.equal(trend.reason, 'monotonic-control-drift');
  assert.equal(controlStability([0, 1, 2]).stable, false);
});

test('Unknown telemetry never becomes evidence of nominal pressure', () => {
  const snapshot = (state) => ({ telemetry: { thermalState: state } });
  assert.equal(thermalIssue(snapshot('nominal'), true), null);
  assert.equal(thermalIssue(snapshot('fair'), false), 'thermal-pressure-fair');
  assert.equal(
    thermalIssue(snapshot('unavailable'), true),
    'thermal-pressure-unavailable',
  );
  assert.equal(thermalIssue(snapshot('unavailable'), false), null);
});

test('Rejected attempts stay outside paired summaries and small wins are never auto-approved', () => {
  const block = (accepted, reference, candidate) => ({
    accepted,
    block: 1,
    order: ['A', 'B', 'B', 'A'],
    samples: [
      { variant: 'A', meanMs: reference },
      { variant: 'B', meanMs: candidate },
      { variant: 'B', meanMs: candidate },
      { variant: 'A', meanMs: reference },
    ],
  });
  const result = summarizeBlocks([block(false, 100, 1), block(true, 100, 101)]);
  assert.equal(result.acceptedBlocks, 1);
  assert.equal(result.rejectedAttempts, 1);
  assert.equal(result.medianCandidateReferenceRatio, 1.01);
  assert.equal(result.referenceFasterBlocks, 1);
  assert.equal(result.candidateFasterBlocks, 0);
  assert.equal('approved' in result, false);
});
