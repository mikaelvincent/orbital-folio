/** Standalone finite Earth comparison; never imported by the portfolio.
 * node scripts/earth-resolution-lab.mjs [--night] [--port 3004] [--thermal-sampler /absolute/path/to/compiled-sampler]
 */
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv.includes('--night') ? 'night' : 'day';
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex < 0 ? 3004 : process.argv[portIndex + 1]);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Choose a port between 1024 and 65535.');
const samplerIndex = process.argv.indexOf('--thermal-sampler');
const samplerPath = samplerIndex < 0 ? null : process.argv[samplerIndex + 1];
if (samplerIndex >= 0 && (!samplerPath || !samplerPath.startsWith('/'))) throw new Error('Thermal sampler must be an explicit absolute path.');
if (samplerPath) await fs.access(samplerPath, 1);
const execute = promisify(execFile);
const snapshot = await fs.mkdtemp(join(tmpdir(), 'orbital-earth-resolution-lab-'));
const bundle = join(snapshot, 'bundle');
const result = await build({
  absWorkingDir: root,
  entryPoints: ['scripts/benchmarks/earth-resolution-lab.ts'],
  outdir: bundle,
  entryNames: 'earth-resolution-lab',
  chunkNames: 'chunks/[name]-[hash]',
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
  metafile: true,
  define: { 'process.env.NODE_ENV': '"production"' },
});
await fs.cp(join(root, 'public'), join(snapshot, 'public'), { recursive: true });
const html = await fs.readFile(join(root, 'scripts/benchmarks/earth-resolution-lab.html'), 'utf8');
await fs.writeFile(join(snapshot, 'index.html'), html.replace('data-lab-mode="day"', `data-lab-mode="${mode}"`));
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');
const sources = await Promise.all(Object.keys(result.metafile.inputs).map(async (name) => {
  const data = await fs.readFile(resolve(root, name));
  return { path: name, bytes: data.byteLength, sha256: hash(data) };
}));
async function inventory(directory, prefix = '') {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await inventory(join(directory, entry.name), name + '/'));
    else {
      const data = await fs.readFile(join(directory, entry.name));
      files.push({ path: name, bytes: data.byteLength, sha256: hash(data) });
    }
  }
  return files;
}
const manifest = {
  snapshotId: randomUUID(), builtAt: new Date().toISOString(), mode,
  node: process.version, sourceFiles: sources,
  nativeContext: samplerPath ? { enabled: true, executable: samplerPath, sha256: hash(await fs.readFile(samplerPath)), arguments: ['--pmset'], timeoutMs: 6000 } : { enabled: false, availability: 'unknown' },
  bundleFiles: await inventory(bundle), publicFiles: await inventory(join(snapshot, 'public')),
  note: 'Compiled modules and public assets are frozen when this server starts. No source watchers or live app routes. Restart explicitly to compare newer code.',
};
await fs.writeFile(join(snapshot, 'build-manifest.json'), JSON.stringify(manifest, null, 2));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.map': 'application/json', '.gz': 'application/gzip', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
let contextInFlight;
async function nativeContext() {
  const capturedAt = new Date().toISOString();
  if (!samplerPath) return { availability: 'unknown', capturedAt, reason: 'No optional native sampler configured. Browser diagnostics remain device agnostic.' };
  try {
    const started = performance.now();
    const { stdout, stderr } = await execute(samplerPath, ['--pmset'], { timeout: 6000, killSignal: 'SIGKILL', maxBuffer: 65536 });
    const native = JSON.parse(stdout);
    if (!native || typeof native.thermalState !== 'string') throw new Error('Malformed native thermal snapshot');
    return { availability: 'available', capturedAt, native, stderr, sampleWallMs: performance.now() - started };
  } catch (error) {
    return { availability: 'unknown', capturedAt, error: String(error) };
  }
}
const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (path === '/context') {
      if (request.headers.origin && request.headers.origin !== `http://127.0.0.1:${port}` && request.headers.origin !== `http://localhost:${port}`) { response.writeHead(403); response.end(); return; }
      if (request.method === 'HEAD') { response.writeHead(200, { 'Cache-Control': 'no-store' }); response.end(); return; }
      contextInFlight ??= nativeContext().finally(() => { contextInFlight = undefined; });
      const data = JSON.stringify(await contextInFlight);
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(data); return;
    }
    const base = path.startsWith('/lab/') ? bundle : join(snapshot, 'public');
    const file = path === '/' ? join(snapshot, 'index.html') : path === '/build-manifest.json' ? join(snapshot, 'build-manifest.json') : resolve(base, '.' + (path.startsWith('/lab/') ? path.slice(4) : path));
    if (path !== '/' && path !== '/build-manifest.json' && !file.startsWith(base + sep)) { response.writeHead(403); response.end(); return; }
    const data = await fs.readFile(file);
    // Gzip texture assets are raw response bytes, intentionally without a
    // Content-Encoding header: the environment decompresses the payload itself.
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Content-Length': data.length, 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch { response.writeHead(404); response.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Earth resolution comparison lab (${mode}): http://127.0.0.1:${port}/`);
  console.log(`Frozen build: ${snapshot}`);
  console.log('No comparison or continuous rendering starts automatically.');
});
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => process.exit(0)));
