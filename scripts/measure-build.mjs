import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
const base = process.env.MEASURE_URL || 'http://127.0.0.1:4173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const chunks = fs.readdirSync('dist/client/_next/static/chunks').map(name => {
  const data = fs.readFileSync(path.join('dist/client/_next/static/chunks', name));
  return { name, bytes: data.length, gzipBytes: gzipSync(data).length };
});
const routes = [];
for (const route of ['/', '/projects', '/projects/relay', '/experience', '/about', '/contact']) {
  const samples = [];
  let html = '';
  for (let i = 0; i < 6; i++) {
    const start = performance.now();
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    html = await response.text();
    if (i > 0) samples.push(Math.round((performance.now() - start) * 100) / 100);
  }
  routes.push({ route, completeResponseMs: samples, htmlBytes: Buffer.byteLength(html), htmlGzipBytes: gzipSync(html).length, hasMain: html.includes('id="main"'), h1Count: (html.match(/<h1\b/g) || []).length });
}
console.log(JSON.stringify({
  scope: 'Built Worker on loopback; warm full-response latency, not network or real-device Core Web Vitals. Gzip is computed, not assumed transport compression.',
  chunks, routes,
}, null, 2));
