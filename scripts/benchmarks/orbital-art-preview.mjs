/** Frozen, finite orbital-art comparisons at captured application camera poses.
 * node scripts/benchmarks/orbital-art-preview.mjs --poses <poses.json>
 *   [--baseline HEAD] [--candidate <revision>] [--port 3021] [--manifest <manifest.json>]
 * Restart after source/asset/pose edits. No spacecraft, GTAO, UI or timing benchmark.
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
};
const port = Number(arg('--port', '3021'));
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Choose a loopback port between 1024 and 65535.');
const posePath = arg('--poses');
if (!posePath)
  throw new Error('Pass --poses with a captured camera-pose JSON file.');
const poseBytes = await readFile(resolve(posePath));
const poses = JSON.parse(poseBytes).poses;
const finiteArray = (value, count) =>
  Array.isArray(value) &&
  value.length === count &&
  value.every(Number.isFinite);
if (!Array.isArray(poses) || !poses.length)
  throw new Error('Pose JSON requires a nonempty poses array.');
const ids = new Set();
for (const pose of poses) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(pose.id) || ids.has(pose.id))
    throw new Error('Each pose needs a unique lowercase hyphenated id.');
  ids.add(pose.id);
  if (
    !finiteArray(pose.viewport, 2) ||
    pose.viewport.some((value) => value < 1)
  )
    throw new Error(
      `${pose.id}: viewport must contain positive width and height.`,
    );
  if (
    !finiteArray(pose.camera?.position, 3) ||
    !finiteArray(pose.camera?.quaternion, 4) ||
    Math.hypot(...pose.camera.quaternion) < 0.5 ||
    !Number.isFinite(pose.camera.fov) ||
    pose.camera.fov <= 0 ||
    pose.camera.fov >= 180 ||
    !Number.isFinite(pose.camera.near) ||
    pose.camera.near <= 0 ||
    !Number.isFinite(pose.camera.far) ||
    pose.camera.far <= pose.camera.near ||
    typeof pose.portraitComposition !== 'boolean'
  )
    throw new Error(`${pose.id}: invalid camera or portraitComposition.`);
}
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const git = (...args) =>
  execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
const baseline = git(
  'rev-parse',
  '--verify',
  `${arg('--baseline', 'HEAD')}^{commit}`,
)
  .toString()
  .trim();
const candidate = arg('--candidate')
  ? git('rev-parse', '--verify', `${arg('--candidate')}^{commit}`)
      .toString()
      .trim()
  : null;
const fileTrees = new Map();
for (const revision of new Set([baseline, candidate].filter(Boolean)))
  fileTrees.set(
    revision,
    new Set(
      git('ls-tree', '-r', '--name-only', revision)
        .toString()
        .trim()
        .split('\n'),
    ),
  );
const manifest = {
  fixture: 'orbital-art-preview',
  schemaVersion: 1,
  frozenAt: new Date().toISOString(),
  fixtureSha256: sha256(await readFile(fileURLToPath(import.meta.url))),
  baselineRevision: baseline,
  currentHead: git('rev-parse', 'HEAD').toString().trim(),
  candidateRevision: candidate,
  currentIncludesWorkingTree: candidate === null,
  node: process.version,
  threeRevision: JSON.parse(
    await readFile(resolve(root, 'node_modules/three/package.json')),
  ).version,
  poses: { sha256: sha256(poseBytes), entries: poses },
  rendering: {
    scope:
      'Orbital environment only, at supplied application world-camera poses.',
    renderer:
      'WebGLRenderer; antialias; sRGB; ACESFilmic tone mapping; exposure 0.95.',
    registration:
      'Version-specific production createOrbitalWorldReference, followCamera and setViewportComposition. Captured quaternion is normalized; capture precision is retained in pose source metadata.',
    time: 'Earth phase and sky seconds are independent. Earth is paused; sky playback starts only on explicit Play. No automatic frame loop for finite stills.',
    dpr: 'Explicit dpr query in 0.5–2, otherwise production pixel-ratio cap.',
    omitted: [
      'spacecraft',
      'spacecraft shadows and lights',
      'GTAO',
      'portfolio interfaces',
      'navigation animation',
    ],
    interpretation:
      'Renderer draw/point/triangle counts describe this fixture, not whole-app rendering cost. No timing, power or memory benchmark.',
  },
  versions: {},
};
const client = `
import * as THREE from 'three';
import { createOrbitalEnvironment } from './features/orbit/orbital-environment.ts';
import { createOrbitalWorldReference } from './features/orbit/earth-view-transform.ts';
const manifest=await fetch('/manifest.json').then(response=>response.json());
const poses=manifest.poses.entries, params=new URLSearchParams(location.search);
const variant=document.body.dataset.variant;
const poseInput=document.getElementById('pose'), phaseInput=document.getElementById('phase'), timeInput=document.getElementById('time'), dprInput=document.getElementById('dpr'), status=document.getElementById('status'), playButton=document.getElementById('play');
const clamp=(value,min,max,fallback)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
let phase=clamp(Number(params.get('phase')??0),0,1,0),skyTime=clamp(Number(params.get('time')??0),0,100000,0),playing=false,frame=0,tickAt=0,drawIndex=0,environment,ready=false;
for(const pose of poses)poseInput.add(new Option(pose.label||pose.id,pose.id));
poseInput.value=poses.some(p=>p.id===params.get('pose'))?params.get('pose'):poses[0].id;
phaseInput.value=String(phase);timeInput.value=String(skyTime);
dprInput.value=params.has('dpr')?String(clamp(Number(params.get('dpr')),.5,2,1)):'auto';
if(![...dprInput.options].some(option=>option.value===dprInput.value)){dprInput.add(new Option(params.get('dpr'),params.get('dpr')));dprInput.value=params.get('dpr');}
const environmentMobile=innerWidth<700;
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.setClearColor('#050a11',1);
renderer.domElement.setAttribute('aria-label','Orbital artwork at captured spacecraft camera pose');document.body.appendChild(renderer.domElement);
const reference=createOrbitalWorldReference(THREE),worldCamera=new THREE.PerspectiveCamera();
const pose=()=>poses.find(p=>p.id===poseInput.value);
const renderDpr=()=>dprInput.value==='auto'?Math.min(devicePixelRatio,innerWidth<700?1.75:2,Math.sqrt(4000000/(innerWidth*innerHeight))):Number(dprInput.value);
function updateUrl(){const url=new URL(location.href);url.searchParams.set('pose',poseInput.value);url.searchParams.set('phase',String(phase));url.searchParams.set('time',String(skyTime));if(dprInput.value==='auto')url.searchParams.delete('dpr');else url.searchParams.set('dpr',dprInput.value);if(document.getElementById('controls').hidden)url.searchParams.set('hide','1');else url.searchParams.delete('hide');history.replaceState(null,'',url);for(const link of document.querySelectorAll('[data-version]')){const next=new URL(url);next.pathname='/'+link.dataset.version;link.href=next.pathname+next.search;}}
function draw(){if(!ready)return;const p=pose(),c=p.camera;worldCamera.fov=c.fov;worldCamera.near=c.near;worldCamera.far=c.far;worldCamera.aspect=innerWidth/innerHeight;worldCamera.position.fromArray(c.position);worldCamera.quaternion.fromArray(c.quaternion).normalize();worldCamera.updateProjectionMatrix();worldCamera.updateMatrixWorld(true);
renderer.setPixelRatio(renderDpr());renderer.setSize(innerWidth,innerHeight);environment.resize(innerWidth,innerHeight,renderer.getPixelRatio(),c.fov);environment.setViewportComposition(p.portraitComposition,reference,true);environment.followCamera(worldCamera,reference);environment.setEarthPlayback({type:'seek',time:phase*environment.getEarthPlayback().duration});environment.update(skyTime,true,0,0);renderer.render(environment.scene,environment.camera);
const diagnostics=environment.getDiagnostics(),buffer=renderer.getDrawingBufferSize(new THREE.Vector2()),worldPose={position:worldCamera.position.toArray(),quaternion:worldCamera.quaternion.toArray(),fov:worldCamera.fov,near:worldCamera.near,far:worldCamera.far};
const snapshot={variant,sourceTreeSha256:manifest.versions[variant].sourceTreeSha256,asset:manifest.versions[variant].assets,poseId:p.id,capturedPose:p,worldPose,worldReference:{position:reference.position.toArray(),quaternion:reference.quaternion.toArray()},environmentPose:{position:environment.camera.position.toArray(),quaternion:environment.camera.quaternion.toArray(),fov:environment.camera.fov},viewport:[innerWidth,innerHeight],poseViewportMatches:innerWidth===p.viewport[0]&&innerHeight===p.viewport[1],environmentMobile,browserDpr:devicePixelRatio,renderDpr:renderer.getPixelRatio(),drawingBuffer:buffer.toArray(),phase,skyTime,playing,frame:++drawIndex,finite:!playing,earthPlayback:environment.getEarthPlayback(),render:{...renderer.info.render},diagnostics,omitted:manifest.rendering.omitted,userAgent:navigator.userAgent};
window.orbitalArtSnapshot=snapshot;document.body.dataset.snapshot=JSON.stringify(snapshot);document.body.dataset.ready='true';status.textContent=variant+' · '+p.id+' · Earth '+phase.toFixed(3)+' · sky '+skyTime.toFixed(2)+' s · '+innerWidth+'×'+innerHeight+' / '+buffer.x+'×'+buffer.y+' buffer · '+snapshot.render.calls+' draws / '+snapshot.render.points+' points / '+snapshot.render.triangles+' triangles'+(snapshot.poseViewportMatches?'':' · VIEWPORT DIFFERS FROM CAPTURE');
}
function stop(){playing=false;cancelAnimationFrame(frame);playButton.textContent='Play sky';}
function tick(now){if(!playing)return;skyTime+=Math.max(0,now-tickAt)/1000;tickAt=now;timeInput.value=skyTime.toFixed(3);draw();frame=requestAnimationFrame(tick);}
function apply(){stop();phase=clamp(Number(phaseInput.value),0,1,0);skyTime=clamp(Number(timeInput.value),0,100000,0);phaseInput.value=String(phase);timeInput.value=String(skyTime);updateUrl();draw();}
document.getElementById('apply').onclick=apply;poseInput.onchange=dprInput.onchange=apply;
playButton.onclick=()=>{if(playing){stop();updateUrl();draw();return;}playing=true;playButton.textContent='Pause sky';tickAt=performance.now();frame=requestAnimationFrame(tick);};
document.getElementById('step').onclick=()=>{timeInput.value=String(skyTime+.5);apply();};
document.getElementById('hide').onclick=()=>{document.getElementById('controls').hidden=true;updateUrl();};
addEventListener('keydown',event=>{if(event.key==='Escape'){document.getElementById('controls').hidden=false;updateUrl();}});
addEventListener('resize',()=>{stop();if((innerWidth<700)!==environmentMobile){updateUrl();location.reload();}else draw();});addEventListener('visibilitychange',()=>{if(document.hidden){stop();draw();}});
addEventListener('pagehide',()=>{stop();ready=false;environment?.dispose();renderer.dispose();},{once:true});
if(params.get('hide')==='1')document.getElementById('controls').hidden=true;
try{environment=createOrbitalEnvironment(THREE,()=>{},{mobile:environmentMobile,cameraFov:pose().camera.fov});await environment.ready;if(!environment.getDiagnostics().earthReady)throw new Error('Regional Earth asset failed to load');ready=true;updateUrl();draw();}catch(error){status.textContent=String(error);document.body.dataset.error=String(error);}
`;
const bundles = {},
  assets = new Map();
const localName = (path) => relative(root, path).split(sep).join('/');
const isSource = (name) =>
  !name.startsWith('../') &&
  !name.startsWith('node_modules/') &&
  /\.(ts|tsx)$/.test(name);
for (const variant of ['before', 'after']) {
  const revision = variant === 'before' ? baseline : candidate;
  const files = fileTrees.get(revision);
  const sources = {},
    compiledSources = {},
    versionAssets = {};
  const plugin = {
    name: 'frozen-orbital-sources',
    setup(builder) {
      if (revision)
        builder.onResolve({ filter: /.*/ }, (args) => {
          const path = args.path.startsWith('@/')
            ? resolve(root, args.path.slice(2))
            : args.path.startsWith('.') || isAbsolute(args.path)
              ? resolve(args.resolveDir || root, args.path)
              : null;
          if (!path) return;
          const name = localName(path);
          const found = [
            name,
            name + '.ts',
            name + '.tsx',
            name + '/index.ts',
          ].find((candidate) => isSource(candidate) && files.has(candidate));
          if (found) return { path: resolve(root, found) };
          if (isSource(name))
            return {
              errors: [{ text: `Missing frozen source ${revision}:${name}` }],
            };
        });
      builder.onLoad({ filter: /\.(ts|tsx)$/ }, async ({ path }) => {
        const name = localName(path);
        if (!isSource(name)) return;
        const original = revision
          ? git('show', revision + ':' + name).toString()
          : await readFile(path, 'utf8');
        sources[name] = sha256(original);
        const urls = [
          ...original.matchAll(/(['"])(\/textures\/[^'"]+)\1/g),
        ].map((match) => match[2]);
        for (const url of urls) {
          const assetPath = 'public' + url;
          const bytes = revision
            ? git('show', revision + ':' + assetPath)
            : await readFile(resolve(root, assetPath));
          const servedUrl = '/' + variant + url;
          assets.set(servedUrl, bytes);
          versionAssets[assetPath] = {
            servedUrl,
            bytes: bytes.length,
            sha256: sha256(bytes),
          };
        }
        const compiled = original.replace(
          /(['"])(\/textures\/[^'"]+)\1/g,
          (_, quote, url) => quote + '/' + variant + url + quote,
        );
        compiledSources[name] = sha256(compiled);
        return {
          contents: compiled,
          loader: name.endsWith('.tsx') ? 'tsx' : 'ts',
          resolveDir: dirname(path),
        };
      });
    },
  };
  const result = await build({
    absWorkingDir: root,
    stdin: { contents: client, resolveDir: root, loader: 'ts' },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    plugins: [plugin],
  });
  bundles[variant] = result.outputFiles[0].contents;
  const ordered = Object.fromEntries(
    Object.entries(sources).sort(([a], [b]) => a.localeCompare(b)),
  );
  manifest.versions[variant] = {
    sourceTreeSha256: sha256(JSON.stringify(ordered)),
    transitiveSources: ordered,
    compiledSources,
    bundleSha256: sha256(bundles[variant]),
    assets: versionAssets,
    rewrite:
      'Only local /textures URLs gain a before/after namespace. Original and compiled source hashes are recorded.',
  };
}
const manifestOutput = arg('--manifest');
if (manifestOutput) {
  await mkdir(dirname(resolve(manifestOutput)), { recursive: true });
  await writeFile(
    resolve(manifestOutput),
    JSON.stringify(manifest, null, 2) + '\n',
  );
}
function html(variant) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Orbital art — ${variant}</title><style>body{margin:0;background:#050a11;color:#eee9de;font:12px system-ui}canvas{display:block}aside{position:fixed;z-index:2;top:8px;left:8px;right:8px;padding:10px;background:#151c23ed;border:1px solid #64717e;border-radius:8px}.row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}a{color:#d4b28c}button,input,select{font:inherit;color:inherit;background:#25303a;border:1px solid #64717e;border-radius:4px;padding:4px}input{width:70px}p{margin:8px 0 0}[hidden]{display:none!important}</style></head><body data-variant="${variant}"><aside id="controls"><div class="row"><a data-version="before" href="/before">Before</a><a data-version="after" href="/after">After</a><a href="/manifest.json">Frozen sources</a><label>Pose <select id="pose"></select></label><label>Earth phase <input id="phase" type="number" min="0" max="1" step="0.001"></label><label>Sky seconds <input id="time" type="number" min="0" step="0.1"></label><label>DPR <select id="dpr"><option value="auto">App cap</option><option>0.5</option><option>1</option><option>1.5</option><option>1.75</option><option>2</option></select></label><button id="apply">Apply</button><button id="step">Sky +0.5s</button><button id="play">Play sky</button><button id="hide">Hide controls</button></div><p>Environment only: no spacecraft, GTAO, vessel lighting or live portfolio UI. Earth stays paused while sky time changes. Escape restores controls. Counts are descriptive, not timings.</p><p id="status" role="status">Loading frozen regional Earth…</p></aside><script type="module" src="/${variant}.js"></script></body></html>`;
}
const server = createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }
  const path = new URL(request.url, 'http://127.0.0.1:' + port).pathname;
  let body, type;
  if (path === '/manifest.json') {
    body = JSON.stringify(manifest, null, 2);
    type = 'application/json';
  } else if (path === '/' || path === '/before' || path === '/after') {
    body = html(path === '/before' ? 'before' : 'after');
    type = 'text/html; charset=utf-8';
  } else if (path === '/before.js' || path === '/after.js') {
    body = bundles[path.slice(1, -3)];
    type = 'text/javascript';
  } else if (assets.has(path)) {
    body = assets.get(path);
    type = 'image/webp';
  } else {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  response.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
  });
  response.end(request.method === 'HEAD' ? undefined : body);
});
server.listen(port, '127.0.0.1', () =>
  console.log(
    `Frozen orbital art: http://127.0.0.1:${port}/after (manifest /manifest.json)`,
  ),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => server.close(() => process.exit(0)));
