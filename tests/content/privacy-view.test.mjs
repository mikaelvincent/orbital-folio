import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { seedSite } from '../../lib/content/seed.ts';

const bundled = await build({
  stdin: {
    contents: `export { ContactComputerWindow } from './features/portfolio/contact-computer-window';
      export { PrivacyView } from './features/portfolio/privacy-view';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['react', 'react/jsx-runtime', '@base-ui/react/dialog'],
  loader: { '.css': 'empty' },
  logLevel: 'silent',
});
const loaded = { exports: {} };
runInNewContext(bundled.outputFiles[0].text, {
  require: createRequire(import.meta.url),
  module: loaded,
  exports: loaded.exports,
  URLSearchParams,
});
const { ContactComputerWindow, PrivacyView } = loaded.exports;
const render = (Component, props) =>
  renderToStaticMarkup(createElement(Component, props));

test('Privacy replaces the Contact form inside the same monitor and exposes an in-app Back link', () => {
  const props = {
    site: seedSite,
    draft: {
      mode: 'message',
      email: 'visitor@example.com',
      message: 'Retained draft.',
    },
    onClose() {},
    backHref: '/contact?open=1',
  };
  const privacy = render(ContactComputerWindow, { ...props, privacy: true });
  const form = render(ContactComputerWindow, props);
  assert.match(privacy, /id="world-reader"/);
  assert.match(privacy, /Close Contact application/);
  assert.match(privacy, /class="privacy-back" href="\/contact\?open=1"/);
  assert.match(privacy, /<h1 tabindex="-1">Privacy<\/h1>/);
  assert.doesNotMatch(privacy, /<form\b|<textarea\b|visitor@example.com/);
  assert.doesNotMatch(form, /class="privacy-page"/);
  assert.match(form, /Retained draft\./);
});

test('standalone Privacy has a semantic reading return path, including private previews', () => {
  for (const preview of [false, true]) {
    const markup = render(PrivacyView, {
      data: {
        site: {
          ...seedSite,
          _preview: preview,
          interfaceText: { 'Back to form': 'Return' },
        },
      },
    });
    assert.match(markup, /Return<\/a>/);
    assert.ok(
      markup.includes(
        preview
          ? 'href="/admin/preview?section=contact&amp;open=1&amp;view=reading"'
          : 'href="/contact?open=1&amp;view=reading"',
      ),
    );
    assert.match(markup, /href="mailto:/);
  }
});
