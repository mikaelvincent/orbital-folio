import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error(
    'These mutating tests are restricted to a local development database.',
  );
let cookie = '';
const created = [];
const req = (path, options = {}) => fetch(base + path, options);
const authorized = (path, options = {}) =>
  req(path, { ...options, headers: { Cookie: cookie, ...options.headers } });
async function api(payload, expected = 200) {
  const r = await authorized('/api/admin', {
    method: 'POST',
    headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const b = await r.json();
  assert.equal(r.status, expected, JSON.stringify(b));
  return b;
}
async function records() {
  const r = await authorized('/api/admin');
  assert.equal(r.status, 200);
  return (await r.json()).records;
}
async function record(id) {
  return (await records()).find((r) => r.id === id);
}
async function save(r, data) {
  return api({
    action: 'save',
    id: r.id,
    revision: r.revision,
    data,
    kind: r.kind,
  });
}
async function publish(id) {
  const r = await record(id);
  return api({ action: 'publish', id, revision: r.revision });
}
async function restore(r) {
  let current = await record(r.id);
  if (!current) return;
  if (r.published) {
    await save(current, r.published);
    await publish(r.id);
  } else if (current.published) {
    await api({ action: 'unpublish', id: r.id, revision: current.revision });
  }
  current = await record(r.id);
  if (JSON.stringify(current.draft) !== JSON.stringify(r.draft))
    await save(current, r.draft);
}
async function create(kind, data) {
  const b = await api({ action: 'save', kind, data });
  created.push(b.id);
  return b.id;
}
await test('Persistent portfolio workflows and security boundaries', async (t) => {
  await t.test(
    'anonymous and forged identities cannot read or mutate the studio',
    async () => {
      assert.equal((await req('/api/admin')).status, 403);
      assert.equal((await req('/api/admin/export')).status, 403);
      assert.equal(
        (
          await req('/api/admin', {
            headers: {
              'oai-authenticated-user-id': 'local_seedy',
              'oai-authenticated-user-email': 'seedy@sites.test',
            },
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await req('/api/admin', {
            method: 'POST',
            headers: { Origin: base, 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id: 'site' }),
          })
        ).status,
        403,
      );
      const p = await req('/admin/preview?section=home', {
        redirect: 'manual',
      });
      assert.ok([302, 303, 307, 308].includes(p.status));
    },
  );
  await t.test(
    'local SIWC sign-in and first-owner claim work without a default password',
    async () => {
      const r = await req('/signin-with-chatgpt?return_to=/admin', {
        redirect: 'manual',
      });
      assert.equal(r.status, 302);
      const set = r.headers.get('set-cookie');
      assert.match(set, /HttpOnly/);
      assert.match(set, /SameSite=Lax/);
      cookie = set.split(';')[0];
      const access = await authorized('/api/admin');
      if (access.status !== 200) {
        const key = fs
          .readFileSync('.dev.vars', 'utf8')
          .match(/^ADMIN_SETUP_KEY=(.+)$/m)?.[1];
        assert.ok(key);
        const setup = await authorized('/api/admin/setup', {
          method: 'POST',
          headers: { Origin: base, 'Content-Type': 'application/json' },
          body: JSON.stringify({ key }),
        });
        assert.equal(setup.status, 200, await setup.text());
      }
      assert.equal((await authorized('/api/admin')).status, 200);
    },
  );
  await t.test(
    'CSRF, malformed bodies, and immutable site protection reject safely',
    async () => {
      const r = await authorized('/api/admin', {
        method: 'POST',
        headers: {
          Origin: 'https://attacker.example',
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      assert.equal(r.status, 403);
      assert.equal(
        (
          await authorized('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
          })
        ).status,
        403,
      );
      await api(
        {
          action: 'delete',
          id: 'site',
          revision: (await record('site')).revision,
        },
        400,
      );
      await api(
        { action: 'save', kind: 'project', data: { title: 'Missing slug' } },
        400,
      );
      await api(
        {
          action: 'save',
          kind: 'link',
          data: { title: 'Unsafe', url: 'javascript:alert(1)', order: 0 },
        },
        400,
      );
      await api(
        {
          action: 'save',
          kind: 'link',
          data: { title: 'Empty', url: '', order: 0 },
        },
        400,
      );
      const huge = await authorized('/api/admin', {
        method: 'POST',
        headers: { Origin: base, 'Content-Type': 'application/json' },
        body: JSON.stringify({ oversize: 'x'.repeat(2000100) }),
      });
      assert.equal(huge.status, 413);
    },
  );
  const baseline = await records();
  try {
    await t.test(
      'published snapshots stay stable while drafts change; optimistic conflicts reject',
      async () => {
        const original = baseline.find(
          (r) => r.kind === 'project' && r.published,
        );
        const draft = {
          ...original.draft,
          title: 'PRIVATE DRAFT — DO NOT LEAK',
          slug: 'private-draft-test',
        };
        await save(original, draft);
        const live = await (
          await req('/projects/' + original.published.slug)
        ).text();
        assert.ok(live.includes(original.published.title));
        assert.ok(!live.includes(draft.title));
        assert.equal((await req('/projects/private-draft-test')).status, 404);
        assert.ok(
          !(await (await req('/sitemap.xml')).text()).includes(
            'private-draft-test',
          ),
        );
        const preview = await authorized(
          '/admin/preview?section=projects&id=' + original.id,
        );
        const html = await preview.text();
        assert.equal(preview.status, 200);
        assert.ok(html.includes(draft.title));
        assert.match(preview.headers.get('x-robots-tag'), /noindex/);
        await api(
          {
            action: 'save',
            id: original.id,
            revision: original.revision,
            kind: original.kind,
            data: draft,
          },
          409,
        );
        await publish(original.id);
        assert.equal((await req('/projects/private-draft-test')).status, 200);
        assert.equal(
          (await req('/projects/' + original.published.slug)).status,
          404,
        );
        const current = await record(original.id);
        await api({
          action: 'unpublish',
          id: current.id,
          revision: current.revision,
        });
        assert.equal((await req('/projects/private-draft-test')).status, 404);
        await restore(original);
      },
    );
    await t.test(
      'collections grow beyond scene capacity, order correctly, and reject concurrent slug collisions',
      async () => {
        const template = baseline.find(
          (r) => r.kind === 'project' && r.published,
        ).draft;
        const fourth = await create('project', {
          ...template,
          title: 'Fourth capacity sample',
          slug: 'fourth-capacity',
          order: -20,
        });
        const fifth = await create('project', {
          ...template,
          title: 'Fifth capacity sample',
          slug: 'fifth-capacity',
          order: -10,
        });
        await publish(fourth);
        await publish(fifth);
        const html = await (await req('/projects')).text();
        assert.ok(html.includes('Fourth capacity sample'));
        assert.ok(html.includes('Fifth capacity sample'));
        assert.ok(
          html.indexOf('Fourth capacity sample') <
            html.indexOf('Fifth capacity sample'),
        );
        const payload = {
          action: 'save',
          kind: 'project',
          data: {
            ...template,
            title: 'Concurrency sample',
            slug: 'concurrent-route',
          },
        };
        const result = await Promise.all(
          [1, 2].map(() =>
            authorized('/api/admin', {
              method: 'POST',
              headers: { Origin: base, 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }),
          ),
        );
        for (const r of result) {
          const b = await r.json();
          if (b.id) created.push(b.id);
        }
        assert.deepEqual(
          result.map((r) => r.status).sort((a, b) => a - b),
          [200, 409],
        );
        const preview = await (
          await authorized('/admin/preview?section=projects')
        ).text();
        assert.ok(
          preview.includes(
            '/admin/preview?section=projects&amp;slug=concurrent-route',
          ),
        );
      },
    );
    await t.test(
      'another owner can replace every site field through the authenticated content interface',
      async () => {
        const original = baseline.find((r) => r.id === 'site');
        const replacement = {};
        for (const [k, v] of Object.entries(original.draft))
          replacement[k] = typeof v === 'string' ? 'Aster copy for ' + k : v;
        Object.assign(replacement, {
          name: 'Rowan Aster',
          initials: 'RA',
          domain: 'https://rowan.example.com',
          email: 'hello@rowan.example.com',
          accent: '#80d7de',
          language: 'en',
          seoImageId: '',
          portraitMediaId: '',
          headline: 'A different owner.\nA different story.',
          seoTitle: 'Rowan Aster — Sample portfolio',
          sampleMode: true,
        });
        await api({
          action: 'import',
          payload: {
            format: 'orbital-folio/v1',
            records: [{ ...original, draft: replacement }],
          },
        });
        const privateData = await record('site');
        assert.deepEqual(privateData.draft, replacement);
        assert.ok(
          (await (await req('/')).text()).includes(original.published.name),
        );
        await publish('site');
        const home = await (await req('/')).text();
        assert.ok(home.includes('Rowan Aster'));
        assert.ok(!home.includes('Mikael Vincent'));
        assert.ok(home.includes('rowan.example.com'));
        assert.ok(home.includes('Aster copy for projectsLabel'));
        assert.ok(home.includes('Aster copy for sceneHelp'));
        assert.ok(home.includes('#80d7de'));
        const missing = await (await req('/missing-test-route')).text();
        assert.ok(missing.includes(replacement.notFoundHeading));
        const icon = await (await req('/icon.svg')).text();
        assert.ok(icon.includes('>RA</text>'));
        for (const path of ['/experience', '/about', '/contact', '/privacy']) {
          const html = await (await req(path)).text();
          assert.ok(html.includes('Rowan Aster'));
          assert.ok(!html.includes('Mikael Vincent'));
        }
        await restore(original);
      },
    );
    await t.test(
      'media bytes persist privately, publish safely, and appear in a project',
      async () => {
        const form = new FormData();
        form.set(
          'file',
          new File(
            [
              Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB9kAAAAASUVORK5CYII=',
                'base64',
              ),
            ],
            'sample.png',
            { type: 'image/png' },
          ),
        );
        form.set('alt', 'A sample pixel used to verify uploads');
        const r = await authorized('/api/admin/upload', {
          method: 'POST',
          headers: { Origin: base },
          body: form,
        });
        assert.equal(r.status, 200);
        const { id } = await r.json();
        created.push(id);
        assert.equal((await req('/media/' + id)).status, 404);
        assert.equal((await authorized('/media/' + id)).status, 200);
        await publish(id);
        const image = await req('/media/' + id);
        assert.equal(image.status, 200);
        assert.equal(image.headers.get('content-type'), 'image/png');
        assert.ok((await image.arrayBuffer()).byteLength > 50);
        const p = await record(
          baseline.find((r) => r.kind === 'project' && r.published).id,
        );
        await save(p, { ...p.draft, mediaId: id });
        await publish(p.id);
        const html = await (await req('/projects/' + p.draft.slug)).text();
        assert.ok(html.includes('A sample pixel used to verify uploads'));
        await restore(baseline.find((r) => r.id === p.id));
      },
    );
    await t.test(
      'script text is escaped and portable exports exclude credentials and inquiries',
      async () => {
        const id = await create('journal', {
          slug: 'escape-test',
          title: '<script>alert(1)</script>',
          subtitle: 'Test sample',
          body: '<img src=x onerror=alert(1)>',
          order: 100,
          sample: true,
        });
        await publish(id);
        const html = await (await req('/about')).text();
        assert.ok(html.includes('&lt;script&gt;'));
        assert.ok(!html.includes('<script>alert(1)</script>'));
        const exported = await (await authorized('/api/admin/export')).json();
        assert.equal(exported.format, 'orbital-folio/v1');
        assert.ok(Array.isArray(exported.records));
        assert.ok(!('admins' in exported));
        assert.ok(!('inquiries' in exported));
        assert.ok(!JSON.stringify(exported).includes('ADMIN_SETUP_KEY'));
        await api({
          action: 'import',
          payload: { ...exported, records: exported.records.slice(0, 2) },
        });
        const invalid = await api(
          {
            action: 'import',
            payload: {
              format: 'orbital-folio/v1',
              records: [
                {
                  id: 'invalid',
                  kind: 'link',
                  draft: { title: 'Bad', url: 'data:text/html,hi' },
                },
              ],
            },
          },
          400,
        );
        assert.ok(invalid.error);
      },
    );
  } finally {
    for (const original of baseline) await restore(original);
    for (const id of created) {
      const r = await record(id);
      if (r) await api({ action: 'delete', id, revision: r.revision });
    }
  }
  await t.test(
    'all public content is present in plain HTTP HTML with meaningful metadata and URLs',
    async () => {
      for (const path of [
        '/',
        '/projects',
        '/projects/relay',
        '/experience',
        '/about',
        '/contact',
        '/privacy',
      ]) {
        const r = await req(path);
        const html = await r.text();
        assert.equal(r.status, 200, path);
        assert.match(html, /<h1/);
        assert.match(html, /<title>/);
        assert.match(html, /rel="canonical"/);
        assert.match(
          r.headers.get('content-security-policy'),
          /object-src 'none'/,
        );
        assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
      }
      assert.equal((await req('/projects/nonexistent')).status, 404);
      const sitemap = await (await req('/sitemap.xml')).text();
      assert.ok(sitemap.includes('/projects/relay'));
      assert.ok(!sitemap.includes('/admin'));
      const robots = await (await req('/robots.txt')).text();
      assert.ok(robots.includes('Disallow: /'));
      assert.match(
        (await authorized('/admin')).headers.get('cache-control'),
        /no-store/,
      );
    },
  );
  await t.test('local sign-out clears the session cookie', async () => {
    const r = await authorized('/signout-with-chatgpt?return_to=/admin', {
      redirect: 'manual',
    });
    assert.equal(r.status, 302);
    assert.match(r.headers.get('set-cookie'), /Max-Age=0/);
    assert.equal((await req('/api/admin')).status, 403);
  });
});
