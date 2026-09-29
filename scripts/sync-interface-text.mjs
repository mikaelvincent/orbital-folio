import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { interfaceTextSiteFields } from '../lib/content/interface-text.ts';
import { CONTACT_KEY_LAYOUT } from '../features/spacecraft/rooms/contact-keyboard.ts';

// The catalog is generated from literal message keys at their render sites.
// Dynamic category/key/diagnostic labels are registered explicitly below.
const groups = new Map();
const add = (group, value) => {
  if (!value || Object.hasOwn(interfaceTextSiteFields, value)) return;
  if (!groups.has(group)) groups.set(group, new Set());
  groups.get(group).add(value);
};
const groupFor = (file) => {
  if (file.includes('diagnostics/')) return 'diagnostics';
  if (file.includes('rendering-controls')) return 'rendering';
  if (file.includes('earth-playback-controls')) return 'earth';
  if (file.includes('scene-tools-menu')) return 'tools';
  if (/case-study|case-stud/.test(file)) return 'experience';
  if (/project-library|project-content|projects-workshop/.test(file))
    return 'projects';
  if (/about-study-artwork/.test(file)) return 'about-art';
  if (/notebook|about-personal|about-social/.test(file)) return 'about';
  if (/contact-keyboard/.test(file)) return 'keyboard';
  if (/contact-form|contact-flow/.test(file)) return 'contact-form';
  if (/contact-flight|contact-social|contact-computer|outboard-wall/.test(file))
    return 'contact';
  return 'shared';
};
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? walk(path.join(dir, entry.name))
        : [path.join(dir, entry.name)],
    );
for (const file of [
  ...walk('features/portfolio'),
  ...walk('features/spacecraft'),
  ...walk('features/orbit'),
  ...walk('features/diagnostics'),
  ...walk('lib/content'),
].filter(
  (file) =>
    /\.(ts|tsx)$/.test(file) && !file.includes('interface-text-catalog'),
)) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes('interfaceText as copy')) continue;
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(tree) === 'copy' &&
      node.arguments[1] &&
      ts.isStringLiteral(node.arguments[1])
    )
      add(groupFor(file), node.arguments[1].text);
    ts.forEachChild(node, visit);
  };
  visit(tree);
}
for (const value of ['Systems', 'Interfaces', 'Experiments'])
  add('projects', value);
for (const value of [
  'All case studies',
  'Product engineering',
  'Systems & reliability',
  'Research & experiments',
  'Design & interfaces',
  'Context',
  'Key decisions',
  'Impact',
])
  add('experience', value);
for (const value of [
  'Small',
  'systems',
  'A WORKING NOTEBOOK',
  'Design',
  'notes',
  'OBSERVATIONS & IDEAS',
  'Field',
  'journal',
  'NOTES FROM THE EVERYDAY',
])
  add('about-art', value);
for (const { label } of CONTACT_KEY_LAYOUT) add('keyboard', label);
add('contact', 'Contact application');
// Register collector display labels while preserving stable exported IDs.
const phaseName = (value) =>
  value.replace(/[._-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
const strings = (node, visit) => {
  if (ts.isStringLiteral(node)) visit(node.text);
  ts.forEachChild(node, (child) => strings(child, visit));
};
for (const file of [
  'features/diagnostics/spacecraft-performance.ts',
  'features/spacecraft/spacecraft-runtime.ts',
  'features/diagnostics/scene-performance.ts',
]) {
  const source = fs.readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const visit = (node) => {
    if (file.endsWith('spacecraft-performance.ts')) {
      if (
        ts.isVariableDeclaration(node) &&
        ['roomLabels', 'label'].includes(node.name.getText(tree)) &&
        node.initializer
      )
        strings(node.initializer, (value) => add('diagnostics', value));
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        node.left.getText(tree) === 'label'
      )
        strings(node.right, (value) => add('diagnostics', value));
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ['mark', 'count', 'beginPass', 'endPass'].includes(
        node.expression.name.text,
      ) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      add('diagnostics', phaseName(node.arguments[0].text));
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(tree) === 'gpuStatus' &&
      node.initializer
    )
      strings(node.initializer, (value) => add('diagnostics', value));
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      node.left.getText(tree) === 'gpuStatus'
    )
      strings(node.right, (value) => add('diagnostics', value));
    ts.forEachChild(node, visit);
  };
  visit(tree);
}
add('diagnostics', 'Frame');
// A message shared by multiple areas appears in each relevant editor section;
// they edit one dictionary key, so changes cannot diverge.
const catalog = Object.fromEntries(
  [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => [
      key,
      [...values].sort((a, b) => a.localeCompare(b)),
    ]),
);
const output =
  '// Generated by scripts/sync-interface-text.mjs. Update render-site messages, then regenerate.\nexport const interfaceTextCatalog: Record<string, readonly string[]> = ' +
  JSON.stringify(catalog, null, 2) +
  ';\n';
const target = 'lib/content/interface-text-catalog.ts';
if (process.argv.includes('--check')) {
  if (fs.readFileSync(target, 'utf8') !== output) {
    console.error(
      'Interface text catalog is stale. Run node scripts/sync-interface-text.mjs.',
    );
    process.exitCode = 1;
  }
} else fs.writeFileSync(target, output);
