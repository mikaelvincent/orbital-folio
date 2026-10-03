import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const built = await build({
  entryPoints: ['features/portfolio/notebook-section-pages.tsx'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['react', 'react/jsx-runtime'],
  loader: { '.css': 'empty' },
});
function fixture(measurementOnly) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const frames = new Map();
  let frameId = 0;
  const observers = [];
  const counts = [];
  const fonts = new EventTarget();
  fonts.ready = Promise.resolve();
  const columns = { clientWidth: 438, scrollWidth: 3 * 494 - 56 };
  const image = { complete: false, loading: 'lazy' };
  const host = new EventTarget();
  host.querySelector = () => columns;
  host.querySelectorAll = (selector) =>
    selector === 'img'
      ? [image]
      : selector.includes('notebook-columns')
        ? [columns, {}, {}]
        : [];
  let bounds = 0;
  host.getBoundingClientRect = () => {
    bounds++;
    return { left: 0, right: 932 };
  };
  const memo = (fn, deps) => {
    const index = cursor++;
    const previous = slots[index];
    if (
      previous &&
      deps.every((value, i) => Object.is(value, previous.deps[i]))
    )
      return previous.value;
    const value = fn();
    slots[index] = { deps, value };
    return value;
  };
  const loaded = { exports: {} };
  runInNewContext(built.outputFiles[0].text, {
    module: loaded,
    exports: loaded.exports,
    document: { fonts },
    requestAnimationFrame: (fn) => {
      frames.set(++frameId, fn);
      return frameId;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    ResizeObserver: class {
      targets = new Set();
      constructor() {
        observers.push(this);
      }
      observe(target) {
        this.targets.add(target);
      }
      disconnect() {
        this.targets.clear();
      }
    },
    require(name) {
      if (name !== 'react') return require(name);
      return {
        useMemo: memo,
        useRef(value) {
          return (slots[cursor++] ||= { current: value });
        },
        useState(initial) {
          const index = cursor++;
          slots[index] ??= { value: initial };
          return [
            slots[index].value,
            (value) => {
              slots[index].value = value;
            },
          ];
        },
        useEffect(effect, deps) {
          const index = cursor++;
          const previous = slots[index];
          if (
            previous &&
            deps.every((value, i) => Object.is(value, previous.deps[i]))
          )
            return;
          effects.push(() => {
            previous?.cleanup?.();
            slots[index] = { deps, cleanup: effect() };
          });
        },
      };
    },
  });
  const props = {
    title: 'Notebook',
    body: 'A story',
    page: 0,
    media: [],
    measurementOnly,
    onPageCount: (count) => counts.push(count),
  };
  return {
    image,
    host,
    fonts,
    columns,
    observers,
    counts,
    get bounds() {
      return bounds;
    },
    render(changes = {}) {
      cursor = 0;
      effects = [];
      const tree = loaded.exports.NotebookSectionPages({
        ...props,
        ...changes,
      });
      tree.props.ref.current = host;
      for (const effect of effects) effect();
    },
    async flush() {
      await new Promise((resolve) => setImmediate(resolve));
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((fn) => fn());
    },
    unmount() {
      slots.forEach((slot) => slot.cleanup?.());
    },
  };
}

await test('hidden ink releases layout observers only after fonts and images settle, and remeasures font/media changes', async () => {
  const f = fixture(true);
  f.render();
  await f.flush();
  assert.equal(f.observers[0].targets.size, 4);
  assert.deepEqual(f.counts, []);
  f.image.complete = true;
  f.host.dispatchEvent(new Event('load'));
  await f.flush();
  assert.deepEqual(f.counts, [3]);
  assert.equal(f.observers[0].targets.size, 0);
  assert.equal(
    f.bounds,
    0,
    'Inert hidden ink needs no focus-target layout reads',
  );
  f.columns.scrollWidth = 5 * 494 - 56;
  f.fonts.dispatchEvent(new Event('loadingdone'));
  await f.flush();
  assert.deepEqual(f.counts, [3, 5]);
  f.columns.scrollWidth = 6 * 494 - 56;
  f.host.dispatchEvent(new Event('loadedmetadata'));
  await f.flush();
  assert.deepEqual(f.counts, [3, 5, 6]);
  f.render({ body: 'Updated story' });
  assert.equal(f.observers[1].targets.size, 4);
  await f.flush();
  assert.equal(f.observers[1].targets.size, 0);
  f.unmount();
  f.fonts.dispatchEvent(new Event('loadingdone'));
  await f.flush();
  assert.equal(f.counts.length, 4);
});

await test('the active notebook retains live layout observation and focus measurements', async () => {
  const f = fixture(false);
  f.image.complete = true;
  f.render();
  await f.flush();
  assert.deepEqual(f.counts, [3]);
  assert.equal(f.observers[0].targets.size, 4);
  assert.equal(f.bounds, 1);
  f.unmount();
  assert.equal(f.observers[0].targets.size, 0);
});

await test('all settled notebook sections retain their moving-leaf ink sources', async () => {
  const bundle = await build({
    entryPoints: ['features/portfolio/about-notebook.tsx'],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    external: ['react', 'react/jsx-runtime'],
    loader: { '.css': 'empty' },
  });
  const loaded = { exports: {} };
  runInNewContext(bundle.outputFiles[0].text, {
    module: loaded,
    exports: loaded.exports,
    require,
  });
  const data = {
    site: { name: 'Fixture', biography: 'Biography' },
    media: [],
    journal: [0, 1, 2].map((index) => ({
      id: `chapter-${index}`,
      title: `Section ${index}`,
      body: `Ink ${index}`,
    })),
  };
  const markup = renderToStaticMarkup(
    createElement(loaded.exports.AboutNotebook, {
      data,
      interactive: true,
      section: 2,
      page: 0,
      ready: true,
      pageCounts: [3, 4, 3],
    }),
  );
  for (const index of [0, 1, 2])
    assert.match(markup, new RegExp(`data-notebook-section="${index}"`));
  assert.equal((markup.match(/class="notebook-columns"/g) || []).length, 3);
});
