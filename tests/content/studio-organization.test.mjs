import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { splitImportedSocialLinks } from '../../lib/content/social-link-migration.ts';
import {
  resolveAboutSocials,
  resolveSocialScreens,
} from '../../lib/content/social-links.ts';
import { build } from 'esbuild';
const bundled = await build({
  stdin: {
    contents:
      "export * from './features/studio/entry-media.ts'; export * from './features/studio/project-editor-helpers.ts';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const { entryMedia, attachmentPublication, projectAssetPublication } =
  await import(
    'data:text/javascript;base64,' +
      Buffer.from(bundled.outputFiles[0].text).toString('base64')
  );
import { inquiryReplyHref } from '../../lib/content/inquiries.ts';

const record = (id, kind, draft, published = null) => ({
  id,
  kind,
  draft,
  published,
  revision: 1,
  updatedAt: '',
});
test('room migration keeps private/public link snapshots independent and preserves existing inquiry text', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(
      'CREATE TABLE content (id TEXT PRIMARY KEY,kind TEXT,draft TEXT,published TEXT,revision INTEGER,updated_at TEXT); CREATE TABLE inquiries (id TEXT PRIMARY KEY,name TEXT,email TEXT,intent TEXT,message TEXT,created_at TEXT);',
    );
    const published = {
      title: 'Public profile',
      url: 'https://example.com/public',
      screen: 'left',
      aboutSlot: 'center',
      iconMediaId: 'public-icon',
      photoMediaId: 'retired-photo',
    };
    const draft = {
      ...published,
      title: 'Private edited profile',
      url: 'https://example.com/draft',
      aboutSlot: 'right',
      iconMediaId: 'private-icon',
      photoCrop: { x: 0.3, y: 0.7, zoom: 1.2 },
    };
    const save = db.prepare(
      "INSERT INTO content VALUES (?,'link',?,?,4,'original')",
    );
    save.run('x'.repeat(100), JSON.stringify(draft), JSON.stringify(published));
    save.run(
      'private-only',
      JSON.stringify({ ...draft, screen: 'list' }),
      null,
    );
    db.exec(
      "INSERT INTO inquiries VALUES ('message','Visitor','visitor@example.com','project','Keep the full message.','2026-09-30T00:00:00.000Z')",
    );
    db.exec(readFileSync('drizzle/0005_studio_rooms_and_inbox.sql', 'utf8'));
    const links = db
      .prepare('SELECT * FROM content')
      .all()
      .map((row) => ({
        ...row,
        draft: JSON.parse(row.draft),
        published: row.published && JSON.parse(row.published),
      }));
    assert.equal(links.length, 4);
    const contact = links.find((row) => row.id === 'x'.repeat(100));
    const about = links.find((row) => row.draft.legacyLinkId === contact.id);
    assert.equal(contact.draft.room, 'contact');
    assert.equal(contact.draft.aboutSlot, 'off');
    assert.equal(about.draft.title, draft.title);
    assert.equal(about.published.title, published.title);
    assert.equal(about.draft.aboutSlot, 'right');
    assert.equal(about.published.aboutSlot, 'center');
    assert.equal(about.draft.iconMediaId, 'private-icon');
    assert.equal(about.published.iconMediaId, 'public-icon');
    assert.equal(contact.draft.photoMediaId, 'retired-photo');
    assert.deepEqual(about.draft.photoCrop, draft.photoCrop);
    assert.equal(
      links.find((row) => row.draft.legacyLinkId === 'private-only').published,
      null,
    );
    const live = links
      .filter((row) => row.published)
      .map((row) => ({ ...row.published, id: row.id }));
    assert.equal(resolveSocialScreens(live).left.title, published.title);
    assert.equal(resolveAboutSocials(live).center.title, published.title);
    assert.equal(resolveAboutSocials(live).right, null);
    assert.equal(
      db
        .prepare('SELECT message,read_at,replied_at,archived_at FROM inquiries')
        .get().message,
      'Keep the full message.',
    );
    assert.equal(
      db.prepare('SELECT read_at FROM inquiries').get().read_at,
      null,
    );
  } finally {
    db.close();
  }
});
test('legacy backup imports reuse the About copy and can restore an inactive placement', () => {
  const input = {
    id: 'original',
    kind: 'link',
    data: {
      title: 'GitHub',
      url: 'https://github.com',
      screen: 'left',
      aboutSlot: 'center',
      iconMediaId: 'image',
    },
  };
  const split = splitImportedSocialLinks([input], [], () => 'separate-about');
  assert.equal(split.length, 2);
  assert.equal(split[0].data.aboutSlot, 'off');
  assert.equal(split[1].data.screen, 'list');
  const existing = split.map((item) =>
    record(item.id, 'link', item.data, item.data),
  );
  const repeated = splitImportedSocialLinks([input], existing, () => {
    throw new Error('must reuse ID');
  });
  assert.equal(repeated[1].id, 'separate-about');
  const inactive = splitImportedSocialLinks(
    [{ ...input, data: { ...input.data, aboutSlot: 'off' } }],
    existing,
    () => {
      throw new Error('must reuse ID');
    },
  );
  assert.equal(inactive[1].data.aboutSlot, 'off');
  assert.equal(
    existing[1].published.aboutSlot,
    'center',
    'Import does not publish or mutate the previous snapshot',
  );
  assert.equal(
    splitImportedSocialLinks(
      [{ ...input, data: { ...input.data, aboutSlot: 'off' } }],
      [],
      () => 'unused',
    ).length,
    1,
  );
});
test('entry attachments retain owned uploads, both snapshots and dependencies without publishing unused uploads', () => {
  const parent = record(
    'entry',
    'experience',
    { body: '![Draft](/media/draft)' },
    { body: '![Live](/media/live)' },
  );
  const records = [
    parent,
    record('draft', 'media', { mime: 'image/png' }),
    record('live', 'media', { mime: 'image/png' }),
    record('upload', 'media', {
      ownerId: 'entry',
      mime: 'video/mp4',
      posterMediaId: 'poster',
      captionsMediaId: 'captions',
    }),
    record('poster', 'media', { mime: 'image/png' }),
    record('captions', 'media', { mime: 'text/vtt' }),
    record('other', 'media', { ownerId: 'other-entry', mime: 'image/png' }),
  ];
  assert.deepEqual(
    entryMedia(
      records,
      'entry',
      { body: '![Missing](/media/missing)' },
      'experience',
    ).map((row) => row.id),
    ['draft', 'live', 'upload', 'poster', 'captions'],
  );
  assert.deepEqual(
    projectAssetPublication(
      { body: '![Draft](/media/draft)' },
      records,
      'experience',
    ).pending.map((row) => row.id),
    ['draft'],
  );
  const siteRecords = [
    record('portrait', 'media', {
      ownerId: 'site',
      ownerField: 'portraitMediaId',
    }),
    record('seo', 'media', { ownerId: 'site', ownerField: 'seoImageId' }),
  ];
  assert.deepEqual(
    entryMedia(siteRecords, 'site', {}, 'site', 'portraitMediaId').map(
      (row) => row.id,
    ),
    ['portrait'],
  );
});
test('reply drafts safely encode reserved email characters and quote every original line without marking status', () => {
  const inquiry = {
    email: 'person?x&y#tag@example.com',
    name: 'Visitor\r\nName',
    created_at: '2026-09-30T00:00:00.000Z',
    message: 'Subject: A & B?\r\n\r\nHello 👋\n> Earlier quote\nLast line',
    replied_at: null,
  };
  const before = structuredClone(inquiry);
  const href = inquiryReplyHref(inquiry);
  const url = new URL(href);
  assert.equal(decodeURIComponent(url.pathname), inquiry.email);
  assert.equal(url.searchParams.get('subject'), 'Re: A & B?');
  assert.match(url.searchParams.get('body'), /Visitor Name/);
  assert.ok(
    url.searchParams
      .get('body')
      .endsWith(
        '> Subject: A & B?\n> \n> Hello 👋\n> > Earlier quote\n> Last line',
      ),
  );
  assert.deepEqual(inquiry, before);
  assert.deepEqual([...url.searchParams.keys()], ['subject', 'body']);
});

test('publishing an aliased attachment includes private source bytes before its metadata', () => {
  const source = record('source', 'media', {
    mime: 'image/png',
    url: '/media/source',
  });
  const data = { mime: 'image/png', url: '/media/source' };
  const alias = record('alias', 'media', data, data);
  assert.deepEqual(
    attachmentPublication('alias', [alias, source]).pending.map(
      (item) => item.id,
    ),
    ['source'],
  );
  assert.equal(attachmentPublication('alias', [alias]).pending.length, 0);
  assert.match(attachmentPublication('alias', [alias]).error, /missing/);
});

test('byte-source publication never follows or publishes a nested alias', () => {
  const data = { mime: 'image/png', url: '/media/b' };
  const a = record('a', 'media', data, data);
  const b = record('b', 'media', { mime: 'image/png', url: '/media/c' });
  const c = record('c', 'media', { mime: 'image/png', url: '/media/c' });
  assert.deepEqual(
    attachmentPublication('a', [a, b, c]).pending.map((item) => item.id),
    ['b'],
  );
  b.draft.url = '/media/a';
  assert.equal(attachmentPublication('a', [a, b]).error, '');
  b.published = { mime: 'image/png', url: '/media/b' };
  assert.deepEqual(attachmentPublication('a', [a, b]).pending, []);
});
