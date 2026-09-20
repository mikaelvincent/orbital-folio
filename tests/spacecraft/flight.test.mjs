import test from 'node:test';
import assert from 'node:assert/strict';
import {
  destinationFromURL,
  flightEase,
  cursorTranslation,
  cursorRotation,
  damping,
} from '../../features/spacecraft/navigation/flight.ts';
import { pageMetadata } from '../../lib/metadata.ts';

test('Flight destinations preserve public and private readable URLs', () => {
  const url = (path) => new URL(path, 'https://portfolio.example');
  assert.equal(destinationFromURL(url('/')).section, 'home');
  assert.equal(destinationFromURL(url('/projects/relay')).slug, 'relay');
  assert.equal(destinationFromURL(url('/contact?sent=1')).sent, true);
  assert.equal(destinationFromURL(url('/contact?sent=1')).open, true);
  assert.equal(destinationFromURL(url('/?open=1')).open, false);
  assert.equal(destinationFromURL(url('/projects?open=1')).open, true);
  assert.equal(destinationFromURL(url('/admin')), null);
  assert.equal(destinationFromURL(url('/experience/missing')), null);
  assert.equal(destinationFromURL(url('/projects/one/two')), null);
  assert.equal(
    destinationFromURL(url('/admin/preview?section=projects&slug=draft'), true)
      .slug,
    'draft',
  );
  assert.equal(destinationFromURL(url('/projects/relay'), true), null);
  assert.equal(
    destinationFromURL(url('/admin/preview?section=projects&id=p1'), true, [
      { id: 'p1', slug: 'private-draft' },
    ]).slug,
    'private-draft',
  );
  assert.equal(
    destinationFromURL(
      url('/admin/preview?section=projects&id=missing'),
      true,
      [],
    ),
    null,
  );
});

test('Fixed flights ease continuously and pointer translations stay bounded', () => {
  let previous = 0;
  for (let step = 0; step <= 100; step++) {
    const value = flightEase(step / 100);
    assert.ok(value >= previous && value >= 0 && value <= 1);
    previous = value;
  }
  assert.equal(flightEase(-1), 0);
  assert.equal(flightEase(2), 1);
  assert.ok(flightEase(0.001) < 0.000001);
  assert.deepEqual(cursorTranslation(999, -999, false), [0.16, -0.1]);
  assert.deepEqual(cursorTranslation(1, 1, true), [0, 0]);
});

test('In-place navigation and server rendering share editable metadata', () => {
  const data = {
    site: {
      name: 'Sample Owner',
      domain: 'https://sample.example',
      seoTitle: 'Editable home title',
      seoDescription: 'Home summary',
      projectsLabel: 'Work',
      projectsIntro: 'Work summary',
      sampleMode: true,
    },
    media: [],
  };
  const home = pageMetadata(data, 'home');
  assert.equal(home.title, 'Editable home title');
  assert.equal(home.alternates.canonical, 'https://sample.example');
  const dossier = pageMetadata(data, 'projects', {
    slug: 'demo',
    seoTitle: 'Custom dossier title',
    seoDescription: 'Custom search summary',
  });
  assert.equal(dossier.title, 'Custom dossier title');
  assert.equal(dossier.openGraph.description, 'Custom search summary');
  assert.equal(dossier.openGraph.url, 'https://sample.example/projects/demo');
  assert.equal(dossier.robots.index, false);
});

// Refresh rates must produce the same damped pose over the same real duration.
test('Cursor rotation stays bounded and damping is independent of refresh rate', () => {
  assert.deepEqual(cursorRotation(999, -999, false), [-0.025, 0.045]);
  assert.deepEqual(cursorRotation(1, 1, true), [0, 0]);
  const simulate = (hz) => {
    let value = 0;
    for (let i = 0; i < hz; i++) value += (1 - value) * damping(1 / hz);
    return value;
  };
  assert.ok(Math.abs(simulate(30) - simulate(120)) < 1e-12);
  assert.equal(damping(0), 0);
  assert.equal(
    destinationFromURL(new URL('https://example.com/about?open=1')).open,
    true,
  );
});
