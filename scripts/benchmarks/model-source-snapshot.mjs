/** Bundle one model source tree, including historical files absent from disk. */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

const modelEntries = [
  'features/spacecraft/spacecraft-model.ts',
  'components/spacecraft-model.ts',
];

export function modelSourceSnapshot({ root, revision, onSource }) {
  const files = revision
    ? new Set(
        execFileSync('git', ['ls-tree', '-r', '--name-only', revision], {
          cwd: root,
          encoding: 'utf8',
        })
          .trim()
          .split('\n'),
      )
    : null;
  const entry = modelEntries.find((name) =>
    files ? files.has(name) : existsSync(resolve(root, name)),
  );
  if (!entry)
    throw new Error(
      `No spacecraft model found in ${revision ?? 'the checkout'}.`,
    );

  const sourceName = (path) => relative(root, path).split(sep).join('/');
  const isSource = (name) =>
    !name.startsWith('../') &&
    !name.startsWith('node_modules/') &&
    /\.(ts|tsx)$/.test(name);

  return {
    entry,
    plugin: {
      name: 'model-source-snapshot',
      setup(builder) {
        if (files)
          builder.onResolve({ filter: /.*/ }, (args) => {
            const path = args.path.startsWith('@/')
              ? resolve(root, args.path.slice(2))
              : args.kind === 'entry-point' ||
                  args.path.startsWith('.') ||
                  isAbsolute(args.path)
                ? resolve(args.resolveDir || root, args.path)
                : null;
            if (!path) return;
            const name = sourceName(path);
            const candidate = [
              name,
              `${name}.ts`,
              `${name}.tsx`,
              `${name}/index.ts`,
              `${name}/index.tsx`,
            ].find((candidate) => isSource(candidate) && files.has(candidate));
            if (candidate) return { path: resolve(root, candidate) };
            if (isSource(name))
              return {
                errors: [
                  { text: `Missing snapshot source ${revision}:${name}` },
                ],
              };
          });
        builder.onLoad({ filter: /\.(ts|tsx)$/ }, async ({ path }) => {
          const name = sourceName(path);
          if (!isSource(name)) return;
          const contents = revision
            ? execFileSync('git', ['show', `${revision}:${name}`], {
                cwd: root,
                encoding: 'utf8',
              })
            : await readFile(path, 'utf8');
          onSource?.(name, contents);
          return {
            contents,
            loader: name.endsWith('.tsx') ? 'tsx' : 'ts',
            resolveDir: dirname(path),
          };
        });
      },
    },
  };
}
