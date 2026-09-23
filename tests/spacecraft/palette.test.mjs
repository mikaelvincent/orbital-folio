import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PALETTE, paletteAccent } from '../../lib/palette.ts';
import { createModelPrimitives } from '../../features/spacecraft/geometry/model-primitives.ts';

const luminance = (hex) => {
  const [r, g, b] = hex
    .slice(1)
    .match(/../g)
    .map((v) => {
      const s = parseInt(v, 16) / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
};
const contrast = (a, b) => {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
};

test('Old default accents resolve to bronze without changing custom metadata', () => {
  for (const value of [undefined, '#ffb547', '#FFB547', '#e6a34c'])
    assert.equal(paletteAccent(value), PALETTE.bronze);
  assert.equal(paletteAccent('#80d7de'), '#80d7de');
});

test('Authored paint reaches Three.js without the retired saturation transform', () => {
  const h = createModelPrimitives(THREE, new THREE.Group(), '#ffb547', {});
  for (const [material, color] of [
    [h.m.shell, PALETTE.ivory],
    [h.m.wall, PALETTE.ivory],
    [h.m.navy, PALETTE.carbon],
    [h.m.amber, PALETTE.bronze],
  ])
    assert.equal(material.color.getHexString(), color.slice(1).toLowerCase());
  for (const material of Object.values(h.m)) material.dispose();
});

test('Functional text variants pass contrast on their intended surfaces', () => {
  for (const [ink, surface] of [
    [PALETTE.ivory, PALETTE.carbon],
    [PALETTE.textMuted, PALETTE.carbonRaised],
    [PALETTE.bronzeLight, PALETTE.carbon],
    [PALETTE.bronzeDark, PALETTE.ivory],
  ])
    assert.ok(contrast(ink, surface) >= 4.5, `${ink} on ${surface}`);
  // Prevent base bronze from being mistaken for an accessible text token.
  assert.ok(contrast(PALETTE.bronze, PALETTE.carbon) < 4.5);
  assert.ok(contrast(PALETTE.bronze, PALETTE.ivory) < 4.5);
});
