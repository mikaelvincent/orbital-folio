/** Matched production-mode standalone renderer bundles; not a network benchmark. */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const root = process.cwd(),
  baseline = '437824a';
const sha = (value) => createHash('sha256').update(value).digest('hex');
const reports = [];
for (const variant of ['baseline', 'indexed']) {
  const sources = [];
  const result = await build({
    absWorkingDir: root,
    entryPoints: ['features/spacecraft/spacecraft-runtime.ts'],
    outdir: '/tmp/orbital-geometry-bundle',
    bundle: true,
    splitting: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    minify: true,
    write: false,
    metafile: true,
    legalComments: 'inline',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [
      {
        name: 'source-identified-comparison',
        setup(builder) {
          builder.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async (args) => {
            const path = relative(root, args.path);
            if (path.startsWith('..') || path.includes('node_modules')) return;
            const contents =
              variant === 'baseline'
                ? execFileSync('git', ['show', `${baseline}:${path}`], {
                    encoding: 'utf8',
                  })
                : await readFile(args.path, 'utf8');
            sources.push({ path, sha256: sha(contents) });
            return {
              contents,
              loader: path.endsWith('.tsx')
                ? 'tsx'
                : path.endsWith('.ts')
                  ? 'ts'
                  : 'js',
            };
          });
        },
      },
    ],
  });
  const files = result.outputFiles.map((file) => ({
    name: relative('/tmp/orbital-geometry-bundle', file.path),
    bytes: file.contents.length,
    gzipBytes: gzipSync(file.contents).length,
    brotliBytes: brotliCompressSync(file.contents).length,
    sha256: sha(file.contents),
  }));
  reports.push({
    variant,
    sources,
    files,
    totals: Object.fromEntries(
      ['bytes', 'gzipBytes', 'brotliBytes'].map((key) => [
        key,
        files.reduce((n, f) => n + f[key], 0),
      ]),
    ),
  });
}
const report = {
  baseline,
  recordedAt: new Date().toISOString(),
  method:
    'Same minified esbuild settings and installed dependencies, renderer runtime entry including its dynamic chunks. Baseline project sources read from Git; candidate from working tree. Actual Vinext delivery may package these modules differently.',
  reports,
};
await writeFile(
  'docs/evidence/performance/offline-geometry-compaction/bundle-comparison.json',
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  JSON.stringify(reports.map((r) => ({ variant: r.variant, ...r.totals }))),
);
