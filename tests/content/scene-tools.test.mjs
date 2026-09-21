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

// Exercise the real component's handlers/effects with explicit event ordering.
// This is a pure hook fixture, not a simulated browser or a Safari DOM claim.
function interactionFixture() {
  const require = createRequire(import.meta.url);
  const slots = [];
  const listeners = new Map();
  let cursor = 0;
  let effects = [];
  let focused;
  const document = {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
  };
  const emit = (type, target, extra = {}) => {
    const event = {
      target,
      preventDefault() {
        this.defaultPrevented = true;
      },
      stopPropagation() {},
      ...extra,
    };
    for (const listener of listeners.get(type) || []) listener(event);
    return event;
  };
  const node = (parent) => {
    const result = {
      parent,
      contains(target) {
        for (; target; target = target.parent)
          if (target === result) return true;
        return false;
      },
      focus() {
        focused = result;
        emit('focusin', result);
      },
    };
    return result;
  };
  const launcherRef = { current: node() };
  const panel = node();
  const firstItem = node(panel);
  panel.querySelector = () => firstItem;
  const interactionModule = { exports: {} };
  runInNewContext(bundled.outputFiles[0].text, {
    module: interactionModule,
    exports: interactionModule.exports,
    document,
    require(id) {
      if (id === 'react-dom') return { createPortal: (element) => element };
      if (id !== 'react') return require(id);
      return {
        ...require('react'),
        useId: () => 'tools-fixture',
        useCallback: (callback) => callback,
        useRef(value) {
          const index = cursor++;
          return (slots[index] ||= { current: value });
        },
        useState(initial) {
          const index = cursor++;
          if (!(index in slots)) slots[index] = initial;
          return [
            slots[index],
            (value) => {
              slots[index] =
                typeof value === 'function' ? value(slots[index]) : value;
            },
          ];
        },
        useEffect(effect, dependencies) {
          const index = cursor++;
          const previous = slots[index];
          if (
            previous &&
            dependencies.every((value, i) =>
              Object.is(value, previous.dependencies[i]),
            )
          )
            return;
          effects.push(() => {
            previous?.cleanup?.();
            slots[index] = { dependencies, cleanup: effect() };
          });
        },
      };
    },
  });
  const unexpected = () =>
    assert.fail('Menu interaction must not start inspection tools');
  const props = {
    launcherRef,
    earthPlayback: {
      getEarthPlayback: unexpected,
      setEarthPlayback: unexpected,
    },
    motionPaused: false,
    diagnosticsEnabled: false,
    onDiagnosticsChange: unexpected,
    studioLabel: 'Content studio',
  };
  return {
    launcher: launcherRef.current,
    emit,
    get focused() {
      return focused;
    },
    render() {
      cursor = 0;
      effects = [];
      const tree = interactionModule.exports.SceneToolsMenu(props);
      const children = tree.props.children.flat().filter(Boolean);
      const toggle = children.find(
        (child) => child.props?.className === 'scene-tools-toggle',
      );
      const dialog = children.find((child) => child.props?.role === 'dialog');
      if (dialog) dialog.props.ref.current = panel;
      for (const effect of effects) effect();
      return toggle.props;
    },
  };
}

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

await test('a launcher press closes the menu even when outside focus dismisses it before click', () => {
  const fixture = interactionFixture();
  let button = fixture.render();
  button.onPointerDown?.({ isPrimary: true, button: 0 });
  button.onClick({ detail: 1 });
  button = fixture.render();
  assert.equal(button['aria-expanded'], true);

  // Browser focus handling can run between pointerdown and click. React can
  // already have committed the dismissal by the time the click is delivered.
  button.onPointerDown?.({ isPrimary: true, button: 0 });
  fixture.emit('focusin', {});
  button = fixture.render();
  assert.equal(button['aria-expanded'], false);
  button.onClick({ detail: 1 });
  button = fixture.render();
  assert.equal(
    button['aria-expanded'],
    false,
    'Close must not become a reopen',
  );

  button.onPointerDown?.({ isPrimary: true, button: 0 });
  button.onClick({ detail: 1 });
  button = fixture.render();
  assert.equal(
    button['aria-expanded'],
    true,
    'A new press can reopen normally',
  );
  button.onPointerDown?.({ isPrimary: true, button: 0 });
  button.onClick({ detail: 1 });
  assert.equal(fixture.render()['aria-expanded'], false);
});

await test('keyboard activation, cancelled presses, Escape and outside dismissal retain their behavior', () => {
  const fixture = interactionFixture();
  let button = fixture.render();
  button.onClick({ detail: 0 });
  button = fixture.render();
  assert.equal(button['aria-expanded'], true);
  button.onPointerDown?.({ isPrimary: true, button: 0 });
  button.onPointerCancel?.();
  fixture.emit('focusin', {});
  button = fixture.render();
  button.onClick({ detail: 0 });
  button = fixture.render();
  assert.equal(
    button['aria-expanded'],
    true,
    'Keyboard activation ignores cancelled pointer intent',
  );

  const escape = fixture.emit('keydown', {}, { key: 'Escape' });
  assert.equal(escape.defaultPrevented, true);
  assert.equal(fixture.render()['aria-expanded'], false);
  assert.equal(fixture.focused, fixture.launcher);

  button = fixture.render();
  button.onClick({ detail: 0 });
  button = fixture.render();
  fixture.emit('pointerdown', {});
  assert.equal(fixture.render()['aria-expanded'], false);
});
