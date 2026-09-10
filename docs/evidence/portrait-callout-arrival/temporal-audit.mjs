// Usage: node audit.mjs [repository] [baseline git ref] [output.json]
// Executes actual annotation modules against deterministic DOM geometry stubs.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2] || process.cwd()),
  ref = process.argv[3] || '2271e8b',
  output = resolve(
    process.argv[4] || '/tmp/portrait-callout-arrival-audit.json',
  );
const req = createRequire(join(root, 'package.json')),
  T = await import(pathToFileURL(req.resolve('three')).href),
  ts = req('typescript'),
  sha = (s) => createHash('sha256').update(s).digest('hex');
const current = readFileSync(
    join(root, 'components/overview-annotations.ts'),
    'utf8',
  ),
  baseline = execFileSync(
    'git',
    ['-C', root, 'show', ref + ':components/overview-annotations.ts'],
    { encoding: 'utf8', maxBuffer: 3e6 },
  ),
  flight = readFileSync(join(root, 'lib/flight.ts'), 'utf8');
const transpile = (s) =>
    ts.transpileModule(s, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      },
    }).outputText,
  flightURL =
    'data:text/javascript;base64,' +
    Buffer.from(transpile(flight)).toString('base64');
async function load(s) {
  const js = transpile(s).replace(
    /from ['"]@\/lib\/flight['"]/g,
    'from ' + JSON.stringify(flightURL),
  );
  return (
    await import(
      'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
    )
  ).createOverviewAnnotations;
}
const modules = await Promise.all([baseline, current].map(load));
class Element {
  constructor(tag) {
    this.tag = tag;
    this.style = {};
    this.dataset = {};
    this.attributes = {};
    this.children = [];
    this.inert = false;
    this.clientWidth = 390;
    this.clientHeight = 844;
    this.classes = new Set();
    this.classList = {
      toggle: (name, on) =>
        on ? this.classes.add(name) : this.classes.delete(name),
    };
  }
  appendChild(child) {
    child.parent = this;
    this.children.push(child);
  }
  setAttribute(k, v) {
    this.attributes[k] = String(v);
  }
  removeAttribute(k) {
    delete this.attributes[k];
  }
  get offsetWidth() {
    return Math.min(110, parseFloat(this.style.maxWidth) || 110);
  }
  get offsetHeight() {
    return 36;
  }
  getBoundingClientRect() {
    return (
      this.rect || {
        left: 0,
        top: 0,
        width: this.clientWidth,
        height: this.clientHeight,
        right: this.clientWidth,
        bottom: this.clientHeight,
      }
    );
  }
  querySelector(selector) {
    return selector === '.orbital-identity-flight' ? this.flight : null;
  }
  remove() {
    if (this.parent)
      this.parent.children = this.parent.children.filter((x) => x !== this);
  }
}
function fixture(create, portrait) {
  const host = new Element('host'),
    identity = new Element('identity'),
    identityFlight = new Element('identity-flight');
  identity.flight = identityFlight;
  globalThis.document = {
    createElement: (t) => new Element(t),
    createElementNS: (_, t) => new Element(t),
    querySelector: (s) => (s === '.orbital-identity' ? identity : null),
  };
  const model = new T.Group();
  model.userData.calloutAnchors = {};
  model.userData.calloutEdges = {};
  for (const [i, section] of [
    'projects',
    'experience',
    'about',
    'contact',
  ].entries()) {
    const x = i % 2 ? 1.5 : -1.5,
      y = i < 2 ? 1.7 : -1.7;
    model.userData.calloutAnchors[section] = [x, y, 1.32];
    model.userData.calloutEdges[section] = {
      top: [x, y + 1.3, 1.32],
      bottom: [x, y - 1.3, 1.32],
      left: [x - 1.2, y, 1.32],
      right: [x + 1.2, y, 1.32],
    };
  }
  model.userData.overviewSupportBounds = [];
  const support = [-5, 5].flatMap((x) =>
      [-3, 3].flatMap((y) => [-1, 1.4].map((z) => [x, y, z])),
    ),
    camera = new T.PerspectiveCamera(38, 1, 0.5, 200);
  const api = create(
    T,
    host,
    {
      projectsLabel: 'Projects',
      experienceLabel: 'Case studies',
      aboutLabel: 'About',
      contactLabel: 'Contact',
    },
    { hover() {}, navigate() {} },
  );
  const f = {
    host,
    identity,
    identityFlight,
    model,
    camera,
    api,
    support,
    layer: host.children[0],
  };
  f.layout = (portrait) => {
    host.clientWidth = portrait ? 390 : 1366;
    host.clientHeight = portrait ? 844 : 900;
    identity.rect = {
      left: host.clientWidth / 2 - 100,
      top: 18,
      width: 200,
      height: 40,
      right: host.clientWidth / 2 + 100,
      bottom: 58,
    };
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
    api.layout(
      {
        target: new T.Vector3(),
        direction: new T.Vector3(0, 0, 1),
        distance: 18,
        roll: portrait ? Math.PI / 2 : 0,
      },
      support,
      model,
    );
  };
  f.layout(portrait);
  return f;
}
function step(f, state, progress = 1, portrait = false) {
  f.model.rotation.z = portrait ? (Math.PI / 2) * progress : 0;
  f.model.updateMatrixWorld(true);
  f.camera.position.set(
    -1.5 * (1 - progress),
    -1.7 * (1 - progress),
    5 + 13 * progress,
  );
  f.camera.lookAt(-1.5 * (1 - progress), -1.7 * (1 - progress), 0);
  f.camera.updateMatrixWorld(true);
  f.api.update(f.camera, f.model, { delta: 1 / 60, hover: '', ...state });
  return snapshot(f);
}
function snapshot(f) {
  return {
    opacity: Number(f.layer.style.opacity),
    inert: f.layer.inert,
    aria: f.layer.attributes['aria-hidden'],
    svg: f.layer.children[0].children.map((e) => ({
      tag: e.tag,
      attributes: { ...e.attributes },
      style: { ...e.style },
      classes: [...e.classes],
    })),
    buttons: f.layer.children
      .slice(1)
      .map((e) => ({
        style: { ...e.style },
        dataset: { ...e.dataset },
        classes: [...e.classes],
      })),
    identity: {
      style: { ...f.identityFlight.style },
      inert: f.identityFlight.inert,
      attributes: { ...f.identityFlight.attributes },
    },
    presence: f.host.dataset.overviewPresence,
  };
}
const report = {
    baseline: ref,
    baselineSha256: sha(baseline),
    candidateSha256: sha(current),
    limits: [
      'Runs the real baseline/candidate annotation code and real spring math with fixed DOM measurements; GPU rendering, pointer dispatch, and browser layout are checked separately.',
      'Synthetic camera interpolation deliberately moves and rotates anchors during travel so every path/button transform is compared, not just opacity.',
    ],
    horizontal: [],
    portrait: {},
    edgeCases: {},
    failures: [],
  },
  equal = (a, b) => JSON.stringify(a) === JSON.stringify(b),
  assert = (ok, message, data = {}) => {
    if (!ok) report.failures.push({ message, ...data });
  };
for (const reduced of [false, true]) {
  const [a, b] = modules.map((m) => fixture(m, false));
  let frames = 0,
    mismatch = 0;
  for (const leg of [
    { n: 30, home: true, travelling: false, from: 1, to: 1 },
    { n: 90, home: false, travelling: true, from: 1, to: 0 },
    { n: 60, home: false, travelling: false, from: 0, to: 0 },
    { n: 120, home: true, travelling: true, from: 0, to: 1 },
    { n: 150, home: true, travelling: false, from: 1, to: 1 },
  ])
    for (let i = 0; i < leg.n; i++) {
      const p = leg.from + ((leg.to - leg.from) * i) / Math.max(1, leg.n - 1),
        state = {
          home: leg.home,
          travelling: leg.travelling,
          reduced,
          hover: i % 20 < 10 ? 'projects' : '',
        },
        x = step(a, state, p),
        y = step(b, state, p);
      frames++;
      if (!equal(x, y)) mismatch++;
    }
  report.horizontal.push({ reduced, frames, mismatch });
  assert(
    !mismatch,
    'Horizontal opacity, paths, buttons, identity, accessibility remain frame-exact',
    { reduced, mismatch },
  );
}
const [a, b] = modules.map((m) => fixture(m, true));
step(a, { home: false, travelling: false, reduced: true }, 0, true);
step(b, { home: false, travelling: false, reduced: true }, 0, true);
let premature = 0,
  baselineVisible = 0,
  identityMismatch = 0,
  flightInertFailures = 0;
for (let i = 0; i < 120; i++) {
  const state = { home: true, travelling: true, reduced: false },
    p = i / 119,
    x = step(a, state, p, true),
    y = step(b, state, p, true);
  if (x.opacity > 0) baselineVisible++;
  if (y.opacity !== 0) premature++;
  if (!y.inert || y.aria !== 'true') flightInertFailures++;
  if (!equal(x.identity, y.identity)) identityMismatch++;
}
let previous = 0,
  decreasing = 0,
  earlyInteractive = 0;
const fade = [];
for (let i = 0; i < 180; i++) {
  const state = { home: true, travelling: false, reduced: false },
    x = step(a, state, 1, true),
    y = step(b, state, 1, true);
  if (y.opacity + 1e-12 < previous) decreasing++;
  if (y.opacity < 0.9 && !y.inert) earlyInteractive++;
  previous = y.opacity;
  if ([0, 5, 15, 30, 60, 120, 179].includes(i))
    fade.push({ frame: i, opacity: y.opacity, inert: y.inert });
  if (!equal(x.identity, y.identity)) identityMismatch++;
}
report.portrait = {
  flightFrames: 120,
  baselineVisibleFrames: baselineVisible,
  prematureCandidateFrames: premature,
  flightInertFailures,
  identityMismatch,
  fadeFrames: 180,
  decreasing,
  earlyInteractive,
  fade,
};
assert(
  baselineVisible > 100 && premature === 0 && !flightInertFailures,
  'Portrait labels stay fully hidden/inert throughout return travel',
);
assert(
  !decreasing && !earlyInteractive && previous > 0.99,
  'Portrait reveal is monotonic after settlement and interactive only when visible',
);
assert(
  !identityMismatch,
  'Portfolio identity retains original presence and transform throughout portrait return',
);
const interrupted = fixture(modules[1], true);
step(interrupted, { home: false, travelling: false, reduced: true }, 0, true);
for (let i = 0; i < 30; i++)
  step(
    interrupted,
    { home: true, travelling: true, reduced: false },
    i / 60,
    true,
  );
let interruptionVisible = 0;
for (let i = 0; i < 120; i++)
  if (
    step(
      interrupted,
      { home: false, travelling: i < 60, reduced: false },
      0.5 * (1 - i / 120),
      true,
    ).opacity !== 0
  )
    interruptionVisible++;
for (let i = 0; i < 60; i++)
  if (
    step(
      interrupted,
      { home: true, travelling: true, reduced: false },
      i / 59,
      true,
    ).opacity !== 0
  )
    interruptionVisible++;
const resume = step(
  interrupted,
  { home: true, travelling: false, reduced: false },
  1,
  true,
);
report.edgeCases.interruptedReturn = {
  visibleWhileCancelledOrReturning: interruptionVisible,
  firstSettledOpacity: resume.opacity,
};
assert(
  !interruptionVisible && resume.opacity > 0 && resume.opacity < 0.1,
  'Cancelled/restarted portrait return does not flash labels and fades from zero at arrival',
);
const initial = modules.map((m) => fixture(m, true)),
  initialStates = initial.map((f) =>
    step(f, { home: true, travelling: false, reduced: false }, 1, true),
  );
report.edgeCases.freshOverview = {
  matchesBaseline: equal(...initialStates),
  opacity: initialStates[1].opacity,
};
assert(
  equal(...initialStates) && initialStates[1].opacity === 1,
  'Fresh settled portrait overview stays immediately visible',
);
const reduced = fixture(modules[1], true);
step(reduced, { home: false, travelling: false, reduced: true }, 0, true);
const reducedTravel = step(
    reduced,
    { home: true, travelling: true, reduced: true },
    0.5,
    true,
  ),
  reducedSettle = step(
    reduced,
    { home: true, travelling: false, reduced: true },
    1,
    true,
  );
report.edgeCases.reducedMotion = {
  travelOpacity: reducedTravel.opacity,
  settledOpacity: reducedSettle.opacity,
  settledInert: reducedSettle.inert,
};
assert(
  reducedTravel.opacity === 0 &&
    reducedSettle.opacity === 1 &&
    !reducedSettle.inert,
  'Reduced motion hides during travel and reveals immediately when settled',
);
const resize = modules.map((m) => fixture(m, true));
for (const f of resize) {
  step(f, { home: false, travelling: false, reduced: true }, 0, true);
  step(f, { home: true, travelling: true, reduced: false }, 0.3, true);
  f.layout(false);
}
const resized = resize.map((f) =>
  step(f, { home: true, travelling: false, reduced: false }, 1, false),
);
report.edgeCases.portraitToLandscape = { matchesBaseline: equal(...resized) };
assert(
  equal(...resized),
  'Leaving portrait removes the gate and restores exact horizontal behavior',
);
writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.failures.length ? 1 : 0;
