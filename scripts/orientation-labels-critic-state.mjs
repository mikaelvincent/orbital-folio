import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2] || process.cwd());
const modelPath = resolve(
  root,
  process.argv[3] || 'components/spacecraft-model.ts',
);
const output = resolve(
  process.argv[4] || '/tmp/orientation-labels-critic-state.json',
);
const hash = () =>
  createHash('sha256').update(readFileSync(modelPath)).digest('hex');
const initialHash = hash();
const req = createRequire(root + '/package.json');
const THREE = await import(pathToFileURL(req.resolve('three')).href);
const { createSpacecraft } = await import(pathToFileURL(modelPath).href);
const model = createSpacecraft(THREE, { projects: [], caseStudies: [] });
const sections = ['projects', 'experience', 'about', 'contact'];
const visible = (o) => {
  for (let p = o; p; p = p.parent) if (!p.visible) return false;
  return true;
};
const report = {
  sourceSha256: initialHash,
  scope:
    'Independent actual post-batching label hardware visibility with a geometry-only fixture. Does not claim browser text rasterization, responsive projected fit, or deferred reader behavior.',
  states: [],
  failures: [],
};
for (const layout of ['wide', 'compact']) {
  model.setLayout(layout);
  for (const portrait of [false, true, false]) {
    for (const active of ['home', ...sections]) {
      model.update(0, '', true, {
        activeRoom: active,
        labelPortrait: portrait,
      });
      model.group.updateMatrixWorld(true);
      const state = { layout, portrait, active, sections: {} };
      for (const section of sections) {
        const roles = {};
        for (const role of ['hull', 'side']) {
          const group = model.group.getObjectByName(
            `${role}-exterior-label-assembly-${section}`,
          );
          assert(group, 'missing assembly ' + role + ' ' + section);
          let meshCount = 0,
            vertexCount = 0;
          group.traverse((o) => {
            if (o.isMesh && visible(o) && o.material.visible !== false) {
              meshCount++;
              vertexCount += o.geometry.getAttribute('position').count;
            }
          });
          roles[role] = { visible: visible(group), meshCount, vertexCount };
          const expected =
            active === 'home' && role === (portrait ? 'side' : 'hull');
          if (
            roles[role].visible !== expected ||
            (expected ? meshCount === 0 : meshCount !== 0)
          )
            report.failures.push({
              layout,
              portrait,
              active,
              section,
              role,
              expected,
              actual: roles[role],
            });
        }
        state.sections[section] = roles;
      }
      report.states.push(state);
    }
  }
}
const obsolete = [];
model.group.traverse((o) => {
  if (
    o.name === 'top-center-vessel-nameplate' ||
    /^(vessel-nameplate-|symmetric-nameplate-end-clasp)/.test(o.name)
  )
    obsolete.push(o.name);
  if (o.userData.parts)
    for (const name of o.userData.parts)
      if (/^(vessel-nameplate-|symmetric-nameplate-end-clasp)/.test(name))
        obsolete.push(name);
});
report.obsoleteBrandingGeometry = obsolete;
if (obsolete.length)
  report.failures.push({
    kind: 'obsolete physical branding geometry remains',
    names: obsolete,
  });
report.sourceUnchangedDuringAudit = hash() === initialHash;
if (!report.sourceUnchangedDuringAudit)
  report.failures.push({ kind: 'source changed during audit' });
report.passed = report.failures.length === 0;
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      passed: report.passed,
      states: report.states.length,
      failures: report.failures,
      sourceSha256: initialHash,
      output,
    },
    null,
    2,
  ),
);
assert(report.passed);
