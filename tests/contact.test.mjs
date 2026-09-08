import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('Local test database only.');
const cookie = '__sites_local_auth=1';
const testIp = 'local-contact-' + Date.now();
await test('Contact messages are durable, private, honest, bounded, and rate limited', async () => {
  const probe = await fetch(base + '/api/admin/inbox', {
    headers: { Cookie: cookie },
  });
  if (probe.status !== 200) {
    const key = fs
      .readFileSync('.dev.vars', 'utf8')
      .match(/^ADMIN_SETUP_KEY=(.+)$/m)?.[1];
    await fetch(base + '/api/admin/setup', {
      method: 'POST',
      headers: {
        Cookie: cookie,
        Origin: base,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key }),
    });
  }
  assert.equal(
    (await fetch(base + '/api/admin/inbox', { headers: { Cookie: cookie } }))
      .status,
    200,
  );
  const ids = [];
  const marker = 'Local integration inquiry ' + Date.now();
  try {
    for (const intent of ['interview', 'project']) {
      const f = new FormData();
      f.set('name', 'Test visitor');
      f.set('email', 'visitor@example.com');
      f.set('message', marker + ' ' + intent);
      f.set('intent', intent);
      const r = await fetch(base + '/api/contact', {
        method: 'POST',
        headers: {
          Origin: base,
          Accept: 'application/json',
          'cf-connecting-ip': testIp,
        },
        body: f,
      });
      assert.equal(r.status, 200, await r.text());
    }
    assert.equal((await fetch(base + '/api/admin/inbox')).status, 403);
    const inbox = await (
      await fetch(base + '/api/admin/inbox', { headers: { Cookie: cookie } })
    ).json();
    const messages = inbox.inquiries.filter((i) =>
      i.message.startsWith(marker),
    );
    assert.equal(messages.length, 2);
    ids.push(...messages.map((i) => i.id));
    assert.deepEqual(messages.map((i) => i.intent).sort(), [
      'interview',
      'project',
    ]);
    const streamedStatus = await new Promise((resolve, reject) => {
      const r = http.request(
        base + '/api/contact',
        {
          method: 'POST',
          headers: {
            Origin: base,
            Accept: 'application/json',
            'cf-connecting-ip': testIp,
            'Content-Type': 'multipart/form-data; boundary=test',
          },
        },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      r.on('error', reject);
      for (let i = 0; i < 10; i++) r.write('x'.repeat(4000));
      r.end();
    });
    assert.equal(streamedStatus, 413);
    const invalid = new FormData();
    invalid.set('name', '');
    invalid.set('intent', 'interview');
    const invalidResponse = await fetch(base + '/api/contact', {
      method: 'POST',
      headers: {
        Origin: base,
        Accept: 'application/json',
        'cf-connecting-ip': testIp,
      },
      body: invalid,
    });
    assert.equal(invalidResponse.status, 400);
    let limited = false;
    for (let i = 0; i < 4; i++) {
      const r = await fetch(base + '/api/contact', {
        method: 'POST',
        headers: {
          Origin: base,
          Accept: 'application/json',
          'cf-connecting-ip': testIp,
        },
        body: new FormData(),
      });
      if (r.status === 429) {
        limited = true;
        break;
      }
    }
    assert.ok(limited, 'Public contact rate limit must activate');
  } finally {
    for (const id of ids)
      await fetch(base + '/api/admin', {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Origin: base,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'inquiryDelete', id }),
      });
  }
});
