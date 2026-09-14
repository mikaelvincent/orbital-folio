/** Standalone finite cloud comparison; never imported by the portfolio.
 * node scripts/cloud-browser-lab.mjs [--port 3004]
 */
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex < 0 ? 3004 : process.argv[portIndex + 1]);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Choose a port between 1024 and 65535.');
const snapshot = await fs.mkdtemp(join(tmpdir(), 'orbital-cloud-lab-'));
const bundle = join(snapshot, 'bundle');
const result = await build({
  absWorkingDir: root,
  entryPoints: ['scripts/benchmarks/cloud-browser-lab.ts'],
  outdir: bundle,
  entryNames: 'cloud-lab',
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
await fs.copyFile(join(root, 'scripts/benchmarks/cloud-browser-lab.html'), join(snapshot, 'index.html'));
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
  snapshotId: randomUUID(), builtAt: new Date().toISOString(),
  node: process.version, sourceFiles: sources,
  bundleFiles: await inventory(bundle), publicFiles: await inventory(join(snapshot, 'public')),
  note: 'Compiled modules and public assets are frozen when this server starts. No source watchers or live app routes. Restart explicitly to compare newer code.',
};
await fs.writeFile(join(snapshot, 'build-manifest.json'), JSON.stringify(manifest, null, 2));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.map': 'application/json', '.gz': 'application/gzip', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
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
  console.log(`Cloud comparison lab: http://127.0.0.1:${port}/`);
  console.log(`Frozen build: ${snapshot}`);
  console.log('No comparison or continuous rendering starts automatically.');
});
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => process.exit(0)));
