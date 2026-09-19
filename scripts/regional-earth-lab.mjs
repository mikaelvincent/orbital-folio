/** Frozen, background-only Europe loop comparison; never imported by production.
 * node scripts/regional-earth-lab.mjs [--port 3025] [--baseline c645c83]
 * Restart after source/asset changes. The main app on port 3000 is untouched.
 */
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => { const index = process.argv.indexOf(name); return index < 0 ? fallback : process.argv[index + 1]; };
const port = Number(arg('--port', '3025'));
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Choose a port between 1024 and 65535.');
const baselineRevision = execFileSync('git', ['rev-parse', '--verify', `${arg('--baseline', 'c645c83')}^{commit}`], { cwd: root, encoding: 'utf8' }).trim();
const snapshot = await fs.mkdtemp(join(tmpdir(), 'orbital-regional-earth-'));
const hash = data => createHash('sha256').update(data).digest('hex');
const baselineSources = [];
const paths = execFileSync('git', ['ls-tree', '-r', '--name-only', baselineRevision, 'features/orbit'], { cwd: root, encoding: 'utf8' }).trim().split('\n');
for (const path of paths) {
  const data = execFileSync('git', ['show', `${baselineRevision}:${path}`], { cwd: root });
  const target = join(snapshot, 'baseline', path);
  await fs.mkdir(dirname(target), { recursive: true });
  await fs.writeFile(target, data);
  baselineSources.push({ path, bytes: data.byteLength, sha256: hash(data) });
}
// Isolated baseline dependencies resolve Three from this installed stack.
await fs.symlink(join(root, 'node_modules'), join(snapshot, 'baseline/node_modules'), 'dir');
const bundle = join(snapshot, 'bundle');
const result = await build({
  absWorkingDir: root, entryPoints: ['scripts/benchmarks/regional-earth-lab.ts'],
  outdir: bundle, entryNames: 'regional-earth-lab', chunkNames: 'chunks/[name]-[hash]',
  bundle: true, splitting: true, format: 'esm', platform: 'browser', target: 'es2022',
  sourcemap: true, metafile: true, define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'frozen-regional-reference', setup(plugin) {
    plugin.onResolve({ filter: /^regional-earth-baseline$/ }, () => ({ path: join(snapshot, 'baseline/features/orbit/orbital-environment.ts') }));
  } }],
});
await fs.cp(join(root, 'public'), join(snapshot, 'public'), { recursive: true });
// Preserve the baseline's exact JPEG even if the candidate retires it publicly.
const oldAsset = 'public/textures/earth-black-marble-8k.jpg';
const oldBytes = execFileSync('git', ['show', `${baselineRevision}:${oldAsset}`], { cwd: root, maxBuffer: 16 * 1024 * 1024 });
await fs.writeFile(join(snapshot, oldAsset), oldBytes);
await fs.copyFile(join(root, 'scripts/benchmarks/regional-earth-lab.html'), join(snapshot, 'index.html'));
const sources = await Promise.all(Object.keys(result.metafile.inputs).map(async path => {
  const absolute = resolve(root, path);
  const data = await fs.readFile(absolute);
  return { path: absolute.startsWith(snapshot) ? absolute.slice(snapshot.length + 1) : path, bytes: data.byteLength, sha256: hash(data) };
}));
async function inventory(directory, prefix = '') {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const path = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await inventory(join(directory, entry.name), path + '/'));
    else { const data = await fs.readFile(join(directory, entry.name)); files.push({ path, bytes: data.byteLength, sha256: hash(data) }); }
  }
  return files;
}
const manifest = {
  schemaVersion: 1, snapshotId: randomUUID(), builtAt: new Date().toISOString(),
  baselineRevision, candidateHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  node: process.version, baselineSources, sourceFiles: sources,
  bundleFiles: await inventory(bundle), publicFiles: await inventory(join(snapshot, 'public')),
  note: 'Current working-tree candidate and Git baseline compiled together, with isolated source dependencies. All modules and assets frozen at launch. This is a background-only fixture, not whole-app performance. Restart after edits.',
};
await fs.writeFile(join(snapshot, 'build-manifest.json'), JSON.stringify(manifest, null, 2));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.map': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gz': 'application/gzip' };
const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const base = path.startsWith('/lab/') ? bundle : join(snapshot, 'public');
    const file = path === '/' ? join(snapshot, 'index.html') : path === '/build-manifest.json' ? join(snapshot, 'build-manifest.json') : resolve(base, '.' + (path.startsWith('/lab/') ? path.slice(4) : path));
    if (path !== '/' && path !== '/build-manifest.json' && !file.startsWith(base + sep)) { response.writeHead(403); response.end(); return; }
    const data = await fs.readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Content-Length': data.length, 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch { response.writeHead(404); response.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Regional Earth lab: http://127.0.0.1:${port}/`);
  console.log(`Frozen source and asset snapshot: ${snapshot}`);
  console.log('No automatic animation or timed work. Restart to capture newer candidate code.');
});
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => process.exit(0)));
