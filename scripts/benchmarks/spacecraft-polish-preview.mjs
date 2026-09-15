/** Developer-only finite geometry views. Never imported by the portfolio.
 * node scripts/benchmarks/spacecraft-polish-preview.mjs
 * Baseline is the last approved pre-polish commit. Current is this checkout.
 * Static renders deliberately omit GTAO to expose geometry/seam errors.
 */
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { modelSourceSnapshot } from './model-source-snapshot.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const baseline = process.argv[2] ?? 'b64852f';
const bundles = {};
for (const version of ['before', 'after']) {
  const snapshot = modelSourceSnapshot({
    root,
    revision: version === 'before' ? baseline : undefined,
  });
  const result = await build({
    absWorkingDir: root,
    stdin: {
      contents: `import * as THREE from 'three';
        import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
        import {createSpacecraft} from './${snapshot.entry}';
        const renderer=new THREE.WebGLRenderer({antialias:true});
        renderer.setPixelRatio(Math.min(devicePixelRatio,2));
        renderer.outputColorSpace=THREE.SRGBColorSpace;
        renderer.toneMapping=THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure=.95;
        renderer.setClearColor('#07101f');
        renderer.shadowMap.enabled=true;
        renderer.shadowMap.type=THREE.PCFShadowMap;
        renderer.shadowMap.autoUpdate=false;
        document.body.appendChild(renderer.domElement);
        const scene=new THREE.Scene();
        const pmrem=new THREE.PMREMGenerator(renderer), room=new RoomEnvironment();
        const environment=pmrem.fromScene(room,.035);scene.environment=environment.texture;
        scene.environmentIntensity=.24;room.dispose();pmrem.dispose();
        scene.add(new THREE.HemisphereLight(0xe0eaff,0x394553,.28));
        const key=new THREE.DirectionalLight(0xffe3c1,2.2);key.position.set(-7,10,12);
        key.castShadow=true;key.shadow.mapSize.set(2048,2048);
        Object.assign(key.shadow.camera,{left:-10,right:10,top:7,bottom:-7,near:.5,far:36});
        key.shadow.normalBias=.035;key.shadow.bias=-.00008;scene.add(key);
        const rim=new THREE.DirectionalLight(0x91b8ff,1.2);rim.position.set(4,3,-7);scene.add(rim);
        const bounce=new THREE.DirectionalLight(0xffd7a4,.45);bounce.position.set(-2,-1,6);scene.add(bounce);
        const model=createSpacecraft(THREE,{layout:'wide',screenLabels:false});scene.add(model.group);
        model.update(0,'',true,{activeRoom:'home',transitWalkway:true,delta:0});
        const camera=new THREE.PerspectiveCamera(38,1,.05,100);
        const ladderX=model.group.userData.walkwayAnchor[0];
        const views={
          'Ladder front':{target:[ladderX,.0675,0],direction:[.25,.04,1],distance:10.8},
          'Ladder reverse':{target:[ladderX,.0675,-.25],direction:[-.22,.08,1],distance:10.8},
          'Upper rear seam':{target:[-3.4,2.6,-.35],direction:[-.42,.7,1],distance:5.4},
          'Lower ladder door':{target:[ladderX+.65,-1.5,0],direction:[-.22,.20,1],distance:4.7},
          'Docking shoulder':{target:[ladderX-.45,.0675,0],direction:[1.3,.12,1],distance:8.8},
          'About corner':{target:[-2.09,-1.405,-.15],direction:[-.32,.06,1],distance:5.4},
          'Contact corner':{target:[2.09,-1.405,-.15],direction:[.32,.06,1],distance:5.4},
          'Upper ladder return':{target:[ladderX,2.44,.05],direction:[.65,-.15,1],distance:4.5},
          'Lower ladder return':{target:[ladderX,-2.31,.05],direction:[.65,.15,1],distance:4.5},
          'Exterior access route':{target:[-.5,.2,0],direction:[-.38,.25,1],distance:17.5},
          'Underside access route':{target:[-.5,.2,0],direction:[-.38,-.25,1],distance:17.5},
          'Underside access detail':{target:[-1,-2.7,.35],direction:[-.35,-.75,1],distance:9.5},
          'Roof access detail':{target:[-1,3.1,.35],direction:[-.35,.75,1],distance:9.5},
          'Rear quarter':{target:[-2,.3,-.4],direction:[-.45,.48,-1],distance:15},
        };
        let selected='Ladder front';
        const draw=()=>{
          const v=views[selected];camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
          const target=new THREE.Vector3(...v.target);
          camera.position.copy(target).add(new THREE.Vector3(...v.direction).normalize().multiplyScalar(v.distance));
          camera.lookAt(target);camera.updateMatrixWorld(true);
          renderer.setSize(innerWidth,innerHeight);scene.updateMatrixWorld(true);
          renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
          document.body.dataset.view=selected;
          document.body.dataset.pose=JSON.stringify({position:camera.position.toArray(),target:v.target});
          document.body.dataset.calls=renderer.info.render.calls;
          document.getElementById('status').textContent='${version} · '+selected+' · static, no GTAO';
        };
        const select=document.getElementById('view');
        for(const name of Object.keys(views)){const o=document.createElement('option');o.textContent=name;select.appendChild(o);}
        select.onchange=()=>{selected=select.value;draw()};
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
}
const server = createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const path = new URL(req.url, 'http://127.0.0.1:3017').pathname;
  const version = path.includes('before') ? 'before' : 'after';
  if (path.endsWith('.js')) {
    res.setHeader('Content-Type', 'text/javascript');
    res.end(bundles[version]);
    return;
  }
  res.setHeader('Content-Type', 'text/html');
  res.end(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Spacecraft geometry ${version}</title><style>body{margin:0;background:#07101f;color:#eae7dc;font:14px system-ui}canvas{display:block}aside{position:fixed;z-index:2;top:12px;left:12px;padding:12px;background:#101826ed;border:1px solid #465a72;border-radius:8px}a{color:#bdd7ec;margin-right:12px}select,button{margin:6px;padding:6px}</style></head><body><aside id="controls"><a href="/before">Before</a><a href="/after">After</a><label>View <select id="view"></select></label><button id="hide">Hide controls</button><p id="status">Preparing…</p></aside><script type="module" src="/${version}.js"></script></body></html>`,
  );
});
server.listen(3017, '127.0.0.1', () =>
  console.log('Finite geometry views: http://127.0.0.1:3017/'),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => server.close(() => process.exit(0)));
