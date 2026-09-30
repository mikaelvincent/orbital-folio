import test from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL;
if (
  !base ||
  !['localhost', '127.0.0.1'].includes(new URL(base).hostname) ||
  new URL(base).port === '3000'
)
  throw new Error(
    'Use an explicit disposable loopback TEST_BASE_URL, never the main development server.',
  );
const headers = {
  Cookie: '__sites_local_auth=1',
  Origin: base,
  'Content-Type': 'application/json',
};
const api = async (body) => {
  const response = await fetch(base + '/api/admin', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  return result;
};
test('saved entry uploads persist local ownership and stay private without publishing the parent', async () => {
  const created = [];
  try {
    const parent = await api({
      action: 'save',
      kind: 'journal',
      data: {
        title: 'Attachment owner test',
        slug: 'attachment-owner-' + Date.now(),
        body: 'Unchanged private body.',
        order: 1000,
      },
    });
    created.push(parent.id);
    const upload = (ownerId) => {
      const form = new FormData();
      form.set('ownerId', ownerId);
      form.set('alt', 'Synthetic test pixel');
      form.set(
        'file',
        new File(
          [
            Buffer.from(
              'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH3sAAAAASUVORK5CYII=',
              'base64',
            ),
          ],
          'pixel.png',
          { type: 'image/png' },
        ),
      );
      return fetch(base + '/api/admin/upload', {
        method: 'POST',
        headers: { Cookie: headers.Cookie, Origin: base },
        body: form,
      });
    };
    assert.equal((await upload('nonexistent-entry')).status, 400);
    const response = await upload(parent.id);
    assert.equal(response.status, 200);
    const result = await response.json();
    created.push(result.id);
    const records = (
      await (await fetch(base + '/api/admin', { headers })).json()
    ).records;
    const asset = records.find((row) => row.id === result.id);
    assert.equal(asset.draft.ownerId, parent.id);
    assert.equal(asset.published, null);
    assert.equal(
      records.find((row) => row.id === parent.id).draft.body,
      'Unchanged private body.',
    );
    assert.notEqual((await fetch(base + '/media/' + asset.id)).status, 200);
    const changed = await api({
      action: 'save',
      id: asset.id,
      revision: asset.revision,
      data: { ...asset.draft, alt: 'Edited local description' },
    });
    assert.equal(
      changed.records.find((row) => row.id === asset.id).draft.ownerId,
      parent.id,
    );
  } finally {
    for (const id of created.reverse()) {
      const records = (
        await (await fetch(base + '/api/admin', { headers })).json()
      ).records;
      const current = records.find((row) => row.id === id);
      if (current)
        await api({ action: 'delete', id, revision: current.revision });
    }
  }
});
