import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inferSocialPlatform,
  isSocialDestination,
  resolveSocialScreens,
  socialLinkDraft,
} from '../lib/social-links.ts';
import {
  beginBoundedDrag,
  updateBoundedDrag,
  endBoundedDrag,
} from '../lib/scene-controls.ts';

const item = (id, extra = {}) => ({
  id,
  title: id,
  url: 'https://example.com/profile',
  order: 0,
  ...extra,
});
test('Legacy links infer exact known hosts and fill only unassigned console screens', () => {
  const result = resolveSocialScreens([
    item('one', { url: 'https://github.com/name', order: 1 }),
    item('two', { order: 2 }),
    item('three', { screen: 'left', order: 99 }),
  ]);
  assert.equal(result.left.id, 'three');
  assert.equal(result.right.id, 'one');
  assert.equal(result.right.platform, 'github');
  assert.equal(
    inferSocialPlatform('https://www.linkedin.com/in/name'),
    'linkedin',
  );
  assert.equal(
    inferSocialPlatform('https://github.com.evil.example/name'),
    'custom',
  );
  assert.equal(inferSocialPlatform('https://example.com/github.com'), 'custom');
});
test('Explicit duplicate, list-only, custom and empty channels resolve predictably', () => {
  const result = resolveSocialScreens([
    item('late', { screen: 'left', order: 5 }),
    item('chosen', {
      screen: 'left',
      platform: 'custom',
      title: 'My community',
      order: 1,
    }),
    item('list', { screen: 'list', order: 0 }),
  ]);
  assert.equal(result.left.id, 'chosen');
  assert.equal(result.left.platform, 'custom');
  assert.equal(result.right, null);
  assert.deepEqual(resolveSocialScreens([]), { left: null, right: null });
  const draft = socialLinkDraft({
    title: 'GitHub',
    url: 'https://github.com/name',
    order: 0,
  });
  assert.equal(draft.platform, 'github');
  assert.equal(draft.screen, 'auto');
  assert.equal(draft.url, 'https://github.com/name');
});
test('Published content cannot turn a console link into a script or credentialed URL', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,test',
    'http://example.com',
    'https://user:password@example.com',
    '/relative',
    'not a URL',
  ]) {
    assert.equal(isSocialDestination(url), false, url);
    assert.deepEqual(resolveSocialScreens([item('bad', { url })]), {
      left: null,
      right: null,
    });
  }
  assert.equal(isSocialDestination('https://example.com/me?q=1#hello'), true);
  assert.equal(isSocialDestination('mailto:hello@example.com'), true);
});
test('Tapping a social screen activates; dragging out and back or changing screen does not', () => {
  const start = () =>
    beginBoundedDrag({
      pointerId: 1,
      x: 100,
      y: 100,
      response: [0, 0],
      sensitivity: 4,
      width: 400,
      height: 800,
      targetKey: 'social:left:github',
    });
  assert.equal(
    endBoundedDrag(start(), 1, 101, 101, 'social:left:github').activate,
    true,
  );
  let drag = updateBoundedDrag(start(), 1, 220, 180);
  drag = updateBoundedDrag(drag, 1, 100, 100);
  assert.equal(
    endBoundedDrag(drag, 1, 100, 100, 'social:left:github').activate,
    false,
  );
  assert.equal(
    endBoundedDrag(start(), 1, 100, 100, 'social:right:linkedin').activate,
    false,
  );
});

test('Social configuration persists through draft, publish, edit and unpublish', async () => {
  const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
  assert.ok(
    ['localhost', '127.0.0.1'].includes(new URL(base).hostname),
    'Local test database only',
  );
  const headers = {
    Cookie: '__sites_local_auth=1',
    Origin: base,
    'Content-Type': 'application/json',
  };
  let id;
  const api = async (body, expected = 200) => {
    const response = await fetch(base + '/api/admin', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const result = await response.json();
    assert.equal(response.status, expected, JSON.stringify(result));
    return result;
  };
  const data = {
    title: 'Channel test',
    url: 'https://example.com/test',
    platform: 'github',
    screen: 'list',
    description: 'Temporary local test',
    order: 900,
  };
  try {
    for (const changes of [
      { platform: 'unknown' },
      { screen: 'roof' },
      { description: 'a'.repeat(65) },
      { url: 'javascript:alert(1)' },
    ])
      await api(
        { action: 'save', kind: 'link', data: { ...data, ...changes } },
        400,
      );
    let result = await api({ action: 'save', kind: 'link', data });
    id = result.id;
    let record = result.records.find((r) => r.id === id);
    assert.deepEqual(record.draft, data);
    assert.equal(record.published, null);
    result = await api({ action: 'publish', id, revision: record.revision });
    record = result.records.find((r) => r.id === id);
    assert.deepEqual(record.published, data);
    const custom = {
      ...data,
      title: 'My community',
      platform: 'custom',
      url: 'https://example.com/community',
      description: 'Discuss & build',
    };
    result = await api({
      action: 'save',
      id,
      revision: record.revision,
      data: custom,
    });
    record = result.records.find((r) => r.id === id);
    assert.equal(record.draft.platform, 'custom');
    assert.equal(
      record.published.platform,
      'github',
      'A draft must not change the live channel',
    );
    result = await api({ action: 'publish', id, revision: record.revision });
    record = result.records.find((r) => r.id === id);
    assert.deepEqual(record.published, custom);
    result = await api({ action: 'unpublish', id, revision: record.revision });
    assert.equal(result.records.find((r) => r.id === id).published, null);
  } finally {
    if (id) {
      const response = await fetch(base + '/api/admin', { headers });
      const record = (await response.json()).records.find((r) => r.id === id);
      if (record)
        await api({ action: 'delete', id, revision: record.revision });
    }
  }
});
