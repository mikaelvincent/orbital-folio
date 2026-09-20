import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, unzipSync, strToU8 } from 'fflate';

const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('Project package tests require a local database.');
const cookie = '__sites_local_auth=1';
const req = (path, init = {}, admin = false) =>
  fetch(base + path, {
    ...init,
    signal: AbortSignal.timeout(20000),
    headers: { ...(admin ? { Cookie: cookie } : {}), ...init.headers },
  });
const records = async () => {
  const response = await req('/api/admin', {}, true);
  assert.equal(
    response.status,
    200,
    'Local owner access must already be configured.',
  );
  return (await response.json()).records;
};
const action = (body) =>
  req(
    '/api/admin',
    {
      method: 'POST',
      headers: { Origin: base, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    true,
  );
const png = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1cAAAAASUVORK5CYII=',
    'base64',
  ),
);
const mp4 = new Uint8Array(32);
mp4.set([0, 0, 0, 32]);
mp4.set(strToU8('ftypisom'), 4);
const vtt = strToU8('WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nA demo.\n');

test('project ZIP routes keep drafts private, reject collisions, export bytes and publish only explicit media', async () => {
  await records();
  const marker = `package-integration-${Date.now()}`;
  const archive = zipSync({
    'project.md': strToU8(
      `---\nformat: orbital-project/v1\ntitle: Package integration fixture\nslug: ${marker}\nsummary: Temporary package test\ncategories: [systems]\ncover: assets/cover.png\nmedia:\n  - path: assets/cover.png\n    alt: Test cover\n  - path: assets/demo.mp4\n    alt: Test video\n    poster: assets/cover.png\n    captions: assets/demo.vtt\n  - path: assets/demo.vtt\n    alt: Test captions\n---\n\n![Cover](assets/cover.png)\n\n[Demo](assets/demo.mp4)\n`,
    ),
    'assets/cover.png': png,
    'assets/demo.mp4': mp4,
    'assets/demo.vtt': vtt,
  });
  const packageForm = () => {
    const form = new FormData();
    form.set(
      'file',
      new File([archive], 'project.zip', { type: 'application/zip' }),
    );
    return form;
  };
  const ids = new Set();
  let projectId;
  try {
    assert.equal(
      (
        await req('/api/admin/projects/import', {
          method: 'POST',
          headers: { Origin: base },
          body: packageForm(),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await req(
          '/api/admin/projects/import',
          {
            method: 'POST',
            headers: { Origin: 'https://other.example' },
            body: packageForm(),
          },
          true,
        )
      ).status,
      403,
    );
    const imported = await req(
      '/api/admin/projects/import',
      { method: 'POST', headers: { Origin: base }, body: packageForm() },
      true,
    );
    const importedData = await imported.json();
    assert.equal(imported.status, 200, JSON.stringify(importedData));
    projectId = importedData.id;
    ids.add(projectId);
    const project = importedData.records.find((r) => r.id === projectId);
    assert.equal(project.published, null);
    const mediaIds = [
      ...project.draft.body.matchAll(/\/media\/([a-zA-Z0-9-]+)/g),
    ].map((m) => m[1]);
    const video = importedData.records.find(
      (r) =>
        r.id ===
        mediaIds.find(
          (id) =>
            importedData.records.find((r) => r.id === id)?.draft.mime ===
            'video/mp4',
        ),
    );
    const ownedMedia = [
      project.draft.mediaId,
      video.id,
      video.draft.captionsMediaId,
    ];
    ownedMedia.forEach((id) => ids.add(id));
    for (const id of ownedMedia) {
      assert.equal((await req('/media/' + id)).status, 404);
      assert.equal((await req('/media/' + id, {}, true)).status, 200);
    }
    assert.equal((await req('/projects/' + marker)).status, 404);
    assert.equal(
      (await req(`/api/admin/projects/${projectId}/export`)).status,
      403,
    );
    const exported = await req(
      `/api/admin/projects/${projectId}/export`,
      {},
      true,
    );
    assert.equal(exported.status, 200);
    assert.equal(exported.headers.get('cache-control'), 'private, no-store');
    const files = unzipSync(new Uint8Array(await exported.arrayBuffer()));
    assert.ok(files['project.md']);
    assert.deepEqual(files[`assets/${video.id}.mp4`], mp4);
    const collision = await req(
      '/api/admin/projects/import',
      { method: 'POST', headers: { Origin: base }, body: packageForm() },
      true,
    );
    assert.equal(collision.status, 409);
    assert.equal(
      (await records()).filter(
        (r) => r.kind === 'project' && r.draft.slug === marker,
      ).length,
      1,
    );
    const publishBeforeAssets = await action({
      action: 'publish',
      id: projectId,
      revision: project.revision,
    });
    assert.equal(publishBeforeAssets.status, 400);
    // Publishing the video before its metadata dependencies must also fail.
    assert.equal(
      (
        await action({
          action: 'publish',
          id: video.id,
          revision: video.revision,
        })
      ).status,
      400,
    );
    for (const id of [
      project.draft.mediaId,
      video.draft.captionsMediaId,
      video.id,
      projectId,
    ]) {
      const current = (await records()).find((r) => r.id === id);
      const response = await action({
        action: 'publish',
        id,
        revision: current.revision,
      });
      assert.equal(response.status, 200, await response.text());
    }
    assert.equal((await req('/projects/' + marker)).status, 200);
    const partial = await req('/media/' + video.id, {
      headers: { Range: 'bytes=4-11' },
    });
    assert.equal(partial.status, 206);
    assert.equal(partial.headers.get('content-range'), 'bytes 4-11/32');
    // The Vite development bridge can convert streams to chunked transfer.
    if (partial.headers.has('content-length'))
      assert.equal(partial.headers.get('content-length'), '8');
    assert.equal(partial.headers.get('content-type'), 'video/mp4');
    assert.deepEqual(
      new Uint8Array(await partial.arrayBuffer()),
      mp4.subarray(4, 12),
    );
    const suffix = await req('/media/' + video.id, {
      headers: { Range: 'bytes=-4' },
    });
    assert.equal(suffix.status, 206);
    assert.deepEqual(
      new Uint8Array(await suffix.arrayBuffer()),
      mp4.subarray(28),
    );
    const head = await req('/media/' + video.id, { method: 'HEAD' });
    assert.equal(head.status, 200);
    if (head.headers.has('content-length'))
      assert.equal(head.headers.get('content-length'), '32');
    assert.equal(await head.text(), '');
    assert.equal(
      (
        await req('/media/' + video.id, {
          headers: { Range: 'bytes=999-1000' },
        })
      ).status,
      416,
    );
    const cover = (await records()).find((r) => r.id === project.draft.mediaId);
    assert.equal(
      (
        await action({
          action: 'unpublish',
          id: cover.id,
          revision: cover.revision,
        })
      ).status,
      409,
    );
    const privateForm = new FormData();
    privateForm.set(
      'file',
      new File([png], 'unrelated.png', { type: 'image/png' }),
    );
    privateForm.set('alt', 'Temporary unrelated private fixture');
    const privateUpload = await req(
      '/api/admin/upload',
      { method: 'POST', headers: { Origin: base }, body: privateForm },
      true,
    );
    const privateData = await privateUpload.json();
    assert.equal(privateUpload.status, 200, JSON.stringify(privateData));
    ids.add(privateData.id);
    assert.equal((await req('/media/' + privateData.id)).status, 404);
  } finally {
    // Only IDs returned by this test are touched. Unpublish/delete dependants
    // before their shared image/caption assets; preserve every existing record.
    const ordered = [...ids].sort((a, b) =>
      a === projectId ? -1 : b === projectId ? 1 : 0,
    );
    for (let pass = 0; pass < 3 && ids.size; pass++) {
      for (const id of ordered) {
        if (!ids.has(id)) continue;
        const current = (await records()).find((r) => r.id === id);
        if (!current) {
          ids.delete(id);
          continue;
        }
        const response = await action({
          action: 'delete',
          id,
          revision: current.revision,
        });
        if (response.ok) ids.delete(id);
      }
    }
    assert.equal(
      ids.size,
      0,
      'All temporary project/media fixtures must be removed.',
    );
  }
});
