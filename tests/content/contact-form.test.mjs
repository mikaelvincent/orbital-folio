import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTACT_MESSAGE_LIMIT,
  contactInboxMessage,
  submitContactDraft,
  validateContactDraft,
} from '../../features/portfolio/contact-flow.ts';

const message = {
  name: 'A Visitor',
  email: 'visitor@example.com',
  message: 'A useful message about working together.',
};

test('messages need no mode selection and preserve the existing inbox contract and optional fields', async () => {
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
    name: 'A Visitor',
    email: 'visitor@example.com',
    intent: 'project',
    message:
      'Company: Orbital Studio\nSubject: Working together\n\nA useful message about working together.',
    website: '',
  });
  assert.equal(
    validateContactDraft(message),
    null,
    'Company and subject are optional',
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

test('missing names, invalid email, short text and oversized fields cannot submit', async () => {
  const invalid = [
    { ...message, name: undefined },
    { ...message, name: '' },
    { ...message, name: '  \t\n ' },
    { ...message, email: '' },
    { ...message, email: 'missing-at' },
    { ...message, email: 'visitor@@example.com' },
    { ...message, email: 'visitor name@example.com' },
    { ...message, email: 'visitor<name>@example.com' },
    { ...message, email: '.visitor@example.com' },
    { ...message, email: 'visitor.@example.com' },
    { ...message, email: 'visitor..name@example.com' },
    { ...message, email: 'visitor@example' },
    { ...message, email: 'visitor@example..com' },
    { ...message, email: 'visitor@-example.com' },
    { ...message, email: 'visitor@example-.com' },
    { ...message, email: 'visitor@exam_ple.com' },
    { ...message, email: 'visitor@example.com/path' },
    { ...message, email: 'x'.repeat(65) + '@example.com' },
    { ...message, email: 'visitor@' + 'x'.repeat(64) + '.com' },
    {
      ...message,
      email:
        'x'.repeat(64) +
        '@' +
        ['x'.repeat(63), 'y'.repeat(63), 'z'.repeat(63)].join('.'),
    },
    { ...message, message: '   short  ' },
    { ...message, name: 'x'.repeat(121) },
    { ...message, company: 'x'.repeat(161) },
    { ...message, subject: 'x'.repeat(201) },
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
});

test('valid email syntax and exact field limits reach only the provided transport', async () => {
  for (const email of [
    'visitor@example.com',
    'Visitor.Name+portfolio@sub.example.com',
    "o'connor@my-studio.example",
    '  visitor@example.com  ',
    'x'.repeat(64) +
      '@' +
      ['x'.repeat(63), 'y'.repeat(63), 'z'.repeat(61)].join('.'),
  ]) {
    let calls = 0;
    await submitContactDraft(
      {
        ...message,
        email,
        name: 'x'.repeat(120),
        company: 'x'.repeat(160),
        subject: 'x'.repeat(200),
      },
      async (body) => {
        calls++;
        assert.equal(body.get('email'), email.trim());
        assert.equal(body.get('name').length, 120);
      },
    );
    assert.equal(calls, 1);
  }
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
    external: ['react', 'react/jsx-runtime', '@base-ui/react/dialog'],
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
  const sent = renderToStaticMarkup(
    createElement(ContactForm, {
      site: { email: 'owner@example.com' },
      initialSent: true,
      draft: message,
    }),
  );
  assert.match(sent, /Message received/);
  assert.doesNotMatch(sent, /<form\b|Schedule a call|Send a message/);
  for (const draft of [undefined, message]) {
    // Include a valid prefilled draft: native validation alone must not be the
    // protection against leaking fields through the browser's default GET.
    const markup = renderToStaticMarkup(
      createElement(ContactForm, {
        site: {
          email: 'owner@example.com',
          nameLabel: 'Your name',
          emailLabel: 'Your email',
        },
        draft,
      }),
    );
    assert.match(markup, /<form\b/);
    assert.match(markup, /<input[^>]*name="email"/);
    assert.match(markup, /Send message/);
    assert.match(markup, /<label[^>]*>Your name<\/label>/);
    assert.doesNotMatch(markup, /including company and subject/);
    for (const [name, limit, required] of [
      ['name', 120, true],
      ['company', 160, false],
      ['subject', 200, false],
      ['email', 254, true],
    ]) {
      const input = markup.match(
        new RegExp(`<input[^>]*name="${name}"[^>]*>`),
      )?.[0];
      assert.ok(input, name);
      assert.match(input, new RegExp(`maxLength="${limit}"`, 'i'));
      assert.equal(/\brequired=""/.test(input), required, name);
      if (name !== 'email') {
        const descriptionId = input.match(/aria-describedby="([^"]+)"/)?.[1];
        assert.ok(descriptionId, name);
        assert.ok(markup.includes(`id="${descriptionId}"`));
        assert.ok(markup.includes(`/ ${limit} characters`));
      }
    }
    assert.doesNotMatch(
      markup,
      /Schedule a call|Send a message|aria-pressed|name="(?:date|time)"/,
    );
    const fieldsets = [...markup.matchAll(/<fieldset\b[^>]*>/g)].map(
      ([tag]) => tag,
    );
    assert.equal(fieldsets.length, 1);
    assert.ok(
      fieldsets.every((tag) => /\bdisabled=""/.test(tag)),
      'All visitor fields stay disabled until hydration',
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
      /<noscript>[\s\S]*?This form needs JavaScript[\s\S]*?href="mailto:owner@example.com"[\s\S]*?<\/noscript>/,
    );
    assert.doesNotMatch(
      markup,
      /action="\/api\/contact"/,
      'Submission requires hydration and the inbox adapter',
    );
    assert.equal((markup.match(/<textarea\b/g) || []).length, 1);
    assert.match(markup, /<textarea[^>]*name="message"/);
    assert.match(markup, /aria-label="Expand message"/);
    assert.doesNotMatch(markup, /role="dialog"/);
  }
});
