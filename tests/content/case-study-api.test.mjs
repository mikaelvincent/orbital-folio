import test from 'node:test';
import assert from 'node:assert/strict';

// Mutating coverage runs only under the disposable verification procedure.
const base = process.env.TEST_BASE_URL;
if (base && !['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('Case study API tests require an isolated loopback server.');

test(
  'case studies publish explicitly, reject private media and protect assets referenced by the published story',
  {
    skip: !base && 'Set TEST_BASE_URL to the disposable verification server.',
  },
  async () => {
    const request = (body) =>
      fetch(base + '/api/admin', {
        method: body ? 'POST' : 'GET',
        signal: AbortSignal.timeout(20000),
        headers: {
          Cookie: '__sites_local_auth=1',
          ...(body ? { Origin: base, 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const action = async (body, expected = 200) => {
      const response = await request(body);
      const result = await response.json();
      assert.equal(response.status, expected, JSON.stringify(result));
      return result;
    };
    const all = async () => (await action()).records;
    const saved = async (kind, data, old) => {
      const result = await action({
        action: 'save',
        kind,
        data,
        id: old?.id,
        revision: old?.revision,
      });
      return result.records.find((record) => record.id === result.id);
    };
    const mutate = (record, actionName, expected = 200) =>
      action(
        {
          action: actionName,
          id: record.id,
          revision: record.revision,
        },
        expected,
      );
    const refresh = async (record) =>
      (await all()).find((item) => item.id === record.id);
    let study;
    let image;
    try {
      image = await saved('media', {
        title: 'Case study integration image',
        alt: 'Temporary verification fixture',
        url: 'https://example.com/case-study-test.png',
        mime: 'image/png',
      });
      const content = {
        title: 'Case study publication fixture',
        slug: `case-study-integration-${Date.now()}`,
        summary: 'Temporary verification story.',
        categories: ['product', 'systems'],
        body: `## Evidence\n\n![Evidence](/media/${image.id})\n`,
        organization: 'Test team',
        period: 'Test period',
      };
      study = await saved('experience', content);
      assert.equal(study.published, null);
      assert.equal(study.draft.body, content.body);
      await mutate(study, 'publish', 400);
      await mutate(image, 'publish');
      image = await refresh(image);
      await mutate(study, 'publish');
      study = await refresh(study);
      assert.equal(study.published.body, content.body);
      await mutate(image, 'unpublish', 409);
      await mutate(image, 'delete', 409);

      study = await saved(
        'experience',
        { ...content, body: '## Results\n\nA new private revision.' },
        study,
      );
      await mutate(image, 'unpublish', 409);
      assert.equal(
        study.published.body,
        content.body,
        'saving a draft preserves the published reference',
      );
      await mutate(study, 'publish');
      study = await refresh(study);
      await mutate(image, 'unpublish');
      image = await refresh(image);
    } finally {
      // Delete only records this test created, never seed or owner content.
      for (const created of [study, image]) {
        if (!created) continue;
        const current = await refresh(created);
        if (current) await mutate(current, 'delete');
      }
    }
  },
);
