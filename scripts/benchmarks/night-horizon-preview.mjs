/** Finite, developer-only still comparisons; never imported by the portfolio.
 * node scripts/benchmarks/night-horizon-preview.mjs
 * Baseline source is retained with the review; all variants render one frozen
 * 8K production opening. No animation or performance benchmark runs here.
 */
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const baseline = await fs.readFile(join(root, 'docs/evidence/horizon-softening/baseline-atmosphere.ts'), 'utf8');
const environmentSource = await fs.readFile(join(root, 'features/orbit/orbital-environment.ts'), 'utf8');
const variants = {
  baseline,
  'cooler-crest': baseline.replace('vec3(0.006, 0.28, 0.85)', 'vec3(0.005, 0.13, 0.46)'),
  'gentler-crest': baseline.replace('max(0.24, footprint * 0.65)', 'max(0.40, footprint * 0.85)')
    .replace('vec3(0.006, 0.28, 0.85)', 'vec3(0.005, 0.15, 0.46)'),
};
const bundles = {};
for (const [name, contents] of Object.entries(variants)) {
  const result = await build({
    absWorkingDir: root,
    stdin: {
      contents: `import * as THREE from 'three';
        import {createOrbitalEnvironment} from './features/orbit/orbital-environment';
        const renderer = new THREE.WebGLRenderer({antialias:true, alpha:false});
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = .95;
        renderer.setClearColor('#050a11',1);
        renderer.domElement.setAttribute('aria-label','Frozen 8K production horizon');
        document.body.appendChild(renderer.domElement);
        const environment = createOrbitalEnvironment(THREE,()=>{}, {mobile:innerWidth<700});
        await environment.ready;
        const draw = ()=> {
          renderer.setPixelRatio(2); renderer.setSize(innerWidth,innerHeight);
          environment.resize(innerWidth,innerHeight,2);
          environment.update(0,true,0,0);
          renderer.render(environment.scene,environment.camera);
          document.body.dataset.ready='true';
          document.getElementById('status').textContent='${name} — frozen time 0, 8K, DPR 2';
        };
        draw(); addEventListener('resize',draw);
        document.getElementById('hide').onclick=()=>document.getElementById('controls').hidden=true;
        addEventListener('pagehide',()=>{environment.dispose();renderer.dispose()},{once:true});`,
      resolveDir: root, loader: 'ts',
    },
    write: false, bundle: true, format: 'esm', platform: 'browser', target: 'es2022',
    plugins: [{ name: 'frozen-horizon-variants', setup(builder) {
      builder.onLoad({filter:/\/night-atmosphere\.ts$/},()=>({contents,loader:'ts'}));
      builder.onLoad({filter:/\/orbital-environment\.ts$/},()=>({contents:environmentSource,loader:'ts',resolveDir:join(root,'features/orbit')}));
    }}],
  });
  bundles[name] = result.outputFiles[0].contents;
}
const manifest = {
  builtAt:new Date().toISOString(), width:8192, frozenTime:0, dpr:2,
  environmentSha256:createHash('sha256').update(environmentSource).digest('hex'),
  variants:Object.fromEntries(Object.entries(variants).map(([name,source])=>[name,{source,sha256:createHash('sha256').update(source).digest('hex')}]))
};
await fs.writeFile(join(root,'docs/evidence/horizon-softening/comparison-manifest.json'),JSON.stringify(manifest,null,2));
const server = createServer(async(req,res)=>{
  try {
    const path = new URL(req.url,'http://127.0.0.1:3016').pathname;
    const name = path.slice(1)||'baseline';
    if (name in bundles) {
      const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Night horizon — ${name}</title><style>body{margin:0;background:#050a11;color:#eae7dc;font:14px system-ui}canvas{display:block}#controls{position:fixed;z-index:2;top:20px;left:20px;padding:16px;background:#101826e8;border:1px solid #465a72;border-radius:10px}a{color:#bdd7ec;margin-right:15px}button{margin-top:10px;padding:5px 12px}</style></head><body data-variant="${name}"><aside id="controls"><nav>${Object.keys(bundles).map(key=>`<a href="/${key}">${key}</a>`).join('')}</nav><p id="status" role="status">Loading 8K Earth…</p><button id="hide">Hide controls</button></aside><script type="module" src="/${name}.js"></script></body></html>`;
      res.setHeader('Content-Type','text/html');res.end(html);return;
    }
    if (name.endsWith('.js') && name.slice(0,-3) in bundles) {
      res.setHeader('Content-Type','text/javascript');res.end(bundles[name.slice(0,-3)]);return;
    }
    const asset = resolve(root,'public','.'+path);
    if (!asset.startsWith(join(root,'public')+'/')) {res.writeHead(403);res.end();return;}
    res.setHeader('Content-Type',({'.jpg':'image/jpeg','.json':'application/json'})[extname(asset)]||'application/octet-stream');
    res.end(await fs.readFile(asset));
  } catch {res.writeHead(404);res.end('Not found');}
});
server.listen(3016,'127.0.0.1',()=>console.log('Frozen still comparison: http://127.0.0.1:3016/'));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>process.exit(0)));
