import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  avoidZeroContributionLighting,
  directLightWorkChunk,
} from '../../features/spacecraft/materials/direct-light-work.ts';

// oxlint-disable typescript/unbound-method -- Hook references below test identity; invocation stays bound to the material.

test('installed Three lighting keeps contributing work and guards zero irradiance', () => {
  const original = THREE.ShaderChunk.lights_fragment_begin;
  const changed = directLightWorkChunk(original);
  assert.notEqual(
    changed,
    original,
    'review specialization when upgrading Three',
  );
  assert.match(
    changed,
    /if \( directLight.visible && dot\( geometryNormal, directLight.direction \) > 0.0 \)/,
  );
  assert.match(
    changed,
    /getDirectionalLightInfo\( directionalLight, directLight \);\s*if \( dot\( geometryNormal, directLight.direction \) > 0.0 \)/,
  );
  assert.equal(
    (changed.match(/RE_Direct\(/g) || []).length,
    (original.match(/RE_Direct\(/g) || []).length,
  );
  assert.equal(
    changed.slice(changed.indexOf('#if defined( RE_IndirectDiffuse )')),
    original.slice(original.indexOf('#if defined( RE_IndirectDiffuse )')),
  );
  assert.equal(
    THREE.ShaderChunk.lights_fragment_begin,
    original,
    'do not mutate global shaders',
  );
  assert.equal(
    directLightWorkChunk('upstream shader changed'),
    'upstream shader changed',
  );
});

test('compose authored hooks once, including shared and array materials; exclude Physical and unlit', () => {
  const standard = new THREE.MeshStandardMaterial();
  const physical = new THREE.MeshPhysicalMaterial({ clearcoat: 1 });
  const unlit = new THREE.MeshBasicMaterial();
  let calls = 0;
  standard.onBeforeCompile = function (shader) {
    assert.equal(this, standard);
    calls++;
    shader.fragmentShader += '\n// authored mask';
  };
  standard.customProgramCacheKey = () => 'authored-mask';
  const physicalHook = physical.onBeforeCompile,
    unlitHook = unlit.onBeforeCompile;
  const root = new THREE.Group();
  const geometry = new THREE.BoxGeometry();
  root.add(
    new THREE.Mesh(geometry, [standard, physical, unlit]),
    new THREE.Mesh(geometry, standard),
  );
  avoidZeroContributionLighting(THREE, root);
  const hook = standard.onBeforeCompile;
  avoidZeroContributionLighting(THREE, root);
  assert.equal(standard.onBeforeCompile, hook);
  assert.equal(physical.onBeforeCompile, physicalHook);
  assert.equal(unlit.onBeforeCompile, unlitHook);
  assert.equal(
    standard.customProgramCacheKey(),
    'authored-mask|zero-direct-light-v1',
  );
  const shader = { fragmentShader: '#include <lights_fragment_begin>' };
  standard.onBeforeCompile(shader, {});
  assert.equal(calls, 1);
  assert.match(shader.fragmentShader, /authored mask/);
  assert.match(shader.fragmentShader, /directLight.visible && dot/);
  geometry.dispose();
  standard.dispose();
  physical.dispose();
  unlit.dispose();
});

test('preserve a custom compile hook identity when Three supplies the default key', () => {
  const material = new THREE.MeshStandardMaterial();
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader += '\n// custom finish';
  };
  const key = material.customProgramCacheKey();
  const geometry = new THREE.BoxGeometry();
  avoidZeroContributionLighting(THREE, new THREE.Mesh(geometry, material));
  assert.equal(material.customProgramCacheKey(), `${key}|zero-direct-light-v1`);
  geometry.dispose();
  material.dispose();
});
