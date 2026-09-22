import test from 'node:test';
import assert from 'node:assert/strict';

// This suite mutates identity settings and must run from the disposable checkout
// with fresh D1/R2 state described in docs/OPERATIONS.md#isolated-verification.
const base = process.env.TEST_BASE_URL;
if (base && !['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('About photo API tests require an isolated loopback server.');

test(
  'About portraits and icons preserve drafts, protect active PNG sources, retire social photos and round-trip through backups',
  {
    skip: !base && 'Set TEST_BASE_URL to the disposable verification server.',
  },
  async () => {
    const headers = { Cookie: '__sites_local_auth=1' };
    const request = (body) =>
      fetch(base + '/api/admin', {
        method: body ? 'POST' : 'GET',
        signal: AbortSignal.timeout(20000),
        headers: {
          ...headers,
          ...(body ? { Origin: base, 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const action = async (body, status = 200) => {
      const response = await request(body);
      const result = await response.json();
      assert.equal(response.status, status, JSON.stringify(result));
      return result;
    };
    const all = async () => (await action()).records;
    const fresh = async (id) =>
      (await all()).find((record) => record.id === id);
    const save = async (kind, data, old) => {
      const result = await action({
        action: 'save',
        kind,
        data,
        id: old?.id,
        revision: old?.revision,
      });
      return result.records.find((record) => record.id === result.id);
    };
    const mutate = (record, name, status = 200) =>
      action(
        { action: name, id: record.id, revision: record.revision },
        status,
      );
    const original = await fresh('site');
    let photo, alias, legacyPhoto, social, duplicate;
    try {
      const occupied = new Set(
        (await all())
          .filter((record) => record.kind === 'link')
          .map((record) => record.published?.aboutSlot),
      );
      const slot = ['left', 'center', 'right'].find(
        (position) => !occupied.has(position),
      );
      assert.ok(
        slot,
        'Disposable initial state leaves an About icon slot available.',
      );
      const svgForm = new FormData();
      svgForm.set(
        'file',
        new Blob(
          [
            '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h10v10z"/></svg>',
          ],
          { type: 'image/svg+xml' },
        ),
        'unconverted.svg',
      );
      svgForm.set('alt', 'Unconverted SVG fixture');
      const svgUpload = await fetch(base + '/api/admin/upload', {
        method: 'POST',
        headers: { ...headers, Origin: base },
        body: svgForm,
      });
      assert.equal(
        svgUpload.status,
        400,
        'Raw SVG cannot bypass the editor conversion by using the media endpoint.',
      );
      const form = new FormData();
      form.set(
        'file',
        new Blob(
          [
            Buffer.from(
              'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9x8AAAAASUVORK5CYII=',
              'base64',
            ),
          ],
          { type: 'image/png' },
        ),
        'about-verification.png',
      );
      form.set('alt', 'Temporary About photo verification image');
      const uploaded = await fetch(base + '/api/admin/upload', {
        method: 'POST',
        signal: AbortSignal.timeout(20000),
        headers: { ...headers, Origin: base },
        body: form,
      });
      const upload = await uploaded.json();
      assert.equal(uploaded.status, 200, JSON.stringify(upload));
      photo = await fresh(upload.id);
      assert.equal(photo.published, null);
      const privateAsset = await fetch(base + photo.draft.url);
      assert.equal(privateAsset.status, 404);
      const previewAsset = await fetch(base + photo.draft.url, { headers });
      assert.equal(previewAsset.status, 200);
      assert.equal(
        previewAsset.headers.get('cache-control'),
        'private, no-store',
      );

      // Portable/imported media metadata may retain another record's managed URL.
      // Publishing that metadata alone must not make its private source usable.
      alias = await save('media', {
        ...photo.draft,
        title: 'About imported image alias',
      });
      await mutate(alias, 'publish');
      alias = await fresh(alias.id);
      social = await save('link', {
        title: 'Private custom icon fixture',
        url: 'https://example.com/profile',
        platform: 'custom',
        screen: 'list',
        aboutSlot: slot,
        iconMediaId: alias.id,
      });
      await mutate(social, 'publish', 400);

      const crop = { x: 0.2, y: 0.8, zoom: 1.6 };
      const readingCrop = { x: 0.75, y: 0.3, zoom: 2 };
      let site = await save(
        'site',
        {
          ...original.draft,
          portraitMediaId: alias.id,
          portraitCrop: crop,
          portraitReadingCrop: readingCrop,
        },
        original,
      );
      await mutate(site, 'publish', 400);
      await mutate(photo, 'publish');
      photo = await fresh(photo.id);
      await mutate(site, 'publish');
      site = await fresh('site');
      assert.deepEqual(site.published.portraitCrop, crop);
      assert.deepEqual(site.published.portraitReadingCrop, readingCrop);
      assert.equal((await fetch(base + photo.draft.url)).status, 200);
      await mutate(photo, 'unpublish', 409);
      await mutate(photo, 'delete', 409);
      await mutate(alias, 'delete', 409);

      photo = await save('media', { ...photo.draft, mime: 'video/mp4' }, photo);
      await mutate(photo, 'publish', 400);
      assert.equal(photo.published.mime, 'image/png');
      photo = await save('media', { ...photo.draft, mime: 'image/png' }, photo);

      legacyPhoto = await save('media', {
        title: 'Retired social photo fixture',
        alt: 'Unused historical photo',
        mime: 'image/jpeg',
        url: 'https://example.com/retired-photo.jpg',
      });
      await mutate(legacyPhoto, 'publish');
      legacyPhoto = await fresh(legacyPhoto.id);
      const linkData = {
        title: 'About API fixture',
        url: 'https://example.com/profile',
        platform: 'custom',
        screen: 'list',
        aboutSlot: slot,
        iconMediaId: alias.id,
        photoMediaId: legacyPhoto.id,
        photoCrop: crop,
      };
      social = await save('link', linkData, social);
      duplicate = await save('link', {
        ...linkData,
        title: 'Occupied About slot fixture',
      });
      const contenders = [social, duplicate];
      const publications = await Promise.all(
        contenders.map(async (record) => {
          const response = await request({
            action: 'publish',
            id: record.id,
            revision: record.revision,
          });
          return {
            id: record.id,
            status: response.status,
            data: await response.json(),
          };
        }),
      );
      assert.deepEqual(
        publications.map((result) => result.status).sort((a, b) => a - b),
        [200, 409],
        'Two simultaneous publications cannot claim one About position.',
      );
      social = await fresh(
        publications.find((result) => result.status === 200).id,
      );
      duplicate = await fresh(
        publications.find((result) => result.status === 409).id,
      );
      assert.deepEqual(social.published, social.draft);
      await mutate(duplicate, 'publish', 409);
      await mutate(legacyPhoto, 'unpublish');
      legacyPhoto = await fresh(legacyPhoto.id);
      await mutate(legacyPhoto, 'delete');
      legacyPhoto = undefined;

      const backupResponse = await fetch(base + '/api/admin/export', {
        headers,
      });
      assert.equal(backupResponse.status, 200);
      const backup = await backupResponse.json();
      const selected = backup.records.filter((record) =>
        ['site', social.id].includes(record.id),
      );
      await action({
        action: 'import',
        payload: { format: backup.format, records: selected },
      });
      site = await fresh('site');
      social = await fresh(social.id);
      assert.deepEqual(site.draft.portraitCrop, crop);
      assert.deepEqual(site.draft.portraitReadingCrop, readingCrop);
      assert.deepEqual(social.draft.photoCrop, crop);
      assert.equal(social.draft.aboutSlot, slot);
      assert.equal(social.published.iconMediaId, alias.id);
      assert.equal(
        social.published.photoMediaId,
        linkData.photoMediaId,
        'Retired photo metadata stays portable even after unused media is removed.',
      );

      site = await save('site', { ...site.draft, portraitMediaId: '' }, site);
      social = await save(
        'link',
        { ...social.draft, aboutSlot: 'off' },
        social,
      );
      await mutate(photo, 'unpublish', 409);
      await mutate(site, 'publish');
      // The published custom icon still protects both alias and uploaded source.
      await mutate(photo, 'unpublish', 409);
      await mutate(alias, 'delete', 409);
      for (const mime of ['image/jpeg', 'image/svg+xml', 'video/mp4']) {
        photo = await save('media', { ...photo.draft, mime }, photo);
        await mutate(photo, 'publish', 400);
      }
      photo = await save('media', { ...photo.draft, mime: 'image/png' }, photo);
      await mutate(social, 'publish');
      social = await fresh(social.id);
      await mutate(photo, 'unpublish');
      photo = await fresh(photo.id);
      assert.equal((await fetch(base + photo.draft.url)).status, 404);
    } finally {
      // Restore only this isolated fixture's identity; never run against owner data.
      let site = await fresh('site');
      site = await save('site', original.published, site);
      await mutate(site, 'publish');
      site = await fresh('site');
      await save('site', original.draft, site);
      for (const created of [duplicate, social, legacyPhoto, alias, photo]) {
        if (!created) continue;
        const current = await fresh(created.id);
        if (current) await mutate(current, 'delete');
      }
    }
  },
);
