import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const bundled = await build({
  entryPoints: ['features/portfolio/scene-tools-menu.tsx'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['react', 'react/jsx-runtime', 'react-dom'],
  loader: { '.css': 'empty' },
  logLevel: 'silent',
});
const loaded = { exports: {} };
runInNewContext(bundled.outputFiles[0].text, {
  require: createRequire(import.meta.url),
  module: loaded,
  exports: loaded.exports,
});
const { SceneToolsMenu } = loaded.exports;

await test('the initial Tools launcher is named and collapsed without starting playback or diagnostics', () => {
  const unexpected = () =>
    assert.fail('A closed Tools menu must not run an inspection tool');
  for (const diagnosticsEnabled of [false, true]) {
    const markup = renderToStaticMarkup(
      createElement(SceneToolsMenu, {
        launcherRef: { current: null },
        earthPlayback: {
          getEarthPlayback: unexpected,
          setEarthPlayback: unexpected,
        },
        motionPaused: false,
        diagnosticsEnabled,
        onDiagnosticsChange: unexpected,
        studioLabel: 'Content studio',
      }),
    );
    assert.match(markup, /<button[^>]+aria-label="Scene tools"/);
    assert.match(markup, /aria-expanded="false"/);
    assert.match(markup, /aria-haspopup="dialog"/);
    assert.match(markup, />Tools<\/span>/);
    assert.equal((markup.match(/<button/g) || []).length, 1);
    assert.doesNotMatch(
      markup,
      /role="dialog"|earth-playback-panel|data-scene-perf|href="\/admin"/,
    );
  }
});
