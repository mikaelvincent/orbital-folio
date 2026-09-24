import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { resolveAboutPhotos } from '../../lib/content/about-photos.ts';
import { resolveSocialScreens } from '../../lib/content/social-links.ts';

const portfolio = {
  site: {},
  media: [],
  projects: [],
  experience: [],
  journal: [],
  links: [
    {
      id: 'github',
      title: 'GitHub',
      url: 'https://github.com',
      aboutSlot: 'left',
      screen: 'right',
    },
    {
      id: 'website',
      title: 'Website',
      url: 'https://example.com',
      aboutSlot: 'center',
      screen: 'list',
    },
    {
      id: 'invalid',
      title: 'Invalid',
      url: 'javascript:alert(1)',
      aboutSlot: 'right',
      screen: 'list',
    },
  ],
};
const rimMaterial = (card) => {
  let rim;
  card.root.traverse((object) => {
    if (object.material?.name === `${card.interactableId}-hover-rim`)
      rim = object.material;
  });
  return rim;
};
const dispose = (model) => {
  model.group.userData.aboutPhotoPrints.dispose();
  const geometries = new Set(),
    materials = new Set();
  model.group.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [object.material].flat())
      if (material) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
};

test('About cards register only safe configured destinations, independent of Contact and passive portrait', () => {
  const model = createSpacecraft(THREE, {
    aboutPhotos: resolveAboutPhotos(portfolio),
    socials: resolveSocialScreens(portfolio.links),
  });
  try {
    const cards = model.group.userData.aboutSocialCards;
    assert.deepEqual(
      cards.map((card) => [card.side, card.link.id]),
      [
        ['left', 'github'],
        ['center', 'website'],
      ],
    );
    assert.equal(
      model.group.userData.socialScreens.find(
        (screen) => screen.side === 'right',
      ).link.id,
      'github',
    );
    for (const card of cards) {
      assert.ok(card.anchor.isObject3D);
      assert.equal(
        card.anchor.parent,
        card.root,
        'link follows its physical mount',
      );
      assert.ok(card.width >= 0.38 && card.height >= 0.38);
      assert.equal(card.root.userData.interactableId, card.interactableId);
      assert.equal(
        rimMaterial(card),
        undefined,
        'paper feedback has no raised frame',
      );
    }
    const postcard = model.group.getObjectByName(
      'personal-study-landscape-postcard-mount',
    );
    const empty = model.group.getObjectByName(
      'personal-study-curiosity-note-mount',
    );
    assert.ok(postcard && empty);
    assert.equal(postcard.userData.interactableId, undefined);
    assert.equal(empty.userData.interactableId, undefined);
    const photoBounds = new THREE.Box3().setFromObject(postcard);
    const photoSize = photoBounds.getSize(new THREE.Vector3());
    assert.ok(
      Math.abs(photoSize.x - photoSize.y) < 0.002,
      'the portrait backing and retainers form a square physical assembly',
    );
    const rightBounds = new THREE.Box3().setFromObject(empty);
    assert.ok(
      photoBounds.min.y > rightBounds.max.y,
      'the square portrait assembly clears the social print below it',
    );
    // Enlarging the three paper cards preserves a real gap between mounts.
    const left = new THREE.Box3().setFromObject(cards[0].root);
    const center = new THREE.Box3().setFromObject(cards[1].root);
    assert.ok(center.min.x > left.max.x);
  } finally {
    dispose(model);
  }
});

test('Social paper follows shared dim/hover states through arrival, reading and room departure', () => {
  const model = createSpacecraft(THREE, {
    aboutPhotos: resolveAboutPhotos(portfolio),
  });
  const [first, second] = model.group.userData.aboutSocialCards;
  try {
    const update = (state) =>
      model.update(1, state.activeRoom, true, {
        travelling: false,
        reading: false,
        hoveredObject: first.interactableId,
        ...state,
      });
    for (const state of [
      { activeRoom: 'home' },
      { activeRoom: 'about', travelling: true, transitRoom: 'about' },
      { activeRoom: 'about', hoveredObject: '' },
    ]) {
      update(state);
      assert.equal(first.root.userData.highlightLevel, 0.65);
    }
    update({ activeRoom: 'about' });
    assert.equal(first.root.userData.highlightLevel, 1.15);
    assert.equal(second.root.userData.highlightLevel, 0.65);
    for (const state of [
      { activeRoom: 'about', reading: true },
      { activeRoom: 'contact' },
    ]) {
      update(state);
      assert.equal(first.root.userData.highlightLevel, 0.65);
    }
  } finally {
    dispose(model);
  }
});
