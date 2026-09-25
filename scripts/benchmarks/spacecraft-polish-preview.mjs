/** Developer-only finite geometry views. Never imported by the portfolio.
 * node scripts/benchmarks/spacecraft-polish-preview.mjs <baseline revision>
 * Current source is frozen at startup. Restart after changing the model.
 * Repeat views with /before?view=Projects+front&layout=wide&dpr=1 and /after.
 * These finite frames omit GTAO and orbital sky/Earth; RoomEnvironment illuminates surfaces.
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { modelSourceSnapshot } from './model-source-snapshot.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(scriptPath), '../..');
const baseline = process.argv[2] ?? '9e67dae352108f1583ad03fba05cb11bf02682c2';
const sha256 = (contents) =>
  createHash('sha256').update(contents).digest('hex');
const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const manifest = {
  fixture: 'spacecraft-polish-preview',
  capturedAt: new Date().toISOString(),
  fixtureSha256: sha256(await readFile(scriptPath)),
  baselineRevision: git('rev-parse', baseline),
  currentHead: git('rev-parse', 'HEAD'),
  currentIncludesWorkingTree: true,
  rendering: {
    finite: true,
    timeSeconds: 0,
    fovDegrees: 38,
    lighting:
      'RoomEnvironment PMREM at intensity 0.24, fixed hemisphere and three directional lights; PCF shadows',
    omitted: [
      'GTAO',
      'orbital sky and Earth',
      'live screen interfaces',
      'navigation',
    ],
    devicePixelRatio: 'query dpr in 0.5–2, otherwise browser DPR capped at 2',
    framing: 'Room anchors and architectural bounds; no furniture-derived fit',
    browserMeasurements:
      'Each page exposes actual dimensions, DPR, pose and draw counts in body datasets and window.previewSnapshot.',
  },
  versions: {},
};
const bundles = {};
for (const version of ['before', 'after']) {
  const sources = {};
  const snapshot = modelSourceSnapshot({
    root,
    revision: version === 'before' ? baseline : undefined,
    onSource(name, contents) {
      sources[name] = sha256(contents);
    },
  });
  const result = await build({
    absWorkingDir: root,
    stdin: {
      contents: `import * as THREE from 'three';
        import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
        import {createSpacecraft} from './${snapshot.entry}';
        const params=new URLSearchParams(location.search);
        const requestedDpr=Number(params.get('dpr'));
        const dpr=params.has('dpr')&&Number.isFinite(requestedDpr)?Math.max(.5,Math.min(requestedDpr,2)):Math.min(devicePixelRatio,2);
        const renderer=new THREE.WebGLRenderer({antialias:true});
        renderer.setPixelRatio(dpr);
        renderer.outputColorSpace=THREE.SRGBColorSpace;
        renderer.toneMapping=THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure=.95;
        renderer.setClearColor('#07101f');
        renderer.shadowMap.enabled=true;
        renderer.shadowMap.type=THREE.PCFShadowMap;
        renderer.shadowMap.autoUpdate=false;
        document.body.appendChild(renderer.domElement);
        const scene=new THREE.Scene();
        const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
        const environment=pmrem.fromScene(room,.035);scene.environment=environment.texture;
        scene.environmentIntensity=.24;room.dispose();pmrem.dispose();
        scene.add(new THREE.HemisphereLight(0xe0eaff,0x394553,.28));
        const key=new THREE.DirectionalLight(0xffe3c1,2.2);key.position.set(-7,10,12);
        key.castShadow=true;key.shadow.mapSize.set(2048,2048);
        Object.assign(key.shadow.camera,{left:-10,right:10,top:7,bottom:-7,near:.5,far:36});
        key.shadow.normalBias=.035;key.shadow.bias=-.00008;scene.add(key);
        const rim=new THREE.DirectionalLight(0x91b8ff,1.2);rim.position.set(4,3,-7);scene.add(rim);
        const bounce=new THREE.DirectionalLight(0xffd7a4,.45);bounce.position.set(-2,-1,6);scene.add(bounce);
        const labels={projects:'Projects',experience:'Case studies',about:'About',contact:'Contact'};
        let layout=params.get('layout')==='compact'?'compact':'wide';
        const model=createSpacecraft(THREE,{layout,labels,screenLabels:false});scene.add(model.group);
        const camera=new THREE.PerspectiveCamera(38,1,.05,100);
        const roomViews={};
        for(const [section,label] of Object.entries(labels)){
          roomViews[label+' front']={room:section,direction:[0,.035,1]};
          roomViews[label+' oblique']={room:section,direction:[section==='projects'||section==='about'?-.36:.36,.10,1]};
        }
        const views=()=>{
          const ladderX=model.group.userData.walkwayAnchor[0];
          return {
            ...roomViews,
            'Ladder front':{target:[ladderX,.0675,0],direction:[.25,.04,1],distance:10.8},
            'Ladder reverse':{target:[ladderX,.0675,-.25],direction:[-.22,.08,1],distance:10.8},
            'Upper rear seam':{target:[-3.4,2.6,-.35],direction:[-.42,.7,1],distance:5.4},
            'Lower ladder door':{target:[ladderX+.65,-1.5,0],direction:[-.22,.20,1],distance:4.7},
            'Docking shoulder':{target:[ladderX-.45,.0675,0],direction:[1.3,.12,1],distance:8.8},
            'Docking exterior':{target:model.group.userData.dockingAnchors.sleeve,direction:[-1.1,.42,1],distance:innerWidth<innerHeight?10.5:6.4},
            'Docking service box':{target:[model.group.userData.dockingAnchor[0],.0675,1],direction:[-.14,.1,1],distance:3.1},
            'Docking face':{target:model.group.userData.dockingAnchors.hatch,direction:[-1,.12,.22],distance:innerWidth<innerHeight?8.5:5.5},
            'Docking inner hatch':{target:model.group.userData.dockingAnchors.innerHatch,direction:[1,0,.08],distance:1.18,fov:90},
            'About corner':{room:'about',direction:[-.32,.06,1]},
            'Contact corner':{room:'contact',direction:[.32,.06,1]},
            'Upper ladder return':{target:[ladderX,2.44,.05],direction:[.65,-.15,1],distance:4.5},
            'Lower ladder return':{target:[ladderX,-2.31,.05],direction:[.65,.15,1],distance:4.5},
            'Exterior access route':{target:[-.5,.2,0],direction:[-.38,.25,1],distance:17.5},
            'Underside access route':{target:[-.5,.2,0],direction:[-.38,-.25,1],distance:17.5},
            'Underside access detail':{target:[-1,-2.7,.35],direction:[-.35,-.75,1],distance:9.5},
            'Roof access detail':{target:[-1,3.1,.35],direction:[-.35,.75,1],distance:9.5},
            'Rear quarter':{target:[-2,.3,-.4],direction:[-.45,.48,-1],distance:15},
          };
        };
        let selected=Object.hasOwn(views(),params.get('view'))?params.get('view'):'Projects front';
        const select=document.getElementById('view');
        for(const name of Object.keys(views())){const o=document.createElement('option');o.textContent=name;select.appendChild(o);}
        select.value=selected;
        const layoutSelect=document.getElementById('layout');layoutSelect.value=layout;
        let frame=0;
        const draw=()=>{
          const v=views()[selected];
          camera.fov=v.fov??38;
          model.update(0,'',true,{activeRoom:'home',transitWalkway:true,delta:0,layout});
          camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
          const target=new THREE.Vector3(...(v.room?model.group.userData.roomAnchors[v.room]:v.target));
          const direction=new THREE.Vector3(...v.direction).normalize();
          let distance=v.distance;
          if(v.room){
            // Project the shared architectural bounds into the requested camera
            // basis. Every room uses the same margin, independent of furniture.
            const bounds=model.group.userData.roomBounds[v.room];
            const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
            const up=new THREE.Vector3().crossVectors(direction,right).normalize();
            const tanY=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2),tanX=tanY*camera.aspect;
            distance=0;
            for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]){
              const point=new THREE.Vector3(...bounds.center).add(new THREE.Vector3(x*bounds.size[0],y*bounds.size[1],z*bounds.size[2])).sub(target);
              distance=Math.max(distance,point.dot(direction)+1.06*Math.max(Math.abs(point.dot(right))/tanX,Math.abs(point.dot(up))/tanY));
            }
          }
          camera.position.copy(target).addScaledVector(direction,distance);
          camera.lookAt(target);camera.updateMatrixWorld(true);
          renderer.setSize(innerWidth,innerHeight);scene.updateMatrixWorld(true);
          renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
          const buffer=renderer.getDrawingBufferSize(new THREE.Vector2());
          const measurements={version:'${version}',view:selected,layout,frame:++frame,timeSeconds:0,
            viewport:{width:innerWidth,height:innerHeight},drawingBuffer:{width:buffer.x,height:buffer.y},
            browserDpr:devicePixelRatio,renderDpr:dpr,userAgent:navigator.userAgent,
            pose:{position:camera.position.toArray(),target:target.toArray(),fov:camera.fov},
            calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
            lines:renderer.info.render.lines,points:renderer.info.render.points,
            finite:true,omitted:['GTAO','orbital sky/Earth','live screen interfaces','navigation']};
          window.previewSnapshot=measurements;
          Object.assign(document.body.dataset,{view:selected,layout,pose:JSON.stringify(measurements.pose),
            calls:String(measurements.calls),triangles:String(measurements.triangles),
            viewport:JSON.stringify(measurements.viewport),drawingBuffer:JSON.stringify(measurements.drawingBuffer),
            dpr:String(dpr),measurements:JSON.stringify(measurements),ready:'true'});
          document.getElementById('status').textContent='${version} · '+selected+' · '+layout+' · '+innerWidth+'×'+innerHeight+' CSS px / '+buffer.x+'×'+buffer.y+' buffer · DPR '+dpr+' · '+measurements.calls+' draws / '+measurements.triangles.toLocaleString()+' triangles';
          const query=new URLSearchParams({view:selected,layout,dpr:String(dpr)});
          history.replaceState(null,'',location.pathname+'?'+query);
          for(const link of document.querySelectorAll('[data-version]'))link.href='/'+link.dataset.version+'?'+query;
        };
        select.onchange=()=>{selected=select.value;draw()};
        layoutSelect.onchange=()=>{layout=layoutSelect.value;model.setLayout(layout);draw()};
        addEventListener('resize',draw);draw();
        document.getElementById('hide').onclick=()=>document.getElementById('controls').hidden=true;
        addEventListener('pagehide',()=>{
          const geometries=new Set(),materials=new Set(),textures=new Set();
          model.group.traverse(object=>{
            if(object.geometry)geometries.add(object.geometry);
            for(const material of [object.material].flat())if(material)materials.add(material);
          });
          for(const material of materials){
            for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
            material.dispose();
          }
          for(const texture of textures)texture.dispose();
          for(const geometry of geometries)geometry.dispose();
          key.shadow.map?.dispose();environment.dispose();renderer.dispose();
        },{once:true});`,
      resolveDir: root,
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    plugins: [snapshot.plugin],
  });
  bundles[version] = result.outputFiles[0].contents;
  const orderedSources = Object.fromEntries(
    Object.entries(sources).sort(([a], [b]) => a.localeCompare(b)),
  );
  manifest.versions[version] = {
    source:
      version === 'before'
        ? manifest.baselineRevision
        : 'working tree at startup',
    entry: snapshot.entry,
    bundleSha256: sha256(bundles[version]),
    sourceTreeSha256: sha256(JSON.stringify(orderedSources)),
    transitiveSources: orderedSources,
  };
}
manifest.frozenAt = new Date().toISOString();
const server = createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const path = new URL(req.url, 'http://127.0.0.1:3017').pathname;
  if (path === '/manifest.json') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(manifest, null, 2));
    return;
  }
  const version = path.includes('before') ? 'before' : 'after';
  if (path.endsWith('.js')) {
    res.setHeader('Content-Type', 'text/javascript');
    res.end(bundles[version]);
    return;
  }
  res.setHeader('Content-Type', 'text/html');
  res.end(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Spacecraft geometry ${version}</title><style>body{margin:0;background:#07101f;color:#eae7dc;font:12px system-ui}canvas{display:block}aside{position:fixed;z-index:2;top:8px;left:8px;right:8px;padding:8px;background:#101826ed;border:1px solid #465a72;border-radius:8px}a{color:#bdd7ec;margin-right:12px}select,button{margin:4px;padding:4px}p{margin:5px 0}small{color:#c4cbd2}</style></head><body><aside id="controls"><a data-version="before" href="/before">Before</a><a data-version="after" href="/after">After</a><label>View <select id="view"></select></label><label>Layout <select id="layout"><option value="wide">Wide</option><option value="compact">Compact</option></select></label><button id="hide">Hide controls</button><a href="/manifest.json">Source manifest</a><p id="status">Preparing…</p><small>Finite geometry frame at t=0. RoomEnvironment illumination at 0.24. No GTAO, orbital sky/Earth, live screen interfaces or navigation. Draw counts include this fixture's shadow work; they are not application performance measurements.</small></aside><script type="module" src="/${version}.js"></script></body></html>`,
  );
});
server.listen(3017, '127.0.0.1', () =>
  console.log(
    `Finite geometry views: http://127.0.0.1:3017/ (source frozen ${manifest.frozenAt}; manifest: /manifest.json)`,
  ),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => server.close(() => process.exit(0)));
