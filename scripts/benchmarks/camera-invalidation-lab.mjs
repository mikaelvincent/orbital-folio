/** Frozen developer lab for the delivered portfolio runtime. Never imported by the app.
 * node scripts/benchmarks/camera-invalidation-lab.mjs [--port 3019]
 *   [--thermal-sampler /absolute/path/to/compiled-sampler]
 * Compile/build before recovery periods; this server has no watchers.
 */
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}
const port = Number(argument('--port', '3019'));
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Choose an unprivileged local port.');
const sampler = argument('--thermal-sampler', null);
if (sampler && !sampler.startsWith('/'))
  throw new Error('The optional compiled sampler requires an absolute path.');
if (sampler) await fs.access(sampler, 1);
const execute = promisify(execFile);
const snapshot = await fs.mkdtemp(join(tmpdir(), 'orbital-camera-lab-'));
const bundle = join(snapshot, 'bundle');
const evidence = join(root, 'docs/evidence/performance/camera-invalidation');
const hash = (data) => createHash('sha256').update(data).digest('hex');
const result = await build({
  absWorkingDir: root,
  entryPoints: ['scripts/benchmarks/camera-invalidation-lab.tsx'],
  outdir: bundle,
  entryNames: 'camera-invalidation-lab',
  chunkNames: 'chunks/[name]-[hash]',
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  metafile: true,
  define: { 'process.env.NODE_ENV': '"production"' },
});
const appCssPath = join(root, 'app/globals.css');
const appCss = await postcss([tailwind({ base: root })]).process(
  await fs.readFile(appCssPath, 'utf8'),
  { from: appCssPath },
);
await fs.writeFile(join(bundle, 'portfolio.css'), appCss.css);
await fs.cp(join(root, 'public'), join(snapshot, 'public'), { recursive: true });
const sourcePaths = new Set([
  ...Object.keys(result.metafile.inputs),
  'app/globals.css',
  'scripts/benchmarks/camera-invalidation-lab.mjs',
  'package-lock.json',
]);
const sourceFiles = await Promise.all([...sourcePaths].sort().map(async (path) => {
  const data = await fs.readFile(resolve(root, path));
  return { path, bytes: data.byteLength, sha256: hash(data) };
}));
async function inventory(directory, prefix = '') {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const path = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await inventory(join(directory, entry.name), path + '/'));
    else {
      const data = await fs.readFile(join(directory, entry.name));
      files.push({ path, bytes: data.byteLength, sha256: hash(data) });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
const manifest = {
  schemaVersion: 1,
  snapshotId: randomUUID(),
  builtAt: new Date().toISOString(),
  node: process.version,
  sourceFiles,
  bundleFiles: await inventory(bundle),
  publicFiles: await inventory(join(snapshot, 'public')),
  fixture: 'Published seed records via toPortfolio; no private database or contact API.',
  runtime: 'Actual ImmersivePortfolio, application CSS, renderer/model/navigation and approved 8K Earth. Production React compilation in a standalone developer harness, not the deployed Vinext server.',
  nativeContext: sampler ? {
    enabled: true,
    executable: sampler,
    sha256: hash(await fs.readFile(sampler)),
    arguments: ['--pmset', '--settings'],
  } : { enabled: false, availability: 'unknown' },
};
await fs.writeFile(join(snapshot, 'build-manifest.json'), JSON.stringify(manifest, null, 2));
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Delivered camera measurement lab</title><link rel="stylesheet" href="/lab/portfolio.css"><link rel="stylesheet" href="/lab/camera-invalidation-lab.css"></head><body><div id="portfolio-root"></div><div id="camera-lab-controls"></div><script type="module" src="/lab/camera-invalidation-lab.js"></script></body></html>`;
const status = { builtAt: manifest.builtAt, snapshotId: manifest.snapshotId, phase: 'ready', progress: null, saved: [] };
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gz': 'application/gzip', '.woff2': 'font/woff2' };
function json(response, code, value) {
  response.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}
async function body(request) {
  const buffers = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 96 * 1024 * 1024) throw new Error('Result exceeds the 96 MiB lab limit.');
    buffers.push(chunk);
  }
  return JSON.parse(Buffer.concat(buffers).toString('utf8'));
}
function sameOrigin(request) {
  const origin = request.headers.origin;
  return origin === `http://127.0.0.1:${port}` || origin === `http://localhost:${port}`;
}
async function nativeContext() {
  const capturedAt = new Date().toISOString();
  if (!sampler) return { availability: 'unknown', capturedAt, reason: 'No native sampler configured.' };
  try {
    const start = performance.now();
    const { stdout, stderr } = await execute(sampler, ['--pmset', '--settings'], { timeout: 6000, killSignal: 'SIGKILL', maxBuffer: 65536 });
    const native = JSON.parse(stdout);
    if (!native || typeof native.thermalState !== 'string') throw new Error('Malformed sampler output.');
    return { availability: 'available', capturedAt, native, stderr, sampleWallMs: performance.now() - start };
  } catch (error) {
    return { availability: 'unknown', capturedAt, error: String(error) };
  }
}
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${port}`).pathname);
    if (request.method === 'POST') {
      if (!sameOrigin(request) || !request.headers['content-type']?.startsWith('application/json')) {
        json(response, 403, { error: 'Local same-origin JSON requests only.' }); return;
      }
      if (pathname !== '/results' && pathname !== '/progress') {
        json(response, 405, { error: 'This fixture has no application write APIs.' }); return;
      }
      const value = await body(request);
      if (pathname === '/progress') {
        status.phase = typeof value.phase === 'string' ? value.phase.slice(0, 120) : 'running';
        status.progress = value;
        json(response, 200, { saved: false }); return;
      }
      if (!value || typeof value.runId !== 'string' || !/^[a-z0-9][a-z0-9-]{1,100}$/.test(value.runId) || !value.report || typeof value.report !== 'object') {
        json(response, 400, { error: 'Invalid run ID or report.' }); return;
      }
      await fs.mkdir(evidence, { recursive: true });
      const report = { ...value.report, manifest };
      // Verification images are generated only by the lab's public fixture.
      // Keep their exact pixels as separate PNGs and link them from the report.
      for (const [index, verification] of (report.verifications ?? []).entries()) {
        for (const side of ['before', 'after']) {
          const data = verification[side];
          if (typeof data !== 'string' || !data.startsWith('data:image/png;base64,')) continue;
          const filename = `${value.runId}-verify-${index}-${side}.png`;
          await fs.writeFile(join(evidence, filename), Buffer.from(data.slice(22), 'base64'), { flag: 'wx' });
          verification[side] = filename;
        }
      }
      const filename = `${value.runId}.json`;
      await fs.writeFile(join(evidence, filename), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      status.saved.push({ runId: value.runId, filename, status: report.status, at: new Date().toISOString() });
      status.phase = report.status ?? 'saved';
      json(response, 201, { filename, path: `docs/evidence/performance/camera-invalidation/${filename}` }); return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) { json(response, 405, { error: 'Method not supported.' }); return; }
    if (pathname === '/status') { json(response, 200, status); return; }
    if (pathname === '/context') {
      if (request.headers.origin && !sameOrigin(request)) { json(response, 403, { error: 'Local requests only.' }); return; }
      json(response, 200, await nativeContext()); return;
    }
    if (pathname === '/manifest') { json(response, 200, manifest); return; }
    if (['/', '/projects', '/about', '/contact', '/case-studies', '/experience'].includes(pathname)) {
      response.writeHead(200, { 'Content-Type': mime['.html'], 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : html); return;
    }
    const base = pathname.startsWith('/lab/') ? bundle : join(snapshot, 'public');
    const file = resolve(base, '.' + (pathname.startsWith('/lab/') ? pathname.slice(4) : pathname));
    if (!file.startsWith(base + sep)) { json(response, 403, { error: 'Invalid path.' }); return; }
    const data = await fs.readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Content-Length': data.length, 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch (error) { json(response, 400, { error: String(error) }); }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Delivered camera lab: http://127.0.0.1:${port}/`);
  console.log(`Frozen build: ${snapshot}`);
  console.log('No automatic rendering or timed comparison starts until a control is selected.');
});
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => process.exit(0)));
