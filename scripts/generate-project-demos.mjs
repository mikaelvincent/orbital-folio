/** Offline, code-authored demo visuals. macOS Swift/AVFoundation encodes the MP4.
 * Run `node scripts/generate-project-demos.mjs`; no network or persisted content changes. */
import sharp from 'sharp';
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  copyFile,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(root, 'scripts/assets/project-demos');
const temporary = await mkdtemp(resolve(tmpdir(), 'orbital-project-demo-'));
const projects = [
  ['relay', 'Relay', 'Durable work. Visible state.', 'systems'],
  ['beacon', 'Beacon', 'A useful signal in the noise.', 'systems'],
  ['parcel', 'Parcel', 'Every file has a delivery path.', 'systems'],
  ['tempo', 'Tempo', 'Scheduled work, explained.', 'systems'],
  ['atlas', 'Atlas', 'Search with useful context.', 'systems'],
  ['fieldnotes', 'Fieldnotes', 'A shared place for good ideas.', 'interfaces'],
  ['ledger', 'Ledger', 'A plan you can follow.', 'interfaces'],
  ['harbor', 'Harbor', 'Small releases. Clear decisions.', 'interfaces'],
  ['meter', 'Meter', 'Explore the shape of a workload.', 'experiments'],
];
const assets = [];
const gifOnly = process.argv.includes('--gif-only');
const text = (x, y, value, size = 18, color = '#dce5e7', weight = 400) =>
  `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${value}</text>`;
