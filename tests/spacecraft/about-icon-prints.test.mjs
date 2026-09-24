import test from 'node:test';
import assert from 'node:assert/strict';
import { createAboutPhotoPrints } from '../../features/spacecraft/rooms/about-photo-print.ts';
import { resolveAboutPhotos } from '../../lib/content/about-photos.ts';

function canvasHarness(t) {
  const frames = [],
    loads = [];
  const context = {
    clearRect() {
      frames.push([]);
    },
    fillRect() {},
    save() {},
    restore() {},
    translate() {},
    scale() {},
    fill(path) {
      frames.at(-1).push(['preset', path]);
    },
    stroke(path) {
      if (path) frames.at(-1).push(['preset', path]);
      else frames.at(-1).push(['arrow']);
    },
    measureText(text) {
      return { width: Array.from(text).length * 29 };
    },
    fillText(...args) {
      frames.at(-1).push(['label', ...args]);
    },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    drawImage(...args) {
      frames.at(-1).push(['image', ...args]);
    },
  };
  const imageClass = class {
    set src(value) {
      this.url = value;
      if (value) loads.push(this);
    }
    removeAttribute() {}
    complete(width, height) {
      this.naturalWidth = width;
      this.naturalHeight = height;
      this.onload();
    }
  };
  for (const [name, value] of Object.entries({
    document: { createElement: () => ({ getContext: () => context }) },
    Image: imageClass,
    Path2D: class {
      constructor(path) {
        this.path = path;
      }
    },
  })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() =>
      original
        ? Object.defineProperty(globalThis, name, original)
        : delete globalThis[name],
    );
  }
  const THREE = { CanvasTexture: class {}, SRGBColorSpace: 'srgb' };
  return { THREE, frames, loads };
}
const link = {
  id: 'github',
  title: 'GitHub',
  platform: 'github',
  url: 'https://github.com',
  aboutSlot: 'left',
};

test('retired social photographs never load or cover a preset icon', async (t) => {
  const { THREE, frames, loads } = canvasHarness(t);
  const social = resolveAboutPhotos({
    site: {},
    links: [{ ...link, photoMediaId: 'old' }],
    media: [{ id: 'old', mime: 'image/png', url: '/media/old' }],
  }).socials.left;
  const prints = createAboutPhotoPrints(THREE);
  try {
    prints.texture('social', 512, 512, null, social);
    await prints.ready();
    assert.equal(loads.length, 0);
    assert.equal(frames.length, 1);
    assert.deepEqual(
      frames[0].map(([type]) => type),
      ['preset', 'label', 'arrow'],
    );
  } finally {
    prints.dispose();
  }
});

test('custom PNG replaces the preset with its whole image above its printed destination, without cropping', async (t) => {
  const { THREE, frames, loads } = canvasHarness(t);
  let changes = 0;
  const prints = createAboutPhotoPrints(THREE, () => changes++);
  try {
    prints.texture('social', 512, 512, null, {
      link,
      icon: { media: { url: '/media/icon' } },
    });
    assert.deepEqual(
      frames[0].map(([type]) => type),
      ['preset', 'label', 'arrow'],
    );
    loads[0].complete(800, 400);
    await prints.ready();
    const painted = frames.at(-1);
    assert.equal(painted.length, 3);
    assert.deepEqual(painted[1].slice(0, 2), ['label', 'GitHub']);
    const [type, image, x, y, width, height] = painted[0];
    assert.equal(type, 'image');
    assert.equal(image.url, '/media/icon');
    assert.equal(
      painted[0].length,
      6,
      'draws the full source, with no source crop',
    );
    assert.equal(width / height, 2);
    assert.equal(x + width / 2, 256);
    assert.equal(y + height / 2, 512 * 0.39);
    assert.equal(changes, 1);
  } finally {
    prints.dispose();
  }
});

test('failed icons keep the preset, and disposed pending loads cannot repaint', async (t) => {
  const { THREE, frames, loads } = canvasHarness(t);
  let changes = 0;
  const prints = createAboutPhotoPrints(THREE, () => changes++);
  prints.texture('failed', 512, 512, null, {
    link,
    icon: { media: { url: '/media/failure' } },
  });
  loads[0].onerror();
  await prints.ready();
  assert.deepEqual(
    frames.at(-1).map(([type]) => type),
    ['preset', 'label', 'arrow'],
  );
  prints.texture('pending', 512, 512, null, {
    link,
    icon: { media: { url: '/media/pending' } },
  });
  const before = frames.length;
  prints.dispose();
  await prints.ready();
  assert.equal(frames.length, before);
  assert.equal(changes, 1);
  assert.equal(loads[1].onload, null);
  assert.equal(loads[1].onerror, null);
});

test('long display names fit the paper and email cards do not promise a new tab', (t) => {
  const { THREE, frames } = canvasHarness(t);
  const prints = createAboutPhotoPrints(THREE);
  try {
    prints.texture('social', 512, 512, null, {
      link: {
        ...link,
        title: 'A deliberately long owner-authored profile name',
      },
      icon: null,
    });
    const [, label, x] = frames[0].find(([kind]) => kind === 'label');
    assert.ok(label.endsWith('…'));
    assert.ok(x >= 512 * 0.09);
    assert.ok(x + label.length * 29 <= 512 * 0.91);
    prints.texture('email', 512, 512, null, {
      link: { ...link, title: 'Email', url: 'mailto:hello@example.com' },
      icon: null,
    });
    assert.deepEqual(
      frames.at(-1).map(([kind]) => kind),
      ['preset', 'label'],
    );
  } finally {
    prints.dispose();
  }
});
