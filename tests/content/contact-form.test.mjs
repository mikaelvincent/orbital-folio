import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CONTACT_MESSAGE_LIMIT } from '../../lib/contact-validation.ts';
import { contactInboxMessage } from '../../lib/content/inquiries.ts';
import {
  submitContactDraft,
  validateContactDraft,
} from '../../features/portfolio/contact-flow.ts';

const message = {
  name: 'A Visitor',
  email: 'visitor@example.com',
  message: 'A useful message about working together.',
};

test('submissions keep company, subject and message separate for server validation', async () => {
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
    company: 'Orbital Studio',
    email: 'visitor@example.com',
    subject: 'Working together',
    intent: 'project',
    message: message.message,
    website: '',
  });
  assert.equal(
    validateContactDraft(message),
    null,
    'Company and subject are optional',
  );
  assert.equal(contactInboxMessage(message), message.message);
});

test('a full-length message retains its own allowance with or without company and subject', async () => {
  const withMetadata = {
    ...message,
    company: 'Studio',
    subject: 'Hello',
    message: 'x'.repeat(5000),
  };
  for (const metadata of [{}, { company: 'Studio', subject: 'Hello' }]) {
    const draft = { ...message, ...metadata, message: withMetadata.message };
    assert.equal(validateContactDraft(draft), null);
    let calls = 0;
    await submitContactDraft(draft, async (body) => {
      calls++;
      assert.equal(body.get('message').length, CONTACT_MESSAGE_LIMIT);
      assert.equal(body.get('company'), metadata.company || '');
      assert.equal(body.get('subject'), metadata.subject || '');
    });
    assert.equal(calls, 1);
    await assert.rejects(
      submitContactDraft(
        { ...draft, message: draft.message + 'x' },
        async () => {
          calls++;
        },
      ),
      /5,000/,
    );
    assert.equal(calls, 1, 'An oversized message never reaches the transport');
  }
  assert.equal(
    contactInboxMessage(withMetadata),
    'Company: Studio\nSubject: Hello\n\n' + withMetadata.message,
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
    { ...message, name: 'x'.repeat(61) },
    { ...message, company: 'x'.repeat(81) },
    { ...message, subject: 'x'.repeat(101) },
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
        name: 'x'.repeat(60),
        company: 'x'.repeat(80),
        subject: 'x'.repeat(100),
      },
      async (body) => {
        calls++;
        assert.equal(body.get('email'), email.trim());
        assert.equal(body.get('name').length, 60);
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

async function loadContactForm() {
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
  return serverModule.exports.ContactForm;
}
const ContactForm = await loadContactForm();

test('unhydrated contact forms fail closed while preserving a no-JavaScript email alternative', () => {
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
      ['name', 60, true],
      ['company', 80, false],
      ['subject', 100, false],
      ['email', 254, true],
    ]) {
      const input = markup.match(
        new RegExp(`<input[^>]*name="${name}"[^>]*>`),
      )?.[0];
      assert.ok(input, name);
      assert.match(input, new RegExp(`maxLength="${limit}"`, 'i'));
      assert.equal(/\brequired=""/.test(input), required, name);
      assert.doesNotMatch(input, /aria-describedby=/);
    }
    assert.doesNotMatch(markup, /class="contact-app-limit/);
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

test('counters appear at 80 percent of each independent field limit with accessible descriptions', () => {
  const render = (draft) =>
    renderToStaticMarkup(
      createElement(ContactForm, {
        site: {
          interfaceText: {
            '{count} / {limit} characters': 'Used {count} of {limit}',
          },
        },
        draft,
      }),
    );
  const below = {
    name: 'n'.repeat(47),
    company: 'c'.repeat(63),
    subject: 's'.repeat(79),
    message: 'm'.repeat(3999),
  };
  assert.doesNotMatch(
    render(below),
    /class="contact-app-limit|aria-describedby=/,
  );
  for (const [name, count, limit] of [
    ['name', 48, 60],
    ['company', 64, 80],
    ['subject', 80, 100],
    ['message', 4000, 5000],
  ]) {
    const markup = render({ ...below, [name]: 'x'.repeat(count) });
    assert.equal(
      (markup.match(/class="contact-app-limit"/g) || []).length,
      1,
      name,
    );
    assert.ok(
      markup.includes(
        `Used ${count.toLocaleString('en-US')} of ${limit.toLocaleString('en-US')}`,
      ),
      name,
    );
    const input = markup.match(
      new RegExp(`<(?:input|textarea)[^>]*name="${name}"[^>]*>`),
    )?.[0];
    const descriptionId = input?.match(/aria-describedby="([^"]+)"/)?.[1];
    assert.ok(descriptionId, name);
    assert.ok(markup.includes(`id="${descriptionId}"`));
  }
  const metadataAtLimit = render({
    ...below,
    company: 'c'.repeat(80),
    subject: 's'.repeat(100),
  });
  assert.doesNotMatch(metadataAtLimit, /of 5,000/);
});
