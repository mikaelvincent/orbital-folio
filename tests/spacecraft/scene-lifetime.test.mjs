import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { runInNewContext } from 'node:vm';
import * as THREE from 'three';
import { createSceneLifetime } from '../../features/spacecraft/scene-lifetime.ts';

await test('partial ownership unwinds once, including after a disposer throws', (t) => {
  const errors = t.mock.method(console, 'error', () => {});
  const lifetime = createSceneLifetime();
  const events = [];
  lifetime.defer(() => events.push('context'));
  const early = lifetime.defer(() => events.push('temporary environment'));
  early();
  lifetime.defer(() => {
    events.push('failed disposer');
    throw Error('fixture');
  });
  lifetime.defer(() => events.push('listeners'));
  lifetime.dispose();
  lifetime.dispose();
  early();
  lifetime.defer(() => events.push('late resource'));
  assert.deepEqual(events, [
    'temporary environment',
    'listeners',
    'failed disposer',
    'context',
    'late resource',
  ]);
  assert.equal(errors.mock.callCount(), 1);
});

// Execute the actual initialization path with controllable resource failures.
// Replace imports, not lifecycle code; no browser, WebGL or live server is used.
const file = 'features/spacecraft/spacecraft-runtime.ts';
let source = fs.readFileSync(file, 'utf8');
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
for (const node of [...ast.statements].reverse())
  if (ts.isImportDeclaration(node))
    source = source.slice(0, node.pos) + source.slice(node.end);
source =
  ts
    .transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    })
    .outputText.replace(
      'export function mountSpacecraftScene',
      'function mountSpacecraftScene',
    )
    .replaceAll('import(', 'load(') +
  '\nmodule.exports = { mountSpacecraftScene };';

class Element {
  children = [];
  dataset = {};
  style = {};
  clientWidth = 1280;
  clientHeight = 720;
  appendChild(child) {
    this.children.push(child);
    child.parent = this;
  }
  remove() {
    if (this.parent)
      this.parent.children = this.parent.children.filter(
        (child) => child !== this,
      );
  }
  setAttribute() {}
}
for (const failAt of ['context', 'pmrem', 'room', 'environment', 'model']) {
  await test(`renderer failure at ${failAt} releases every acquired resource and mounted node`, async () => {
    const made = [];
    const disposed = [];
    const surfaces = [];
    const fail = (stage) => {
      if (failAt === stage) throw Error('Injected ' + stage);
    };
    const resource = (name) => {
      made.push(name);
      return {
        dispose() {
          disposed.push(name);
        },
      };
    };
    const host = { current: new Element() };
    let unavailable = 0;
    let finish;
    const failed = new Promise((resolve) => {
      finish = resolve;
    });
    const loaded = { exports: {} };
    const three = {
      ...THREE,
      WebGLRenderer: class {
        domElement = new Element();
        shadowMap = {};
        info = {};
        capabilities = { maxTextureSize: 4096 };
        extensions = { has: () => false };
        constructor() {
          Object.assign(this, resource('renderer'));
        }
        getContext() {
          fail('context');
          return {};
        }
        setPixelRatio() {}
      },
      PMREMGenerator: class {
        constructor() {
          fail('pmrem');
          Object.assign(this, resource('pmrem'));
        }
        fromScene() {
          fail('environment');
          return { ...resource('environment'), texture: {} };
        }
      },
    };
    runInNewContext(source, {
      module: loaded,
      console: { error() {} },
      navigator: { hardwareConcurrency: 8 },
      devicePixelRatio: 1,
      crypto,
      document: { createElement: () => new Element() },
      AbortController,
      performance,
      process: { env: { NODE_ENV: 'test' } },
      createSceneLifetime,
      DEFAULT_RENDERING_SETTINGS: {},
      resolveRenderingSettings: () => ({ pixelDensity: 1 }),
      createProjectedSurface: () => ({}),
      createVesselCameraFrame: () => ({}),
      createOrbitalWorldReference: () => ({}),
      VESSEL_LIGHTING: {},
      resolveSocialScreens: () => [],
      resolveAboutPhotos: () => [],
      copy: (_s, value) => value,
      load: async (path) => {
        if (path === 'three') return three;
        if (path.endsWith('CSS3DRenderer.js'))
          return {
            CSS3DRenderer: class {
              domElement = new Element();
            },
          };
        if (path.endsWith('RoomEnvironment.js'))
          return {
            RoomEnvironment: class {
              constructor() {
                fail('room');
                Object.assign(this, resource('room'));
              }
            },
          };
        if (path === './spacecraft-model')
          return { createSpacecraft: () => fail('model') };
        return {};
      },
    });
    const latest = {
      current: {
        projects: [],
        caseStudies: [],
        links: [],
        onSurfaceReady: (value) => surfaces.push(value),
        onNotebookSurfaceReady: (value) => surfaces.push(value),
        onUnavailable: () => {
          unavailable++;
          finish();
        },
      },
    };
    const unmount = loaded.exports.mountSpacecraftScene({
      host,
      latest,
      api: { current: null },
      setState() {},
      site: {},
    });
    await failed;
    unmount();
    assert.deepEqual(
      [...disposed].sort((a, b) => a.localeCompare(b)),
      [...made].sort((a, b) => a.localeCompare(b)),
    );
    assert.equal(unavailable, 1);
    assert.equal(host.current.children.length, 0);
    if (surfaces.length) assert.deepEqual(surfaces.slice(-2), [null, null]);
  });
}
