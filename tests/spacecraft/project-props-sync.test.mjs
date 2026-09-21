import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

const bundled = await build({
  entryPoints: ['features/spacecraft/spacecraft.tsx'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['react', 'react/jsx-runtime'],
  logLevel: 'silent',
  plugins: [
    {
      name: 'scene-lifecycle-fixture',
      setup(builder) {
        builder.onResolve(
          { filter: /^\.\/(spacecraft-runtime|scene-loader)$/ },
          ({ path }) => ({ path, namespace: 'fixture' }),
        );
        builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
          contents: path.endsWith('spacecraft-runtime')
            ? 'export const mountSpacecraftScene = globalThis.mountScene;'
            : 'export const SceneLoader = () => null;',
          loader: 'js',
        }));
      },
    },
  ],
});

// Execute the real shell's hooks/effect ordering with a stub scene lifecycle.
// This pure fixture does not mount DOM, render WebGL or contact a live server.
function fixture() {
  const require = createRequire(import.meta.url);
  const slots = [];
  const events = [];
  let cursor = 0,
    effects = [],
    synchronized;
  const loaded = { exports: {} };
  runInNewContext(bundled.outputFiles[0].text, {
    module: loaded,
    exports: loaded.exports,
    mountScene({ latest, api }) {
      synchronized = latest.current.projects;
      events.push({ type: 'mount' });
      api.current = {
        projects() {
          synchronized = latest.current.projects;
          events.push({ type: 'projects', projects: synchronized });
        },
        caseStudies() {
          events.push({
            type: 'caseStudies',
            caseStudies: latest.current.caseStudies,
          });
        },
        go() {
          events.push({
            type: 'go',
            projects: synchronized,
            screen: latest.current.projectScreen,
          });
        },
        pause() {},
        diagnostics() {},
      };
      return () => {
        events.push({ type: 'unmount' });
        api.current = null;
      };
    },
    require(id) {
      if (id !== 'react') return require(id);
      return {
        useRef(value) {
          return (slots[cursor++] ||= { current: value });
        },
        useState(initial) {
          return [initial, () => {}];
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
  return {
    events,
    render(props) {
      cursor = 0;
      effects = [];
      loaded.exports.Spacecraft(props);
      for (const effect of effects) effect();
    },
    unmount() {
      for (const slot of slots) slot.cleanup?.();
    },
  };
}

await test('project prop changes refresh the existing scene before framing, without remounting or unnecessary camera travel', () => {
  const scene = fixture();
  let props = {
    site: {},
    links: [],
    enabled: true,
    projects: [{ slug: 'relay', categories: ['systems'] }],
    section: 'projects',
    projectScreen: 'all',
    projectPage: 0,
    readingSurface: false,
    paused: false,
    diagnosticsEnabled: false,
  };
  scene.render(props);
  assert.deepEqual(
    scene.events.map(({ type }) => type),
    ['mount'],
  );
  scene.events.length = 0;

  props = { ...props, projects: [] };
  scene.render(props);
  assert.deepEqual(
    scene.events.map(({ type }) => type),
    ['projects'],
  );
  assert.equal(
    scene.events[0].projects,
    props.projects,
    'Empty collections reach the mounted scene',
  );
  scene.events.length = 0;

  props = {
    ...props,
    projects: [{ slug: 'fieldnotes', categories: ['interfaces'] }],
    projectScreen: 'interfaces',
    readingSurface: true,
  };
  scene.render(props);
  assert.deepEqual(
    scene.events.map(({ type }) => type),
    ['projects', 'go'],
  );
  assert.equal(
    scene.events[1].projects,
    props.projects,
    'Framing sees the new collection, not stale availability',
  );
  assert.equal(scene.events[1].screen, 'interfaces');
  scene.events.length = 0;

  scene.render({ ...props });
  assert.deepEqual(
    scene.events,
    [],
    'Unchanged collection and selection do not resync or travel',
  );
  scene.unmount();
  assert.deepEqual(
    scene.events.map(({ type }) => type),
    ['unmount'],
  );
});

await test('Case study updates refresh availability without remounting; category and detail changes keep the same terminal camera', () => {
  const scene = fixture();
  let props = {
    site: {},
    links: [],
    enabled: true,
    projects: [],
    caseStudies: [{ slug: 'study', categories: ['systems'] }],
    section: 'experience',
    caseStudyScreen: 'all',
    projectPage: 0,
    readingSurface: false,
    paused: false,
    diagnosticsEnabled: false,
  };
  scene.render(props);
  scene.events.length = 0;
  props = {
    ...props,
    caseStudies: [{ slug: 'study', categories: ['product'] }],
    readingSurface: true,
    caseStudyScreen: 'product',
  };
  scene.render(props);
  assert.deepEqual(
    scene.events.map((event) => event.type),
    ['caseStudies', 'go'],
  );
  assert.equal(scene.events[0].caseStudies, props.caseStudies);
  scene.events.length = 0;
  props = { ...props, slug: 'study' };
  scene.render(props);
  scene.render({ ...props, slug: undefined, caseStudyScreen: 'all' });
  assert.deepEqual(
    scene.events,
    [],
    'One terminal does not travel between its collection and stories',
  );
  props = { ...props, caseStudies: [], readingSurface: false };
  scene.render(props);
  assert.deepEqual(
    scene.events.map((event) => event.type),
    ['caseStudies', 'go'],
  );
  scene.unmount();
});