const rect = (x, y, w, h, fill = '#152b3d', radius = 12, stroke = '#385266') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;
function cover(name, subtitle, category, index) {
  const accent =
    category === 'systems'
      ? '#e6af5b'
      : category === 'interfaces'
        ? '#88c3cc'
        : '#b5c99c';
  let content = '';
  if (category === 'systems') {
    const labels =
      index === 0
        ? ['Accept', 'Persist', 'Run', 'Complete']
        : index === 1
          ? ['Receive', 'Correlate', 'Inspect', 'Resolve']
          : index === 2
            ? ['Upload', 'Verify', 'Process', 'Deliver']
            : index === 3
              ? ['Plan', 'Lease', 'Execute', 'Record']
              : ['Index', 'Authorize', 'Rank', 'Return'];
    content += `<path d="M125 296 H835" stroke="#345168" stroke-width="5"/>`;
    labels.forEach((label, i) => {
      const x = 80 + i * 208;
      content +=
        rect(x, 247, 168, 102, '#142b3e') +
        text(x + 20, 283, String(i + 1).padStart(2, '0'), 14, accent) +
        text(x + 20, 322, label, 21, '#e4eaec', 600);
    });
    content +=
      rect(80, 385, 800, 112, '#101f30') +
      text(103, 418, 'EVENT TIMELINE', 12, '#7fa3b3', 700);
    for (let i = 0; i < 34; i++) {
      const h = 10 + ((i * 17 + index * 23) % 47);
      content += `<rect x="${107 + i * 22}" y="${478 - h}" width="10" height="${h}" rx="4" fill="${i < 22 ? accent : '#345168'}" opacity="${0.48 + (i % 3) * 0.2}"/>`;
    }
  } else if (category === 'interfaces') {
    content +=
      rect(70, 212, 820, 297, '#111f2e') +
      rect(88, 230, 171, 260, '#152b3b') +
      text(110, 264, 'WORKSPACE', 12, '#84a6b7', 700);
    ['Overview', 'Drafts', 'Review', 'History'].forEach((label, i) => {
      if (i === 1) content += rect(100, 315, 146, 38, '#254756', 8, '#254756');
      content += text(
        114,
        306 + i * 37,
        label,
        15,
        i === 1 ? '#ddebef' : '#8ea8b5',
      );
    });
    content += text(
      285,
      261,
      name === 'Fieldnotes'
        ? 'The shared library'
        : name === 'Ledger'
          ? 'Quarterly plan'
          : 'Release sequence',
      22,
      '#dce6e9',
      600,
    );
    for (let i = 0; i < 3; i++) {
      const x = 284 + i * 189;
      content += rect(x, 287, 171, 157, '#193247');
      content +=
        `<path d="M${x + 20} 330 h${80 - i * 13} m-${80 - i * 13} 18 h${114 - i * 11} m-${114 - i * 11} 18 h${68 + i * 15}" stroke="#759bac" stroke-width="6" stroke-linecap="round"/>` +
        text(
          x + 18,
          410,
          ['Draft', 'In review', 'Published'][i],
          13,
          i === 2 ? accent : '#9fb4be',
        );
    }
    content += text(
      286,
      478,
      'A clear revision. A deliberate next step.',
      14,
      '#88a8b8',
    );
  } else {
    content += rect(76, 214, 810, 296, '#111f2e');
    for (let i = 0; i < 5; i++)
      content += `<path d="M125 ${265 + i * 45} H842" stroke="#263f52"/>`;
    content +=
      `<path d="M126 455 C240 452 238 387 345 387 S450 349 527 352 S680 263 835 251" fill="none" stroke="${accent}" stroke-width="6" stroke-linecap="round"/><path d="M126 455 C242 448 298 435 362 422 S620 390 835 344" fill="none" stroke="#6997af" stroke-width="4" stroke-dasharray="8 7"/>` +
      text(122, 247, 'SCENARIO COMPARISON', 12, '#90afbd', 700) +
      text(648, 477, 'workload →', 13, '#90afbd');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#203c51"/><stop offset="1" stop-color="#091523"/></linearGradient></defs><rect width="960" height="600" fill="url(#bg)"/>${text(76, 58, category.toUpperCase() + ' / ' + String(index + 1).padStart(2, '0'), 12, accent, 700)}${text(74, 130, name, 56, '#eff0e9', 700)}${text(77, 166, subtitle, 20, '#adc0c9')}${content}<path d="M76 551 H884" stroke="#344e61"/>${text(76, 578, 'DESIGN EXPLORATION', 11, '#799bad', 600)}${text(755, 578, 'ORBITAL / 2026', 11, '#799bad', 600)}</svg>`;
}
function frame(progress) {
  const xs = [76, 238, 400, 562],
    labels = ['ACCEPTED', 'QUEUED', 'RUNNING', 'COMPLETE'];
  const dot = 76 + 486 * progress;
  let shapes = `<path d="M76 195 H562" stroke="#39546a" stroke-width="5"/><path d="M76 195 H${dot}" stroke="#d9ad64" stroke-width="5"/>`;
  xs.forEach((x, i) => {
    shapes +=
      `<circle cx="${x}" cy="195" r="22" fill="${dot >= x ? '#d9ad64' : '#192f42'}" stroke="#698491" stroke-width="2"/>` +
      text(x - 20, 249, labels[i], 10, dot >= x ? '#e8d5ae' : '#9eb5c1', 600);
  });
  shapes += `<circle cx="${dot}" cy="195" r="7" fill="#fcf1cf"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#101f30"/>${text(34, 42, 'RELAY / JOB LIFECYCLE', 14, '#81a8bb', 700)}${text(34, 92, 'One request. A traceable journey.', 27, '#e5e9e7', 600)}${text(34, 123, 'Synthetic events · explicit state transitions', 14, '#92acb9')}${shapes}<rect x="34" y="298" width="572" height="5" rx="2" fill="#2b4257"/><rect x="34" y="298" width="${572 * progress}" height="5" rx="2" fill="#d9ad64"/>${text(34, 332, 'Accept → persist → execute → acknowledge', 12, '#a6bac4')}</svg>`;
}
async function record(key, file, mime, title, alt, extras = {}) {
  const bytes = await readFile(resolve(output, file));
  assets.push({
    key,
    file,
    mime,
    title,
    alt,
    size: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    ...extras,
  });
}
try {
  await mkdir(output, { recursive: true });
  for (const [index, [slug, name, subtitle, category]] of projects.entries()) {
    if (!gifOnly)
      await sharp(Buffer.from(cover(name, subtitle, category, index)))
        .webp({ quality: 86 })
        .toFile(resolve(output, slug + '.webp'));
    await record(
      slug,
      slug + '.webp',
      'image/webp',
      name + ' interface overview',
      `A code-authored ${name} design illustration showing ${category === 'systems' ? 'a service pipeline and event timeline' : category === 'interfaces' ? 'a workspace with revision cards' : 'two workload scenario curves'}.`,
    );
  }
  const frames = resolve(temporary, 'frames');
  await mkdir(frames);
  if (!gifOnly) {
    for (let i = 0; i < 48; i++)
      await sharp(Buffer.from(frame(i / 47)))
        .png()
        .toFile(resolve(frames, String(i).padStart(3, '0') + '.png'));
    // AVFoundation can leave .sb-* sidecars beside its destination, including
    // after successful network optimization. Keep all encoder output temporary.
    const encodedVideo = resolve(temporary, 'relay-lifecycle.mp4');
    execFileSync(
      '/usr/bin/swift',
      [
        resolve(root, 'scripts/demo-projects/encode-video.swift'),
        frames,
        encodedVideo,
        '12',
      ],
      { stdio: 'inherit', timeout: 120000 },
    );
    await copyFile(encodedVideo, resolve(output, 'relay-lifecycle.mp4'));
  }
  const gifFrames = [];
  for (let i = 0; i < 24; i++)
    gifFrames.push(
      await sharp(Buffer.from(frame(i / 23)))
        .resize(320, 180)
        .ensureAlpha()
        .raw()
        .toBuffer(),
    );
  await sharp(Buffer.concat(gifFrames), {
    raw: { width: 320, height: 180 * 24, channels: 4, pageHeight: 180 },
  })
    .gif({ loop: 2, delay: Array(24).fill(80), colours: 64, dither: 0 })
    .toFile(resolve(output, 'relay-lifecycle.gif'));
  await writeFile(
    resolve(output, 'relay-lifecycle.vtt'),
    'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nA request is accepted and its intent is stored.\n\n00:00:01.000 --> 00:00:02.500\nThe queued job is picked up by a worker.\n\n00:00:02.500 --> 00:00:04.000\nThe worker completes the job and acknowledges the result.\n',
  );
  await record(
    'relay-captions',
    'relay-lifecycle.vtt',
    'text/vtt',
    'Lifecycle captions',
    'English descriptions of the silent queue lifecycle animation.',
  );
  await record(
    'relay-video',
    'relay-lifecycle.mp4',
    'video/mp4',
    'Relay lifecycle walkthrough',
    'A silent four-second animation of a request moving through accepted, queued, running and completed states.',
    {
      poster: 'relay',
      captions: 'relay-captions',
      width: 640,
      height: 360,
      durationSeconds: 4,
    },
  );
  await record(
    'relay-motion',
    'relay-lifecycle.gif',
    'image/gif',
    'Relay retry sequence',
    'An animated diagram of a request moving through four service states; it stops after two short passes.',
    {
      width: 320,
      height: 180,
      frames: 24,
      loop: 2,
      frameDelayMilliseconds: 80,
      totalDurationSeconds: 3.84,
    },
  );
  await writeFile(
    resolve(output, 'manifest.json'),
    JSON.stringify(
      {
        format: 'orbital-demo-media/v1',
        provenance:
          'Offline code-authored SVG diagrams rasterized with Sharp; MP4 encoded using macOS AVFoundation. Synthetic illustrations, no user data, recordings, external assets or real performance claims.',
        assets,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    JSON.stringify(
      {
        assets: assets.length,
        totalBytes: assets.reduce((n, a) => n + a.size, 0),
        sizes: assets.map((a) => ({ file: a.file, bytes: a.size })),
      },
      null,
      2,
    ),
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
