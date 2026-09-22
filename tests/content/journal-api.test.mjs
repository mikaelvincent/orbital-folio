import test from 'node:test';
import assert from 'node:assert/strict';

// This mutating test is run only against the disposable verification checkout.
const base = process.env.TEST_BASE_URL;
if (base && !['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('Journal API tests require an isolated loopback server.');

test(
  'journal Markdown publishing rejects private media and preserves live dependencies until the replacement chapter publishes',
  { skip: !base && 'Set TEST_BASE_URL to the disposable verification server.' },
  async () => {
    const action = async (body, expected = 200) => {
      const response = await fetch(base + '/api/admin', {
        method: body ? 'POST' : 'GET',
        signal: AbortSignal.timeout(20000),
        headers: {
          Cookie: '__sites_local_auth=1',
          ...(body ? { Origin: base, 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const result = await response.json();
      assert.equal(response.status, expected, JSON.stringify(result));
      return result;
    };
    const refresh = async (record) =>
      (await action()).records.find((item) => item.id === record.id);
    const save = async (kind, data, record) => {
      const result = await action({
        action: 'save',
        kind,
        data,
        id: record?.id,
        revision: record?.revision,
      });
      return result.records.find((item) => item.id === result.id);
    };
    const mutate = (record, name, expected = 200) =>
      action(
        { action: name, id: record.id, revision: record.revision },
        expected,
      );
    let chapter;
    let image;
    try {
      image = await save('media', {
        title: 'Notebook publication fixture',
        alt: 'A temporary journal fixture',
        url: 'https://example.com/journal-test.png',
        mime: 'image/png',
      });
      const content = {
        title: 'University life',
        slug: `journal-integration-${Date.now()}`,
        subtitle: 'A private test chapter',
        body: `    preserve this indentation\n\n![Campus](/media/${image.id})\n`,
        order: 2,
        sample: false,
      };
      chapter = await save('journal', content);
      assert.equal(chapter.published, null);
      assert.equal(chapter.draft.body, content.body);
      await mutate(chapter, 'publish', 400);
      await mutate(image, 'publish');
      image = await refresh(image);
      await mutate(chapter, 'publish');
      chapter = await refresh(chapter);
      assert.deepEqual(chapter.published, content);
      await mutate(image, 'unpublish', 409);
      await mutate(image, 'delete', 409);
      chapter = await save(
        'journal',
        { ...content, body: 'A new private revision.' },
        chapter,
      );
      assert.equal(chapter.published.body, content.body);
      await mutate(image, 'unpublish', 409);
      await mutate(chapter, 'publish');
      chapter = await refresh(chapter);
      await mutate(image, 'unpublish');
      image = await refresh(image);
    } finally {
      for (const created of [chapter, image]) {
        if (!created) continue;
        const current = await refresh(created);
        if (current) await mutate(current, 'delete');
      }
    }
  },
);
