/** Finite-frame orbital art contact sheet. No spacecraft, AO or performance claims.
 * node docs/evidence/earth-route-presets/visual-lab.mjs
 * Paste candidate JSON through the visible form, then Render comparison.
 */
import { build } from 'esbuild';
import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';
const root = process.cwd();
const hash = (value) => createHash('sha256').update(value).digest('hex');
const client = `
import * as THREE from 'three';
import { createOrbitalEnvironment } from './features/orbit/orbital-environment';
const renderer = new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.95;
renderer.setPixelRatio(1);
const env=createOrbitalEnvironment(THREE,()=>{},{earthAppearance:'night',earthTextureWidth:8192,cameraFov:38});
await env.ready;
const form=document.querySelector('form'), output=document.querySelector('#output'), status=document.querySelector('#status');
const textureReady=env.getDiagnostics().earthReady;
status.textContent=textureReady?'8K Earth ready.':'Earth texture failed.';
form.querySelector('button').disabled=!textureReady;
form.addEventListener('submit',async event=>{
 event.preventDefault();
 try{
  const routes=JSON.parse(document.querySelector('#routes').value);
  const times=document.querySelector('#times').value.split(',').map(Number);
  const rate=Number(document.querySelector('#rate').value);
  const portrait=document.querySelector('#layout').value==='portrait';
  const width=portrait?390:1280,height=portrait?844:720;
  renderer.setSize(width,height,false);env.resize(width,height,1);
  output.replaceChildren();
  output.style.setProperty('--columns',times.length);
  for(const route of routes){
   const row=document.createElement('section');
   const title=document.createElement('h2');title.textContent=route.name+' · '+route.opening.longitude+' / '+route.opening.latitude+' / '+route.opening.roll+' · '+Math.round(rate/.003*100)/100+'×';row.append(title);
   const grid=document.createElement('div');grid.className='frames';row.append(grid);output.append(row);
   for(const time of times){
    env.setEarthComposition(route.opening,rate);env.setEarthPreview({paused:true,speed:1,elapsed:time});
    env.update(0,false,0,0);renderer.render(env.scene,env.camera);
    const figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');
    image.src=renderer.domElement.toDataURL('image/jpeg',.9);image.alt=route.name+' at '+time+' seconds';
    caption.textContent=Math.floor(time/60)+':'+String(time%60).padStart(2,'0');
    figure.append(image,caption);grid.append(figure);
   }
  }
  document.body.dataset.snapshot=JSON.stringify({routes,times,rate,viewport:[width,height],dpr:1,earth:env.getDiagnostics().earthTextureDimensions,source:'current snapshot',omits:'spacecraft, UI occlusion, camera hover/drag/portrait roll'});
  status.textContent='Rendered '+routes.length+' routes × '+times.length+' frames. Earth-only; full application still needs review.';
 }catch(error){status.textContent=String(error)}
});
addEventListener('pagehide',()=>{env.dispose();renderer.dispose()},{once:true});
`;
const result = await build({
  absWorkingDir: root,
  stdin: { contents: client, resolveDir: root, loader: 'ts' },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  metafile: true,
});
const bundle = result.outputFiles[0].contents;
const manifest = {
  builtAt: new Date().toISOString(),
  sources: await Promise.all(
    Object.keys(result.metafile.inputs)
      .filter((path) => !path.startsWith('node_modules') && path !== '<stdin>')
      .map(async (path) => ({ path, sha256: hash(await fs.readFile(path)) })),
  ),
  clientSha256: hash(client),
  bundleSha256: hash(bundle),
  assetSha256: hash(
    await fs.readFile('public/textures/earth-black-marble-8k.jpg'),
  ),
  note: 'Finite art-selection images, not a benchmark; no spacecraft, live camera roll or AO. 8K source, 1DPR full aspect render shown at smaller CSS contact-sheet sizes.',
};
await fs.writeFile(
  'docs/evidence/earth-route-presets/fixture-manifest.json',
  JSON.stringify(manifest, null, 2) + '\n',
);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Earth route comparison</title><style>body{background:#07111e;color:#e8edf2;font:14px system-ui;margin:18px}h1{font-size:20px}form{display:flex;gap:12px;align-items:center;flex-wrap:wrap}textarea{width:540px;height:90px}input,select,button,textarea{color:#eee;background:#152639;border:1px solid #637689;border-radius:5px;padding:6px;font:12px system-ui}input{width:220px}button{cursor:pointer}label{display:flex;flex-direction:column;gap:4px}#output{--columns:6}h2{font-size:15px;margin:18px 0 7px}.frames{display:grid;grid-template-columns:repeat(var(--columns),minmax(0,1fr));gap:7px}figure{margin:0}img{width:100%;display:block}figcaption{text-align:center;margin-top:4px;color:#d9bb83}#output.detail .frames{grid-template-columns:repeat(3,minmax(0,1fr))}#output.detail img{height:175px;object-fit:cover;object-position:bottom}#controls[hidden]{display:none}</style></head><body><h1>Earth route comparison · frozen 8K frames</h1><div id="controls"><form><label>Routes JSON<textarea id="routes">[{"name":"Current opening","opening":{"longitude":120,"latitude":25,"roll":22.5}}]</textarea></label><label>Visit seconds<input id="times" value="0,30,60,120,180,300"></label><label>Rotation speed<select id="rate"><option value="0.006">2×</option><option value="0.009">3×</option></select></label><label>Layout<select id="layout"><option value="wide">Wide</option><option value="portrait">Portrait (no camera roll)</option></select></label><button disabled>Render comparison</button></form></div><p id="status" role="status">Loading 8K…</p><label><input type="checkbox" id="detail">Enlarge foreground strips (3 columns)</label><button id="hide" type="button">Hide form</button><div id="output"></div><script>document.querySelector('#detail').onchange=e=>document.querySelector('#output').classList.toggle('detail',e.target.checked);document.querySelector('#hide').onclick=()=>document.querySelector('#controls').hidden=!document.querySelector('#controls').hidden;</script><script type="module" src="/app.js"></script></body></html>`;
const publicRoot = await fs.realpath(resolve(root, 'public'));
const server = createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405);
      res.end();
      return;
    }
    const path = new URL(req.url, 'http://127.0.0.1:3031').pathname;
    let data, type;
    if (path === '/') {
      data = html;
      type = 'text/html';
    } else if (path === '/app.js') {
      data = bundle;
      type = 'text/javascript';
    } else if (path === '/manifest.json') {
      data = JSON.stringify(manifest);
      type = 'application/json';
    } else {
      const file = await fs.realpath(
        resolve(publicRoot, '.' + decodeURIComponent(path)),
      );
      if (!file.startsWith(publicRoot + sep)) throw new Error('outside');
      data = await fs.readFile(file);
      type = extname(file) === '.jpg' ? 'image/jpeg' : 'application/json';
    }
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'no-store');
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});
server.listen(3031, '127.0.0.1', () =>
  console.log('Earth route lab http://127.0.0.1:3031'),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => server.close(() => process.exit(0)));
