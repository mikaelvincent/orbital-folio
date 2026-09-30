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
    const changeStatus = (id, action, extraHeaders = {}) =>
      fetch(base + '/api/admin/inbox', {
        method: 'PATCH',
        headers: {
          Cookie: cookie,
          Origin: base,
          'Content-Type': 'application/json',
          ...extraHeaders,
        },
        body: JSON.stringify({ id, action }),
      });
    const first = messages[0];
    assert.equal(first.read_at, null);
    assert.equal(first.replied_at, null);
    assert.equal(
      (await changeStatus(first.id, 'read', { Cookie: '' })).status,
      403,
    );
    assert.equal(
      (await changeStatus(first.id, 'read', { Origin: 'https://example.com' }))
        .status,
      403,
    );
    assert.equal((await changeStatus(first.id, 'unknown')).status, 400);
    assert.equal((await changeStatus('missing-message', 'read')).status, 404);
    for (const [action, field, expected] of [
      ['read', 'read_at', true],
      ['replied', 'replied_at', true],
      ['unread', 'read_at', false],
      ['archive', 'archived_at', true],
      ['unarchive', 'archived_at', false],
      ['unreplied', 'replied_at', false],
    ]) {
      const response = await changeStatus(first.id, action);
      assert.equal(response.status, 200);
      const item = (await response.json()).inquiry;
      assert.equal(!!item[field], expected);
      assert.equal(item.message, first.message);
    }
    const olderResponse = await fetch(
      base +
        '/api/admin/inbox?before=' +
        encodeURIComponent(first.created_at + '|' + first.id),
      { headers: { Cookie: cookie } },
    );
    assert.equal(olderResponse.status, 200);
    const older = (await olderResponse.json()).inquiries;
    assert.ok(older.some((item) => item.id === messages[1].id));
    assert.ok(!older.some((item) => item.id === first.id));
    const malformed = await fetch(base + '/api/admin/inbox?before=invalid', {
      headers: { Cookie: cookie },
    });
    assert.equal(malformed.status, 400);
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
    for (const [index, fields] of [
      { name: ' \t ' },
      { email: 'visitor..name@example.com' },
      { email: 'visitor@-example.com' },
      { email: 'visitor@example.com/path' },
      { name: 'n'.repeat(51) },
      { company: 'c'.repeat(51) },
      { subject: 's'.repeat(101) },
      { message: 'm'.repeat(5001) },
    ].entries()) {
      const invalidFields = new FormData();
      for (const [key, value] of Object.entries({
        name: 'Test visitor',
        email: 'visitor@example.com',
        message: marker + ' invalid submission',
        intent: 'project',
        ...fields,
      }))
        invalidFields.set(key, value);
      const response = await fetch(base + '/api/contact', {
        method: 'POST',
        headers: {
          Origin: base,
          Accept: 'application/json',
          'cf-connecting-ip': `${testIp}-invalid-${index}`,
        },
        body: invalidFields,
      });
      assert.equal(response.status, 400);
    }
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

await test('the API accepts and preserves a full message plus independently bounded company and subject', async () => {
  const company = 'c'.repeat(50);
  const subject = 's'.repeat(100);
  const message = ('Independent message allowance ' + Date.now()).padEnd(
    5000,
    'm',
  );
  const body = new FormData();
  for (const [key, value] of Object.entries({
    name: 'n'.repeat(50),
    email: 'visitor@example.com',
    company,
    subject,
    message,
    intent: 'project',
  }))
    body.set(key, value);
  let id;
  try {
    const response = await fetch(base + '/api/contact', {
      method: 'POST',
      headers: {
        Origin: base,
        Accept: 'application/json',
        'cf-connecting-ip': testIp + '-independent-limits',
      },
      body,
    });
    assert.equal(response.status, 200, await response.text());
    const inbox = await (
      await fetch(base + '/api/admin/inbox', {
        headers: { Cookie: cookie },
      })
    ).json();
    const received = inbox.inquiries.find((inquiry) =>
      inquiry.message.endsWith(message),
    );
    id = received?.id;
    assert.ok(received, 'The full message must be saved without truncation');
    assert.equal(received.name.length, 50);
    assert.equal(
      received.message,
      `Company: ${company}\nSubject: ${subject}\n\n${message}`,
    );
  } finally {
    if (id)
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
