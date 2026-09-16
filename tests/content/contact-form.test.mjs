import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTACT_MESSAGE_LIMIT,
  contactInboxMessage,
  submitContactDraft,
  validateContactDraft,
} from '../../features/portfolio/contact-flow.ts';

const message = {
  mode: 'message',
  email: 'visitor@example.com',
  message: 'A useful message about working together.',
};
const call = {
  ...message,
  mode: 'call',
  date: '2026-10-20',
  time: '14:30',
  timeZone: 'Asia/Manila',
};

test('call requests validate and complete as a demo without invoking any transport', async () => {
  let calls = 0;
  const before = structuredClone(call);
  assert.equal(
    await submitContactDraft(call, async () => {
      calls++;
    }),
    'demo',
  );
  assert.equal(calls, 0);
  assert.deepEqual(
    call,
    before,
    'Temporary input remains available for editing',
  );
  assert.equal(
    await submitContactDraft({ ...call, mode: undefined }, async () => {
      calls++;
    }),
    'demo',
    'The default mode is also protected from live submissions',
  );
  assert.equal(calls, 0);
});

test('messages reuse the existing inbox contract while preserving optional subject/company', async () => {
  const draft = {
    ...message,
    company: 'Orbital Studio',
    subject: 'Working together',
  };
  let body;
  assert.equal(
    await submitContactDraft(draft, async (value) => {
      body = value;
    }),
    'sent',
  );
  assert.deepEqual(Object.fromEntries(body), {
    name: 'Name not provided',
    email: 'visitor@example.com',
    intent: 'project',
    message:
      'Company: Orbital Studio\nSubject: Working together\n\nA useful message about working together.',
    website: '',
  });
  assert.equal(
    validateContactDraft(message),
    null,
    'Name, company and subject are genuinely optional',
  );
  assert.equal(contactInboxMessage(message), message.message);
});

test('optional metadata is counted in the existing inbox limit and never silently truncated', async () => {
  const withMetadata = {
    ...message,
    company: 'Studio',
    subject: 'Hello',
    message: 'x'.repeat(5000),
  };
  let called = false;
  await assert.rejects(
    submitContactDraft(withMetadata, async () => {
      called = true;
    }),
    /5,000/,
  );
  assert.equal(called, false);
  assert.equal(contactInboxMessage(withMetadata).length, 5032);
  const prefix = contactInboxMessage({ ...withMetadata, message: '' }).length;
  const exact = {
    ...withMetadata,
    message: 'x'.repeat(CONTACT_MESSAGE_LIMIT - prefix),
  };
  assert.equal(contactInboxMessage(exact).length, CONTACT_MESSAGE_LIMIT);
  assert.equal(validateContactDraft(exact), null);
  assert.match(
    validateContactDraft({ ...exact, message: exact.message + 'x' }),
    /5,000/,
  );
});

test('invalid email, short text, oversized fields and impossible call dates cannot submit', async () => {
  const invalid = [
    { ...message, email: 'missing-at' },
    { ...message, message: '   short  ' },
    { ...message, name: 'x'.repeat(121) },
    { ...message, company: 'x'.repeat(161) },
    { ...message, subject: 'x'.repeat(201) },
    { ...call, date: '' },
    { ...call, date: '2026-02-30' },
    { ...call, date: '2026-13-01' },
    { ...call, time: '' },
    { ...call, time: '24:00' },
    { ...call, time: '14:60' },
    { ...call, timeZone: 'Invalid/timezone' },
  ];
  let calls = 0;
  for (const draft of invalid) {
    await assert.rejects(
      submitContactDraft(draft, async () => {
        calls++;
      }),
    );
  }
  assert.equal(calls, 0);
  assert.equal(
    validateContactDraft({
      ...call,
      date: '2028-02-29',
      time: '00:00',
      timeZone: 'UTC',
    }),
    null,
  );
});

test('working submission retains honeypot and rejects delivery failures without mutating input', async () => {
  const draft = {
    ...message,
    name: '  A Visitor  ',
    subject: 'A subject',
    company: 'A company',
  };
  const before = structuredClone(draft);
  await assert.rejects(
    submitContactDraft(
      draft,
      async (body) => {
        assert.equal(body.get('website'), 'bot.example');
        assert.equal(body.get('name'), 'A Visitor');
        throw new Error('Network unavailable');
      },
      'bot.example',
    ),
    /Network unavailable/,
  );
  assert.deepEqual(draft, before);
});

test('unhydrated contact forms fail closed while preserving a no-JavaScript email alternative', async () => {
  const { build } = await import('esbuild');
  const { createRequire } = await import('node:module');
  const { runInNewContext } = await import('node:vm');
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const bundled = await build({
    entryPoints: ['features/portfolio/contact-form.tsx'],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    external: ['react', 'react/jsx-runtime'],
    loader: { '.css': 'empty' },
    logLevel: 'silent',
  });
  const serverModule = { exports: {} };
  runInNewContext(bundled.outputFiles[0].text, {
    require: createRequire(import.meta.url),
    module: serverModule,
    exports: serverModule.exports,
  });
  const { ContactForm } = serverModule.exports;
  for (const draft of [call, message]) {
    // Include a valid prefilled draft: native validation alone must not be the
    // protection against leaking fields through the browser's default GET.
    const markup = renderToStaticMarkup(
      createElement(ContactForm, {
        site: { email: 'owner@example.com' },
        draft,
      }),
    );
    const fieldsets = [...markup.matchAll(/<fieldset\b[^>]*>/g)].map(
      ([tag]) => tag,
    );
    assert.equal(fieldsets.length, 2);
    assert.ok(
      fieldsets.every((tag) => /\bdisabled=""/.test(tag)),
      'Mode selection and all visitor fields stay disabled until hydration',
    );
    const buttons = [...markup.matchAll(/<button\b[^>]*>/g)].map(
      ([tag]) => tag,
    );
    assert.ok(buttons.length >= 3);
    assert.ok(
      buttons.every((tag) => /\bdisabled=""/.test(tag)),
      'No button can submit an unhydrated form',
    );
    const outsideFieldsets = markup.replace(
      /<fieldset\b[\s\S]*?<\/fieldset>/g,
      '',
    );
    const remainingInputs = [
      ...outsideFieldsets.matchAll(/<input\b[^>]*>/g),
    ].map(([tag]) => tag);
    assert.ok(
      remainingInputs.every((tag) => /\bdisabled=""/.test(tag)),
      'The honeypot is disabled too',
    );
    assert.match(
      markup,
      /<noscript>[\s\S]*?These forms need JavaScript[\s\S]*?href="mailto:owner@example.com"[\s\S]*?<\/noscript>/,
    );
    assert.doesNotMatch(
      markup,
      /action="\/api\/contact"/,
      'No live native submission path exists for the demo',
    );
  }
});
