import test from 'node:test';
import assert from 'node:assert/strict';
import {
  requestedPortfolioView,
  resolvePortfolioView,
} from '../../features/portfolio/view-policy.ts';

await test('roomy home entries invite exploration; direct content entries prioritize reading', () => {
  assert.equal(resolvePortfolioView({ section: 'home' }), 'interactive');
  for (const section of [
    'projects',
    'experience',
    'about',
    'contact',
    'privacy',
  ])
    assert.equal(resolvePortfolioView({ section }), 'reading', section);
});

await test('compact space, reduced motion and reported data saving independently prefer Reading', () => {
  for (const preference of ['compact', 'reducedMotion', 'saveData']) {
    assert.equal(
      resolvePortfolioView({ section: 'home', [preference]: true }),
      'reading',
      preference,
    );
    assert.equal(
      resolvePortfolioView({ section: 'home', [preference]: false }),
      'interactive',
      preference,
    );
  }
});

await test('explicit choices override every soft default, including content entry and data saving', () => {
  for (const requested of ['interactive', 'reading'])
    for (const section of ['home', 'contact'])
      for (const compact of [false, true])
        for (const reducedMotion of [false, true])
          for (const saveData of [false, true])
            assert.equal(
              resolvePortfolioView({
                requested,
                section,
                compact,
                reducedMotion,
                saveData,
              }),
              requested,
            );
});

await test('missing and invalid view values use defaults; loader escape wins over Interactive', () => {
  for (const view of ['', 'unknown', 'READING']) {
    const params = new URLSearchParams({ view });
    assert.equal(requestedPortfolioView(params), undefined);
    assert.equal(
      resolvePortfolioView({
        requested: requestedPortfolioView(params),
        section: 'home',
      }),
      'interactive',
    );
  }
  assert.equal(requestedPortfolioView(new URLSearchParams()), undefined);
  for (const view of ['reading', 'interactive']) {
    const params = new URLSearchParams({ view });
    assert.equal(requestedPortfolioView(params), view);
    assert.equal(requestedPortfolioView(params, '#room-reader'), 'reading');
    assert.equal(requestedPortfolioView(params, '#chapter'), view);
  }
});
