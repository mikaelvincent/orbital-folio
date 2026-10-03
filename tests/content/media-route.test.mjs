import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

const built = await build({
  entryPoints: ['app/media/[id]/route.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['@/lib/content/repository', '@/lib/security'],
});
function fixture({ published = '{}', admin = false, missing = false } = {}) {
  const calls = [];
  const bytes = new Uint8Array(32);
  const info = {
    size: bytes.length,
    httpEtag: '"version"',
    writeHttpMetadata(headers) {
      headers.set('Content-Type', 'image/png');
    },
  };
  const bucket = {
    async head() {
      calls.push('head');
      return missing ? null : info;
    },
    async get(_id, options) {
      calls.push('get');
      if (missing) return null;
      const condition = options?.onlyIf?.get('If-None-Match');
      if (condition === '*' || condition?.includes(info.httpEtag)) return info;
      const range = options?.range;
      const selected = range
        ? bytes.slice(range.offset, range.offset + range.length)
        : bytes;
      return { ...info, body: new Response(selected).body };
    },
  };
  const loaded = { exports: {} };
  runInNewContext(built.outputFiles[0].text, {
    module: loaded,
    exports: loaded.exports,
    Headers,
    Response,
    require(name) {
      if (name.endsWith('/security'))
        return {
          adminIdentity: async () => {
            calls.push('auth');
            return admin;
          },
        };
      return {
        bindings: () => ({ MEDIA: bucket }),
        database: () => ({
          prepare: () => ({
            bind: () => ({
              first: async () => {
                calls.push('publication');
                return { published };
              },
            }),
          }),
        }),
      };
    },
  });
  return {
    calls,
    request: (method = 'GET', headers = {}) =>
      loaded.exports[method](
        new Request('http://fixture/media/file', { method, headers }),
        { params: Promise.resolve({ id: 'file' }) },
      ),
  };
}

await test('matching validators return no body with one R2 operation after publication checks', async () => {
  for (const method of ['GET', 'HEAD'])
    for (const condition of [
      '"version"',
      'W/"version"',
      '"old", W/"version"',
      '*',
    ]) {
      const f = fixture();
      const response = await f.request(method, { 'If-None-Match': condition });
      assert.equal(response.status, 304);
      assert.equal(await response.text(), '');
      assert.equal(response.headers.get('ETag'), '"version"');
      assert.equal(
        response.headers.get('Cache-Control'),
        'public, max-age=300',
      );
      assert.equal(response.headers.get('Vary'), 'Cookie');
      assert.equal(response.headers.get('Content-Length'), null);
      assert.deepEqual(f.calls, [
        'publication',
        method === 'HEAD' ? 'head' : 'get',
      ]);
    }
});

await test('range HEAD reuses metadata and validators take precedence over even invalid ranges', async () => {
  const f = fixture();
  const response = await f.request('HEAD', { Range: 'bytes=0-15' });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('Content-Range'), 'bytes 0-15/32');
  assert.equal(response.headers.get('Content-Length'), '16');
  assert.deepEqual(f.calls, ['publication', 'head']);
  for (const method of ['GET', 'HEAD']) {
    const conditional = fixture();
    const result = await conditional.request(method, {
      Range: 'bytes=999-',
      'If-None-Match': 'W/"version"',
    });
    assert.equal(result.status, 304);
    assert.equal(result.headers.get('Content-Range'), null);
    assert.deepEqual(conditional.calls, ['publication', 'head']);
  }
});

await test('changed validators still deliver bytes; missing and private files never produce a public 304', async () => {
  for (const range of [undefined, 'bytes=0-15', 'bytes=-4']) {
    const f = fixture();
    const response = await f.request('GET', {
      'If-None-Match': '"old"',
      ...(range ? { Range: range } : {}),
    });
    assert.equal(response.status, range ? 206 : 200);
    assert.equal(
      (await response.arrayBuffer()).byteLength,
      range === 'bytes=-4' ? 4 : range ? 16 : 32,
    );
  }
  const privateFile = fixture({ published: null });
  assert.equal(
    (await privateFile.request('GET', { 'If-None-Match': '*' })).status,
    404,
  );
  assert.deepEqual(privateFile.calls, ['publication', 'auth']);
  const preview = fixture({ published: null, admin: true });
  const response = await preview.request('GET', {
    'If-None-Match': '"version"',
  });
  assert.equal(response.status, 304);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.deepEqual(preview.calls, ['publication', 'auth', 'get']);
  assert.equal(
    (await fixture({ missing: true }).request('GET', { 'If-None-Match': '*' }))
      .status,
    404,
  );
  assert.equal(
    (await fixture().request('GET', { Range: 'bytes=99-' })).status,
    416,
  );
});
