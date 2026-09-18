/** Developer-only orbital art fixture; no spacecraft/AO/vessel lighting.
 * node scripts/benchmarks/sky-composition-preview.mjs
 * Snapshots both revisions at server startup. Restart after source edits.
 * Frozen frames by default; Play is explicitly opt-in. This is not a benchmark.
 */
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { dirname, join, resolve, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const publicRoot = await fs.realpath(join(root, 'public'));
const baselineRevision = '29ffee1';
const run = promisify(execFile);
const sourcePaths = [
  'orbital-environment.ts',
  'earth-view-transform.ts',
  'night-atmosphere.ts',
].map((name) => `features/orbit/${name}`);
const snapshots = { baseline: {}, current: {} };
for (const path of sourcePaths) {
  snapshots.baseline[path] = (
    await run('git', ['show', `${baselineRevision}:${path}`], { cwd: root })
  ).stdout;
  snapshots.current[path] = await fs.readFile(join(root, path), 'utf8');
}
const hash = (source) => createHash('sha256').update(source).digest('hex');
const manifest = {
  builtAt: new Date().toISOString(),
  baselineRevision,
  note: 'Orbital scene only; no spacecraft, AO, or vessel lighting. Finite stills unless Play. Other dependencies use the current checkout. Counts are descriptive, not timings.',
  variants: Object.fromEntries(
    Object.entries(snapshots).map(([variant, sources]) => [
      variant,
      Object.fromEntries(
        Object.entries(sources).map(([path, source]) => [path, hash(source)]),
      ),
    ]),
  ),
};
const client = `
import * as THREE from 'three';
import { createOrbitalEnvironment } from './features/orbit/orbital-environment';
const params = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .95;
renderer.setClearColor('#050a11', 1);
renderer.domElement.setAttribute('aria-label', 'Orbital art comparison without spacecraft');
document.body.appendChild(renderer.domElement);
const worldCamera = new THREE.PerspectiveCamera(38, 1, .1, 1200);
const reference = new THREE.PerspectiveCamera(38, 1, .1, 1200);
reference.updateMatrixWorld(true);
const poses = {
  neutral: [0, 0, 0],
  left: [-.32, 0, 0], right: [.32, 0, 0],
  up: [0, .18, 0], down: [0, -.18, 0],
  'upper-left': [-.32, .18, 0], 'upper-right': [.32, .18, 0],
  'lower-left': [-.32, -.18, 0], 'lower-right': [.32, -.18, 0],
  portrait: [0, 0, Math.PI / 2],
  'portrait-upper-left': [-.32, .18, Math.PI / 2],
  'portrait-lower-right': [.32, -.18, Math.PI / 2],
};
let time = Math.max(0, Number(params.get('time')) || 0);
let playing = false, frame = 0, previousTick = 0, ready = false;
const timeSelect = document.getElementById('time');
const poseSelect = document.getElementById('pose');
const starsOnly = document.getElementById('stars-only');
const status = document.getElementById('status');
const play = document.getElementById('play');
for (const name of Object.keys(poses)) poseSelect.add(new Option(name, name));
poseSelect.value = params.get('pose') in poses ? params.get('pose') : 'neutral';
starsOnly.checked = params.get('starsOnly') === '1';
if (![...timeSelect.options].some(option => Number(option.value) === time)) timeSelect.add(new Option(String(time), String(time)));
timeSelect.value = String(time);
let environment;
const meteorMeshes = [];
function draw() {
  if (!ready) return;
  const [yaw, pitch, roll] = poses[poseSelect.value];
  worldCamera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ'));
  worldCamera.updateMatrixWorld(true);
  environment.followCamera(worldCamera, reference);
  environment.update(time, true, 0, 0);
  environment.scene.getObjectByName('satellite-earth-surface').parent.visible = !starsOnly.checked;
  // Production update restores each meteor's natural visibility on the next
  // draw; suppress only the comparison frame, without disposing resources.
  if (starsOnly.checked) for (const mesh of meteorMeshes) mesh.visible = false;
  renderer.render(environment.scene, environment.camera);
  const buffer = renderer.getDrawingBufferSize(new THREE.Vector2());
  const diagnostics = environment.getDiagnostics();
  const snapshot = {
    variant: document.body.dataset.variant, time, pose: poseSelect.value,
    yaw, pitch, roll, playing, starsOnly: starsOnly.checked,
    viewport: [innerWidth, innerHeight], dpr: renderer.getPixelRatio(),
    drawingBuffer: buffer.toArray(), cameraFov: 38,
    render: { ...renderer.info.render }, memory: { ...renderer.info.memory }, diagnostics,
  };
  document.body.dataset.ready = 'true';
  document.body.dataset.snapshot = JSON.stringify(snapshot);
  document.body.dataset.time = time.toFixed(3);
  status.textContent = snapshot.variant + ' · ' + time.toFixed(2) + ' s · ' + poseSelect.value +
    ' · ' + innerWidth + '×' + innerHeight + ' @ ' + snapshot.dpr + ' DPR · ' +
    snapshot.render.calls + ' draws / ' + snapshot.render.points + ' points / ' + snapshot.render.triangles + ' triangles';
}
function resize() {
  renderer.setPixelRatio(devicePixelRatio || 1);
  renderer.setSize(innerWidth, innerHeight);
  worldCamera.aspect = innerWidth / Math.max(1, innerHeight);
  worldCamera.updateProjectionMatrix();
  environment.resize(innerWidth, innerHeight, renderer.getPixelRatio());
  draw();
}
function tick(now) {
  if (!playing) return;
  time += Math.max(0, now - previousTick) / 1000;
  previousTick = now;
  draw();
  frame = requestAnimationFrame(tick);
}
function stop() {
  playing = false;
  cancelAnimationFrame(frame);
  play.textContent = 'Play';
}
function setUrl() {
  const url = new URL(location.href);
  url.searchParams.set('time', String(time));
  url.searchParams.set('pose', poseSelect.value);
  url.searchParams.set('starsOnly', starsOnly.checked ? '1' : '0');
  return url;
}
play.onclick = () => {
  if (playing) { stop(); draw(); return; }
  playing = true; play.textContent = 'Pause'; previousTick = performance.now();
  frame = requestAnimationFrame(tick);
};
// Reloading creates a fresh environment clock, so backward seeking also resets
// night-Earth openingElapsed without changing production animation internals.
timeSelect.onchange = () => { stop(); time = Number(timeSelect.value); location.assign(setUrl()); };
poseSelect.onchange = starsOnly.onchange = () => { history.replaceState(null, '', setUrl()); draw(); };
for (const link of document.querySelectorAll('[data-variant-link]')) link.onclick = event => {
  event.preventDefault(); stop(); const url = setUrl(); url.pathname = '/' + link.dataset.variantLink; location.assign(url);
};
document.getElementById('hide').onclick = () => document.getElementById('controls').hidden = true;
addEventListener('keydown', event => {
  if (event.key === 'Escape') document.getElementById('controls').hidden = false;
});
addEventListener('visibilitychange', () => { if (document.hidden && playing) { stop(); draw(); } });
addEventListener('resize', resize);
addEventListener('pagehide', () => { stop(); ready = false; environment.dispose(); renderer.dispose(); }, { once: true });
try {
  environment = createOrbitalEnvironment(THREE, () => {}, {
    earthAppearance: 'night', earthTextureWidth: 8192, cameraFov: 38, mobile: innerWidth < 700,
  });
  await environment.ready;
  if (!environment.getDiagnostics().earthReady) throw new Error('8K Earth failed to load');
  environment.scene.traverse(object => {
    if (object.isMesh && object.material?.uniforms?.head && object.material?.uniforms?.tailLength) meteorMeshes.push(object);
  });
  ready = true;
  environment.update(0, true, 0, 0);
  resize();
} catch (error) { status.textContent = String(error); document.body.dataset.error = String(error); }
`;
const bundles = {};
for (const [variant, sources] of Object.entries(snapshots)) {
  const result = await build({
    absWorkingDir: root,
    stdin: { contents: client, resolveDir: root, loader: 'ts' },
    write: false,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    plugins: [
      {
        name: 'source-snapshot',
        setup(builder) {
          builder.onLoad(
            {
              filter:
                /\/(orbital-environment|earth-view-transform|night-atmosphere)\.ts$/,
            },
            (args) => {
              const path = relative(root, args.path).split(sep).join('/');
              return {
                contents: sources[path],
                loader: 'ts',
                resolveDir: dirname(args.path),
              };
            },
          );
        },
      },
    ],
  });
  bundles[variant] = result.outputFiles[0].contents;
}
function html(variant) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Orbital art — ${variant}</title><style>
    body{margin:0;background:#050a11;color:#eee9dc;font:12px system-ui}canvas{display:block}#controls{position:fixed;z-index:2;top:8px;left:8px;max-width:calc(100vw - 44px);padding:12px;background:#101826ed;border:1px solid #465a72;border-radius:10px}nav,.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}a{color:#bdd7ec}select,button{font:inherit;padding:4px;color:#eee9dc;background:#19293b;border:1px solid #607484;border-radius:4px}p{max-width:620px;margin:8px 0}label{display:inline-flex;align-items:center;gap:5px}[hidden]{display:none!important}
    </style></head><body data-variant="${variant}"><aside id="controls"><nav><a href="/baseline" data-variant-link="baseline">Baseline ${baselineRevision}</a><a href="/current" data-variant-link="current">Current snapshot</a><a href="/manifest.json" target="_blank">Source hashes</a></nav><p>Orbital-only art fixture: no spacecraft, AO, or vessel lights. Stills by default; counts are not timings.</p><div class="row"><label>Time (seconds)<select id="time">${[0, 2, 4, 60, 180, 300, 600, 900].map((value) => `<option>${value}</option>`).join('')}</select></label><label>Camera<select id="pose"></select></label><label><input type="checkbox" id="stars-only">Stars only (hide Earth and meteors)</label><button id="play">Play</button><button id="hide">Hide controls (Esc restores)</button></div><p id="status" role="status">Loading 8K Earth…</p></aside><script type="module" src="/${variant}.js"></script></body></html>`;
}
const server = createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }
  const send = (type, body) => {
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'no-store');
    res.end(req.method === 'HEAD' ? undefined : body);
  };
  try {
    const path = decodeURIComponent(
      new URL(req.url, 'http://127.0.0.1:3021').pathname,
    );
    const variant = path.slice(1) || 'current';
    if (Object.hasOwn(bundles, variant)) {
      send('text/html; charset=utf-8', html(variant));
      return;
    }
    if (path === '/manifest.json') {
      send('application/json', JSON.stringify(manifest, null, 2));
      return;
    }
    if (
      variant.endsWith('.js') &&
      Object.hasOwn(bundles, variant.slice(0, -3))
    ) {
      send('text/javascript', bundles[variant.slice(0, -3)]);
      return;
    }
    const asset = resolve(publicRoot, '.' + path);
    if (!asset.startsWith(publicRoot + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const canonical = await fs.realpath(asset);
    if (!canonical.startsWith(publicRoot + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const type =
      {
        '.jpg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.json': 'application/json',
      }[extname(canonical)] || 'application/octet-stream';
    send(type, await fs.readFile(canonical));
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});
server.listen(3021, '127.0.0.1', () =>
  console.log('Orbital art snapshot: http://127.0.0.1:3021/current'),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => server.close(() => process.exit(0)));
